'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Clock,
  MapPin,
  Phone,
  CheckCircle,
  AlertCircle,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Copy,
  Check,
  Send,
  UtensilsCrossed,
  Wrench,
  MessageSquare,
  HelpCircle,
  X,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { formatDate, formatWhatsAppLink, cn } from '@/lib/utils';
import { MILITARY_ROLE_LABELS, MilitaryRole } from '@/types';

// Shift request categories
const SHIFT_REQUEST_CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  food: { label: 'בקשת מזון', icon: UtensilsCrossed, color: 'text-orange-600 bg-orange-50' },
  equipment: { label: 'ציוד', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
  report: { label: 'דיווח', icon: MessageSquare, color: 'text-green-600 bg-green-50' },
  other: { label: 'אחר', icon: HelpCircle, color: 'text-gray-600 bg-gray-50' },
};

interface CurrentShiftOverview {
  date: string;
  schedule: {
    id: string;
    zone?: { id: string; name: string };
    shiftOfficer: { id: string; fullName: string; phone: string };
  };
  currentShift: {
    shiftTemplate: {
      id: string;
      displayName: string;
      startTime: string;
      endTime: string;
      color?: string;
    };
    tasks: Array<{
      task: {
        id: string;
        name: string;
        zone?: { id: string; name: string };
      };
      soldiers: Array<{
        id: string;
        soldier: {
          id: string;
          fullName: string;
          phone: string;
          militaryRole?: MilitaryRole;
          role?: string;
        };
        arrivedAt: string | null;
        batteryLevel: number;
        missingItems: string | null;
        status: string;
        isCommander: boolean;
      }>;
      commanderCount: number;
    }>;
    stats: {
      total: number;
      arrived: number;
      pending: number;
      totalTasks: number;
    };
  };
  submissions: Array<{
    id: string;
    user: { id: string; fullName: string; phone: string };
    category: string;
    message: string;
    shiftName: string;
    taskName: string;
    status: string;
    createdAt: string;
  }>;
}

interface CommanderInfo {
  id: string;
  soldier: {
    id: string;
    fullName: string;
    phone: string;
    militaryRole?: MilitaryRole;
  };
  task: {
    id: string;
    name: string;
    zone?: { id: string; name: string };
  };
  arrivedAt: string | null;
  batteryLevel: number;
}

