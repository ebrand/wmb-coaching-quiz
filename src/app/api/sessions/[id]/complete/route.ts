import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendResultEmail } from '@/lib/email/resend';

// POST /api/sessions/[id]/complete - Complete quiz and calculate results
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = createAdminClient();

  // Get session with user and quiz info
  const { data: sessionData, error: sessionFetchError } = await supabase
    .from('quiz_sessions')
    .select(`
      *,
      user:users(*),
      quiz:quizzes(id, title)
    `)
    .eq('id', sessionId)
    .single();

  if (sessionFetchError) {
    return NextResponse.json({ error: sessionFetchError.message }, { status: 500 });
  }

  const quizId = sessionData.quiz_id;

  // Get all responses for this session with their weights
  const { data: responses, error: responsesError } = await supabase
    .from('quiz_responses')
    .select(`
      answer_id,
      answer:answers(
        answer_result_weights(
          result_id,
          weight
        )
      )
    `)
    .eq('session_id', sessionId);

  if (responsesError) {
    return NextResponse.json({ error: responsesError.message }, { status: 500 });
  }

  // Calculate total score by summing all weights
  // Each answer contributes its weight (default 1.0 = 1 point)
  let totalScore = 0;

  responses?.forEach((response) => {
    const answer = response.answer as unknown as { answer_result_weights: { result_id: string; weight: number }[] } | null;
    const weights = answer?.answer_result_weights || [];
    weights.forEach((w) => {
      totalScore += w.weight;
    });
  });

  console.log('Quiz completion - Total score:', totalScore);

  // Get all results for this quiz, ordered by min_score descending
  // We want to find the result with the highest min_score that is <= totalScore
  const { data: quizResults, error: resultsError } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('quiz_id', quizId)
    .order('min_score', { ascending: false });

  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  // Find the matching result (highest min_score that is <= totalScore)
  let primaryResult = null;
  for (const result of quizResults || []) {
    if (result.min_score <= totalScore) {
      primaryResult = result;
      break;
    }
  }

  // Fallback to the result with lowest min_score if none match
  if (!primaryResult && quizResults && quizResults.length > 0) {
    primaryResult = quizResults[quizResults.length - 1];
  }

  console.log('Matched result:', primaryResult?.title, 'with min_score:', primaryResult?.min_score);

  // Delete existing session results
  await supabase
    .from('session_results')
    .delete()
    .eq('session_id', sessionId);

  // Insert new session result
  if (primaryResult) {
    const { error: insertError } = await supabase
      .from('session_results')
      .insert({
        session_id: sessionId,
        result_id: primaryResult.id,
        score: totalScore,
        is_primary: true,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // Check if this result marks the user as a lead
  const isLead = primaryResult?.is_lead || false;

  // Update session status to completed and set lead flag
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      lead_score: totalScore,
      is_lead: isLead,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Send result email if user has email and result exists
  const user = sessionData.user as { email: string | null; name: string | null } | null;
  const quiz = sessionData.quiz as { id: string; title: string } | null;

  let emailSent = false;
  let emailError: string | null = null;

  console.log('Email check:', {
    hasUser: !!user,
    userEmail: user?.email,
    hasPrimaryResult: !!primaryResult,
    hasResendKey: !!process.env.RESEND_API_KEY,
  });

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured - skipping email');
  } else if (!user?.email) {
    console.log('No user email - skipping email (user may have skipped auth)');
  } else if (!primaryResult) {
    console.log('No primary result - skipping email');
  } else {
    try {
      console.log('Sending result email to:', user.email);
      const result = await sendResultEmail({
        to: user.email,
        userName: user.name,
        quizTitle: quiz?.title || 'Quiz',
        resultTitle: primaryResult.title,
        resultDescription: primaryResult.description,
        emailContent: primaryResult.email_content,
      });

      if (result.success) {
        console.log('Email sent successfully to:', user.email);
        emailSent = true;
      } else {
        console.error('Failed to send result email:', result.error);
        emailError = result.error || 'Unknown error';
      }
    } catch (err) {
      console.error('Error sending result email:', err);
      emailError = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  return NextResponse.json({
    session,
    totalScore,
    primaryResult,
    isLead,
    emailSent,
    emailError,
  });
}
