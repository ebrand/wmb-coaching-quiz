import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/sessions/[id]/respond - Submit an answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  // Upsert the response (update if already answered)
  const { data, error } = await supabase
    .from('quiz_responses')
    .upsert(
      {
        session_id: sessionId,
        question_id: body.question_id,
        answer_id: body.answer_id,
        answered_at: new Date().toISOString(),
      },
      {
        onConflict: 'session_id,question_id',
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also update session status to 'started' if it's still 'viewed'
  await supabase
    .from('quiz_sessions')
    .update({ status: 'started', started_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'viewed');

  return NextResponse.json(data, { status: 201 });
}