export default function ShiftDutyPage() {
  const queryClient = useQueryClient();
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [showCommandersModal, setShowCommandersModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get current shift overview (current shift only, not full day)
  const { data: overview, isLoading } = useQuery<CurrentShiftOverview | null>({
    queryKey: ['current-shift-overview'],
    queryFn: async () => {
      const response = await api.get('/shift-assignments/active/current-shift-only');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get commanders for popup
  const { data: commanders } = useQuery<CommanderInfo[]>({
    queryKey: ['current-shift-commanders'],
    queryFn: async () => {
      const response = await api.get('/shift-assignments/active/current-commanders');
      return response.data;
    },
    enabled: showCommandersModal,
  });

  const confirmArrivalMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await api.post(`/shift-assignments/active/${assignmentId}/arrive-supervisor`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift-overview'] });
      toast.success('הגעה אושרה');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה באישור הגעה');
    },
  });

  const confirmSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await api.post(`/shift-assignments/active/submission/${submissionId}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift-overview'] });
      toast.success('הבקשה אושרה');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה באישור הבקשה');
    },
  });

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBatteryIcon = (level: number) => {
    if (level === 0) return <Battery className="w-4 h-4" />;
    if (level <= 25) return <BatteryLow className="w-4 h-4" />;
    if (level <= 50) return <BatteryMedium className="w-4 h-4" />;
    return <BatteryFull className="w-4 h-4" />;
  };

  const getBatteryColor = (level: number) => {
    if (level === 0) return 'bg-gray-100 text-gray-500';
    if (level <= 25) return 'bg-red-100 text-red-700';
    if (level <= 50) return 'bg-orange-100 text-orange-700';
    if (level <= 75) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </UserLayout>
    );
  }

  if (!overview) {
    return (
      <UserLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-military-700">ניהול משמרת</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">אינך מוגדר כקצין תורן להיום</p>
          </CardContent>
        </Card>
      </UserLayout>
    );
  }

  const pendingSubmissions = overview.submissions.filter(s => s.status === 'PENDING');

  return (
    <UserLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-military-700">ניהול משמרת</h1>
            <p className="text-gray-600 mt-1">
              {formatDate(overview.date, 'EEEE, dd/MM/yyyy')}
              {overview.schedule.zone && ` • ${overview.schedule.zone.name}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowCommandersModal(true)}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              מפקדים במשמרת
            </Button>
            <div className="text-left bg-military-50 px-4 py-2 rounded-xl">
              <p className="text-xs text-gray-500">קצין תורן</p>
              <p className="font-medium text-military-700">{overview.schedule.shiftOfficer.fullName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Shift Header */}
      <Card className="mb-6 border-military-200">
        <CardHeader className="bg-gradient-to-l from-military-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: overview.currentShift.shiftTemplate.color || '#6B7280' }}
              />
              <span className="font-bold text-xl text-military-700">
                {overview.currentShift.shiftTemplate.displayName}
              </span>
              <span className="text-sm text-gray-500">
                {overview.currentShift.shiftTemplate.startTime} - {overview.currentShift.shiftTemplate.endTime}
              </span>
            </div>
            <Badge variant="success" className="animate-pulse">משמרת נוכחית</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="py-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-1 text-military-600" />
            <p className="text-2xl font-bold text-military-700">{overview.currentShift.stats.total}</p>
            <p className="text-xs text-gray-500">משובצים</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{overview.currentShift.stats.arrived}</p>
            <p className="text-xs text-gray-500">הגיעו</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-1 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-700">{overview.currentShift.stats.pending}</p>
            <p className="text-xs text-gray-500">ממתינים</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <MapPin className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">{overview.currentShift.stats.totalTasks}</p>
            <p className="text-xs text-gray-500">משימות</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Submissions Alert */}
      {pendingSubmissions.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader className="flex items-center gap-2 text-orange-700">
            <Send className="w-5 h-5" />
            <span>בקשות ממפקדים ({pendingSubmissions.length})</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingSubmissions.map((submission) => {
                const category = SHIFT_REQUEST_CATEGORIES[submission.category] || SHIFT_REQUEST_CATEGORIES.other;
                const Icon = category.icon;
                return (
                  <div key={submission.id} className="p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-lg', category.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{submission.user.fullName}</span>
                            <span className="text-xs text-gray-400">
                              {submission.taskName && `• ${submission.taskName}`}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{submission.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(submission.createdAt, 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={formatWhatsAppLink(submission.user.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <Button
                          size="sm"
                          onClick={() => confirmSubmissionMutation.mutate(submission.id)}
                          isLoading={confirmSubmissionMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          אשר
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {overview.currentShift.tasks.map((taskGroup) => {
          const isExpanded = expandedTasks.includes(taskGroup.task.id);
          const arrivedCount = taskGroup.soldiers.filter(s => s.arrivedAt).length;
          const totalCount = taskGroup.soldiers.length;
          const allArrived = arrivedCount === totalCount;

          return (
            <Card key={taskGroup.task.id} className={allArrived ? 'border-green-200' : 'border-yellow-200'}>
              <CardHeader
                className={cn(
                  'cursor-pointer transition-colors',
                  allArrived ? 'bg-green-50 hover:bg-green-100' : 'bg-yellow-50 hover:bg-yellow-100'
                )}
                onClick={() => toggleTask(taskGroup.task.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className={cn('w-5 h-5', allArrived ? 'text-green-600' : 'text-yellow-600')} />
                    <div>
                      <span className="font-bold">{taskGroup.task.name}</span>
                      {taskGroup.task.zone && (
                        <span className="text-sm text-gray-500 mr-2">({taskGroup.task.zone.name})</span>
                      )}
                    </div>
                    {taskGroup.commanderCount > 0 && (
                      <Badge variant="info" className="text-xs">
                        <Shield className="w-3 h-3 ml-1" />
                        {taskGroup.commanderCount} מפקדים
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-sm px-2 py-1 rounded font-medium',
                      allArrived
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {arrivedCount}/{totalCount} הגיעו
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-2">
                    {taskGroup.soldiers.map((soldierData) => (
                      <div
                        key={soldierData.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border',
                          soldierData.arrivedAt
                            ? 'bg-green-50 border-green-200'
                            : 'bg-yellow-50 border-yellow-200'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center',
                              soldierData.arrivedAt ? 'bg-green-500' : 'bg-yellow-500'
                            )}
                          >
                            {soldierData.arrivedAt ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <Clock className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{soldierData.soldier.fullName}</p>
                              {soldierData.isCommander && (
                                <Shield className="w-4 h-4 text-military-600" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {soldierData.soldier.militaryRole && (
                                <span>{MILITARY_ROLE_LABELS[soldierData.soldier.militaryRole]}</span>
                              )}
                              {soldierData.arrivedAt && (
                                <span>
                                  • הגיע {new Date(soldierData.arrivedAt).toLocaleTimeString('he-IL', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                            {soldierData.missingItems && (
                              <p className="text-xs text-red-600 mt-1">
                                <AlertTriangle className="w-3 h-3 inline ml-1" />
                                חסר: {soldierData.missingItems}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Battery level indicator */}
                          {soldierData.arrivedAt && (
                            <div
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                                getBatteryColor(soldierData.batteryLevel)
                              )}
                              title={`סוללה: ${soldierData.batteryLevel}%`}
                            >
                              {getBatteryIcon(soldierData.batteryLevel)}
                              <span>{soldierData.batteryLevel > 0 ? `${soldierData.batteryLevel}%` : '-'}</span>
                            </div>
                          )}

                          {/* WhatsApp link */}
                          <a
                            href={formatWhatsAppLink(soldierData.soldier.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          >
                            <Phone className="w-4 h-4" />
                          </a>

                          {/* Confirm arrival button */}
                          {!soldierData.arrivedAt && (
                            <Button
                              size="sm"
                              onClick={() => confirmArrivalMutation.mutate(soldierData.id)}
                              isLoading={confirmArrivalMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 ml-1" />
                              אשר
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Commanders Modal */}
      <Modal
        isOpen={showCommandersModal}
        onClose={() => setShowCommandersModal(false)}
        title="מפקדים במשמרת הנוכחית"
        size="lg"
      >
        <div className="space-y-3">
          {commanders && commanders.length > 0 ? (
            commanders.map((commander) => (
              <div
                key={commander.id}
                className="flex items-center justify-between p-4 bg-military-50 rounded-xl border border-military-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-military-600 rounded-full flex items-center justify-center text-white font-bold">
                    {commander.soldier.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-military-700">{commander.soldier.fullName}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-3 h-3" />
                      <span>{commander.task.name}</span>
                      {commander.task.zone && (
                        <span className="text-gray-400">• {commander.task.zone.name}</span>
                      )}
                    </div>
                    {commander.soldier.militaryRole && (
                      <p className="text-xs text-gray-500">
                        {MILITARY_ROLE_LABELS[commander.soldier.militaryRole]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Battery if arrived */}
                  {commander.arrivedAt && commander.batteryLevel > 0 && (
                    <div className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                      getBatteryColor(commander.batteryLevel)
                    )}>
                      {getBatteryIcon(commander.batteryLevel)}
                      <span>{commander.batteryLevel}%</span>
                    </div>
                  )}

                  {/* WhatsApp */}
                  <a
                    href={formatWhatsAppLink(commander.soldier.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                  >
                    <Phone className="w-5 h-5" />
                  </a>

                  {/* Copy button */}
                  <button
                    onClick={() => copyToClipboard(
                      `${commander.soldier.fullName}\n${commander.task.name}\n${commander.soldier.phone}`,
                      commander.id
                    )}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    title="העתק פרטים"
                  >
                    {copiedId === commander.id ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>אין מפקדים משובצים במשמרת הנוכחית</p>
            </div>
          )}
        </div>
      </Modal>
    </UserLayout>
  );
}
