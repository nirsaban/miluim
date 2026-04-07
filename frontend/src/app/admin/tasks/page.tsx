'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Plus, Edit2, Trash2, Check, X, ChevronDown, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { Zone, Task, Skill, TaskRequirement } from '@/types';

interface RequirementInput {
  skillId: string;
  quantity: number;
}

interface ChecklistItemInput {
  id?: string;
  label: string;
  description?: string;
  externalLink?: string;
  isRequired: boolean;
  sortOrder: number;
  isActive?: boolean;
}

export default function AdminTasksPage() {
  const searchParams = useSearchParams();
  const initialZoneId = searchParams.get('zone') || '';

  const queryClient = useQueryClient();
  const [selectedZoneId, setSelectedZoneId] = useState(initialZoneId);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRequirementsId, setEditingRequirementsId] = useState<string | null>(null);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', zoneId: '', requiredPeopleCount: 1 });
  const [requirements, setRequirements] = useState<RequirementInput[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemInput[]>([]);

  useEffect(() => {
    if (initialZoneId) {
      setSelectedZoneId(initialZoneId);
    }
  }, [initialZoneId]);

  const { data: zones } = useQuery<Zone[]>({
    queryKey: ['zones'],
    queryFn: async () => {
      const response = await api.get('/zones');
      return response.data;
    },
  });

  const { data: skills } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: async () => {
      const response = await api.get('/skills');
      return response.data;
    },
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks-admin'],
    queryFn: async () => {
      const response = await api.get('/tasks/admin');
      return response.data;
    },
  });

  const filteredTasks = selectedZoneId
    ? tasks?.filter((t) => t.zoneId === selectedZoneId)
    : tasks;

  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string; 
      zoneId: string; 
      requiredPeopleCount?: number; 
      requirements?: RequirementInput[];
      checklistItems?: ChecklistItemInput[];
    }) => {
      const response = await api.post('/tasks', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-admin'] });
      queryClient.invalidateQueries({ queryKey: ['zones-admin'] });
      toast.success('משימה נוספה בהצלחה');
      setIsAdding(false);
      setFormData({ name: '', description: '', zoneId: '', requiredPeopleCount: 1 });
      setRequirements([]);
      setChecklistItems([]);
    },
    onError: () => {
      toast.error('שגיאה בהוספת משימה');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> & { checklistItems?: ChecklistItemInput[] } }) => {
      const response = await api.patch(`/tasks/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-admin'] });
      toast.success('משימה עודכנה בהצלחה');
      setEditingId(null);
      setEditingChecklistId(null);
    },
    onError: () => {
      toast.error('שגיאה בעדכון משימה');
    },
  });

  const updateRequirementsMutation = useMutation({
    mutationFn: async ({ id, requirements }: { id: string; requirements: RequirementInput[] }) => {
      const response = await api.put(`/tasks/${id}/requirements`, { requirements });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-admin'] });
      toast.success('דרישות עודכנו בהצלחה');
      setEditingRequirementsId(null);
      setRequirements([]);
    },
    onError: () => {
      toast.error('שגיאה בעדכון דרישות');
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.zoneId) {
      toast.error('נא למלא שם ואזור');
      return;
    }
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      zoneId: formData.zoneId,
      requiredPeopleCount: formData.requiredPeopleCount || 1,
      requirements: requirements.filter((r) => r.skillId && r.quantity > 0),
      checklistItems: checklistItems.filter(item => item.label),
    });
  };

  const handleUpdate = (id: string) => {
    if (!formData.name) {
      toast.error('נא למלא שם משימה');
      return;
    }
    updateMutation.mutate({
      id,
      data: {
        name: formData.name,
        description: formData.description || undefined,
        requiredPeopleCount: formData.requiredPeopleCount,
      },
    });
  };

  const handleUpdateChecklist = (id: string) => {
    updateMutation.mutate({
      id,
      data: {
        checklistItems: checklistItems.filter(item => item.label),
      },
    });
  };

  const handleUpdateRequirements = (id: string) => {
    updateRequirementsMutation.mutate({
      id,
      requirements: requirements.filter((r) => r.skillId && r.quantity > 0),
    });
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setFormData({
      name: task.name,
      description: task.description || '',
      zoneId: task.zoneId,
      requiredPeopleCount: task.requiredPeopleCount || 1,
    });
  };

  const startEditingRequirements = (task: Task) => {
    setEditingRequirementsId(task.id);
    setRequirements(
      task.requirements?.map((r) => ({
        skillId: r.skillId,
        quantity: r.quantity,
      })) || []
    );
  };

  const startEditingChecklist = (task: Task) => {
    setEditingChecklistId(task.id);
    setChecklistItems(
      (task as any).checklistItems?.map((item: any) => ({
        id: item.id,
        label: item.label,
        description: item.description || '',
        externalLink: item.externalLink || '',
        isRequired: item.isRequired,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      })) || []
    );
  };

  const toggleActive = (task: Task) => {
    updateMutation.mutate({
      id: task.id,
      data: { isActive: !task.isActive },
    });
  };

  const addRequirement = () => {
    setRequirements([...requirements, { skillId: '', quantity: 1 }]);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, field: keyof RequirementInput, value: string | number) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const addChecklistItem = () => {
    setChecklistItems([...checklistItems, { label: '', description: '', isRequired: true, sortOrder: checklistItems.length }]);
  };

  const removeChecklistItem = (index: number) => {
    const item = checklistItems[index];
    if (item.id) {
      const updated = [...checklistItems];
      updated[index] = { ...item, isActive: false };
      setChecklistItems(updated);
    } else {
      setChecklistItems(checklistItems.filter((_, i) => i !== index));
    }
  };

  const updateChecklistItem = (index: number, field: keyof ChecklistItemInput, value: any) => {
    const updated = [...checklistItems];
    updated[index] = { ...updated[index], [field]: value };
    setChecklistItems(updated);
  };

  const getSkillName = (skillId: string) => {
    return skills?.find((s) => s.id === skillId)?.displayName || skillId;
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול משימות</h1>
        <p className="text-gray-600 mt-1">הוסף וערוך משימות לאזורים מבצעיים</p>
      </div>

      <div className="mb-4">
        <Select
          value={selectedZoneId}
          onChange={(e) => setSelectedZoneId(e.target.value)}
          options={[
            { value: '', label: 'כל האזורים' },
            ...(zones?.map((zone) => ({ value: zone.id, label: zone.name })) || []),
          ]}
          className="w-64"
        />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>משימות</span>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 ml-1" />
              משימה חדשה
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-3">
              {isAdding && (
                <div className="p-4 bg-military-50 rounded-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <Select
                      value={formData.zoneId}
                      onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                      options={[
                        { value: '', label: 'בחר אזור' },
                        ...(zones?.map((zone) => ({ value: zone.id, label: zone.name })) || []),
                      ]}
                      className="w-48"
                    />
                    <Input
                      placeholder="שם המשימה"
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
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600 whitespace-nowrap">מס׳ אנשים:</span>
                      <Input
                        type="number"
                        min="1"
                        value={formData.requiredPeopleCount}
                        onChange={(e) => setFormData({ ...formData, requiredPeopleCount: parseInt(e.target.value) || 1 })}
                        className="w-16"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-md p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold">דרישות כוח אדם</span>
                        <Button size="xs" variant="secondary" onClick={addRequirement}>
                          <Plus className="w-3 h-3 ml-1" />
                          הוסף
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {requirements.map((req, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Select
                              value={req.skillId}
                              onChange={(e) => updateRequirement(index, 'skillId', e.target.value)}
                              options={[
                                { value: '', label: 'בחר כישור' },
                                ...(skills?.map((skill) => ({ value: skill.id, label: skill.displayName })) || []),
                              ]}
                              className="flex-1 h-8 text-sm"
                            />
                            <Input
                              type="number"
                              min="1"
                              value={req.quantity}
                              onChange={(e) => updateRequirement(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-sm"
                            />
                            <button onClick={() => removeRequirement(index)} className="text-red-500"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border rounded-md p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold">צ׳קליסט תחילת משמרת</span>
                        <Button size="xs" variant="secondary" onClick={addChecklistItem}>
                          <Plus className="w-3 h-3 ml-1" />
                          הוסף
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {checklistItems.map((item, index) => (
                          <div key={index} className="flex flex-col gap-1 p-2 border rounded bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="שם הסעיף"
                                value={item.label}
                                onChange={(e) => updateChecklistItem(index, 'label', e.target.value)}
                                className="flex-1 h-8 text-sm"
                              />
                              <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                                <input
                                  type="checkbox"
                                  checked={item.isRequired}
                                  onChange={(e) => updateChecklistItem(index, 'isRequired', e.target.checked)}
                                />
                                חובה
                              </label>
                              <button onClick={() => removeChecklistItem(index)} className="text-red-500"><X className="w-4 h-4" /></button>
                            </div>
                            <Input
                              placeholder="תיאור / עזרה"
                              value={item.description}
                              onChange={(e) => updateChecklistItem(index, 'description', e.target.value)}
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder="קישור חיצוני (אופציונלי)"
                              value={item.externalLink}
                              onChange={(e) => updateChecklistItem(index, 'externalLink', e.target.value)}
                              className="h-7 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setIsAdding(false);
                        setFormData({ name: '', description: '', zoneId: '', requiredPeopleCount: 1 });
                        setRequirements([]);
                        setChecklistItems([]);
                      }}
                    >
                      ביטול
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreate}
                      isLoading={createMutation.isPending}
                    >
                      הוסף משימה
                    </Button>
                  </div>
                </div>
              )}

              {filteredTasks?.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg ${
                    task.isActive ? 'bg-white border' : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  {editingId === task.id ? (
                    <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">אנשים:</span>
                        <Input
                          type="number"
                          min="1"
                          value={formData.requiredPeopleCount}
                          onChange={(e) => setFormData({ ...formData, requiredPeopleCount: parseInt(e.target.value) || 1 })}
                          className="w-16"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(task.id)}
                        isLoading={updateMutation.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({ name: '', description: '', zoneId: '', requiredPeopleCount: 1 });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : editingRequirementsId === task.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{task.name} - עריכת דרישות</span>
                        <Button size="sm" variant="secondary" onClick={addRequirement}>
                          <Plus className="w-3 h-3 ml-1" />
                          הוסף
                        </Button>
                      </div>
                      {requirements.map((req, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={req.skillId}
                            onChange={(e) => updateRequirement(index, 'skillId', e.target.value)}
                            options={[
                              { value: '', label: 'בחר כישור' },
                              ...(skills?.map((skill) => ({ value: skill.id, label: skill.displayName })) || []),
                            ]}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            min="1"
                            value={req.quantity}
                            onChange={(e) => updateRequirement(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                          <button
                            onClick={() => removeRequirement(index)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingRequirementsId(null);
                            setRequirements([]);
                          }}
                        >
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRequirements(task.id)}
                          isLoading={updateRequirementsMutation.isPending}
                        >
                          שמור דרישות
                        </Button>
                      </div>
                    </div>
                  ) : editingChecklistId === task.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{task.name} - עריכת צ׳קליסט</span>
                        <Button size="sm" variant="secondary" onClick={addChecklistItem}>
                          <Plus className="w-3 h-3 ml-1" />
                          הוסף
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {checklistItems.filter(item => item.isActive !== false).map((item, index) => (
                          <div key={index} className="flex flex-col gap-1 p-2 border rounded bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="שם הסעיף"
                                value={item.label}
                                onChange={(e) => updateChecklistItem(index, 'label', e.target.value)}
                                className="flex-1 h-8 text-sm"
                              />
                              <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                                <input
                                  type="checkbox"
                                  checked={item.isRequired}
                                  onChange={(e) => updateChecklistItem(index, 'isRequired', e.target.checked)}
                                />
                                חובה
                              </label>
                              <button onClick={() => removeChecklistItem(index)} className="text-red-500"><X className="w-4 h-4" /></button>
                            </div>
                            <Input
                              placeholder="תיאור / עזרה"
                              value={item.description}
                              onChange={(e) => updateChecklistItem(index, 'description', e.target.value)}
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder="קישור חיצוני (אופציונלי)"
                              value={item.externalLink}
                              onChange={(e) => updateChecklistItem(index, 'externalLink', e.target.value)}
                              className="h-7 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingChecklistId(null);
                            setChecklistItems([]);
                          }}
                        >
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateChecklist(task.id)}
                          isLoading={updateMutation.isPending}
                        >
                          שמור צ׳קליסט
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {task.zone?.name}
                          </span>
                          <span className="text-xs text-military-600 bg-military-100 px-2 py-0.5 rounded">
                            {task.requiredPeopleCount || 1} אנשים
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {task.requirements && task.requirements.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.requirements.map((req) => (
                                <span
                                  key={req.id}
                                  className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
                                >
                                  {req.quantity}× {req.skill?.displayName || getSkillName(req.skillId)}
                                </span>
                              ))}
                            </div>
                          )}
                          {(task as any).checklistItems && (task as any).checklistItems.length > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                              {(task as any).checklistItems.length} סעיפי צ׳קליסט
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          task.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {task.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                      <button
                        onClick={() => startEditingChecklist(task)}
                        className="p-1 text-gray-500 hover:text-purple-600"
                        title="ערוך צ׳קליסט"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEditingRequirements(task)}
                        className="p-1 text-gray-500 hover:text-military-600"
                        title="ערוך דרישות"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEditing(task)}
                        className="p-1 text-gray-500 hover:text-military-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(task)}
                        className={`p-1 ${
                          task.isActive
                            ? 'text-gray-500 hover:text-red-600'
                            : 'text-gray-500 hover:text-green-600'
                        }`}
                        title={task.isActive ? 'הסתר משימה' : 'הפעל משימה'}
                      >
                        {task.isActive ? (
                          <Trash2 className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredTasks?.length === 0 && !isAdding && (
                <p className="text-center text-gray-500 py-4">
                  {selectedZoneId ? 'אין משימות באזור זה' : 'אין משימות'}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
