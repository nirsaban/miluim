'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { LeaveCategory } from '@/types';

export default function AdminLeaveCategoriesPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', displayName: '', icon: '' });

  const { data: categories, isLoading } = useQuery<LeaveCategory[]>({
    queryKey: ['leave-categories-admin'],
    queryFn: async () => {
      const response = await api.get('/leave-categories/admin');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; displayName: string; icon?: string }) => {
      const response = await api.post('/leave-categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-categories-admin'] });
      toast.success('קטגוריה נוספה בהצלחה');
      setIsAdding(false);
      setFormData({ name: '', displayName: '', icon: '' });
    },
    onError: () => {
      toast.error('שגיאה בהוספת קטגוריה');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeaveCategory> }) => {
      const response = await api.patch(`/leave-categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-categories-admin'] });
      toast.success('קטגוריה עודכנה בהצלחה');
      setEditingId(null);
    },
    onError: () => {
      toast.error('שגיאה בעדכון קטגוריה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/leave-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-categories-admin'] });
      toast.success('קטגוריה הוסרה בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בהסרת קטגוריה');
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.displayName) {
      toast.error('נא למלא שם וכותרת');
      return;
    }
    createMutation.mutate({
      name: formData.name.toUpperCase(),
      displayName: formData.displayName,
      icon: formData.icon || undefined,
    });
  };

  const handleUpdate = (id: string) => {
    if (!formData.displayName) {
      toast.error('נא למלא כותרת');
      return;
    }
    updateMutation.mutate({
      id,
      data: {
        displayName: formData.displayName,
        icon: formData.icon || undefined,
      },
    });
  };

  const startEditing = (category: LeaveCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      displayName: category.displayName,
      icon: category.icon || '',
    });
  };

  const toggleActive = (category: LeaveCategory) => {
    updateMutation.mutate({
      id: category.id,
      data: { isActive: !category.isActive },
    });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול קטגוריות יציאה</h1>
        <p className="text-gray-600 mt-1">הוסף וערוך קטגוריות לבקשות יציאה קצרה</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>קטגוריות</span>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 ml-1" />
              קטגוריה חדשה
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-2">
              {isAdding && (
                <div className="flex items-center gap-2 p-3 bg-military-50 rounded-lg">
                  <Input
                    placeholder="שם מזהה (אנגלית)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="כותרת (עברית)"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="אייקון (אופציונלי)"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-32"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    isLoading={createMutation.isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setIsAdding(false);
                      setFormData({ name: '', displayName: '', icon: '' });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {categories?.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    category.isActive ? 'bg-white border' : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  {editingId === category.id ? (
                    <>
                      <span className="text-sm text-gray-500 w-24">{category.name}</span>
                      <Input
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        placeholder="אייקון"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="w-32"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(category.id)}
                        isLoading={updateMutation.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({ name: '', displayName: '', icon: '' });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-500 w-24">{category.name}</span>
                      <span className="flex-1 font-medium">{category.displayName}</span>
                      {category.icon && (
                        <span className="text-sm text-gray-400">{category.icon}</span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          category.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {category.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                      <button
                        onClick={() => startEditing(category)}
                        className="p-1 text-gray-500 hover:text-military-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(category)}
                        className={`p-1 ${
                          category.isActive
                            ? 'text-gray-500 hover:text-red-600'
                            : 'text-gray-500 hover:text-green-600'
                        }`}
                        title={category.isActive ? 'הסתר קטגוריה' : 'הפעל קטגוריה'}
                      >
                        {category.isActive ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))}

              {categories?.length === 0 && !isAdding && (
                <p className="text-center text-gray-500 py-4">אין קטגוריות</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
