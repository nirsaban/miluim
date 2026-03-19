'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Send, Clock, Home, LogOut, CheckCircle, XCircle, AlertCircle, CornerDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDateTime, cn } from '@/lib/utils';
import { FormType, FORM_TYPE_LABELS, LeaveCategory, LeaveType, LEAVE_TYPE_LABELS, LeaveStatus } from '@/types';

interface LeaveRequest {
  id: string;
  type: LeaveType;
  status: LeaveStatus;
  category?: { displayName: string };
  reason?: string;
  exitTime: string;
  expectedReturn: string;
  actualReturn?: string;
  approvedBy?: { fullName: string };
  createdAt: string;
}

interface FormSubmission {
  id: string;
  type: FormType;
  content: Record<string, any>;
  status: string;
  createdAt: string;
}

const regularFormTypes: FormType[] = [
  'EQUIPMENT_SHORTAGE',
  'IMPROVEMENT_SUGGESTION',
  'RESTAURANT_RECOMMENDATION',
];

const statusConfig: Record<LeaveStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  PENDING: { icon: AlertCircle, color: 'text-yellow-500', label: 'ממתין' },
  APPROVED: { icon: CheckCircle, color: 'text-green-500', label: 'מאושר' },
  REJECTED: { icon: XCircle, color: 'text-red-500', label: 'נדחה' },
  ACTIVE: { icon: CheckCircle, color: 'text-blue-500', label: 'פעיל' },
  RETURNED: { icon: CheckCircle, color: 'text-gray-500', label: 'חזר' },
  OVERDUE: { icon: AlertCircle, color: 'text-red-500', label: 'באיחור' },
};

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [formContent, setFormContent] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('SHORT');
  const [categoryId, setCategoryId] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [reason, setReason] = useState('');

  const { data: leaveRequests, isLoading: leaveLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leave-requests'],
    queryFn: async () => {
      const response = await api.get('/leave-requests/my');
      return response.data;
    },
  });

  const { data: categories } = useQuery<LeaveCategory[]>({
    queryKey: ['leave-categories'],
    queryFn: async () => {
      const response = await api.get('/leave-categories');
      return response.data;
    },
  });

  const submitFormMutation = useMutation({
    mutationFn: async (data: { type: FormType; content: Record<string, any> }) => {
      const response = await api.post('/forms', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('הטופס נשלח בהצלחה');
      setSelectedForm(null);
      setFormContent('');
    },
    onError: () => {
      toast.error('שגיאה בשליחת הטופס');
    },
  });

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

  const getDefaultExitTime = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    return now.toISOString().slice(0, 16);
  };

  const getDefaultReturnTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 2);
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    return now.toISOString().slice(0, 16);
  };

  const openLeaveModal = (type: LeaveType) => {
    setLeaveType(type);
    setExitTime(getDefaultExitTime());
    setExpectedReturn(getDefaultReturnTime());
    setShowLeaveModal(true);
  };

  const handleSubmitForm = () => {
    if (!selectedForm || !formContent.trim()) {
      toast.error('נא למלא את כל השדות');
      return;
    }
    submitFormMutation.mutate({
      type: selectedForm,
      content: { text: formContent },
    });
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
    const exitDate = new Date(exitTime);
    const returnDate = new Date(expectedReturn);
    if (returnDate <= exitDate) {
      toast.error('זמן החזרה חייב להיות אחרי זמן היציאה');
      return;
    }
    leaveRequestMutation.mutate({
      type: leaveType,
      categoryId: leaveType === 'SHORT' ? categoryId : undefined,
      reason: reason || undefined,
      exitTime,
      expectedReturn,
    });
  };

  const categoryOptions = categories?.map((cat) => ({
    value: cat.id,
    label: cat.displayName,
  })) || [];

  return (
    <UserLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">טפסים ובקשות</h1>
        <p className="text-gray-600 mt-1">הגשת בקשות יציאה וטפסים</p>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-military-600" />
          <span>בקשות יציאה</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => openLeaveModal('SHORT')}
              className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-center hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              <LogOut className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <span className="font-medium text-blue-700">יציאה קצרה</span>
            </button>
            <button
              onClick={() => openLeaveModal('HOME')}
              className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center hover:bg-green-100 hover:border-green-300 transition-colors"
            >
              <Home className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <span className="font-medium text-green-700">יציאה הביתה</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Other Forms */}
      <Card className="mb-6">
        <CardHeader>טפסים נוספים</CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {regularFormTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedForm(type)}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-right hover:bg-military-50 hover:border-military-300 transition-colors"
              >
                <p className="font-medium text-sm">{FORM_TYPE_LABELS[type]}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Leave Requests */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          <span>הבקשות שלי</span>
        </CardHeader>
        <CardContent>
          {leaveLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : leaveRequests && leaveRequests.length > 0 ? (
            <div className="space-y-3">
              {leaveRequests.slice(0, 10).map((request) => {
                const StatusIcon = statusConfig[request.status]?.icon || AlertCircle;
                const statusColor = statusConfig[request.status]?.color || 'text-gray-500';
                const statusLabel = statusConfig[request.status]?.label || request.status;
                const canConfirmReturn = ['APPROVED', 'ACTIVE'].includes(request.status);

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {LEAVE_TYPE_LABELS[request.type]}
                        {request.category && ` - ${request.category.displayName}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(request.exitTime)} - {formatDateTime(request.expectedReturn)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                          className="text-green-600 hover:bg-green-50"
                        >
                          <CornerDownLeft className="w-4 h-4 ml-1" />
                          חזרתי
                        </Button>
                      )}
                      <div className={cn('flex items-center gap-1', statusColor)}>
                        <StatusIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">{statusLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">אין בקשות קודמות</p>
          )}
        </CardContent>
      </Card>

      {/* Regular Form Modal */}
      <Modal
        isOpen={!!selectedForm}
        onClose={() => {
          setSelectedForm(null);
          setFormContent('');
        }}
        title={selectedForm ? FORM_TYPE_LABELS[selectedForm] : ''}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">פרטי הבקשה</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="הזן את פרטי הבקשה..."
              className="input min-h-[120px] resize-none"
              rows={5}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmitForm}
              isLoading={submitFormMutation.isPending}
              className="flex-1"
            >
              <Send className="w-4 h-4 ml-2" />
              שלח בקשה
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedForm(null);
                setFormContent('');
              }}
            >
              ביטול
            </Button>
          </div>
        </div>
      </Modal>

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
    </UserLayout>
  );
}
