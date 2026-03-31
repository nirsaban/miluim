'use client';

import { useState, useMemo } from 'react';
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
import { StatUsersModal, StatUser } from '@/components/ui/StatUsersModal';
import { ClickableStatCard } from '@/components/ui/ClickableStatCard';
import api from '@/lib/api';
import {
  ServiceCycleSummary,
  ServiceAttendance,
  ServiceAttendanceStatus,
  SERVICE_ATTENDANCE_STATUS_LABELS,
  MILITARY_ROLE_LABELS,
  MilitaryRole,
} from '@/types';

// Stat modal types for current service
type ServiceStatModalType =
  | 'total'
  | 'arrived'
  | 'notComing'
  | 'pending'
  | 'withGun'
  | 'withRoom'
  | null;

export default function AdminCurrentServicePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceAttendanceStatus | ''>('');
  const [statModal, setStatModal] = useState<ServiceStatModalType>(null);

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

  // Helper: Convert attendance to StatUser format
  const attendanceToStatUser = (attendance: ServiceAttendance, additionalInfo?: string): StatUser => ({
    id: attendance.user?.id || attendance.id,
    fullName: attendance.user?.fullName || 'לא ידוע',
    phone: attendance.user?.phone || '',
    personalId: attendance.user?.personalId,
    department: attendance.user?.department ? { name: attendance.user.department.name } : null,
    additionalInfo,
  });

  // Derive filtered user lists from attendances data (same source as counts)
  const statModalUsers = useMemo((): { users: StatUser[]; title: string; emptyMessage: string; icon: React.ReactNode; headerColor: string } => {
    if (!attendances || !statModal) {
      return { users: [], title: '', emptyMessage: '', icon: null, headerColor: '' };
    }

    switch (statModal) {
      case 'total':
        return {
          users: attendances.map((a) => attendanceToStatUser(a, SERVICE_ATTENDANCE_STATUS_LABELS[a.attendanceStatus])),
          title: 'כל החיילים',
          emptyMessage: 'אין חיילים',
          icon: <Users className="w-5 h-5" />,
          headerColor: 'bg-blue-50 text-blue-800',
        };
      case 'arrived':
        return {
          users: attendances
            .filter((a) => a.attendanceStatus === 'ARRIVED' || a.attendanceStatus === 'LATE')
            .map((a) => attendanceToStatUser(a, a.attendanceStatus === 'LATE' ? 'הגיע באיחור' : 'הגיע')),
          title: 'הגיעו',
          emptyMessage: 'אף אחד לא הגיע עדיין',
          icon: <UserCheck className="w-5 h-5" />,
          headerColor: 'bg-green-50 text-green-800',
        };
      case 'notComing':
        return {
          users: attendances
            .filter((a) => a.attendanceStatus === 'NOT_COMING')
            .map((a) => attendanceToStatUser(a, a.cannotAttendReason || 'לא מגיע')),
          title: 'לא מגיעים',
          emptyMessage: 'אין חיילים שלא מגיעים',
          icon: <UserX className="w-5 h-5" />,
          headerColor: 'bg-red-50 text-red-800',
        };
      case 'pending':
        return {
          users: attendances
            .filter((a) => a.attendanceStatus === 'PENDING')
            .map((a) => attendanceToStatUser(a, 'ממתין לעדכון')),
          title: 'ממתינים',
          emptyMessage: 'אין ממתינים',
          icon: <Clock className="w-5 h-5" />,
          headerColor: 'bg-yellow-50 text-yellow-800',
        };
      case 'withGun':
        return {
          users: attendances
            .filter((a) => a.onboardGunNumber)
            .map((a) => attendanceToStatUser(a, `נשק: ${a.onboardGunNumber}`)),
          title: 'עם נשק',
          emptyMessage: 'אין חיילים עם נשק משויך',
          icon: <Shield className="w-5 h-5" />,
          headerColor: 'bg-purple-50 text-purple-800',
        };
      case 'withRoom':
        return {
          users: attendances
            .filter((a) => a.hotelRoomNumber)
            .map((a) => attendanceToStatUser(a, `חדר: ${a.hotelRoomNumber}`)),
          title: 'עם חדר',
          emptyMessage: 'אין חיילים עם חדר משויך',
          icon: <Hotel className="w-5 h-5" />,
          headerColor: 'bg-indigo-50 text-indigo-800',
        };
      default:
        return { users: [], title: '', emptyMessage: '', icon: null, headerColor: '' };
    }
  }, [attendances, statModal]);

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
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">אין סבב מילואים פעיל</h2>
            <p className="text-gray-500 mb-6">צור והפעל סבב מילואים כדי לראות את הדשבורד</p>
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
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-military-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-military-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-military-700">{cycle.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
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
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link href="/admin/current-service/checklist" className="flex-1 sm:flex-none">
              <Button variant="secondary" className="flex items-center justify-center gap-2 w-full">
                <ClipboardList className="w-4 h-4" />
                צ׳קליסט
              </Button>
            </Link>
            <Link href="/admin/service-cycles" className="flex-1 sm:flex-none">
              <Button variant="secondary" className="w-full">נהל סבבים</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <ClickableStatCard onClick={() => setStatModal('total')}>
          <Card className="hover:shadow-card-hover">
            <CardContent className="py-4 px-3 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalSoldiers}</div>
              <div className="text-xs sm:text-sm text-gray-500">סה״כ חיילים</div>
            </CardContent>
          </Card>
        </ClickableStatCard>

        <ClickableStatCard onClick={() => setStatModal('arrived')} disabled={stats.arrived === 0}>
          <Card className="hover:shadow-card-hover">
            <CardContent className="py-4 px-3 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.arrived}</div>
              <div className="text-xs sm:text-sm text-gray-500">הגיעו</div>
            </CardContent>
          </Card>
        </ClickableStatCard>

        <ClickableStatCard onClick={() => setStatModal('notComing')} disabled={stats.notComing === 0}>
          <Card className="hover:shadow-card-hover">
            <CardContent className="py-4 px-3 text-center">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.notComing}</div>
              <div className="text-xs sm:text-sm text-gray-500">לא מגיעים</div>
            </CardContent>
          </Card>
        </ClickableStatCard>

        <ClickableStatCard onClick={() => setStatModal('pending')} disabled={stats.pending === 0}>
          <Card className="hover:shadow-card-hover">
            <CardContent className="py-4 px-3 text-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs sm:text-sm text-gray-500">ממתינים</div>
            </CardContent>
          </Card>
        </ClickableStatCard>

        <ClickableStatCard onClick={() => setStatModal('withGun')} disabled={stats.withGunAssigned === 0}>
          <Card className="hover:shadow-card-hover">
            <CardContent className="py-4 px-3 text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold">{stats.withGunAssigned}</div>
              <div className="text-xs sm:text-sm text-gray-500">עם נשק</div>
            </CardContent>
          </Card>
        </ClickableStatCard>

        <ClickableStatCard onClick={() => setStatModal('withRoom')} disabled={stats.withRoomAssigned === 0}>
          <Card className="hover:shadow-card-hover">
            <CardContent className="py-4 px-3 text-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Hotel className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold">{stats.withRoomAssigned}</div>
              <div className="text-xs sm:text-sm text-gray-500">עם חדר</div>
            </CardContent>
          </Card>
        </ClickableStatCard>
      </div>

      {/* Checklist Progress & Reasons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Checklist Progress */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <span className="font-semibold">התקדמות צ׳קליסט</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-green-400 to-green-500 transition-all duration-500"
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
              <div className="text-sm font-bold text-gray-700">
                {checklistStats.completed}/{checklistStats.total}
              </div>
            </div>
            <Link
              href="/admin/current-service/checklist"
              className="text-military-600 text-sm font-medium hover:text-military-700 transition-colors"
            >
              צפה בצ׳קליסט המלא ←
            </Link>
          </CardContent>
        </Card>

        {/* Reasons Summary */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <span className="font-semibold">סיבות אי-הגעה</span>
          </CardHeader>
          <CardContent>
            {Object.keys(reasonsGrouped).length > 0 ? (
              <div className="space-y-2.5">
                {Object.entries(reasonsGrouped).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 truncate">{reason}</span>
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">אין סיבות אי-הגעה</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <div className="w-8 h-8 bg-military-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-military-600" />
            </div>
            <span className="font-semibold">רשימת חיילים</span>
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ServiceAttendanceStatus | '')}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent transition-all"
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
        <CardContent className="p-0 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-3 font-semibold text-gray-700">שם מלא</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 hidden md:table-cell">מ.א</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 hidden lg:table-cell">תפקיד</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 hidden lg:table-cell">מחלקה</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700">סטטוס</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 hidden md:table-cell">סיבה</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 hidden lg:table-cell">נשק</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700 hidden lg:table-cell">חדר</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAttendances?.map((attendance) => (
                  <tr key={attendance.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-medium text-gray-900">{attendance.user?.fullName}</span>
                      <span className="text-gray-500 text-xs block md:hidden">{attendance.user?.personalId}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 hidden md:table-cell">{attendance.user?.personalId}</td>
                    <td className="py-3 px-3 text-gray-600 hidden lg:table-cell">
                      {attendance.user?.militaryRole
                        ? MILITARY_ROLE_LABELS[attendance.user.militaryRole as MilitaryRole]
                        : '-'}
                    </td>
                    <td className="py-3 px-3 text-gray-600 hidden lg:table-cell">{attendance.user?.department?.name || '-'}</td>
                    <td className="py-3 px-3">
                      <select
                        value={attendance.attendanceStatus}
                        onChange={(e) =>
                          updateAttendanceMutation.mutate({
                            id: attendance.id,
                            data: { attendanceStatus: e.target.value },
                          })
                        }
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                          attendance.attendanceStatus === 'ARRIVED'
                            ? 'bg-green-100 border-green-200 text-green-700'
                            : attendance.attendanceStatus === 'NOT_COMING'
                              ? 'bg-red-100 border-red-200 text-red-700'
                              : 'bg-gray-100 border-gray-200 text-gray-700'
                        }`}
                      >
                        {Object.entries(SERVICE_ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 max-w-32 truncate text-gray-600 hidden md:table-cell" title={attendance.cannotAttendReason || ''}>
                      {attendance.cannotAttendReason || '-'}
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <input
                        type="text"
                        value={attendance.onboardGunNumber || ''}
                        onChange={(e) =>
                          updateAttendanceMutation.mutate({
                            id: attendance.id,
                            data: { onboardGunNumber: e.target.value || null },
                          })
                        }
                        className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent"
                        placeholder="מספר"
                      />
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <input
                        type="text"
                        value={attendance.hotelRoomNumber || ''}
                        onChange={(e) =>
                          updateAttendanceMutation.mutate({
                            id: attendance.id,
                            data: { hotelRoomNumber: e.target.value || null },
                          })
                        }
                        className="w-16 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent"
                        placeholder="חדר"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={`tel:${attendance.user?.phone}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-military-50 text-military-700 rounded-lg text-xs font-medium hover:bg-military-100 transition-colors"
                      >
                        התקשר
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAttendances?.length === 0 && (
              <div className="text-center py-12 text-gray-500">לא נמצאו תוצאות</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat Users Modal - Shows users when clicking on stat cards */}
      <StatUsersModal
        isOpen={!!statModal}
        onClose={() => setStatModal(null)}
        title={statModalUsers.title}
        users={statModalUsers.users}
        emptyMessage={statModalUsers.emptyMessage}
        icon={statModalUsers.icon}
        headerColorClass={statModalUsers.headerColor}
      />
    </AdminLayout>
  );
}
