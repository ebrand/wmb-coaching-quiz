'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { AnalyticsData } from '@/types/database';

interface AnalyticsDashboardProps {
  quizId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const truncateLabel = (text: string, maxLen = 15) =>
  text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text;

export function AnalyticsDashboard({ quizId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/analytics?quiz_id=${quizId}`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [quizId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error || 'No analytics data available'}
        </CardContent>
      </Card>
    );
  }

  const funnelData = [
    { name: 'Viewed', value: data.funnel.viewed },
    { name: 'Started', value: data.funnel.started },
    { name: 'Completed', value: data.funnel.completed },
    { name: 'Leads', value: data.funnel.leads },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.funnel.viewed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.funnel.started}</div>
            <p className="text-xs text-muted-foreground">
              {data.funnel.viewed > 0
                ? `${((data.funnel.started / data.funnel.viewed) * 100).toFixed(1)}% of views`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.funnel.completed}</div>
            <p className="text-xs text-muted-foreground">
              {data.conversionRate.toFixed(1)}% conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.funnel.leads}</div>
            <p className="text-xs text-muted-foreground">
              {data.funnel.completed > 0
                ? `${((data.funnel.leads / data.funnel.completed) * 100).toFixed(1)}% of completions`
                : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Result Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Result Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {data.resultDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.resultDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${truncateLabel(name ?? '')} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="result"
                    >
                      {data.resultDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No completed quizzes yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completions Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Completions Over Time (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {data.completionsByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.completionsByDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value as string).toLocaleDateString()
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No completions in the last 30 days
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
