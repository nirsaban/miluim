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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { formatDate, formatWhatsAppLink, cn } from '@/lib/utils';

interface ShiftOverview {
  date: string;
  schedule: {
    id: string;
    zone?: { id: string; name: string };
    shiftOfficer: { id: string; fullName: string; phone: string };
  };
  shifts: Array<{
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
          militaryRole?: string;
        };
        arrivedAt: string | null;
        batteryLevel: number;
        missingItems: string | null;
        status: string;
      }>;
    }>;
    stats: {
      total: number;
      arrived: number;
    };
  }>;
  totalStats: {
    total: number;
    arrived: number;
    pending: number;
  };
  missingItems: Array<{
    soldier: string;
    task: string;
    items: string;
  }>;
}

export default function ShiftDutyPage() {
  const queryClient = useQueryClient();
  const [expandedShifts, setExpandedShifts] = useState<string[]>([]);

  const { data: overview, isLoading } = useQuery<ShiftOverview | null>({
    queryKey: ['shift-overview'],
    queryFn: async () => {
      const response = await api.get('/shift-assignments/active/shift-overview');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const confirmArrivalMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await api.post(`/shift-assignments/active/${assignmentId}/arrive-supervisor`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-overview'] });
      toast.success('הגעה אושרה');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה באישור הגעה');
    },
  });

  const toggleExpand = (shiftId: string) => {
    setExpandedShifts((prev) =>
      prev.includes(shiftId)
        ? prev.filter((id) => id !== shiftId)
        : [...prev, shiftId]
    );
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

  return (
    <UserLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-military-700">ניהול משמרת</h1>
            <p className="text-gray-600 mt-1">
              {formatDate(overview.date, 'EEEE, dd/MM/yyyy')}
              {overview.schedule.zone && ` • ${overview.schedule.zone.name}`}
            </p>
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-500">קצין תורן</p>
            <p className="font-medium">{overview.schedule.shiftOfficer.fullName}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-military-600" />
            <p className="text-2xl font-bold text-military-700">{overview.totalStats.total}</p>
            <p className="text-sm text-gray-500">סה"כ משובצים</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{overview.totalStats.arrived}</p>
            <p className="text-sm text-gray-500">הגיעו</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-700">{overview.totalStats.pending}</p>
            <p className="text-sm text-gray-500">ממתינים</p>
          </CardContent>
        </Card>
      </div>

      {/* Missing Items Alert */}
      {overview.missingItems.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>דיווחי חוסרים ({overview.missingItems.length})</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overview.missingItems.map((item, idx) => (
                <div key={idx} className="p-2 bg-white rounded-lg border border-red-200">
                  <span className="font-medium">{item.soldier}</span>
                  <span className="text-gray-500"> ({item.task}): </span>
                  <span className="text-red-700">{item.items}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shifts */}
      <div className="space-y-4">
        {overview.shifts.map((shift) => {
          const isExpanded = expandedShifts.includes(shift.shiftTemplate.id);

          return (
            <Card key={shift.shiftTemplate.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleExpand(shift.shiftTemplate.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: shift.shiftTemplate.color || '#6B7280' }}
                    />
                    <span className="font-bold text-lg">{shift.shiftTemplate.displayName}</span>
                    <span className="text-sm text-gray-500">
                      {shift.shiftTemplate.startTime} - {shift.shiftTemplate.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      'text-sm px-2 py-1 rounded',
                      shift.stats.arrived === shift.stats.total
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {shift.stats.arrived}/{shift.stats.total} הגיעו
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
                  <div className="space-y-4">
                    {shift.tasks.map((taskGroup) => (
                      <div key={taskGroup.task.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{taskGroup.task.name}</span>
                          <span className="text-sm text-gray-400">
                            ({taskGroup.soldiers.length} חיילים)
                          </span>
                        </div>

                        <div className="grid gap-2">
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
                                    'w-8 h-8 rounded-full flex items-center justify-center',
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
                                  <p className="font-medium">{soldierData.soldier.fullName}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    {soldierData.arrivedAt && (
                                      <span>
                                        הגיע {new Date(soldierData.arrivedAt).toLocaleTimeString('he-IL', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    )}
                                    {soldierData.missingItems && (
                                      <span className="text-red-600">
                                        חסר: {soldierData.missingItems}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Battery level indicator */}
                                {soldierData.arrivedAt && (
                                  <div
                                    className={cn(
                                      'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                                      soldierData.batteryLevel === 0
                                        ? 'bg-gray-100 text-gray-500'
                                        : soldierData.batteryLevel <= 25
                                        ? 'bg-red-100 text-red-700'
                                        : soldierData.batteryLevel <= 50
                                        ? 'bg-orange-100 text-orange-700'
                                        : soldierData.batteryLevel <= 75
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-green-100 text-green-700'
                                    )}
                                    title={`סוללה: ${soldierData.batteryLevel}%`}
                                  >
                                    {soldierData.batteryLevel === 0 ? (
                                      <Battery className="w-4 h-4" />
                                    ) : soldierData.batteryLevel <= 25 ? (
                                      <BatteryLow className="w-4 h-4" />
                                    ) : soldierData.batteryLevel <= 50 ? (
                                      <BatteryMedium className="w-4 h-4" />
                                    ) : (
                                      <BatteryFull className="w-4 h-4" />
                                    )}
                                    <span>{soldierData.batteryLevel > 0 ? `${soldierData.batteryLevel}%` : '-'}</span>
                                  </div>
                                )}

                                {/* WhatsApp link */}
                                <a
                                  href={formatWhatsAppLink(soldierData.soldier.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-green-600 hover:bg-green-50 rounded"
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
                                    אשר הגעה
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
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
    </UserLayout>
  );
}
