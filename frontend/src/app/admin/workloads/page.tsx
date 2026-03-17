'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  Filter,
  Search,
  Users,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Department } from '@/types';

interface SoldierWorkload {
  soldier: {
    id: string;
    fullName: string;
    department: { id: string; name: string } | null;
  };
  totalShifts: number;
  shiftsByTemplate: Record<string, number>;
  lastShiftDate: string | null;
  taskBreakdown: Record<string, number>;
}

type DateRange = 'week' | 'month' | 'year' | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  week: 'שבוע אחרון',
  month: 'חודש אחרון',
  year: 'שנה אחרונה',
  all: 'הכל',
};

export default function AdminWorkloadsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [filterDepartment, setFilterDepartment] = useState<string>('');

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

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/users/admin/departments');
      return response.data;
    },
  });

  const { data: workloads, isLoading } = useQuery<SoldierWorkload[]>({
    queryKey: ['workloads-summary', dateRange, filterDepartment],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();
      if (filterDepartment) params.departmentId = filterDepartment;

      const response = await api.get('/shift-assignments/workloads', { params });
      return response.data;
    },
  });

  // Filter workloads by search term
  const filteredWorkloads = workloads?.filter((w) =>
    w.soldier.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate statistics
  const stats = workloads
    ? {
        totalSoldiers: workloads.length,
        totalShifts: workloads.reduce((sum, w) => sum + w.totalShifts, 0),
        avgShifts: workloads.length > 0
          ? (workloads.reduce((sum, w) => sum + w.totalShifts, 0) / workloads.length).toFixed(1)
          : '0',
        maxShifts: workloads.length > 0 ? Math.max(...workloads.map((w) => w.totalShifts)) : 0,
        minShifts: workloads.length > 0 ? Math.min(...workloads.map((w) => w.totalShifts)) : 0,
      }
    : null;

  // Get all unique shift templates from all workloads
  const shiftTemplates = workloads
    ? Array.from(new Set(workloads.flatMap((w) => Object.keys(w.shiftsByTemplate))))
    : [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">עומסי עבודה</h1>
        <p className="text-gray-600 mt-1">סקירת משמרות לכל החיילים</p>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-military-600" />
              <p className="text-2xl font-bold text-military-700">{stats.totalSoldiers}</p>
              <p className="text-sm text-gray-500">חיילים</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-700">{stats.totalShifts}</p>
              <p className="text-sm text-gray-500">סה"כ משמרות</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-700">{stats.avgShifts}</p>
              <p className="text-sm text-gray-500">ממוצע</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-700">{stats.maxShifts}</p>
              <p className="text-sm text-gray-500">מקסימום</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <TrendingDown className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-700">{stats.minShifts}</p>
              <p className="text-sm text-gray-500">מינימום</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="חיפוש לפי שם..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Date Range */}
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

            {/* Department Filter */}
            {departments && departments.length > 0 && (
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-military-500"
              >
                <option value="">כל המחלקות</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workloads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    שם
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    מחלקה
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                    סה"כ
                  </th>
                  {shiftTemplates.map((template) => (
                    <th
                      key={template}
                      className="text-center px-4 py-3 text-sm font-semibold text-gray-700"
                    >
                      {template}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    משמרת אחרונה
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWorkloads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4 + shiftTemplates.length}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      לא נמצאו נתונים
                    </td>
                  </tr>
                ) : (
                  filteredWorkloads.map((workload, index) => {
                    // Calculate deviation from average
                    const avg = stats ? parseFloat(stats.avgShifts) : 0;
                    const deviation = workload.totalShifts - avg;
                    const isHigh = deviation > avg * 0.2;
                    const isLow = deviation < -avg * 0.2;

                    return (
                      <tr key={workload.soldier.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">{index + 1}.</span>
                            <span className="font-medium">{workload.soldier.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {workload.soldier.department?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-1 rounded-full text-sm font-medium',
                              isHigh && 'bg-red-100 text-red-700',
                              isLow && 'bg-yellow-100 text-yellow-700',
                              !isHigh && !isLow && 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {workload.totalShifts}
                          </span>
                        </td>
                        {shiftTemplates.map((template) => (
                          <td
                            key={template}
                            className="px-4 py-3 text-center text-gray-600"
                          >
                            {workload.shiftsByTemplate[template] || 0}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-gray-500 text-sm">
                          {workload.lastShiftDate
                            ? formatDate(workload.lastShiftDate, 'dd/MM/yyyy')
                            : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
