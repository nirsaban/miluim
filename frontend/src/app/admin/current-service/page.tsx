'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Hotel,
  Calendar,
  MapPin,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import {
  ServiceCycleSummary,
  ServiceAttendance,
  ServiceAttendanceStatus,
  SERVICE_ATTENDANCE_STATUS_LABELS,
  MILITARY_ROLE_LABELS,
  MilitaryRole,
} from '@/types';

export default function AdminCurrentServicePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceAttendanceStatus | ''>('');

  // Get current cycle summary
  const { data: summary, isLoading: summaryLoading } = useQuery<ServiceCycleSummary | null>({
    queryKey: ['current-service-summary'],
    queryFn: async () => {
      const response = await api.get('/service-cycles/current/summary');
      return response.data;
    },
  });

  // Get attendance list
  const { data: attendances, isLoading: attendanceLoading } = useQuery<ServiceAttendance[]>({
    queryKey: ['current-service-attendance'],
    queryFn: async () => {
      const response = await api.get('/service-attendance/current/list');
      return response.data;
    },
    enabled: !!summary?.cycle,
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/service-attendance/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-service-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['current-service-summary'] });
      toast.success('עודכן בהצלחה');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בעדכון');
    },
  });

  const isLoading = summaryLoading || attendanceLoading;

  // Filter attendances
  const filteredAttendances = attendances?.filter((a) => {
    const matchesSearch =
      !searchTerm ||
      a.user?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.user?.personalId?.includes(searchTerm);
    const matchesStatus = !statusFilter || a.attendanceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  if (!summary?.cycle) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">אין סבב מילואים פעיל</h2>
            <p className="text-gray-500 mb-4">צור והפעל סבב מילואים כדי לראות את הדשבורד</p>
            <Link href="/admin/service-cycles">
              <Button>נהל סבבי מילואים</Button>
            </Link>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const { cycle, stats, reasonsGrouped, checklistStats } = summary;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-military-700">{cycle.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(cycle.startDate).toLocaleDateString('he-IL')}
                {cycle.endDate && <> - {new Date(cycle.endDate).toLocaleDateString('he-IL')}</>}
              </span>
              {cycle.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {cycle.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/current-service/checklist">
              <Button variant="secondary" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                צ׳קליסט
              </Button>
            </Link>
            <Link href="/admin/service-cycles">
              <Button variant="secondary">נהל סבבים</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="py-4 text-center">
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalSoldiers}</div>
            <div className="text-sm text-gray-500">סה״כ חיילים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <UserCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{stats.arrived}</div>
            <div className="text-sm text-gray-500">הגיעו</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <UserX className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{stats.notComing}</div>
            <div className="text-sm text-gray-500">לא מגיעים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">ממתינים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Shield className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.withGunAssigned}</div>
            <div className="text-sm text-gray-500">עם נשק</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Hotel className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.withRoomAssigned}</div>
            <div className="text-sm text-gray-500">עם חדר</div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Progress & Reasons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Checklist Progress */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>התקדמות צ׳קליסט</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{
                      width: `${
                        checklistStats.total > 0
                          ? (checklistStats.completed / checklistStats.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-sm font-medium">
                {checklistStats.completed}/{checklistStats.total}
              </div>
            </div>
            <Link
              href="/admin/current-service/checklist"
              className="text-military-600 text-sm hover:underline mt-2 inline-block"
            >
              צפה בצ׳קליסט המלא
            </Link>
          </CardContent>
        </Card>

        {/* Reasons Summary */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>סיבות אי-הגעה</span>
          </CardHeader>
          <CardContent>
            {Object.keys(reasonsGrouped).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(reasonsGrouped).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 truncate">{reason}</span>
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">אין סיבות אי-הגעה</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            רשימת חיילים
          </span>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9 pl-3 py-2 border rounded-lg text-sm w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ServiceAttendanceStatus | '')}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">כל הסטטוסים</option>
              {Object.entries(SERVICE_ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-2">שם מלא</th>
                  <th className="text-right py-3 px-2">מ.א</th>
                  <th className="text-right py-3 px-2">תפקיד</th>
                  <th className="text-right py-3 px-2">מחלקה</th>
                  <th className="text-right py-3 px-2">סטטוס</th>
                  <th className="text-right py-3 px-2">סיבה</th>
                  <th className="text-right py-3 px-2">נשק</th>
                  <th className="text-right py-3 px-2">חדר</th>
                  <th className="text-right py-3 px-2">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendances?.map((attendance) => (
                  <tr key={attendance.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{attendance.user?.fullName}</td>
                    <td className="py-3 px-2">{attendance.user?.personalId}</td>
                    <td className="py-3 px-2">
                      {attendance.user?.militaryRole
                        ? MILITARY_ROLE_LABELS[attendance.user.militaryRole as MilitaryRole]
                        : '-'}
                    </td>
                    <td className="py-3 px-2">{attendance.user?.department?.name || '-'}</td>
                    <td className="py-3 px-2">
                      <select
                        value={attendance.attendanceStatus}
                        onChange={(e) =>
                          updateAttendanceMutation.mutate({
                            id: attendance.id,
                            data: { attendanceStatus: e.target.value },
                          })
                        }
                        className={`text-xs px-2 py-1 rounded border ${
                          attendance.attendanceStatus === 'ARRIVED'
                            ? 'bg-green-100 border-green-300'
                            : attendance.attendanceStatus === 'NOT_COMING'
                              ? 'bg-red-100 border-red-300'
                              : 'bg-gray-100 border-gray-300'
                        }`}
                      >
                        {Object.entries(SERVICE_ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2 max-w-32 truncate" title={attendance.cannotAttendReason || ''}>
                      {attendance.cannotAttendReason || '-'}
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={attendance.onboardGunNumber || ''}
                        onChange={(e) =>
                          updateAttendanceMutation.mutate({
                            id: attendance.id,
                            data: { onboardGunNumber: e.target.value || null },
                          })
                        }
                        className="w-20 px-2 py-1 border rounded text-xs"
                        placeholder="מספר"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={attendance.hotelRoomNumber || ''}
                        onChange={(e) =>
                          updateAttendanceMutation.mutate({
                            id: attendance.id,
                            data: { hotelRoomNumber: e.target.value || null },
                          })
                        }
                        className="w-16 px-2 py-1 border rounded text-xs"
                        placeholder="חדר"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <a
                        href={`tel:${attendance.user?.phone}`}
                        className="text-military-600 hover:underline text-xs"
                      >
                        התקשר
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAttendances?.length === 0 && (
              <div className="text-center py-8 text-gray-500">לא נמצאו תוצאות</div>
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
