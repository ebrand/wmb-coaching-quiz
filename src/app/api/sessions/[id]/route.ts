import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/sessions/[id] - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select(`
      *,
      user:users(*),
      quiz_responses(
        *,
        question:questions(*),
        answer:answers(*)
      ),
      session_results(
        *,
        quiz_result:quiz_results(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/sessions/[id] - Update session status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.status === 'started') {
    updateData.status = 'started';
    updateData.started_at = new Date().toISOString();
  } else if (body.status === 'completed') {
    updateData.status = 'completed';
    updateData.completed_at = new Date().toISOString();
  }

  if (body.user_id) {
    updateData.user_id = body.user_id;
  }

  if (body.is_lead !== undefined) {
    updateData.is_lead = body.is_lead;
  }

  if (body.lead_score !== undefined) {
    updateData.lead_score = body.lead_score;
  }

  const { data, error } = await supabase
    .from('quiz_sessions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
