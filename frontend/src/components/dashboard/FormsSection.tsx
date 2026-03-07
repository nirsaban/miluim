'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Send, Clock, Home, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import api from '@/lib/api';
import { FormType, FORM_TYPE_LABELS, LeaveCategory, LeaveType, LEAVE_TYPE_LABELS } from '@/types';

// Regular forms (not leave requests)
const regularFormTypes: FormType[] = [
  'EQUIPMENT_SHORTAGE',
  'IMPROVEMENT_SUGGESTION',
  'RESTAURANT_RECOMMENDATION',
];

export function FormsSection() {
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [formContent, setFormContent] = useState('');

  // Leave request state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('SHORT');
  const [categoryId, setCategoryId] = useState('');
  const [exitTime, setExitTime] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [reason, setReason] = useState('');

  const queryClient = useQueryClient();

  // Fetch leave categories
  const { data: categories } = useQuery<LeaveCategory[]>({
    queryKey: ['leave-categories'],
    queryFn: async () => {
      const response = await api.get('/leave-categories');
      return response.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { type: FormType; content: Record<string, any> }) => {
      const response = await api.post('/forms', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('הטופס נשלח בהצלחה');
      setSelectedForm(null);
      setFormContent('');
      queryClient.invalidateQueries({ queryKey: ['my-forms'] });
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

  const resetLeaveForm = () => {
    setShowLeaveModal(false);
    setLeaveType('SHORT');
    setCategoryId('');
    setExitTime('');
    setExpectedReturn('');
    setReason('');
  };

  const handleSubmitForm = () => {
    if (!selectedForm || !formContent.trim()) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    submitMutation.mutate({
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

  // Get default datetime values (current time + 1 hour for exit, + 3 hours for return)
  const getDefaultExitTime = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15); // Round to next 15 min
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

  const categoryOptions = categories?.map((cat) => ({
    value: cat.id,
    label: cat.displayName,
  })) || [];

  return (
    <>
      <Card>
        <CardHeader className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          <span>טפסים ובקשות</span>
        </CardHeader>
        <CardContent>
          {/* Leave Request Buttons */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">בקשות יציאה</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => openLeaveModal('SHORT')}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-right hover:bg-blue-100 hover:border-blue-300 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-sm">יציאה קצרה</span>
              </button>
              <button
                onClick={() => openLeaveModal('HOME')}
                className="p-3 bg-green-50 border border-green-200 rounded-lg text-right hover:bg-green-100 hover:border-green-300 transition-colors flex items-center gap-2"
              >
                <Home className="w-5 h-5 text-green-600" />
                <span className="font-medium text-sm">יציאה הביתה</span>
              </button>
            </div>
          </div>

          {/* Regular Forms */}
          <div>
            <p className="text-sm text-gray-500 mb-2">טפסים נוספים</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>
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
              isLoading={submitMutation.isPending}
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
    </>
  );
}
