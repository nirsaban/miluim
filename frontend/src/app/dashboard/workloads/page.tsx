'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface UserWorkload {
  totalShifts: number;
  shiftsByTemplate: Record<string, { count: number; color?: string | null }>;
  taskBreakdown: Record<string, number>;
  recentShifts: Array<{
    id: string;
    date: string;
    shiftTemplate: string;
    task: string;
    color?: string | null;
  }>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

type DateRange = 'week' | 'month' | 'year' | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  week: 'שבוע אחרון',
  month: 'חודש אחרון',
  year: 'שנה אחרונה',
  all: 'הכל',
};

const CHART_COLORS = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export default function WorkloadsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  const getDateParams = () => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    switch (dateRange) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = undefined;
        endDate = undefined;
        break;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateParams();

  const { data: workload, isLoading } = useQuery<UserWorkload>({
    queryKey: ['my-workload', dateRange],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await api.get('/shift-assignments/workloads/my', { params });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </UserLayout>
    );
  }

  const templateData = workload
    ? Object.entries(workload.shiftsByTemplate).map(([name, data]) => ({
        name,
        value: data.count,
        color: data.color || CHART_COLORS[0],
      }))
    : [];

  const taskData = workload
    ? Object.entries(workload.taskBreakdown).map(([name, count]) => ({
        name,
        count,
      }))
    : [];

  const monthlyData = workload?.monthlyTrend.map((item) => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString('he-IL', {
      month: 'short',
    }),
  })) || [];

  return (
    <UserLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-military-700">עומסי עבודה</h1>
            <p className="text-gray-600 mt-1">סטטיסטיקות המשמרות שלך</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-military-500"
            >
              {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!workload || workload.totalShifts === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">אין נתוני משמרות לתקופה זו</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-military-600" />
                <p className="text-3xl font-bold text-military-700">{workload.totalShifts}</p>
                <p className="text-sm text-gray-500">סה"כ משמרות</p>
              </CardContent>
            </Card>
            {Object.entries(workload.shiftsByTemplate).slice(0, 3).map(([name, data]) => (
              <Card key={name}>
                <CardContent className="py-4 text-center">
                  <Clock
                    className="w-8 h-8 mx-auto mb-2"
                    style={{ color: data.color || '#6B7280' }}
                  />
                  <p className="text-3xl font-bold" style={{ color: data.color || '#374151' }}>
                    {data.count}
                  </p>
                  <p className="text-sm text-gray-500">{name}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card>
              <CardHeader className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-military-600" />
                <span>מגמה חודשית</span>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        formatter={(value) => [`${value} משמרות`, 'כמות']}
                        labelFormatter={(label) => `חודש: ${label}`}
                      />
                      <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Shift Type Distribution */}
            <Card>
              <CardHeader className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-military-600" />
                <span>התפלגות לפי סוג משמרת</span>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={templateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {templateData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} משמרות`, 'כמות']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Task Breakdown */}
          {taskData.length > 0 && (
            <Card>
              <CardHeader className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-military-600" />
                <span>התפלגות לפי משימה</span>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip
                        formatter={(value) => [`${value} משמרות`, 'כמות']}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Shifts */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-military-600" />
              <span>משמרות אחרונות</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workload.recentShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: shift.color || '#6B7280' }}
                      />
                      <div>
                        <p className="font-medium">{shift.shiftTemplate}</p>
                        <p className="text-sm text-gray-500">{shift.task}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(shift.date, 'dd/MM/yyyy')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </UserLayout>
  );
}
