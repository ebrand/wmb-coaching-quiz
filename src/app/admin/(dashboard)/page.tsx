export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { FileQuestion, Users, Eye, CheckCircle } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // Fetch overview stats
  const [quizzesResult, sessionsResult, completedResult, leadsResult] = await Promise.all([
    supabase.from('quizzes').select('id', { count: 'exact' }),
    supabase.from('quiz_sessions').select('id', { count: 'exact' }),
    supabase.from('quiz_sessions').select('id', { count: 'exact' }).eq('status', 'completed'),
    supabase.from('quiz_sessions').select('id', { count: 'exact' }).eq('is_lead', true),
  ]);

  const stats = [
    {
      title: 'Total Quizzes',
      value: quizzesResult.count || 0,
      icon: FileQuestion,
      href: '/admin/quizzes',
    },
    {
      title: 'Total Sessions',
      value: sessionsResult.count || 0,
      icon: Eye,
      href: '/admin',
    },
    {
      title: 'Completed',
      value: completedResult.count || 0,
      icon: CheckCircle,
      href: '/admin',
    },
    {
      title: 'Leads',
      value: leadsResult.count || 0,
      icon: Users,
      href: '/admin/leads',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/admin/quizzes/new"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create New Quiz
            </Link>
            <Link
              href="/admin/quizzes"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Manage Quizzes
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
