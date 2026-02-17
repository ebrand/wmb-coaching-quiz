'use client';

import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SessionData {
  id: string;
  completed_at: string | null;
  is_lead: boolean;
  lead_score: number | null;
  quiz: { title: string; slug: string } | null;
  quiz_id: string;
  user: {
    name: string | null;
    email: string | null;
    profile_picture_url: string | null;
  } | null;
  session_results: {
    is_primary: boolean;
    quiz_result: { title: string } | null;
  }[];
}

interface QuizOption {
  id: string;
  title: string;
}

interface LeadsTableFilteredProps {
  sessions: SessionData[];
  quizzes: QuizOption[];
}

export function LeadsTableFiltered({ sessions, quizzes }: LeadsTableFilteredProps) {
  const [quizFilter, setQuizFilter] = useState<string>('all');
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (quizFilter !== 'all' && session.quiz_id !== quizFilter) return false;

      if (leadFilter === 'leads' && !session.is_lead) return false;
      if (leadFilter === 'non-leads' && session.is_lead) return false;

      if (dateFrom && session.completed_at) {
        if (new Date(session.completed_at) < new Date(dateFrom)) return false;
      }
      if (dateTo && session.completed_at) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (new Date(session.completed_at) > endOfDay) return false;
      }

      return true;
    });
  }, [sessions, quizFilter, leadFilter, dateFrom, dateTo]);

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Quiz</label>
              <Select value={quizFilter} onValueChange={setQuizFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quizzes</SelectItem>
                  {quizzes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Lead Status</label>
              <Select value={leadFilter} onValueChange={setLeadFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="leads">Leads Only</SelectItem>
                  <SelectItem value="non-leads">Non-Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-[160px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-[160px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Recent Quiz Completions
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filtered.length} result{filtered.length !== 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {filtered.map((session) => {
                  const primaryResult = session.session_results?.find(
                    (r) => r.is_primary
                  );
                  const user = session.user;

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
                        <span className="text-muted-foreground">
                          {session.quiz?.title || 'Unknown Quiz'}
                        </span>
                        {primaryResult ? (
                          <Badge variant="secondary">
                            {primaryResult.quiz_result?.title}
                          </Badge>
                        ) : null}
                        {session.is_lead ? (
                          <Badge variant="default">Lead</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {session.completed_at
                          ? new Date(session.completed_at).toLocaleString()
                          : '-'}
                      </p>
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
                      <TableHead>Quiz</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((session) => {
                      const primaryResult = session.session_results?.find(
                        (r) => r.is_primary
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
                            <span className="text-sm">
                              {session.quiz?.title || 'Unknown Quiz'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {primaryResult ? (
                              <Badge variant="secondary">
                                {primaryResult.quiz_result?.title}
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
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No results match the current filters
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
