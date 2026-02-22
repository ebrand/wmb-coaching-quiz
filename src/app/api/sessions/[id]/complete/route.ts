import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendResultEmail, sendAdminNotificationEmail } from '@/lib/email/resend';

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

  // Get all responses for this session with their result mappings
  const { data: responses, error: responsesError } = await supabase
    .from('quiz_responses')
    .select(`
      answer_id,
      answer:answers(
        answer_result_weights(
          result_id
        )
      )
    `)
    .eq('session_id', sessionId);

  if (responsesError) {
    return NextResponse.json({ error: responsesError.message }, { status: 500 });
  }

  // Count votes per result
  const resultVotes: Record<string, number> = {};

  responses?.forEach((response) => {
    const answer = response.answer as unknown as { answer_result_weights: { result_id: string }[] } | null;
    const weights = answer?.answer_result_weights || [];
    weights.forEach((w) => {
      resultVotes[w.result_id] = (resultVotes[w.result_id] || 0) + 1;
    });
  });

  console.log('Quiz completion - Result votes:', resultVotes);

  // Find the result with the most votes
  let maxVotes = 0;
  let winningResultId: string | null = null;

  Object.entries(resultVotes).forEach(([resultId, votes]) => {
    if (votes > maxVotes) {
      maxVotes = votes;
      winningResultId = resultId;
    }
  });

  // Get the winning result details
  let primaryResult = null;
  if (winningResultId) {
    const { data: result } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('id', winningResultId)
      .single();
    primaryResult = result;
  }

  // Fallback to first result if no votes (shouldn't happen)
  if (!primaryResult) {
    const { data: fallbackResults } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('quiz_id', quizId)
      .order('display_order')
      .limit(1);
    if (fallbackResults && fallbackResults.length > 0) {
      primaryResult = fallbackResults[0];
    }
  }

  console.log('Winning result:', primaryResult?.title, 'with votes:', maxVotes);

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
        score: maxVotes,
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
      lead_score: maxVotes,
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

  const emailDebug = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 8) || 'NOT SET',
    hasUser: !!user,
    userEmail: user?.email || null,
    userName: user?.name || null,
    sessionUserId: sessionData.user_id || null,
    hasPrimaryResult: !!primaryResult,
    primaryResultTitle: primaryResult?.title || null,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev',
    skippedReason: null as string | null,
  };

  console.log('Email debug:', JSON.stringify(emailDebug));

  if (!process.env.RESEND_API_KEY) {
    emailDebug.skippedReason = 'RESEND_API_KEY not configured';
    console.warn(emailDebug.skippedReason);
  } else if (!user?.email) {
    emailDebug.skippedReason = 'No user email (user may have skipped auth or user record has no email)';
    console.log(emailDebug.skippedReason);
  } else if (!primaryResult) {
    emailDebug.skippedReason = 'No primary result found';
    console.log(emailDebug.skippedReason);
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

  // Send admin notification email for all completions
  let adminEmailSent = false;
  if (process.env.RESEND_API_KEY && primaryResult) {
    try {
      const adminResult = await sendAdminNotificationEmail({
        userName: user?.name || null,
        userEmail: user?.email || null,
        quizTitle: quiz?.title || 'Quiz',
        resultTitle: primaryResult.title,
        isLead,
      });
      adminEmailSent = adminResult.success;
      if (!adminResult.success) {
        console.error('Admin notification failed:', adminResult.error);
      }
    } catch (err) {
      console.error('Error sending admin notification:', err);
    }
  }

  return NextResponse.json({
    session,
    resultVotes,
    primaryResult,
    isLead,
    emailSent,
    emailError,
    adminEmailSent,
  });
}
