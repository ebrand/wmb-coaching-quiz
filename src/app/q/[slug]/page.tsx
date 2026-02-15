export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { QuizContainer } from '@/components/quiz/quiz-container';

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_results(*),
      questions(
        *,
        answers(*)
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .order('display_order', { referencedTable: 'quiz_results' })
    .order('display_order', { referencedTable: 'questions' })
    .single();

  if (error || !quiz) {
    notFound();
  }

  // Sort answers within questions
  if (quiz.questions) {
    quiz.questions.forEach((q: { answers?: { display_order: number }[] }) => {
      if (q.answers) {
        q.answers.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order);
      }
    });
  }

  return <QuizContainer quiz={quiz} />;
}
