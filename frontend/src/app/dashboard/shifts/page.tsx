'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Phone,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  UserCheck,
  AlertCircle,
  Send,
  MessageSquare,
  UtensilsCrossed,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatDate, formatWhatsAppLink, cn } from '@/lib/utils';

// Shift request categories
const SHIFT_REQUEST_CATEGORIES = [
  { id: 'food', label: 'בקשת מזון', icon: UtensilsCrossed, color: 'text-orange-600' },
  { id: 'equipment', label: 'ציוד', icon: Wrench, color: 'text-blue-600' },
  { id: 'report', label: 'דיווח', icon: MessageSquare, color: 'text-green-600' },
  { id: 'other', label: 'אחר', icon: HelpCircle, color: 'text-gray-600' },
];

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

interface MyTodayShift {
  id: string;
  date: string;
  shiftTemplate: {
    id: string;
    displayName: string;
    startTime: string;
    endTime: string;
  };
  task: {
    id: string;
    name: string;
    zone?: {
      id: string;
      name: string;
    };
  };
  arrivedAt: string | null;
  batteryLevel: number;
  status: string;
  shiftOfficer: {
    id: string;
    fullName: string;
    phone: string;
  } | null;
  teammates: {
    id: string;
    fullName: string;
    phone: string;
    taskName: string;
  }[];
}

