import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { UpdateQuiz } from '@/types/database';

// GET /api/quizzes/[id] - Get a single quiz with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_results(*),
      questions(
        *,
        answers(
          *,
          answer_result_weights(*)
        )
      )
    `)
    .eq('id', id)
    .order('display_order', { referencedTable: 'quiz_results' })
    .order('display_order', { referencedTable: 'questions' })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Sort answers within each question
  if (data.questions) {
    data.questions.forEach((q: { answers?: { display_order: number }[] }) => {
      if (q.answers) {
        q.answers.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order);
      }
    });
  }

  return NextResponse.json(data);
}

// PATCH /api/quizzes/[id] - Update a quiz
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body: UpdateQuiz = await request.json();

  const { data, error } = await supabase
    .from('quizzes')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/quizzes/[id] - Delete a quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
