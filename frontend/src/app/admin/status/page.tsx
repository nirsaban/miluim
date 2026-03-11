'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { AttendanceCharts } from '@/components/charts/AttendanceCharts';
import api from '@/lib/api';
import {
  LeaveRequest,
  LeaveRequestDashboard,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
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

export default function AdminStatusPage() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('leaves');

  const { data: dashboard, isLoading, refetch } = useQuery<LeaveRequestDashboard>({
    queryKey: ['leave-dashboard'],
    queryFn: async () => {
      const response = await api.get('/leave-requests/dashboard');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
          <h1 className="text-2xl font-bold text-military-700">סטטוס חיילים - בזמן אמת</h1>
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <Users className="w-6 h-6 mx-auto text-military-600 mb-2" />
              <p className="text-sm text-gray-500">{dashboard.currentCycle ? 'הגיעו לסבב' : 'סה"כ חיילים'}</p>
              <p className="text-2xl font-bold text-gray-700">{dashboard.stats.totalSoldiers}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-4 text-center border-2 border-green-200">
              <LogIn className="w-6 h-6 mx-auto text-green-600 mb-2" />
              <p className="text-sm text-green-600">בבסיס</p>
              <p className="text-2xl font-bold text-green-700">{dashboard.stats.inBase}</p>
            </div>
            <div className={cn(
              "rounded-lg shadow p-4 text-center border-2",
              dashboard.stats.overdue > 0
                ? "bg-red-50 border-red-300"
                : "bg-gray-50 border-gray-200"
            )}>
              <AlertTriangle className={cn(
                "w-6 h-6 mx-auto mb-2",
                dashboard.stats.overdue > 0 ? "text-red-600" : "text-gray-400"
              )} />
              <p className={cn(
                "text-sm",
                dashboard.stats.overdue > 0 ? "text-red-600" : "text-gray-500"
              )}>באיחור</p>
              <p className={cn(
                "text-2xl font-bold",
                dashboard.stats.overdue > 0 ? "text-red-700" : "text-gray-400"
              )}>{dashboard.stats.overdue}</p>
            </div>
            <div className={cn(
              "rounded-lg shadow p-4 text-center border-2",
              dashboard.stats.pending > 0
                ? "bg-yellow-50 border-yellow-300"
                : "bg-gray-50 border-gray-200"
            )}>
              <Clock className={cn(
                "w-6 h-6 mx-auto mb-2",
                dashboard.stats.pending > 0 ? "text-yellow-600" : "text-gray-400"
              )} />
              <p className={cn(
                "text-sm",
                dashboard.stats.pending > 0 ? "text-yellow-600" : "text-gray-500"
              )}>ממתינים לאישור</p>
              <p className={cn(
                "text-2xl font-bold",
                dashboard.stats.pending > 0 ? "text-yellow-700" : "text-gray-400"
              )}>{dashboard.stats.pending}</p>
            </div>
          </div>

          {/* Category Breakdown - Who is OUT */}
          {dashboard.stats.outOfBase > 0 && (
            <div className="bg-blue-50 rounded-lg shadow p-4 mb-6 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <LogOut className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-blue-800">בחוץ ({dashboard.stats.outOfBase})</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {dashboard.categoryBreakdown.map((cat, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg",
                      cat.type === 'HOME' ? "bg-green-100" : "bg-white"
                    )}
                  >
                    <span className="text-2xl font-bold text-blue-700">{cat.count}</span>
                    <span className="text-sm text-gray-600">{cat.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Leaves - Soldiers currently OUT */}
            <Card>
              <CardHeader className="flex items-center gap-2 bg-blue-50">
                <LogOut className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">חיילים בחוץ כרגע ({dashboard.activeLeaves.length})</span>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
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
                          {leave.isOverdue && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">
                              באיחור!
                            </span>
                          )}
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
              <CardContent className="max-h-[400px] overflow-y-auto">
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
    </AdminLayout>
  );
}
