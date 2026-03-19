'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, BarChart2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import {
  Message,
  MessageType,
  MessagePriority,
  MessageTargetAudience,
  MESSAGE_TYPE_LABELS,
  PRIORITY_LABELS,
  MESSAGE_TARGET_LABELS,
} from '@/types';
import { formatDateTime, getPriorityColor } from '@/lib/utils';

interface MessageAnalytics {
  messageId: string;
  totalUsers: number;
  confirmedCount: number;
  notConfirmedCount: number;
  confirmationRate: number;
  confirmedUsers: Array<{
    user: {
      id: string;
      fullName: string;
      militaryRole?: string;
      department?: { id: string; name: string };
    };
    confirmedAt: string;
  }>;
  notConfirmedUsers: Array<{
    id: string;
    fullName: string;
    militaryRole?: string;
    department?: { id: string; name: string };
  }>;
}

export default function AdminMessagesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'GENERAL' as MessageType,
    priority: 'MEDIUM' as MessagePriority,
    targetAudience: 'ALL' as MessageTargetAudience,
    requiresConfirmation: false,
  });
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [analyticsTab, setAnalyticsTab] = useState<'confirmed' | 'notConfirmed'>('confirmed');
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const response = await api.get('/admin/messages');
      return response.data;
    },
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<MessageAnalytics>({
    queryKey: ['message-analytics', selectedMessageId],
    queryFn: async () => {
      const response = await api.get(`/messages/${selectedMessageId}/analytics`);
      return response.data;
    },
    enabled: !!selectedMessageId && analyticsModalOpen,
  });

  const openAnalyticsModal = (messageId: string) => {
    setSelectedMessageId(messageId);
    setAnalyticsTab('confirmed');
    setAnalyticsModalOpen(true);
  };

  const closeAnalyticsModal = () => {
    setAnalyticsModalOpen(false);
    setSelectedMessageId(null);
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/admin/messages', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('ההודעה נוצרה בהצלחה');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    },
    onError: () => {
      toast.error('שגיאה ביצירת ההודעה');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.patch(`/admin/messages/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('ההודעה עודכנה בהצלחה');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון ההודעה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/messages/${id}`);
    },
    onSuccess: () => {
      toast.success('ההודעה נמחקה');
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    },
    onError: () => {
      toast.error('שגיאה במחיקת ההודעה');
    },
  });

  const openModal = (message?: Message) => {
    if (message) {
      setEditingMessage(message);
      setFormData({
        title: message.title,
        content: message.content,
        type: message.type,
        priority: message.priority,
        targetAudience: message.targetAudience || 'ALL',
        requiresConfirmation: message.requiresConfirmation || false,
      });
    } else {
      setEditingMessage(null);
      setFormData({
        title: '',
        content: '',
        type: 'GENERAL',
        priority: 'MEDIUM',
        targetAudience: 'ALL',
        requiresConfirmation: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMessage(null);
    setFormData({
      title: '',
      content: '',
      type: 'GENERAL',
      priority: 'MEDIUM',
      targetAudience: 'ALL',
      requiresConfirmation: false,
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    if (editingMessage) {
      updateMutation.mutate({ id: editingMessage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const typeOptions = Object.entries(MESSAGE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const targetAudienceOptions = Object.entries(MESSAGE_TARGET_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-military-100 rounded-xl flex items-center justify-center">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-military-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-military-700">ניהול הודעות</h1>
            <p className="text-sm text-gray-500 hidden sm:block">צפה וערוך הודעות מערכת</p>
          </div>
        </div>
        <Button onClick={() => openModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 ml-2" />
          הוסף הודעה
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="text-right px-4 py-3.5 text-sm font-semibold text-gray-700">
                      כותרת
                    </th>
                    <th className="text-right px-4 py-3.5 text-sm font-semibold text-gray-700 hidden md:table-cell">
                      סוג
                    </th>
                    <th className="text-right px-4 py-3.5 text-sm font-semibold text-gray-700 hidden sm:table-cell">
                      עדיפות
                    </th>
                    <th className="text-right px-4 py-3.5 text-sm font-semibold text-gray-700 hidden lg:table-cell">
                      קהל יעד
                    </th>
                    <th className="text-right px-4 py-3.5 text-sm font-semibold text-gray-700 hidden md:table-cell">
                      אישורים
                    </th>
                    <th className="text-right px-4 py-3.5 text-sm font-semibold text-gray-700 hidden lg:table-cell">
                      תאריך
                    </th>
                    <th className="text-right px-4 py-3.5 text-sm font-semibold text-gray-700">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {messages.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900">{message.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {message.content}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                          <Badge variant="info" className="text-xs">
                            {MESSAGE_TYPE_LABELS[message.type]}
                          </Badge>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(message.priority)}`}
                          >
                            {PRIORITY_LABELS[message.priority]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <Badge variant="info">
                          {MESSAGE_TYPE_LABELS[message.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            message.priority
                          )}`}
                        >
                          {PRIORITY_LABELS[message.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div className="flex flex-col gap-1">
                          <Badge variant={message.targetAudience === 'ALL' ? 'default' : 'warning'}>
                            {MESSAGE_TARGET_LABELS[message.targetAudience] || 'כולם'}
                          </Badge>
                          {message.requiresConfirmation && (
                            <span className="text-xs text-orange-600 font-medium">דורש אישור</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <button
                          onClick={() => openAnalyticsModal(message.id)}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <BarChart2 className="w-4 h-4" />
                          <span className="hover:underline">צפה באישורים</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                        {formatDateTime(message.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openAnalyticsModal(message.id)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
                            title="צפה באישורים"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal(message)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="ערוך"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('האם למחוק את ההודעה?')) {
                                deleteMutation.mutate(message.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="מחק"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">אין הודעות</p>
              <Button onClick={() => openModal()} variant="secondary" size="sm">
                <Plus className="w-4 h-4 ml-1" />
                הוסף הודעה ראשונה
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingMessage ? 'עריכת הודעה' : 'הוספת הודעה'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="כותרת"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div>
            <label className="label">תוכן</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input min-h-[120px] resize-none"
              rows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="סוג"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as MessageType })
              }
              options={typeOptions}
            />

            <Select
              label="עדיפות"
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as MessagePriority,
                })
              }
              options={priorityOptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="קהל יעד"
              value={formData.targetAudience}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  targetAudience: e.target.value as MessageTargetAudience,
                })
              }
              options={targetAudienceOptions}
            />

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="requiresConfirmation"
                checked={formData.requiresConfirmation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    requiresConfirmation: e.target.checked,
                  })
                }
                className="w-4 h-4 text-military-600 border-gray-300 rounded focus:ring-military-500"
              />
              <label htmlFor="requiresConfirmation" className="text-sm text-gray-700">
                דורש אישור קריאה
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {editingMessage ? 'עדכן' : 'צור הודעה'}
            </Button>
            <Button variant="secondary" onClick={closeModal}>
              ביטול
            </Button>
          </div>
        </div>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        isOpen={analyticsModalOpen}
        onClose={closeAnalyticsModal}
        title="סטטיסטיקת אישורי קריאה"
        size="lg"
      >
        {isLoadingAnalytics ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : analytics ? (
          <div className="space-y-5">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.totalUsers}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">סה״כ משתמשים</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-green-700">{analytics.confirmedCount}</p>
                <p className="text-xs sm:text-sm text-green-600 mt-1">אישרו קריאה</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-red-700">{analytics.notConfirmedCount}</p>
                <p className="text-xs sm:text-sm text-red-600 mt-1">לא אישרו</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-l from-green-400 to-green-500 h-full transition-all duration-500"
                style={{ width: `${analytics.confirmationRate}%` }}
              />
            </div>
            <p className="text-center text-sm font-medium text-gray-600">
              {analytics.confirmationRate}% אישרו קריאה
            </p>

            {/* Tab Buttons */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setAnalyticsTab('confirmed')}
                className={`flex-1 py-2.5 text-center rounded-lg transition-all duration-200 text-sm font-medium ${
                  analyticsTab === 'confirmed'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckCircle className="w-4 h-4 inline ml-1" />
                אישרו ({analytics.confirmedCount})
              </button>
              <button
                onClick={() => setAnalyticsTab('notConfirmed')}
                className={`flex-1 py-2.5 text-center rounded-lg transition-all duration-200 text-sm font-medium ${
                  analyticsTab === 'notConfirmed'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <XCircle className="w-4 h-4 inline ml-1" />
                לא אישרו ({analytics.notConfirmedCount})
              </button>
            </div>

            {/* Users List */}
            <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100">
              {analyticsTab === 'confirmed' ? (
                analytics.confirmedUsers.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {analytics.confirmedUsers.map((confirmation) => (
                      <li key={confirmation.user.id} className="py-3 px-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="font-medium text-gray-900">{confirmation.user.fullName}</p>
                          <p className="text-sm text-gray-500">
                            {confirmation.user.department?.name || 'ללא מחלקה'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                          {formatDateTime(confirmation.confirmedAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-500 py-8">אין משתמשים שאישרו</p>
                )
              ) : (
                analytics.notConfirmedUsers.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {analytics.notConfirmedUsers.map((user) => (
                      <li key={user.id} className="py-3 px-4 hover:bg-gray-50 transition-colors">
                        <p className="font-medium text-gray-900">{user.fullName}</p>
                        <p className="text-sm text-gray-500">
                          {user.department?.name || 'ללא מחלקה'}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-500 py-8">כל המשתמשים אישרו</p>
                )
              )}
            </div>

            <Button variant="secondary" onClick={closeAnalyticsModal} className="w-full">
              סגור
            </Button>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-12">לא נמצאו נתונים</p>
        )}
      </Modal>
    </AdminLayout>
  );
}
