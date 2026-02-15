import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/analytics?quiz_id=... - Get analytics for a quiz
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quiz_id');

  if (!quizId) {
    return NextResponse.json({ error: 'quiz_id is required' }, { status: 400 });
  }

  try {
    // Get funnel data
    const [viewedResult, startedResult, completedResult, leadsResult] = await Promise.all([
      supabase
        .from('quiz_sessions')
        .select('id', { count: 'exact' })
        .eq('quiz_id', quizId),
      supabase
        .from('quiz_sessions')
        .select('id', { count: 'exact' })
        .eq('quiz_id', quizId)
        .in('status', ['started', 'completed']),
      supabase
        .from('quiz_sessions')
        .select('id', { count: 'exact' })
        .eq('quiz_id', quizId)
        .eq('status', 'completed'),
      supabase
        .from('quiz_sessions')
        .select('id', { count: 'exact' })
        .eq('quiz_id', quizId)
        .eq('is_lead', true),
    ]);

    const funnel = {
      viewed: viewedResult.count || 0,
      started: startedResult.count || 0,
      completed: completedResult.count || 0,
      leads: leadsResult.count || 0,
    };

    // Get completions by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: completions } = await supabase
      .from('quiz_sessions')
      .select('completed_at')
      .eq('quiz_id', quizId)
      .eq('status', 'completed')
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: true });

    // Group by date
    const completionsByDate: Record<string, number> = {};
    completions?.forEach((session) => {
      if (session.completed_at) {
        const date = session.completed_at.split('T')[0];
        completionsByDate[date] = (completionsByDate[date] || 0) + 1;
      }
    });

    // Convert to array
    const completionsByDateArray = Object.entries(completionsByDate).map(([date, count]) => ({
      date,
      count,
    }));

    // Get result distribution
    const { data: results } = await supabase
      .from('session_results')
      .select(`
        result_id,
        quiz_result:quiz_results(title)
      `)
      .eq('is_primary', true);

    // Filter to only include results for this quiz's sessions
    const { data: quizSessionIds } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('status', 'completed');

    const sessionIdSet = new Set(quizSessionIds?.map((s) => s.id) || []);

    const { data: sessionResultsForQuiz } = await supabase
      .from('session_results')
      .select(`
        result_id,
        session_id,
        quiz_result:quiz_results(title)
      `)
      .eq('is_primary', true)
      .in('session_id', Array.from(sessionIdSet));

    const resultCounts: Record<string, { title: string; count: number }> = {};
    sessionResultsForQuiz?.forEach((sr) => {
      const quizResult = sr.quiz_result as unknown as { title: string } | null;
      const title = quizResult?.title || 'Unknown';
      if (!resultCounts[sr.result_id]) {
        resultCounts[sr.result_id] = { title, count: 0 };
      }
      resultCounts[sr.result_id].count++;
    });

    const resultDistribution = Object.values(resultCounts).map((r) => ({
      result: r.title,
      count: r.count,
    }));

    // Calculate conversion rate
    const conversionRate = funnel.viewed > 0 ? (funnel.completed / funnel.viewed) * 100 : 0;

    return NextResponse.json({
      funnel,
      completionsByDate: completionsByDateArray,
      resultDistribution,
      totalSessions: funnel.viewed,
      conversionRate,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
