'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Users, MapPin, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDate, formatWhatsAppLink, cn } from '@/lib/utils';

interface ShiftAssignment {
  id: string;
  date: string;
  status: string;
  shiftTemplate: {
    id: string;
    displayName: string;
    startTime: string;
    endTime: string;
    color?: string;
    sortOrder: number;
  };
  task: {
    id: string;
    name: string;
    zone?: {
      id: string;
      name: string;
    };
  };
  soldier: {
    id: string;
    fullName: string;
    phone: string;
  };
}

interface MyShift {
  id: string;
  date: string;
  shiftTemplate: {
    displayName: string;
    startTime: string;
    endTime: string;
  };
  task: {
    name: string;
    zone?: {
      name: string;
    };
  };
  teammates: {
    id: string;
    fullName: string;
    phone: string;
    taskName: string;
  }[];
}

export default function ShiftsPage() {
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Get my shifts
  const { data: myShifts, isLoading: myShiftsLoading } = useQuery<MyShift[]>({
    queryKey: ['my-shifts'],
    queryFn: async () => {
      const response = await api.get('/shift-assignments/my-shifts');
      return response.data;
    },
  });

  // Get all shifts for today
  const { data: todayShifts, isLoading: todayShiftsLoading } = useQuery<ShiftAssignment[]>({
    queryKey: ['today-shifts', todayStr],
    queryFn: async () => {
      const response = await api.get(`/shift-assignments/date/${todayStr}`);
      return response.data;
    },
  });

  const isLoading = myShiftsLoading || todayShiftsLoading;

  // Find my shift for today
  const myTodayShift = myShifts?.find((shift) => {
    const shiftDate = new Date(shift.date).toISOString().split('T')[0];
    return shiftDate === todayStr;
  });

  // Group today's shifts by shift template
  const groupedShifts = todayShifts?.reduce((acc, assignment) => {
    const templateId = assignment.shiftTemplate.id;
    if (!acc[templateId]) {
      acc[templateId] = {
        template: assignment.shiftTemplate,
        tasks: {},
      };
    }
    const taskId = assignment.task.id;
    if (!acc[templateId].tasks[taskId]) {
      acc[templateId].tasks[taskId] = {
        task: assignment.task,
        soldiers: [],
      };
    }
    acc[templateId].tasks[taskId].soldiers.push(assignment.soldier);
    return acc;
  }, {} as Record<string, { template: ShiftAssignment['shiftTemplate']; tasks: Record<string, { task: ShiftAssignment['task']; soldiers: ShiftAssignment['soldier'][] }> }>);

  // Sort shift templates by sortOrder
  const sortedTemplates = groupedShifts
    ? Object.values(groupedShifts).sort((a, b) => a.template.sortOrder - b.template.sortOrder)
    : [];

  // My upcoming shifts
  const upcomingShifts = myShifts?.filter((shift) => {
    const shiftDate = new Date(shift.date).toISOString().split('T')[0];
    return shiftDate > todayStr;
  }).slice(0, 5);

  return (
    <UserLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">משמרות</h1>
        <p className="text-gray-600 mt-1">לוח משמרות להיום - {formatDate(today, 'EEEE, dd/MM/yyyy')}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          {/* My Current Shift Highlight */}
          {myTodayShift && (
            <Card className="mb-6 border-2 border-green-400">
              <CardHeader className="flex items-center gap-2 bg-green-50">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-700">המשמרת שלי היום</span>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-green-700">
                      {myTodayShift.shiftTemplate.displayName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {myTodayShift.shiftTemplate.startTime} - {myTodayShift.shiftTemplate.endTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{myTodayShift.task.zone?.name || 'לא מוגדר'}</span>
                    </div>
                    <span className="px-2 py-1 bg-green-200 rounded text-green-700">
                      {myTodayShift.task.name}
                    </span>
                  </div>

                  {/* Teammates */}
                  {myTodayShift.teammates && myTodayShift.teammates.length > 0 && (
                    <div className="border-t border-green-200 pt-3 mt-3">
                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        חברי משמרת ({myTodayShift.teammates.length})
                      </h4>
                      <div className="grid gap-2">
                        {myTodayShift.teammates.map((teammate) => (
                          <div
                            key={teammate.id}
                            className="flex items-center justify-between p-2 bg-white rounded-lg"
                          >
                            <div>
                              <span className="font-medium">{teammate.fullName}</span>
                              <span className="text-sm text-gray-500 mr-2">({teammate.taskName})</span>
                            </div>
                            <a
                              href={formatWhatsAppLink(teammate.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-green-600 hover:text-green-700"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Shifts for Today */}
          <Card className="mb-6">
            <CardHeader className="flex items-center gap-2 bg-military-50">
              <Calendar className="w-5 h-5 text-military-600" />
              <span className="font-bold">כל המשמרות להיום</span>
              <span className="text-sm text-gray-500">({todayShifts?.length || 0} שיבוצים)</span>
            </CardHeader>
            <CardContent>
              {sortedTemplates.length > 0 ? (
                <div className="space-y-4">
                  {sortedTemplates.map(({ template, tasks }) => (
                    <div key={template.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Shift Template Header */}
                      <button
                        onClick={() => setExpandedShift(expandedShift === template.id ? null : template.id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: template.color || '#6B7280' }}
                          />
                          <span className="font-bold text-lg">{template.displayName}</span>
                          <span className="text-sm text-gray-500">
                            {template.startTime} - {template.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {Object.values(tasks).reduce((sum, t) => sum + t.soldiers.length, 0)} חיילים
                          </span>
                          {expandedShift === template.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {expandedShift === template.id && (
                        <div className="p-4 space-y-3">
                          {Object.values(tasks).map(({ task, soldiers }) => (
                            <div key={task.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{task.zone?.name || 'לא מוגדר'}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-military-600">{task.name}</span>
                                <span className="text-sm text-gray-400">({soldiers.length})</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {soldiers.map((soldier) => (
                                  <div
                                    key={soldier.id}
                                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                                  >
                                    <span className="text-sm">{soldier.fullName}</span>
                                    <a
                                      href={formatWhatsAppLink(soldier.phone)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">אין משמרות מתוכננות להיום</p>
              )}
            </CardContent>
          </Card>

          {/* My Upcoming Shifts */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span>המשמרות הקרובות שלי</span>
            </CardHeader>
            <CardContent>
              {upcomingShifts && upcomingShifts.length > 0 ? (
                <div className="space-y-3">
                  {upcomingShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">{formatDate(shift.date, 'EEEE, dd/MM')}</div>
                        <div className="text-sm text-gray-500">
                          {shift.shiftTemplate.displayName} • {shift.task.name}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {shift.shiftTemplate.startTime} - {shift.shiftTemplate.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">אין משמרות מתוכננות</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </UserLayout>
  );
}
