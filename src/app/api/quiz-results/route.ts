import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/auth/admin';

// POST /api/quiz-results - Create a new quiz result
export const POST = withAdminAuth(async (request: NextRequest) => {
  const supabase = createAdminClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('quiz_results')
    .insert({
      quiz_id: body.quiz_id,
      title: body.title || '',
      description: body.description || null,
      image_url: body.image_url || null,
      show_emoji: body.show_emoji ?? true,
      emoji: body.emoji || '🎉',
      display_order: body.display_order || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
});
