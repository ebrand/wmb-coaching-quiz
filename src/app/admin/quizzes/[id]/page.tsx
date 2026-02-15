export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuizSettingsForm } from '@/components/admin/quiz-settings-form';
import { QuizResultsManager } from '@/components/admin/quiz-results-manager';
import { QuestionsManager } from '@/components/admin/questions-manager';

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: quiz, error } = await supabase
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

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quizzes
        </Link>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="text-muted-foreground mt-1">
            /q/{quiz.slug}
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="results">Results ({quiz.quiz_results?.length || 0})</TabsTrigger>
          <TabsTrigger value="questions">Questions ({quiz.questions?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <QuizSettingsForm quiz={quiz} />
        </TabsContent>

        <TabsContent value="results">
          <QuizResultsManager
            quizId={quiz.id}
            results={quiz.quiz_results || []}
            questionCount={quiz.questions?.length || 0}
          />
        </TabsContent>

        <TabsContent value="questions">
          <QuestionsManager
            quizId={quiz.id}
            questions={quiz.questions || []}
            results={quiz.quiz_results || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
