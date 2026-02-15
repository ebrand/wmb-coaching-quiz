export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function LeadsPage() {
  const supabase = createAdminClient();

  // Get all completed sessions with user info
  const { data: sessions, error } = await supabase
    .from('quiz_sessions')
    .select(`
      *,
      user:users(*),
      quiz:quizzes(title, slug),
      session_results(
        *,
        quiz_result:quiz_results(title)
      )
    `)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(100);

  if (error) {
    return <div>Error loading leads: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Leads & Completions</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Quiz Completions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const primaryResult = session.session_results?.find(
                    (r: { is_primary: boolean }) => r.is_primary
                  );
                  const user = session.user;

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user?.profile_picture_url && (
                            <img
                              src={user.profile_picture_url}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium">
                              {user?.name || 'Anonymous'}
                            </p>
                            {user?.email && (
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {(session.quiz as { title: string })?.title || 'Unknown Quiz'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {primaryResult ? (
                          <Badge variant="secondary">
                            {(primaryResult.quiz_result as { title: string })?.title}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {session.lead_score?.toFixed(1) || '-'}
                      </TableCell>
                      <TableCell>
                        {session.is_lead ? (
                          <Badge variant="default">Lead</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {session.completed_at
                          ? new Date(session.completed_at).toLocaleString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No completed quizzes yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
