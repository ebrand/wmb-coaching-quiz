import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/questions - Create a new question
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('questions')
    .insert({
      quiz_id: body.quiz_id,
      question_text: body.question_text,
      image_url: body.image_url || null,
      display_order: body.display_order || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
