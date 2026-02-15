import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// POST /api/sessions - Create a new quiz session
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  const anonymousToken = uuidv4();

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      quiz_id: body.quiz_id,
      anonymous_token: anonymousToken,
      status: 'viewed',
      entered_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
