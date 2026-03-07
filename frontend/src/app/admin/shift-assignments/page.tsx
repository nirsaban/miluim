'use client';

import { useState, useMemo } from 'react';
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
import { ChevronRight, ChevronLeft, Calendar, Users, AlertTriangle, Check, Send, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { SoldierCard } from '@/components/shifts/SoldierCard';
import { TaskDropZone } from '@/components/shifts/TaskDropZone';
import api from '@/lib/api';
import { ShiftTemplate, ShiftAssignment, Zone, Task, AvailableSoldier, ScheduleStatus, PublishResult } from '@/types';

export default function ShiftAssignmentsPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [activeSoldier, setActiveSoldier] = useState<AvailableSoldier | null>(null);

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
    mutationFn: async () => {
      const response = await api.post('/shift-schedules/publish', null, {
        params: {
          date: selectedDate,
          zoneId: selectedZoneId || undefined,
        },
      });
      return response.data as PublishResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-status'] });
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      toast.success(
        `לוח משמרות פורסם בהצלחה! ${data.notifiedSoldiers} חיילים קיבלו התראה`,
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בפרסום לוח משמרות');
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
      toast.success('שיבוץ הוסר');
    },
    onError: () => {
      toast.error('שגיאה בהסרת שיבוץ');
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">שיבוץ משמרות</h1>
        <p className="text-gray-600 mt-1">גרור חיילים למשימות לשיבוץ משמרות</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4 mb-6">
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
            <div className="flex items-center gap-3">
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
                <>
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">טיוטה</span>
                    {scheduleStatus?.assignmentCount ? (
                      <span className="text-xs">({scheduleStatus.assignmentCount} שיבוצים)</span>
                    ) : null}
                  </div>
                  <Button
                    onClick={() => {
                      if (confirm('האם לפרסם את לוח המשמרות? כל החיילים המשובצים יקבלו התראה.')) {
                        publishMutation.mutate();
                      }
                    }}
                    isLoading={publishMutation.isPending}
                    disabled={!scheduleStatus?.assignmentCount}
                  >
                    <Send className="w-4 h-4 ml-2" />
                    פרסם משמרות
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

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
                    ({availableSoldiers?.length || 0})
                  </span>
                </CardHeader>
                <CardContent className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {soldiersLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : availableSoldiers?.length === 0 ? (
                    <p className="text-center text-gray-500 py-4 text-sm">
                      אין חיילים זמינים למשמרת זו
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableSoldiers?.map((soldier) => (
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
    </AdminLayout>
  );
}
