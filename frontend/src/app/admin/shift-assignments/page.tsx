'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { ChevronRight, ChevronLeft, Calendar, Users, AlertTriangle, Check, Send, FileText, X, StickyNote, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { SoldierCard } from '@/components/shifts/SoldierCard';
import { TaskDropZone } from '@/components/shifts/TaskDropZone';
import api from '@/lib/api';
import { ShiftTemplate, ShiftAssignment, Zone, Task, AvailableSoldier, ScheduleStatus, PublishResult } from '@/types';

// Edit Assignment Modal Component
interface EditAssignmentModalProps {
  assignment: ShiftAssignment;
  tasks: Task[];
  shiftTemplates: ShiftTemplate[];
  onClose: () => void;
  onUpdate: (data: { notes?: string }) => void;
  onMove: (taskId: string, shiftTemplateId?: string) => void;
  onDelete: () => void;
  isLoading: boolean;
}

function EditAssignmentModal({
  assignment,
  tasks,
  shiftTemplates,
  onClose,
  onUpdate,
  onMove,
  onDelete,
  isLoading,
}: EditAssignmentModalProps) {
  const [notes, setNotes] = useState(assignment.notes || '');
  const [newTaskId, setNewTaskId] = useState(assignment.taskId);
  const [newShiftTemplateId, setNewShiftTemplateId] = useState(assignment.shiftTemplateId);

  const handleSave = () => {
    // Update notes if changed
    if (notes !== (assignment.notes || '')) {
      onUpdate({ notes });
    }
    // Move if task or shift changed
    if (newTaskId !== assignment.taskId || newShiftTemplateId !== assignment.shiftTemplateId) {
      onMove(newTaskId, newShiftTemplateId !== assignment.shiftTemplateId ? newShiftTemplateId : undefined);
    } else if (notes !== (assignment.notes || '')) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">עריכת שיבוץ</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Soldier info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium">{assignment.soldier.fullName}</p>
            <p className="text-sm text-gray-500">{assignment.soldier.armyNumber}</p>
          </div>

          {/* Task select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">משימה</label>
            <Select
              value={newTaskId}
              onChange={(e) => setNewTaskId(e.target.value)}
              options={tasks.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>

          {/* Shift select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">משמרת</label>
            <Select
              value={newShiftTemplateId}
              onChange={(e) => setNewShiftTemplateId(e.target.value)}
              options={shiftTemplates.map((s) => ({ value: s.id, label: s.displayName }))}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <StickyNote className="w-4 h-4 inline ml-1" />
              הערות
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערה לשיבוץ..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm('האם למחוק את השיבוץ?')) {
                onDelete();
              }
            }}
            className="text-red-600 hover:bg-red-50"
          >
            מחק שיבוץ
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              ביטול
            </Button>
            <Button onClick={handleSave} isLoading={isLoading}>
              שמור
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShiftAssignmentsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedZoneId, setSelectedZoneId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shift-assignments-zone') || '';
    }
    return '';
  });
  const [selectedShiftId, setSelectedShiftId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shift-assignments-shift') || '';
    }
    return '';
  });
  const [activeSoldier, setActiveSoldier] = useState<AvailableSoldier | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [soldierSearch, setSoldierSearch] = useState('');

  // Persist selected zone to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedZoneId) {
        localStorage.setItem('shift-assignments-zone', selectedZoneId);
      } else {
        localStorage.removeItem('shift-assignments-zone');
      }
    }
  }, [selectedZoneId]);

  // Persist selected shift to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedShiftId) {
        localStorage.setItem('shift-assignments-shift', selectedShiftId);
      } else {
        localStorage.removeItem('shift-assignments-shift');
      }
    }
  }, [selectedShiftId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: zones } = useQuery<Zone[]>({
    queryKey: ['zones'],
    queryFn: async () => {
      const response = await api.get('/zones');
      return response.data;
    },
  });

  const { data: shiftTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: ['shift-templates'],
    queryFn: async () => {
      const response = await api.get('/shift-templates');
      return response.data;
    },
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ['tasks', 'zone', selectedZoneId],
    queryFn: async () => {
      if (!selectedZoneId) return [];
      const response = await api.get(`/tasks/zone/${selectedZoneId}`);
      return response.data;
    },
    enabled: !!selectedZoneId,
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<ShiftAssignment[]>({
    queryKey: ['shift-assignments', selectedDate, selectedZoneId],
    queryFn: async () => {
      const response = await api.get('/shift-assignments', {
        params: {
          startDate: selectedDate,
          endDate: selectedDate,
          zoneId: selectedZoneId || undefined,
        },
      });
      return response.data;
    },
  });

  const { data: availableSoldiers, isLoading: soldiersLoading } = useQuery<AvailableSoldier[]>({
    queryKey: ['available-soldiers', selectedDate, selectedShiftId],
    queryFn: async () => {
      if (!selectedShiftId) return [];
      const response = await api.get('/shift-assignments/available-soldiers', {
        params: {
          date: selectedDate,
          shiftTemplateId: selectedShiftId,
        },
      });
      return response.data;
    },
    enabled: !!selectedShiftId,
  });

  const { data: scheduleStatus } = useQuery<ScheduleStatus>({
    queryKey: ['schedule-status', selectedDate, selectedZoneId],
    queryFn: async () => {
      const response = await api.get('/shift-schedules/status', {
        params: {
          date: selectedDate,
          zoneId: selectedZoneId || undefined,
        },
      });
      return response.data;
    },
    enabled: !!selectedZoneId,
  });

  const publishMutation = useMutation({
    mutationFn: async (shiftTemplateId?: string) => {
      const params: { date: string; zoneId?: string; shiftTemplateId?: string } = {
        date: selectedDate,
      };

      if (selectedZoneId) {
        params.zoneId = selectedZoneId;
      }

      if (shiftTemplateId) {
        params.shiftTemplateId = shiftTemplateId;
      }

      const response = await api.post('/shift-schedules/publish', {}, {
        params,
      });
      return response.data as PublishResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-status'] });
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      toast.success(
        `פורסם בהצלחה! ${data.notifiedSoldiers} חיילים קיבלו התראה`,
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בפרסום');
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: {
      date: string;
      shiftTemplateId: string;
      taskId: string;
      soldierId: string;
    }) => {
      const response = await api.post('/shift-assignments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-soldiers'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-status'] });
      toast.success('חייל שובץ בהצלחה');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בשיבוץ חייל');
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/shift-assignments/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-soldiers'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-status'] });
      toast.success('שיבוץ הוסר');
      setEditingAssignment(null);
    },
    onError: () => {
      toast.error('שגיאה בהסרת שיבוץ');
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await api.patch(`/shift-assignments/${id}`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      toast.success('שיבוץ עודכן');
      setEditingAssignment(null);
    },
    onError: () => {
      toast.error('שגיאה בעדכון שיבוץ');
    },
  });

  const moveAssignmentMutation = useMutation({
    mutationFn: async ({ id, newTaskId, newShiftTemplateId }: { id: string; newTaskId: string; newShiftTemplateId?: string }) => {
      const response = await api.patch(`/shift-assignments/${id}/move`, {
        newTaskId,
        newShiftTemplateId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['available-soldiers'] });
      toast.success('שיבוץ הועבר');
      setEditingAssignment(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בהעברת שיבוץ');
    },
  });

  const assignmentsByTaskAndShift = useMemo(() => {
    const map: Record<string, Record<string, ShiftAssignment[]>> = {};
    assignments?.forEach((a) => {
      if (!map[a.taskId]) map[a.taskId] = {};
      if (!map[a.taskId][a.shiftTemplateId]) map[a.taskId][a.shiftTemplateId] = [];
      map[a.taskId][a.shiftTemplateId].push(a);
    });
    return map;
  }, [assignments]);

  // Filter soldiers by search query (name or skills)
  const filteredSoldiers = useMemo(() => {
    if (!availableSoldiers) return [];
    if (!soldierSearch.trim()) return availableSoldiers;

    const searchLower = soldierSearch.toLowerCase().trim();
    return availableSoldiers.filter((soldier) => {
      // Search by name
      if (soldier.fullName.toLowerCase().includes(searchLower)) return true;
      // Search by skills
      if (soldier.skills?.some((s) => s.skill?.displayName?.toLowerCase().includes(searchLower))) return true;
      return false;
    });
  }, [availableSoldiers, soldierSearch]);

  const handleDragStart = (event: DragStartEvent) => {
    const soldier = availableSoldiers?.find((s) => s.id === event.active.id);
    if (soldier) {
      setActiveSoldier(soldier);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSoldier(null);

    const { active, over } = event;
    if (!over) return;

    const soldierId = active.id as string;
    const [taskId, shiftTemplateId] = (over.id as string).split('::');

    if (taskId && shiftTemplateId && soldierId) {
      createAssignmentMutation.mutate({
        date: selectedDate,
        shiftTemplateId,
        taskId,
        soldierId,
      });
    }
  };

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">שיבוץ משמרות</h1>
        <p className="text-gray-600 mt-1">גרור חיילים למשימות לשיבוץ משמרות</p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="font-medium">{formatDate(selectedDate)}</span>
            </div>
            <button
              onClick={() => handleDateChange(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Zone selector */}
          <Select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            options={[
              { value: '', label: 'בחר איזור' },
              ...(zones?.map((z) => ({ value: z.id, label: z.name })) || []),
            ]}
            className="w-48"
          />

          {/* Shift selector */}
          <Select
            value={selectedShiftId}
            onChange={(e) => setSelectedShiftId(e.target.value)}
            options={[
              { value: '', label: 'בחר משמרת' },
              ...(shiftTemplates?.map((s) => ({ value: s.id, label: s.displayName })) || []),
            ]}
            className="w-48"
          />

          <Button
            variant="secondary"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            היום
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Schedule Status & Publish */}
          {selectedZoneId && (
            <div className="flex items-center gap-3 flex-wrap">
              {scheduleStatus?.status === 'PUBLISHED' ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">פורסם</span>
                  {scheduleStatus.publishedBy && (
                    <span className="text-xs text-green-600">
                      ע"י {scheduleStatus.publishedBy.fullName}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">טיוטה</span>
                  {scheduleStatus?.assignmentCount ? (
                    <span className="text-xs">({scheduleStatus.assignmentCount} שיבוצים)</span>
                  ) : null}
                </div>
              )}

              {/* Publish buttons per shift template */}
              {shiftTemplates && shiftTemplates.length > 0 && (
                <div className="flex items-center gap-2 border-r pr-3 mr-2">
                  {shiftTemplates.map((template) => {
                    const templateAssignments = assignments?.filter(a => a.shiftTemplateId === template.id) || [];
                    const confirmedCount = templateAssignments.filter(a => a.status === 'CONFIRMED').length;
                    const isPublished = confirmedCount > 0 && confirmedCount === templateAssignments.length;

                    return (
                      <Button
                        key={template.id}
                        size="sm"
                        variant={isPublished ? 'secondary' : 'primary'}
                        onClick={() => {
                          if (templateAssignments.length === 0) {
                            toast.error(`אין שיבוצים למשמרת ${template.displayName}`);
                            return;
                          }
                          if (confirm(`האם לפרסם את משמרת ${template.displayName}? ${templateAssignments.length} חיילים יקבלו התראה.`)) {
                            publishMutation.mutate(template.id);
                          }
                        }}
                        isLoading={publishMutation.isPending}
                        disabled={templateAssignments.length === 0 || isPublished}
                        className="text-xs"
                      >
                        {isPublished ? (
                          <Check className="w-3 h-3 ml-1" />
                        ) : (
                          <Send className="w-3 h-3 ml-1" />
                        )}
                        {template.displayName}
                        {templateAssignments.length > 0 && !isPublished && (
                          <span className="mr-1 text-xs">({templateAssignments.length})</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Publish All button */}
              {scheduleStatus?.status !== 'PUBLISHED' && scheduleStatus?.assignmentCount && scheduleStatus.assignmentCount > 0 && (
                <Button
                  onClick={() => {
                    if (confirm('האם לפרסם את כל המשמרות? כל החיילים המשובצים יקבלו התראה.')) {
                      publishMutation.mutate(undefined);
                    }
                  }}
                  isLoading={publishMutation.isPending}
                >
                  <Send className="w-4 h-4 ml-2" />
                  פרסם הכל
                </Button>
              )}
            </div>
          )}
        </div>
        </CardContent>
      </Card>

      {!selectedZoneId || !selectedShiftId ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>בחר איזור ומשמרת להצגת לוח השיבוץ</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-6">
            {/* Available Soldiers */}
            <div className="col-span-1">
              <Card className="sticky top-4">
                <CardHeader className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>חיילים זמינים</span>
                  <span className="text-sm text-gray-400">
                    ({filteredSoldiers.length}{soldierSearch && availableSoldiers ? `/${availableSoldiers.length}` : ''})
                  </span>
                </CardHeader>
                <CardContent className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {/* Search Input */}
                  <div className="relative mb-3">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={soldierSearch}
                      onChange={(e) => setSoldierSearch(e.target.value)}
                      placeholder="חיפוש לפי שם או כישור..."
                      className="pr-9 text-sm"
                    />
                  </div>
                  {soldiersLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : availableSoldiers?.length === 0 ? (
                    <p className="text-center text-gray-500 py-4 text-sm">
                      אין חיילים זמינים למשמרת זו
                    </p>
                  ) : filteredSoldiers.length === 0 ? (
                    <p className="text-center text-gray-500 py-4 text-sm">
                      לא נמצאו חיילים מתאימים לחיפוש
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredSoldiers.map((soldier) => (
                        <SoldierCard
                          key={soldier.id}
                          soldier={soldier}
                          isDraggable
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tasks Grid */}
            <div className="col-span-3">
              {assignmentsLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : tasks?.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>אין משימות מוגדרות לאיזור זה</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {tasks?.map((task) => (
                    <TaskDropZone
                      key={task.id}
                      task={task}
                      shiftTemplateId={selectedShiftId}
                      shiftTemplate={shiftTemplates?.find((s) => s.id === selectedShiftId)}
                      assignments={assignmentsByTaskAndShift[task.id]?.[selectedShiftId] || []}
                      onRemoveAssignment={(id) => deleteAssignmentMutation.mutate(id)}
                      onEditAssignment={(assignment) => setEditingAssignment(assignment)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeSoldier && (
              <SoldierCard soldier={activeSoldier} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Edit Assignment Modal */}
      {editingAssignment && tasks && shiftTemplates && (
        <EditAssignmentModal
          assignment={editingAssignment}
          tasks={tasks}
          shiftTemplates={shiftTemplates}
          onClose={() => setEditingAssignment(null)}
          onUpdate={(data) => updateAssignmentMutation.mutate({ id: editingAssignment.id, ...data })}
          onMove={(taskId, shiftTemplateId) => moveAssignmentMutation.mutate({
            id: editingAssignment.id,
            newTaskId: taskId,
            newShiftTemplateId: shiftTemplateId,
          })}
          onDelete={() => deleteAssignmentMutation.mutate(editingAssignment.id)}
          isLoading={updateAssignmentMutation.isPending || moveAssignmentMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}
