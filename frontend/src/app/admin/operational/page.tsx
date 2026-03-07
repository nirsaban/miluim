'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { OperationalLink } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function AdminOperationalPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<OperationalLink | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
  });
  const queryClient = useQueryClient();

  const { data: links, isLoading } = useQuery<OperationalLink[]>({
    queryKey: ['admin-operational-links'],
    queryFn: async () => {
      const response = await api.get('/operational-links');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/operational-links', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('הקישור נוצר בהצלחה');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin-operational-links'] });
    },
    onError: () => {
      toast.error('שגיאה ביצירת הקישור');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.patch(`/operational-links/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('הקישור עודכן בהצלחה');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin-operational-links'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון הקישור');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/operational-links/${id}`);
    },
    onSuccess: () => {
      toast.success('הקישור נמחק');
      queryClient.invalidateQueries({ queryKey: ['admin-operational-links'] });
    },
    onError: () => {
      toast.error('שגיאה במחיקת הקישור');
    },
  });

  const openModal = (link?: OperationalLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        title: link.title,
        description: link.description || '',
        url: link.url,
      });
    } else {
      setEditingLink(null);
      setFormData({
        title: '',
        description: '',
        url: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLink(null);
    setFormData({
      title: '',
      description: '',
      url: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.url) {
      toast.error('נא למלא כותרת וקישור');
      return;
    }

    if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      toast.error('נא להזין קישור תקין (מתחיל ב-http:// או https://)');
      return;
    }

    if (editingLink) {
      updateMutation.mutate({ id: editingLink.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול קישורים מבצעיים</h1>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף קישור
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : links && links.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      כותרת
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      תיאור
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      קישור
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      נוצר על ידי
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
                  {links.map((link) => (
                    <tr key={link.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{link.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {link.description || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <span className="truncate max-w-xs text-sm" dir="ltr">
                            {link.url}
                          </span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {link.createdBy.fullName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDateTime(link.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(link)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('האם למחוק את הקישור?')) {
                                deleteMutation.mutate(link.id);
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
            <p className="text-center text-gray-500 py-8">אין קישורים מבצעיים</p>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingLink ? 'עריכת קישור' : 'הוספת קישור'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="כותרת"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="לדוגמה: דוח ציוד ורכב"
            required
          />

          <Input
            label="תיאור (אופציונלי)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="תיאור קצר של הקישור"
          />

          <Input
            label="קישור"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://forms.google.com/..."
            required
            dir="ltr"
          />

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {editingLink ? 'עדכן' : 'צור קישור'}
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
