'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Check, X, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { Zone } from '@/types';

export default function AdminZonesPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const { data: zones, isLoading } = useQuery<Zone[]>({
    queryKey: ['zones-admin'],
    queryFn: async () => {
      const response = await api.get('/zones/admin');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.post('/zones', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-admin'] });
      toast.success('אזור נוסף בהצלחה');
      setIsAdding(false);
      setFormData({ name: '', description: '' });
    },
    onError: () => {
      toast.error('שגיאה בהוספת אזור');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Zone> }) => {
      const response = await api.patch(`/zones/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-admin'] });
      toast.success('אזור עודכן בהצלחה');
      setEditingId(null);
    },
    onError: () => {
      toast.error('שגיאה בעדכון אזור');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-admin'] });
      toast.success('אזור הוסר בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בהסרת אזור');
    },
  });

  const handleCreate = () => {
    if (!formData.name) {
      toast.error('נא למלא שם אזור');
      return;
    }
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
    });
  };

  const handleUpdate = (id: string) => {
    if (!formData.name) {
      toast.error('נא למלא שם אזור');
      return;
    }
    updateMutation.mutate({
      id,
      data: {
        name: formData.name,
        description: formData.description || undefined,
      },
    });
  };

  const startEditing = (zone: Zone) => {
    setEditingId(zone.id);
    setFormData({
      name: zone.name,
      description: zone.description || '',
    });
  };

  const toggleActive = (zone: Zone) => {
    updateMutation.mutate({
      id: zone.id,
      data: { isActive: !zone.isActive },
    });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול אזורים</h1>
        <p className="text-gray-600 mt-1">הוסף וערוך אזורים מבצעיים</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>אזורים</span>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 ml-1" />
              אזור חדש
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
                    placeholder="שם האזור"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="תיאור (אופציונלי)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="flex-1"
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
                      setFormData({ name: '', description: '' });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {zones?.map((zone) => (
                <div
                  key={zone.id}
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    zone.isActive ? 'bg-white border' : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  {editingId === zone.id ? (
                    <>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        placeholder="תיאור"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(zone.id)}
                        isLoading={updateMutation.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({ name: '', description: '' });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium flex-1">{zone.name}</span>
                      {zone.description && (
                        <span className="text-sm text-gray-500 flex-1">{zone.description}</span>
                      )}
                      <Link
                        href={`/admin/tasks?zone=${zone.id}`}
                        className="flex items-center gap-1 text-sm text-military-600 hover:text-military-700"
                      >
                        <ClipboardList className="w-4 h-4" />
                        {zone._count?.tasks || 0} משימות
                      </Link>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          zone.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {zone.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                      <button
                        onClick={() => startEditing(zone)}
                        className="p-1 text-gray-500 hover:text-military-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(zone)}
                        className={`p-1 ${
                          zone.isActive
                            ? 'text-gray-500 hover:text-red-600'
                            : 'text-gray-500 hover:text-green-600'
                        }`}
                        title={zone.isActive ? 'הסתר אזור' : 'הפעל אזור'}
                      >
                        {zone.isActive ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))}

              {zones?.length === 0 && !isAdding && (
                <p className="text-center text-gray-500 py-4">אין אזורים</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
