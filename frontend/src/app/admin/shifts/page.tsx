'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Upload, Calendar } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { ShiftPost, ShiftType, SHIFT_TYPE_LABELS } from '@/types';
import { formatDate } from '@/lib/utils';

export default function AdminShiftsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftPost | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    shiftType: 'GUARD' as ShiftType,
    message: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: shifts, isLoading } = useQuery<ShiftPost[]>({
    queryKey: ['admin-shifts'],
    queryFn: async () => {
      const response = await api.get('/admin/shifts');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.post('/admin/shifts', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('סידור המשמרות נוצר בהצלחה');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin-shifts'] });
    },
    onError: () => {
      toast.error('שגיאה ביצירת סידור המשמרות');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const response = await api.patch(`/admin/shifts/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('סידור המשמרות עודכן בהצלחה');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin-shifts'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון סידור המשמרות');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/shifts/${id}`);
    },
    onSuccess: () => {
      toast.success('סידור המשמרות נמחק');
      queryClient.invalidateQueries({ queryKey: ['admin-shifts'] });
    },
    onError: () => {
      toast.error('שגיאה במחיקת סידור המשמרות');
    },
  });

  const openModal = (shift?: ShiftPost) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        date: shift.date.split('T')[0],
        shiftType: shift.shiftType,
        message: shift.message || '',
      });
    } else {
      setEditingShift(null);
      setFormData({
        date: '',
        shiftType: 'GUARD',
        message: '',
      });
    }
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
    setFormData({
      date: '',
      shiftType: 'GUARD',
      message: '',
    });
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!formData.date || !formData.shiftType) {
      toast.error('נא למלא תאריך וסוג משמרת');
      return;
    }

    const data = new FormData();
    data.append('date', formData.date);
    data.append('shiftType', formData.shiftType);
    if (formData.message) {
      data.append('message', formData.message);
    }
    if (selectedFile) {
      data.append('image', selectedFile);
    }

    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const shiftTypeOptions = Object.entries(SHIFT_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול סידור משמרות</h1>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף סידור
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : shifts && shifts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="border rounded-lg overflow-hidden bg-white"
                >
                  {shift.imageUrl && (
                    <div className="relative h-40 bg-gray-200">
                      <Image
                        src={shift.imageUrl}
                        alt="סידור משמרות"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{formatDate(shift.date)}</span>
                      </div>
                      <Badge variant="info">{SHIFT_TYPE_LABELS[shift.shiftType]}</Badge>
                    </div>
                    {shift.message && (
                      <p className="text-sm text-gray-600 mt-2">{shift.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      נוצר ע"י: {shift.createdBy.fullName}
                    </p>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <button
                        onClick={() => openModal(shift)}
                        className="flex-1 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4 inline ml-1" />
                        עריכה
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('האם למחוק את סידור המשמרות?')) {
                            deleteMutation.mutate(shift.id);
                          }
                        }}
                        className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 inline ml-1" />
                        מחיקה
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">אין סידורי משמרות</p>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingShift ? 'עריכת סידור משמרות' : 'הוספת סידור משמרות'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="תאריך"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />

          <Select
            label="סוג משמרת"
            value={formData.shiftType}
            onChange={(e) =>
              setFormData({ ...formData, shiftType: e.target.value as ShiftType })
            }
            options={shiftTypeOptions}
            required
          />

          <div>
            <label className="label">הודעה (אופציונלי)</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="input min-h-[80px] resize-none"
              rows={3}
              placeholder="הודעה נוספת..."
            />
          </div>

          <div>
            <label className="label">תמונת סידור (אופציונלי)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-military-500 transition-colors"
            >
              {selectedFile ? (
                <div className="relative h-32 w-full">
                  <Image
                    src={URL.createObjectURL(selectedFile)}
                    alt="תצוגה מקדימה"
                    fill
                    className="object-contain rounded"
                  />
                </div>
              ) : editingShift?.imageUrl ? (
                <div className="relative h-32 w-full">
                  <Image
                    src={editingShift.imageUrl}
                    alt="סידור נוכחי"
                    fill
                    className="object-contain rounded"
                    unoptimized
                  />
                  <p className="text-xs text-gray-400 mt-2">לחץ להחלפה</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">לחץ לבחירת תמונה</p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {editingShift ? 'עדכן' : 'צור סידור'}
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
