'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  RefreshCw,
  BarChart3,
  Calendar,
  Home,
  Shield,
  UserMinus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { StatUsersModal, StatUser } from '@/components/ui/StatUsersModal';
import { ClickableStatCard } from '@/components/ui/ClickableStatCard';
import { AttendanceCharts } from '@/components/charts/AttendanceCharts';
import { EmergencyAdminPanel } from '@/components/emergency';
import api from '@/lib/api';
import {
  LeaveRequest,
  LeaveRequestDashboard,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  ShiftAssignment,
} from '@/types';
import { cn, formatDate } from '@/lib/utils';

function TimeRemaining({ expectedReturn, isOverdue }: { expectedReturn: string; isOverdue: boolean }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const returnTime = new Date(expectedReturn);
      const diff = returnTime.getTime() - now.getTime();

      if (diff <= 0) {
        const overdueDiff = Math.abs(diff);
        const hours = Math.floor(overdueDiff / (1000 * 60 * 60));
        const minutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`איחור: ${hours}:${minutes.toString().padStart(2, '0')}`);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expectedReturn]);

  return (
    <span className={cn(
      'font-mono text-sm',
      isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'
    )}>
      {timeLeft}
    </span>
  );
}

type TabType = 'leaves' | 'attendance';

// Type for stat modal content
type StatModalType =
  | 'homeLeave'
  | 'shortLeave'
  | 'currentShift'
  | 'freeToday'
  | null;

// Extended shift assignment with soldier details
interface ShiftAssignmentWithSoldier {
  id: string;
  soldier: {
    id: string;
    fullName: string;
    phone: string;
    armyNumber: string;
  };
  shiftTemplate: {
    displayName: string;
    startTime: string;
    endTime: string;
  };
  task: {
    name: string;
    zone?: { name: string };
  };
  arrivedAt?: string;
}

// Today's shift overview data
interface TodayShiftOverview {
  total: number;
  confirmed: number;
  pending: number;
  arrived: number;
  currentShiftAssignments: ShiftAssignmentWithSoldier[];
  allTodayAssignments: ShiftAssignmentWithSoldier[];
}

// Service attendance with user details
interface ServiceAttendanceWithUser {
  id: string;
  userId: string;
  attendanceStatus: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    armyNumber: string;
    department?: { id: string; name: string } | null;
  };
}

