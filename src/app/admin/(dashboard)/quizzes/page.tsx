export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, BarChart3, ExternalLink } from 'lucide-react';
import { DeleteQuizButton } from '@/components/admin/delete-quiz-button';
import { AdminNotificationSettings } from '@/components/admin/admin-notification-settings';

export default async function QuizzesPage() {
  const supabase = createAdminClient();

  const [{ data: quizzes, error }, { data: appSettings }] = await Promise.all([
    supabase
      .from('quizzes')
      .select(`
        *,
        quiz_results(count),
        questions(count)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single(),
  ]);

  if (error) {
    return <div>Error loading quizzes: {error.message}</div>;
  }

  const defaultEmail = process.env.ADMIN_NOTIFICATION_EMAIL || '';
  const defaultNotify = process.env.NOTIFY_ADMIN === 'true';

  const notifyAdmin = appSettings?.notify_admin ?? defaultNotify;
  const adminEmail = appSettings?.admin_notification_email || defaultEmail;

  return (
    <div>
      <div className="mb-6">
        <AdminNotificationSettings
          initialNotifyAdmin={notifyAdmin}
          initialEmail={adminEmail}
          defaultEmail={defaultEmail}
        />
      </div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Quizzes</h1>
        <Link href="/admin/quizzes/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Quiz
          </Button>
        </Link>
      </div>

      {quizzes && quizzes.length > 0 ? (
        <>
          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{quiz.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{quiz.slug}</p>
                  </div>
                  {quiz.is_published ? (
                    <Badge variant="default">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{(quiz.quiz_results as { count: number }[])?.[0]?.count || 0} results</span>
                  <span>{(quiz.questions as { count: number }[])?.[0]?.count || 0} questions</span>
                  <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/quizzes/${quiz.id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/admin/quizzes/${quiz.id}/analytics`}>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Analytics
                    </Button>
                  </Link>
                  <a href={`/q/${quiz.slug}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                  <DeleteQuizButton quizId={quiz.id} quizTitle={quiz.title} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell className="text-muted-foreground">{quiz.slug}</TableCell>
                    <TableCell>
                      {quiz.is_published ? (
                        <Badge variant="default">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell>{(quiz.quiz_results as { count: number }[])?.[0]?.count || 0}</TableCell>
                    <TableCell>{(quiz.questions as { count: number }[])?.[0]?.count || 0}</TableCell>
                    <TableCell>
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/quizzes/${quiz.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/quizzes/${quiz.id}/analytics`}>
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </Link>
                        <a href={`/q/${quiz.slug}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                        <DeleteQuizButton quizId={quiz.id} quizTitle={quiz.title} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <h3 className="text-lg font-medium mb-2">No quizzes yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first quiz to get started
          </p>
          <Link href="/admin/quizzes/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Quiz
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
