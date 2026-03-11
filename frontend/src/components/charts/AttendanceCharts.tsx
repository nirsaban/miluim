'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Users, TrendingUp } from 'lucide-react';
import api from '@/lib/api';

interface AttendanceStats {
  cycle: {
    id: string;
    name: string;
    startDate: string;
  } | null;
  summary: {
    totalUsers: number;
    totalResponded: number;
    noResponse: number;
    arrived: number;
    late: number;
    notComing: number;
    pending: number;
    leftEarly: number;
    totalPresent: number;
    attendanceRate: number;
  };
  pieChartData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  reasonsChartData: Array<{
    reason: string;
    count: number;
  }>;
}

export function AttendanceCharts() {
  const { data: stats, isLoading, error } = useQuery<AttendanceStats>({
    queryKey: ['attendance-stats'],
    queryFn: async () => {
      const response = await api.get('/service-attendance/current/stats');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          אין סבב מילואים פעיל כרגע
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-sm text-gray-500">סה"כ במערכת</p>
          <p className="text-2xl font-bold text-gray-700">{stats.summary.totalUsers}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 text-center border border-green-200">
          <p className="text-sm text-green-600">הגיעו</p>
          <p className="text-2xl font-bold text-green-700">{stats.summary.arrived}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 text-center border border-yellow-200">
          <p className="text-sm text-yellow-600">באיחור</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.summary.late}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 text-center border border-red-200">
          <p className="text-sm text-red-600">לא מגיעים</p>
          <p className="text-2xl font-bold text-red-700">{stats.summary.notComing}</p>
        </div>
        <div className="bg-gray-50 rounded-lg shadow p-4 text-center border border-gray-200">
          <p className="text-sm text-gray-500">לא עדכנו</p>
          <p className="text-2xl font-bold text-gray-600">{stats.summary.noResponse}</p>
        </div>
      </div>

      {/* Attendance Rate */}
      <Card>
        <CardHeader className="flex items-center gap-2 bg-military-50">
          <TrendingUp className="w-5 h-5 text-military-600" />
          <span className="text-military-800">אחוז הגעה לסבב</span>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-military-700">
                {stats.summary.attendanceRate}%
              </div>
              <p className="text-gray-500 mt-2">
                {stats.summary.totalPresent} מתוך {stats.summary.totalUsers} חיילים
              </p>
            </div>
            <div className="w-48 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${stats.summary.attendanceRate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Status Distribution */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Users className="w-5 h-5 text-military-600" />
            <span>התפלגות סטטוס נוכחות</span>
          </CardHeader>
          <CardContent>
            {stats.pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {stats.pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} חיילים`, '']}
                    contentStyle={{ direction: 'rtl' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    formatter={(value) => <span style={{ marginRight: 8 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">אין נתונים להצגה</p>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Reasons for not coming */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-600" />
            <span>סיבות אי-הגעה</span>
          </CardHeader>
          <CardContent>
            {stats.reasonsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.reasonsChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    width={90}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} חיילים`, '']}
                    contentStyle={{ direction: 'rtl' }}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">אין סיבות אי-הגעה</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
