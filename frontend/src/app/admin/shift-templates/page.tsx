'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Clock, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { ShiftTemplate } from '@/types';

interface ShiftTemplateForm {
  name: string;
  displayName: string;
  startTime: string;
  endTime: string;
  color: string;
  sortOrder: number;
}

const defaultForm: ShiftTemplateForm = {
  name: '',
  displayName: '',
  startTime: '06:00',
  endTime: '14:00',
  color: '#FCD34D',
  sortOrder: 0,
};

const colorOptions = [
  { value: '#FCD34D', label: 'צהוב' },
  { value: '#F97316', label: 'כתום' },
  { value: '#6366F1', label: 'סגול' },
  { value: '#10B981', label: 'ירוק' },
  { value: '#EF4444', label: 'אדום' },
  { value: '#3B82F6', label: 'כחול' },
];

export default function ShiftTemplatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShiftTemplateForm>(defaultForm);

  const { data: templates, isLoading } = useQuery<ShiftTemplate[]>({
    queryKey: ['shift-templates-admin'],
    queryFn: async () => {
      const response = await api.get('/shift-templates/admin');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ShiftTemplateForm) => {
      const response = await api.post('/shift-templates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates-admin'] });
      toast.success('משמרת נוצרה בהצלחה');
      resetForm();
    },
    onError: () => {
      toast.error('שגיאה ביצירת משמרת');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ShiftTemplateForm> }) => {
      const response = await api.patch(`/shift-templates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates-admin'] });
      toast.success('משמרת עודכנה בהצלחה');
      resetForm();
    },
    onError: () => {
      toast.error('שגיאה בעדכון משמרת');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/shift-templates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-templates-admin'] });
      toast.success('משמרת הוסרה בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בהסרת משמרת');
    },
  });

  const resetForm = () => {
    setForm(defaultForm);
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (template: ShiftTemplate) => {
    setForm({
      name: template.name,
      displayName: template.displayName,
      startTime: template.startTime,
      endTime: template.endTime,
      color: template.color || '#FCD34D',
      sortOrder: template.sortOrder,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.displayName) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-military-700">ניהול משמרות</h1>
          <p className="text-gray-600 mt-1">הגדר את סוגי המשמרות (בוקר, ערב, לילה)</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף משמרת
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <span>{editingId ? 'עריכת משמרת' : 'משמרת חדשה'}</span>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="מזהה (באנגלית)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
                  placeholder="MORNING"
                  disabled={!!editingId}
                />
                <Input
                  label="שם תצוגה"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="בוקר"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="שעת התחלה"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
                <Input
                  label="שעת סיום"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
                <Input
                  label="סדר תצוגה"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">צבע</label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: color.value })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        form.color === color.value
                          ? 'border-military-600 ring-2 ring-military-300'
                          : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  ביטול
                </Button>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? 'עדכן' : 'צור'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <span>משמרות מוגדרות</span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : templates?.length === 0 ? (
            <p className="text-center text-gray-500 py-8">אין משמרות מוגדרות</p>
          ) : (
            <div className="space-y-3">
              {templates?.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    template.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-12 rounded"
                      style={{ backgroundColor: template.color || '#CBD5E1' }}
                    />
                    <div>
                      <div className="font-medium text-lg">{template.displayName}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span dir="ltr">
                          {template.startTime} - {template.endTime}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {template.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!template.isActive && (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                        לא פעיל
                      </span>
                    )}
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-gray-500 hover:text-military-600 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('האם למחוק משמרת זו?')) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
