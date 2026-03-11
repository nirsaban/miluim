'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Check,
  X,
  Trash2,
  Edit2,
  ClipboardList,
  Calendar,
  User,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import {
  ServiceAdminChecklist,
  ServiceChecklistCategory,
  SERVICE_CHECKLIST_CATEGORY_LABELS,
} from '@/types';

export default function AdminChecklistPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceAdminChecklist | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ServiceChecklistCategory>('GENERAL');

  const { data: items, isLoading } = useQuery<ServiceAdminChecklist[]>({
    queryKey: ['current-service-checklist'],
    queryFn: async () => {
      const response = await api.get('/service-checklist/current');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/service-checklist/current', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-service-checklist'] });
      toast.success('פריט נוסף בהצלחה');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בהוספת פריט');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/service-checklist/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-service-checklist'] });
      toast.success('פריט עודכן בהצלחה');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בעדכון פריט');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await api.patch(`/service-checklist/${id}/complete`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-service-checklist'] });
      toast.success('פריט סומן כהושלם');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בסימון פריט');
    },
  });

  const incompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/service-checklist/${id}/incomplete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-service-checklist'] });
      toast.success('פריט בוטל');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בביטול פריט');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/service-checklist/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-service-checklist'] });
      toast.success('פריט נמחק');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה במחיקת פריט');
    },
  });

  const createDefaultsMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get('/service-cycles/current');
      if (!response.data?.id) throw new Error('אין סבב פעיל');
      const result = await api.post(`/service-checklist/cycle/${response.data.id}/defaults`);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['current-service-checklist'] });
      toast.success(`נוצרו ${data.created} פריטים ברירת מחדל`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה ביצירת פריטים');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('GENERAL');
    setShowForm(false);
    setEditingItem(null);
  };

  const startEditing = (item: ServiceAdminChecklist) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setCategory(item.category);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title,
      description: description || undefined,
      category,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Group items by category
  const groupedItems: Record<ServiceChecklistCategory, ServiceAdminChecklist[]> = {
    STAFF: [],
    VEHICLES: [],
    LOGISTICS: [],
    HOTEL: [],
    WEAPONS: [],
    GENERAL: [],
  };

  items?.forEach((item) => {
    if (groupedItems[item.category]) {
      groupedItems[item.category].push(item);
    }
  });

  const getCategoryIcon = (cat: ServiceChecklistCategory) => {
    const icons: Record<ServiceChecklistCategory, string> = {
      STAFF: '👥',
      VEHICLES: '🚗',
      LOGISTICS: '📦',
      HOTEL: '🏨',
      WEAPONS: '🔫',
      GENERAL: '📋',
    };
    return icons[cat];
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <Link href="/admin/current-service" className="hover:text-military-600">
            דשבורד סבב
          </Link>
          <ChevronLeft className="w-4 h-4" />
          <span>צ׳קליסט</span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-military-700">צ׳קליסט סגל</h1>
            <p className="text-gray-600">ניהול משימות קליטה ולוגיסטיקה</p>
          </div>
          <div className="flex gap-2">
            {(!items || items.length === 0) && (
              <Button
                variant="secondary"
                onClick={() => createDefaultsMutation.mutate()}
                isLoading={createDefaultsMutation.isPending}
              >
                צור פריטים ברירת מחדל
              </Button>
            )}
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              פריט חדש
            </Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>{editingItem ? 'עריכת פריט' : 'הוספת פריט חדש'}</CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="כותרת"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="שם המשימה"
                  required
                />
                <Select
                  label="קטגוריה"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceChecklistCategory)}
                  options={Object.entries(SERVICE_CHECKLIST_CATEGORY_LABELS).map(
                    ([value, label]) => ({
                      value,
                      label: `${getCategoryIcon(value as ServiceChecklistCategory)} ${label}`,
                    })
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תיאור המשימה..."
                  className="w-full p-3 border rounded-lg resize-none h-20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                >
                  {editingItem ? 'עדכן' : 'הוסף'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  ביטול
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Checklist by Category */}
      {Object.entries(groupedItems).map(([cat, categoryItems]) => {
        if (categoryItems.length === 0) return null;

        const completed = categoryItems.filter((i) => i.isCompleted).length;

        return (
          <Card key={cat} className="mb-4">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {getCategoryIcon(cat as ServiceChecklistCategory)}
                </span>
                <span>{SERVICE_CHECKLIST_CATEGORY_LABELS[cat as ServiceChecklistCategory]}</span>
              </div>
              <span className="text-sm text-gray-500">
                {completed}/{categoryItems.length} הושלמו
              </span>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      item.isCompleted
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() =>
                            item.isCompleted
                              ? incompleteMutation.mutate(item.id)
                              : completeMutation.mutate({ id: item.id })
                          }
                          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            item.isCompleted
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {item.isCompleted && <Check className="w-4 h-4" />}
                        </button>
                        <div className="flex-1">
                          <h3
                            className={`font-medium ${
                              item.isCompleted ? 'text-green-700 line-through' : 'text-gray-900'
                            }`}
                          >
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          {item.isCompleted && item.completedBy && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                              <User className="w-3 h-3" />
                              <span>הושלם ע״י {item.completedBy.fullName}</span>
                              <Calendar className="w-3 h-3 mr-2" />
                              <span>
                                {item.completedAt &&
                                  new Date(item.completedAt).toLocaleString('he-IL')}
                              </span>
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-sm text-gray-500 mt-1 italic">
                              הערות: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(item)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('האם למחוק את הפריט?')) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {(!items || items.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">אין פריטים בצ׳קליסט</h2>
            <p className="text-gray-500 mb-4">הוסף פריטים או צור ברירות מחדל</p>
            <div className="flex justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => createDefaultsMutation.mutate()}
                isLoading={createDefaultsMutation.isPending}
              >
                צור ברירות מחדל
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 ml-2" />
                פריט חדש
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
