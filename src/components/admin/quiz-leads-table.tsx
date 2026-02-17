'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Supabase returns many-to-one joins as objects (not arrays) at runtime,
// despite TS inferring arrays. Use `any` for the raw prop and cast below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function QuizLeadsTable({ sessions }: { sessions: any[] }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No completed sessions yet
      </div>
    );
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {sessions.map((session) => {
          const primaryResult = (session.session_results as any[])?.find(
            (r: { is_primary: boolean }) => r.is_primary
          );
          const user = session.user as {
            name: string | null;
            email: string | null;
            profile_picture_url: string | null;
          } | null;

          return (
            <div key={session.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                {user?.profile_picture_url && (
                  <img
                    src={user.profile_picture_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {user?.name || 'Anonymous'}
                  </p>
                  {user?.email && (
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {primaryResult?.quiz_result ? (
                  <Badge variant="secondary">
                    {(primaryResult.quiz_result as { title: string }).title}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {session.completed_at
                    ? new Date(session.completed_at).toLocaleString()
                    : '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const primaryResult = (session.session_results as any[])?.find(
                (r: { is_primary: boolean }) => r.is_primary
              );
              const user = session.user as {
                name: string | null;
                email: string | null;
                profile_picture_url: string | null;
              } | null;

              return (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user?.profile_picture_url && (
                        <img
                          src={user.profile_picture_url}
                          alt=""
                          referrerPolicy="no-referrer"
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
                    {primaryResult?.quiz_result ? (
                      <Badge variant="secondary">
                        {(primaryResult.quiz_result as { title: string }).title}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
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
      </div>
    </>
  );
}
