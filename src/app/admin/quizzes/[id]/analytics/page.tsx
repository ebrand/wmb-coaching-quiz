export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';

export default async function QuizAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('id, title, slug')
    .eq('id', id)
    .single();

  if (error || !quiz) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/admin/quizzes/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quiz
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics: {quiz.title}</h1>
        <p className="text-muted-foreground mt-1">/q/{quiz.slug}</p>
      </div>

      <AnalyticsDashboard quizId={quiz.id} />
    </div>
  );
}
