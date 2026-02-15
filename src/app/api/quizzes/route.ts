import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { CreateQuiz } from '@/types/database';

// GET /api/quizzes - List all quizzes
export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_results(count),
      questions(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/quizzes - Create a new quiz
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body: CreateQuiz = await request.json();

  // Generate slug from title if not provided
  const slug = body.slug || body.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      title: body.title,
      description: body.description,
      slug,
      settings: body.settings || {
        primaryColor: '#3b82f6',
        backgroundColor: '#ffffff',
        buttonStyle: 'rounded',
        logoUrl: null,
      },
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