export default function AdminStatusPage() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('leaves');
  const [statModal, setStatModal] = useState<StatModalType>(null);

  const { data: dashboard, isLoading, refetch } = useQuery<LeaveRequestDashboard>({
    queryKey: ['leave-dashboard'],
    queryFn: async () => {
      const response = await api.get('/leave-requests/dashboard');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch today's shift overview with soldier details
  const { data: shiftOverview } = useQuery<TodayShiftOverview>({
    queryKey: ['shift-overview-today-detailed'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/shift-assignments/date/${today}`);
      const assignments: ShiftAssignmentWithSoldier[] = response.data || [];

      // Get current time to determine current shift
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

      // Filter assignments for current shift (time-based)
      const currentShiftAssignments = assignments.filter((a: any) => {
        if (!a.shiftTemplate) return false;
        const startTime = a.shiftTemplate.startTime;
        const endTime = a.shiftTemplate.endTime;

        // Handle overnight shifts (e.g., 22:00 - 06:00)
        if (endTime < startTime) {
          return currentTimeStr >= startTime || currentTimeStr < endTime;
        }
        return currentTimeStr >= startTime && currentTimeStr < endTime;
      });

      // Calculate stats
      const stats: TodayShiftOverview = {
        total: assignments.length,
        confirmed: assignments.filter((a: any) => a.status === 'CONFIRMED').length,
        pending: assignments.filter((a: any) => a.status === 'PENDING').length,
        arrived: assignments.filter((a: any) => a.arrivedAt).length,
        currentShiftAssignments,
        allTodayAssignments: assignments,
      };
      return stats;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch all soldiers in the current service cycle (arrived)
  const { data: cycleAttendances } = useQuery<ServiceAttendanceWithUser[]>({
    queryKey: ['service-attendances-current'],
    queryFn: async () => {
      const response = await api.get('/service-attendance/current');
      return response.data || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Helper: Convert leave request to StatUser format
  const leaveToStatUser = (leave: LeaveRequest, additionalInfo?: string): StatUser => ({
    id: leave.soldier.id,
    fullName: leave.soldier.fullName,
    phone: leave.soldier.phone,
    armyNumber: leave.soldier.armyNumber,
    department: leave.soldier.department,
    additionalInfo,
  });

  // Helper: Convert shift assignment to StatUser format
  const shiftToStatUser = (assignment: ShiftAssignmentWithSoldier): StatUser => ({
    id: assignment.soldier.id,
    fullName: assignment.soldier.fullName,
    phone: assignment.soldier.phone,
    armyNumber: assignment.soldier.armyNumber,
    additionalInfo: `${assignment.shiftTemplate.displayName} - ${assignment.task.name}`,
  });

  // Helper: Convert service attendance to StatUser format
  const attendanceToStatUser = (attendance: ServiceAttendanceWithUser, additionalInfo?: string): StatUser => ({
    id: attendance.user.id,
    fullName: attendance.user.fullName,
    phone: attendance.user.phone,
    armyNumber: attendance.user.armyNumber,
    department: attendance.user.department,
    additionalInfo,
  });

  // Derive filtered lists for stat modals
  const homeLeaves = useMemo(() => {
    return dashboard?.activeLeaves.filter(l => l.type === 'HOME') || [];
  }, [dashboard?.activeLeaves]);

  const shortLeaves = useMemo(() => {
    return dashboard?.activeLeaves.filter(l => l.type === 'SHORT') || [];
  }, [dashboard?.activeLeaves]);

  // Soldiers in current shift
  const currentShiftSoldiers = useMemo(() => {
    return shiftOverview?.currentShiftAssignments || [];
  }, [shiftOverview?.currentShiftAssignments]);

  // Calculate soldiers "free today" - in base, no shift scheduled today
  const freeTodaySoldiers = useMemo((): StatUser[] => {
    if (!cycleAttendances || !dashboard || !shiftOverview) return [];

    // Get IDs of soldiers who are out (have active leave)
    const outSoldierIds = new Set(dashboard.activeLeaves.map(l => l.soldier.id));

    // Get IDs of soldiers who have shifts today
    const shiftSoldierIds = new Set(
      shiftOverview.allTodayAssignments.map(a => a.soldier.id)
    );

    // Filter: soldiers who arrived, are not on leave, and don't have a shift today
    const arrivedSoldiers = cycleAttendances.filter(
      a => a.attendanceStatus === 'ARRIVED' || a.attendanceStatus === 'LATE'
    );

    return arrivedSoldiers
      .filter(a => !outSoldierIds.has(a.userId) && !shiftSoldierIds.has(a.userId))
      .map(a => attendanceToStatUser(a, 'בבסיס ללא משמרת'));
  }, [cycleAttendances, dashboard, shiftOverview]);

  // Stat modal users derived from same data source as counts
  const statModalUsers = useMemo((): { users: StatUser[]; title: string; emptyMessage: string; icon: React.ReactNode; headerColor: string } => {
    if (!statModal) {
      return { users: [], title: '', emptyMessage: '', icon: null, headerColor: '' };
    }

    switch (statModal) {
      case 'homeLeave':
        return {
          users: homeLeaves.map(leave => leaveToStatUser(leave, 'יציאה הביתה')),
          title: 'מי בחופשה בבית',
          emptyMessage: 'אין חיילים ביציאה הביתה',
          icon: <Home className="w-5 h-5" />,
          headerColor: 'bg-green-50 text-green-800',
        };

      case 'shortLeave':
        return {
          users: shortLeaves.map(leave =>
            leaveToStatUser(leave, leave.category?.displayName || 'יציאה קצרה')
          ),
          title: 'יציאה קצרה פעילה',
          emptyMessage: 'אין חיילים ביציאה קצרה',
          icon: <LogOut className="w-5 h-5" />,
          headerColor: 'bg-blue-50 text-blue-800',
        };

      case 'currentShift':
        return {
          users: currentShiftSoldiers.map(shiftToStatUser),
          title: 'במשמרת כרגע',
          emptyMessage: 'אין חיילים במשמרת כרגע',
          icon: <Shield className="w-5 h-5" />,
          headerColor: 'bg-purple-50 text-purple-800',
        };

      case 'freeToday':
        return {
          users: freeTodaySoldiers,
          title: 'באוויר היום ללא משמרת',
          emptyMessage: 'אין חיילים ללא משמרת היום',
          icon: <UserMinus className="w-5 h-5" />,
          headerColor: 'bg-orange-50 text-orange-800',
        };

      default:
        return { users: [], title: '', emptyMessage: '', icon: null, headerColor: '' };
    }
  }, [statModal, homeLeaves, shortLeaves, currentShiftSoldiers, freeTodaySoldiers]);

  const approveMutation = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote?: string }) => {
      const response = await api.patch(`/leave-requests/${id}/approve`, { adminNote });
      return response.data;
    },
    onSuccess: () => {
      toast.success('הבקשה אושרה');
      queryClient.invalidateQueries({ queryKey: ['leave-dashboard'] });
      setSelectedRequest(null);
      setAdminNote('');
      setActionType(null);
    },
    onError: () => {
      toast.error('שגיאה באישור הבקשה');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote?: string }) => {
      const response = await api.patch(`/leave-requests/${id}/reject`, { adminNote });
      return response.data;
    },
    onSuccess: () => {
      toast.success('הבקשה נדחתה');
      queryClient.invalidateQueries({ queryKey: ['leave-dashboard'] });
      setSelectedRequest(null);
      setAdminNote('');
      setActionType(null);
    },
    onError: () => {
      toast.error('שגיאה בדחיית הבקשה');
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/leave-requests/${id}/return`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('החייל סומן כחזר לבסיס');
      queryClient.invalidateQueries({ queryKey: ['leave-dashboard'] });
    },
    onError: () => {
      toast.error('שגיאה בסימון חזרה');
    },
  });

  const handleAction = () => {
    if (!selectedRequest || !actionType) return;
    if (actionType === 'approve') {
      approveMutation.mutate({ id: selectedRequest.id, adminNote });
    } else {
      rejectMutation.mutate({ id: selectedRequest.id, adminNote });
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-military-700">סטטוס מבצעי - בזמן אמת</h1>
          {dashboard?.currentCycle ? (
            <p className="text-gray-600 mt-1">
              סבב נוכחי: <span className="font-semibold text-military-600">{dashboard.currentCycle.name}</span>
            </p>
          ) : (
            <p className="text-orange-600 mt-1">אין סבב מילואים פעיל - מוצג מידע לכלל החיילים</p>
          )}
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 ml-1" />
          רענן
        </Button>
      </div>

      {/* Emergency Check-In Panel */}
      <EmergencyAdminPanel className="mb-6" />

      {/* Main Operational Stats - New Design */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {/* 1. Total soldiers active in current reserve cycle */}
        <div className="bg-gradient-to-br from-military-50 to-military-100 rounded-xl p-4 border border-military-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-military-600" />
            <span className="text-xs font-medium text-military-700">סה״כ בסבב</span>
          </div>
          <p className="text-3xl font-bold text-military-800">{dashboard?.stats.totalSoldiers || 0}</p>
          <p className="text-xs text-military-500 mt-1">חיילים פעילים</p>
        </div>

        {/* 2. מי בחופשה בבית - HOME leave, clickable */}
        <ClickableStatCard
          onClick={() => setStatModal('homeLeave')}
          disabled={homeLeaves.length === 0}
        >
          <div className={cn(
            "rounded-xl p-4 border shadow-sm h-full",
            homeLeaves.length > 0
              ? "bg-gradient-to-br from-green-50 to-green-100 border-green-300"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Home className={cn("w-5 h-5", homeLeaves.length > 0 ? "text-green-600" : "text-gray-400")} />
              <span className={cn("text-xs font-medium", homeLeaves.length > 0 ? "text-green-700" : "text-gray-500")}>בחופשה בבית</span>
            </div>
            <p className={cn("text-3xl font-bold", homeLeaves.length > 0 ? "text-green-700" : "text-gray-400")}>
              {homeLeaves.length}
            </p>
            {homeLeaves.length > 0 && (
              <p className="text-xs text-green-600 mt-1">לחץ לצפייה</p>
            )}
          </div>
        </ClickableStatCard>

        {/* 3. Short active leave - clickable */}
        <ClickableStatCard
          onClick={() => setStatModal('shortLeave')}
          disabled={shortLeaves.length === 0}
        >
          <div className={cn(
            "rounded-xl p-4 border shadow-sm h-full",
            shortLeaves.length > 0
              ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <LogOut className={cn("w-5 h-5", shortLeaves.length > 0 ? "text-blue-600" : "text-gray-400")} />
              <span className={cn("text-xs font-medium", shortLeaves.length > 0 ? "text-blue-700" : "text-gray-500")}>יציאה קצרה</span>
            </div>
            <p className={cn("text-3xl font-bold", shortLeaves.length > 0 ? "text-blue-700" : "text-gray-400")}>
              {shortLeaves.length}
            </p>
            {shortLeaves.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">לחץ לצפייה</p>
            )}
          </div>
        </ClickableStatCard>

        {/* 4. Soldiers in current active shift now - clickable */}
        <ClickableStatCard
          onClick={() => setStatModal('currentShift')}
          disabled={currentShiftSoldiers.length === 0}
        >
          <div className={cn(
            "rounded-xl p-4 border shadow-sm h-full",
            currentShiftSoldiers.length > 0
              ? "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className={cn("w-5 h-5", currentShiftSoldiers.length > 0 ? "text-purple-600" : "text-gray-400")} />
              <span className={cn("text-xs font-medium", currentShiftSoldiers.length > 0 ? "text-purple-700" : "text-gray-500")}>במשמרת כרגע</span>
            </div>
            <p className={cn("text-3xl font-bold", currentShiftSoldiers.length > 0 ? "text-purple-700" : "text-gray-400")}>
              {currentShiftSoldiers.length}
            </p>
            {currentShiftSoldiers.length > 0 && (
              <p className="text-xs text-purple-600 mt-1">לחץ לצפייה</p>
            )}
          </div>
        </ClickableStatCard>

        {/* 5. In base without shift today - clickable */}
        <ClickableStatCard
          onClick={() => setStatModal('freeToday')}
          disabled={freeTodaySoldiers.length === 0}
        >
          <div className={cn(
            "rounded-xl p-4 border shadow-sm h-full",
            freeTodaySoldiers.length > 0
              ? "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <UserMinus className={cn("w-5 h-5", freeTodaySoldiers.length > 0 ? "text-orange-600" : "text-gray-400")} />
              <span className={cn("text-xs font-medium", freeTodaySoldiers.length > 0 ? "text-orange-700" : "text-gray-500")}>באוויר ללא משמרת</span>
            </div>
            <p className={cn("text-3xl font-bold", freeTodaySoldiers.length > 0 ? "text-orange-700" : "text-gray-400")}>
              {freeTodaySoldiers.length}
            </p>
            {freeTodaySoldiers.length > 0 && (
              <p className="text-xs text-orange-600 mt-1">לחץ לצפייה</p>
            )}
          </div>
        </ClickableStatCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('leaves')}
          className={cn(
            'px-4 py-2 font-medium text-sm border-b-2 transition-colors -mb-px',
            activeTab === 'leaves'
              ? 'border-military-600 text-military-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            יציאות וחזרות
          </div>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'px-4 py-2 font-medium text-sm border-b-2 transition-colors -mb-px',
            activeTab === 'attendance'
              ? 'border-military-600 text-military-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            סטטיסטיקת נוכחות
          </div>
        </button>
      </div>

      {activeTab === 'attendance' ? (
        <AttendanceCharts />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : dashboard ? (
        <>
          {/* Direct request lists - no summary cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Leaves - Soldiers currently OUT */}
            <Card>
              <CardHeader className="flex items-center gap-2 bg-blue-50">
                <LogOut className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">חיילים בחוץ כרגע ({dashboard.activeLeaves.length})</span>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                {dashboard.activeLeaves.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">כל החיילים בבסיס</p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.activeLeaves.map((leave) => (
                      <div
                        key={leave.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          leave.isOverdue
                            ? "bg-red-50 border-red-300"
                            : "bg-white border-gray-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold">{leave.soldier.fullName}</span>
                            <span className="text-sm text-gray-500 mr-2">
                              ({leave.soldier.armyNumber})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {leave.isOverdue && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">
                                באיחור!
                              </span>
                            )}
                            <span className={cn(
                              "px-2 py-1 text-xs rounded-full",
                              leave.type === 'HOME' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {LEAVE_TYPE_LABELS[leave.type]}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          <div>
                            <span className="text-gray-500">סוג: </span>
                            <span className="font-medium">
                              {LEAVE_TYPE_LABELS[leave.type]}
                              {leave.category && ` - ${leave.category.displayName}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">טלפון: </span>
                            <a href={`tel:${leave.soldier.phone}`} className="text-military-600 hover:underline">
                              {leave.soldier.phone}
                            </a>
                          </div>
                          <div>
                            <span className="text-gray-500">יצא: </span>
                            <span>{formatTime(leave.exitTime)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">חזרה צפויה: </span>
                            <span>{formatTime(leave.expectedReturn)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <TimeRemaining
                              expectedReturn={leave.expectedReturn}
                              isOverdue={leave.isOverdue || false}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => returnMutation.mutate(leave.id)}
                            isLoading={returnMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            סמן חזרה
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Requests */}
            <Card>
              <CardHeader className="flex items-center gap-2 bg-yellow-50">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800">בקשות ממתינות ({dashboard.pendingRequests.length})</span>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                {dashboard.pendingRequests.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">אין בקשות ממתינות</p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-3 rounded-lg bg-white border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold">{request.soldier.fullName}</span>
                            <span className="text-sm text-gray-500 mr-2">
                              ({request.soldier.armyNumber})
                            </span>
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            {LEAVE_TYPE_LABELS[request.type]}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                          {request.category && (
                            <div className="col-span-2">
                              <span className="text-gray-500">קטגוריה: </span>
                              <span className="font-medium">{request.category.displayName}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">יציאה: </span>
                            <span>{formatDateTime(request.exitTime)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">חזרה: </span>
                            <span>{formatDateTime(request.expectedReturn)}</span>
                          </div>
                          {request.reason && (
                            <div className="col-span-2">
                              <span className="text-gray-500">סיבה: </span>
                              <span>{request.reason}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('approve');
                            }}
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            אשר
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('reject');
                            }}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            דחה
                          </Button>
                          <a
                            href={`tel:${request.soldier.phone}`}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-military-600 hover:bg-military-50 rounded transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            התקשר
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {/* Action Modal */}
      <Modal
        isOpen={!!selectedRequest && !!actionType}
        onClose={() => {
          setSelectedRequest(null);
          setAdminNote('');
          setActionType(null);
        }}
        title={actionType === 'approve' ? 'אישור בקשה' : 'דחיית בקשה'}
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-bold text-lg">{selectedRequest.soldier.fullName}</p>
              <p className="text-gray-600">{LEAVE_TYPE_LABELS[selectedRequest.type]}</p>
              {selectedRequest.category && (
                <p className="text-sm text-gray-500">קטגוריה: {selectedRequest.category.displayName}</p>
              )}
              <div className="mt-2 text-sm">
                <p>יציאה: {formatDateTime(selectedRequest.exitTime)}</p>
                <p>חזרה צפויה: {formatDateTime(selectedRequest.expectedReturn)}</p>
              </div>
              {selectedRequest.reason && (
                <p className="mt-2 text-sm text-gray-600">סיבה: {selectedRequest.reason}</p>
              )}
            </div>

            <div>
              <label className="label">הערה (אופציונלי)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="input min-h-[80px] resize-none"
                rows={3}
                placeholder="הוסף הערה..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAction}
                isLoading={approveMutation.isPending || rejectMutation.isPending}
                variant={actionType === 'reject' ? 'danger' : 'primary'}
                className="flex-1"
              >
                {actionType === 'approve' ? 'אשר בקשה' : 'דחה בקשה'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedRequest(null);
                  setAdminNote('');
                  setActionType(null);
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
