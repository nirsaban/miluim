'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Check, X, Users, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { Skill } from '@/types';

export default function AdminSkillsPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', displayName: '' });

  const { data: skills, isLoading } = useQuery<Skill[]>({
    queryKey: ['skills-admin'],
    queryFn: async () => {
      const response = await api.get('/skills/admin');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; displayName: string }) => {
      const response = await api.post('/skills', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills-admin'] });
      toast.success('כישור נוסף בהצלחה');
      setIsAdding(false);
      setFormData({ name: '', displayName: '' });
    },
    onError: () => {
      toast.error('שגיאה בהוספת כישור');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Skill> }) => {
      const response = await api.patch(`/skills/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills-admin'] });
      toast.success('כישור עודכן בהצלחה');
      setEditingId(null);
    },
    onError: () => {
      toast.error('שגיאה בעדכון כישור');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/skills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills-admin'] });
      toast.success('כישור הוסר בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בהסרת כישור');
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
      },
    });
  };

  const startEditing = (skill: Skill) => {
    setEditingId(skill.id);
    setFormData({
      name: skill.name,
      displayName: skill.displayName,
    });
  };

  const toggleActive = (skill: Skill) => {
    updateMutation.mutate({
      id: skill.id,
      data: { isActive: !skill.isActive },
    });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול כישורים</h1>
        <p className="text-gray-600 mt-1">הוסף וערוך כישורים לחיילים ומשימות</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>כישורים</span>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 ml-1" />
              כישור חדש
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
                      setFormData({ name: '', displayName: '' });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {skills?.map((skill) => (
                <div
                  key={skill.id}
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    skill.isActive ? 'bg-white border' : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  {editingId === skill.id ? (
                    <>
                      <span className="text-sm text-gray-500 w-28">{skill.name}</span>
                      <Input
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(skill.id)}
                        isLoading={updateMutation.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({ name: '', displayName: '' });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-500 w-28">{skill.name}</span>
                      <span className="flex-1 font-medium">{skill.displayName}</span>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1" title="חיילים עם כישור זה">
                          <Users className="w-4 h-4" />
                          {skill._count?.soldiers || 0}
                        </span>
                        <span className="flex items-center gap-1" title="משימות הדורשות כישור זה">
                          <ClipboardList className="w-4 h-4" />
                          {skill._count?.taskRequirements || 0}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          skill.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {skill.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                      <button
                        onClick={() => startEditing(skill)}
                        className="p-1 text-gray-500 hover:text-military-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(skill)}
                        className={`p-1 ${
                          skill.isActive
                            ? 'text-gray-500 hover:text-red-600'
                            : 'text-gray-500 hover:text-green-600'
                        }`}
                        title={skill.isActive ? 'הסתר כישור' : 'הפעל כישור'}
                      >
                        {skill.isActive ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))}

              {skills?.length === 0 && !isAdding && (
                <p className="text-center text-gray-500 py-4">אין כישורים</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