export default function ShiftsPage() {
  const { user } = useAuth();
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [requestMessage, setRequestMessage] = useState('');
  const queryClient = useQueryClient();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Check if user is a commander
  const isCommander = user?.role === 'COMMANDER' || user?.role === 'OFFICER' || user?.role === 'ADMIN';

  // Get my active shift for today with detailed info
  const { data: myActiveShift, isLoading: activeShiftLoading } = useQuery<MyTodayShift | null>({
    queryKey: ['my-active-shift'],
    queryFn: async () => {
      const response = await api.get('/shift-assignments/active/my-shift');
      return response.data;
    },
  });

  // Get my shifts (for upcoming shifts)
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

  // Get today's shift schedule for shift officer info
  const { data: todaySchedule } = useQuery<{
    shiftOfficer: { id: string; fullName: string; phone: string } | null;
  } | null>({
    queryKey: ['today-schedule'],
    queryFn: async () => {
      const response = await api.get('/shift-assignments/active/today');
      return response.data?.schedule || null;
    },
  });

  // Confirm arrival mutation
  const confirmArrivalMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await api.post(`/shift-assignments/active/${assignmentId}/arrive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
      toast.success('הגעה אושרה בהצלחה!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה באישור הגעה');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { assignmentId: string; batteryLevel: number }) => {
      const response = await api.patch(`/shift-assignments/active/${data.assignmentId}/status`, {
        batteryLevel: data.batteryLevel,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-active-shift'] });
      toast.success('הסטטוס עודכן');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בעדכון הסטטוס');
    },
  });

  // Submit shift request mutation
  const submitShiftRequestMutation = useMutation({
    mutationFn: async (data: { category: string; message: string; shiftId: string }) => {
      const response = await api.post('/forms', {
        type: 'SHIFT_REQUEST',
        content: {
          category: data.category,
          message: data.message,
          shiftId: data.shiftId,
          shiftName: myTodayShift?.shiftTemplate.displayName,
          taskName: myTodayShift?.task.name,
          submittedAt: new Date().toISOString(),
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('הבקשה נשלחה בהצלחה לקצין התורן');
      setShowRequestModal(false);
      setSelectedCategory('');
      setRequestMessage('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בשליחת הבקשה');
    },
  });

  const handleSubmitRequest = () => {
    if (!selectedCategory || !requestMessage.trim()) {
      toast.error('נא למלא את כל השדות');
      return;
    }
    if (!myTodayShift) {
      toast.error('אין משמרת פעילה');
      return;
    }
    submitShiftRequestMutation.mutate({
      category: selectedCategory,
      message: requestMessage,
      shiftId: myTodayShift.id,
    });
  };

  const isLoading = myShiftsLoading || todayShiftsLoading || activeShiftLoading;

  // Use the active shift data for today's shift display
  const myTodayShift = myActiveShift;

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
            <Card className={`mb-6 border-2 ${myTodayShift.arrivedAt ? 'border-green-400' : 'border-yellow-400'}`}>
              <CardHeader className={`flex items-center gap-2 ${myTodayShift.arrivedAt ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <Calendar className={`w-5 h-5 ${myTodayShift.arrivedAt ? 'text-green-600' : 'text-yellow-600'}`} />
                <span className={`font-bold ${myTodayShift.arrivedAt ? 'text-green-700' : 'text-yellow-700'}`}>
                  המשמרת שלי היום
                </span>
                {myTodayShift.arrivedAt ? (
                  <Badge variant="success" className="mr-auto">הגעה אושרה</Badge>
                ) : (
                  <Badge variant="warning" className="mr-auto">ממתין לאישור הגעה</Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className={`rounded-lg p-4 ${myTodayShift.arrivedAt ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-bold text-lg ${myTodayShift.arrivedAt ? 'text-green-700' : 'text-yellow-700'}`}>
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
                    <span className={`px-2 py-1 rounded ${myTodayShift.arrivedAt ? 'bg-green-200 text-green-700' : 'bg-yellow-200 text-yellow-700'}`}>
                      {myTodayShift.task.name}
                    </span>
                  </div>

                  {/* Shift Officer Info */}
                  {myTodayShift.shiftOfficer && (
                    <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-white rounded-lg">
                      <UserCheck className="w-4 h-4 text-military-600" />
                      <span className="font-medium">קצין תורן:</span>
                      <span>{myTodayShift.shiftOfficer.fullName}</span>
                      <a
                        href={formatWhatsAppLink(myTodayShift.shiftOfficer.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-auto text-green-600 hover:text-green-700"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  {/* Arrival Confirmation */}
                  {!myTodayShift.arrivedAt && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-yellow-300">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium text-yellow-700">אנא אשר את הגעתך למשמרת</span>
                      </div>
                      <Button
                        onClick={() => confirmArrivalMutation.mutate(myTodayShift.id)}
                        isLoading={confirmArrivalMutation.isPending}
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        אישור הגעה
                      </Button>
                    </div>
                  )}

                  {/* Battery Status - Show only if arrived */}
                  {myTodayShift.arrivedAt && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-green-200">
                      <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Battery className="w-5 h-5" />
                        מצב סוללה
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[25, 50, 75, 100].map((level) => {
                          const isSelected = myTodayShift.batteryLevel === level;
                          const getBatteryIcon = () => {
                            if (level <= 25) return <BatteryLow className="w-5 h-5" />;
                            if (level <= 50) return <BatteryMedium className="w-5 h-5" />;
                            return <BatteryFull className="w-5 h-5" />;
                          };
                          const getColors = () => {
                            if (level <= 25) return isSelected ? 'bg-red-100 border-red-400 text-red-700' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-red-50';
                            if (level <= 50) return isSelected ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-orange-50';
                            if (level <= 75) return isSelected ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-yellow-50';
                            return isSelected ? 'bg-green-100 border-green-400 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-green-50';
                          };
                          return (
                            <button
                              key={level}
                              onClick={() => updateStatusMutation.mutate({
                                assignmentId: myTodayShift.id,
                                batteryLevel: level,
                              })}
                              disabled={updateStatusMutation.isPending}
                              className={cn(
                                'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors flex-1 min-w-[70px] justify-center',
                                getColors()
                              )}
                            >
                              {getBatteryIcon()}
                              <span className="font-medium">{level}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Teammates */}
                  {myTodayShift.teammates && myTodayShift.teammates.length > 0 && (
                    <div className={`border-t pt-3 mt-3 ${myTodayShift.arrivedAt ? 'border-green-200' : 'border-yellow-200'}`}>
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

                  {/* Commander Request Button */}
                  {isCommander && myTodayShift.arrivedAt && (
                    <div className="border-t pt-3 mt-3 border-green-200">
                      <Button
                        onClick={() => setShowRequestModal(true)}
                        variant="secondary"
                        className="w-full"
                      >
                        <Send className="w-4 h-4 ml-2" />
                        שלח בקשה לקצין התורן
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shift Request Modal */}
          <Modal
            isOpen={showRequestModal}
            onClose={() => {
              setShowRequestModal(false);
              setSelectedCategory('');
              setRequestMessage('');
            }}
            title="שליחת בקשה לקצין התורן"
            size="md"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סוג הבקשה
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SHIFT_REQUEST_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl border-2 transition-colors',
                          isSelected
                            ? 'border-military-500 bg-military-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <Icon className={cn('w-5 h-5', cat.color)} />
                        <span className={isSelected ? 'font-medium text-military-700' : 'text-gray-700'}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  פירוט הבקשה
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="תאר את הבקשה שלך..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmitRequest}
                  isLoading={submitShiftRequestMutation.isPending}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 ml-2" />
                  שלח בקשה
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedCategory('');
                    setRequestMessage('');
                  }}
                >
                  ביטול
                </Button>
              </div>
            </div>
          </Modal>

          {/* All Shifts for Today */}
          <Card className="mb-6">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-military-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-military-600" />
                <span className="font-bold">כל המשמרות להיום</span>
                <span className="text-sm text-gray-500">({todayShifts?.length || 0} שיבוצים)</span>
              </div>
              {todaySchedule?.shiftOfficer && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-military-200">
                  <UserCheck className="w-4 h-4 text-military-600" />
                  <span className="text-sm font-medium">קצין תורן:</span>
                  <span className="text-sm">{todaySchedule.shiftOfficer.fullName}</span>
                  <a
                    href={formatWhatsAppLink(todaySchedule.shiftOfficer.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 p-1"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              )}
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
