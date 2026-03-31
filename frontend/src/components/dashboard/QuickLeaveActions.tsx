'use client';

import { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FileText, Home, LogOut, Clock, CheckCircle, AlertCircle, CornerDownLeft, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import {
  getIsraelDateTimeLocalRounded,
  getIsraelDateTimeLocalRoundedPlusHours,
  dateTimeLocalToISO,
} from '@/lib/timezone';
import { formatDateTime, cn } from '@/lib/utils';
import { LeaveCategory, LeaveType, LEAVE_TYPE_LABELS, LeaveStatus } from '@/types';

interface LeaveRequest {
  id: string;
  type: LeaveType;
  status: LeaveStatus;
  category?: { displayName: string };
  reason?: string;
  exitTime: string;
  expectedReturn: string;
  actualReturn?: string;
  createdAt: string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bgColor: string; label: string }> = {
  PENDING: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200', label: 'ממתין לאישור' },
  APPROVED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', label: 'מאושר' },
  ACTIVE: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', label: 'ביציאה' },
  OVERDUE: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'באיחור' },
};

interface QuickLeaveActionsProps {
  className?: string;
}

export function QuickLeaveActions({ className }: QuickLeaveActionsProps) {
  const queryClient = useQueryClient();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('SHORT');
  const [categoryId, setCategoryId] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [reason, setReason] = useState('');

  const { data: categories } = useQuery<LeaveCategory[]>({
    queryKey: ['leave-categories'],
    queryFn: async () => {
      const response = await api.get('/leave-categories');
      return response.data;
    },
  });

  // Fetch user's leave requests
  const { data: leaveRequests, isLoading: leaveLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leave-requests'],
    queryFn: async () => {
      const response = await api.get('/leave-requests/my');
      return response.data;
    },
  });

  // Filter for pending and active requests
  const activeRequests = leaveRequests?.filter(
    (r) => ['PENDING', 'APPROVED', 'ACTIVE', 'OVERDUE'].includes(r.status)
  ) || [];

  const leaveRequestMutation = useMutation({
    mutationFn: async (data: {
      type: LeaveType;
      categoryId?: string;
      reason?: string;
      exitTime: string;
      expectedReturn: string;
    }) => {
      const response = await api.post('/leave-requests', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('בקשת היציאה נשלחה בהצלחה');
      resetLeaveForm();
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'שגיאה בשליחת הבקשה';
      toast.error(message);
    },
  });

  const confirmReturnMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/leave-requests/my/${id}/return`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('החזרה אושרה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'שגיאה באישור החזרה';
      toast.error(message);
    },
  });

  const resetLeaveForm = () => {
    setShowLeaveModal(false);
    setLeaveType('SHORT');
    setCategoryId('');
    setExitTime('');
    setExpectedReturn('');
    setReason('');
  };

  const openLeaveModal = (type: LeaveType) => {
    setLeaveType(type);
    setExitTime(getIsraelDateTimeLocalRounded());
    setExpectedReturn(getIsraelDateTimeLocalRoundedPlusHours(2));
    setShowLeaveModal(true);
  };

  const handleSubmitLeave = () => {
    if (!exitTime || !expectedReturn) {
      toast.error('נא למלא זמן יציאה וזמן חזרה צפוי');
      return;
    }
    if (leaveType === 'SHORT' && !categoryId) {
      toast.error('נא לבחור קטגוריה');
      return;
    }
    if (expectedReturn <= exitTime) {
      toast.error('זמן החזרה חייב להיות אחרי זמן היציאה');
      return;
    }
    leaveRequestMutation.mutate({
      type: leaveType,
      categoryId: leaveType === 'SHORT' ? categoryId : undefined,
      reason: reason || undefined,
      exitTime: dateTimeLocalToISO(exitTime),
      expectedReturn: dateTimeLocalToISO(expectedReturn),
    });
  };

  const categoryOptions = categories?.map((cat) => ({
    value: cat.id,
    label: cat.displayName,
  })) || [];

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-military-600" />
            <span>בקשות יציאה</span>
            {activeRequests.length > 0 && (
              <span className="bg-military-100 text-military-700 text-xs px-2 py-0.5 rounded-full">
                {activeRequests.length}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/requests"
            className="text-sm text-military-600 hover:text-military-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-military-100 transition-colors"
          >
            כל הבקשות
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => openLeaveModal('SHORT')}
              className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-center hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              <LogOut className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <span className="font-medium text-sm text-blue-700">יציאה קצרה</span>
            </button>
            <button
              onClick={() => openLeaveModal('HOME')}
              className="p-3 bg-green-50 border-2 border-green-200 rounded-xl text-center hover:bg-green-100 hover:border-green-300 transition-colors"
            >
              <Home className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <span className="font-medium text-sm text-green-700">יציאה הביתה</span>
            </button>
          </div>

          {/* Active Requests List */}
          {leaveLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : activeRequests.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium mb-2">בקשות פעילות</p>
              {activeRequests.map((request) => {
                const config = statusConfig[request.status] || statusConfig.PENDING;
                const StatusIcon = config.icon;
                const canConfirmReturn = ['APPROVED', 'ACTIVE'].includes(request.status);

                return (
                  <div
                    key={request.id}
                    className={cn(
                      "p-3 rounded-xl border",
                      config.bgColor
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
                          <span className="font-medium text-sm text-gray-900">
                            {LEAVE_TYPE_LABELS[request.type]}
                            {request.category && ` - ${request.category.displayName}`}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatDateTime(request.exitTime)} - {formatDateTime(request.expectedReturn)}
                        </div>
                        <div className={cn("text-xs mt-1 font-medium", config.color)}>
                          {config.label}
                        </div>
                      </div>
                      {canConfirmReturn && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (confirm('האם אתה בטוח שחזרת?')) {
                              confirmReturnMutation.mutate(request.id);
                            }
                          }}
                          isLoading={confirmReturnMutation.isPending}
                          className="text-green-600 hover:bg-green-100 flex-shrink-0"
                        >
                          <CornerDownLeft className="w-4 h-4 ml-1" />
                          חזרתי
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Leave Request Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={resetLeaveForm}
        title={LEAVE_TYPE_LABELS[leaveType]}
        size="md"
      >
        <div className="space-y-4">
          {leaveType === 'SHORT' && (
            <Select
              label="קטגוריה"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[{ value: '', label: 'בחר קטגוריה...' }, ...categoryOptions]}
              required
            />
          )}
          <div>
            <label className="label">זמן יציאה</label>
            <input
              type="datetime-local"
              value={exitTime}
              onChange={(e) => setExitTime(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">זמן חזרה צפוי</label>
            <input
              type="datetime-local"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">סיבה (אופציונלי)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="פרטים נוספים..."
              className="input min-h-[80px] resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmitLeave}
              isLoading={leaveRequestMutation.isPending}
              className="flex-1"
            >
              <Clock className="w-4 h-4 ml-2" />
              שלח בקשה
            </Button>
            <Button variant="secondary" onClick={resetLeaveForm}>
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
