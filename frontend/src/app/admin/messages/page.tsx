'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
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
  MESSAGE_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/types';
import { formatDateTime, getPriorityColor } from '@/lib/utils';

export default function AdminMessagesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'GENERAL' as MessageType,
    priority: 'MEDIUM' as MessagePriority,
  });
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const response = await api.get('/admin/messages');
      return response.data;
    },
  });

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
      });
    } else {
      setEditingMessage(null);
      setFormData({
        title: '',
        content: '',
        type: 'GENERAL',
        priority: 'MEDIUM',
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

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול הודעות</h1>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף הודעה
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      כותרת
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      סוג
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      עדיפות
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      תאריך
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr key={message.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{message.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {message.content}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">
                          {MESSAGE_TYPE_LABELS[message.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(
                            message.priority
                          )}`}
                        >
                          {PRIORITY_LABELS[message.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDateTime(message.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(message)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('האם למחוק את ההודעה?')) {
                                deleteMutation.mutate(message.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
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
            <p className="text-center text-gray-500 py-8">אין הודעות</p>
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
    </AdminLayout>
  );
}
