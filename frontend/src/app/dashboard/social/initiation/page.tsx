'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  MapPin,
  Clock,
  Users,
  Calendar,
  Check,
  X,
  UserPlus,
  UserCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  SocialActivity,
  SocialActivityStatus,
  ParticipantStatus,
  SOCIAL_ACTIVITY_STATUS_LABELS,
} from '@/types';

export default function SocialInitiationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [place, setPlace] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<string>('');

  // Fetch activities
  const { data: activities, isLoading } = useQuery<SocialActivity[]>({
    queryKey: ['social-activities'],
    queryFn: async () => {
      const response = await api.get('/social-activities');
      return response.data;
    },
    refetchInterval: 30000,
  });

  // Create activity mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      place: string;
      startTime: string;
      endTime?: string;
      maxParticipants?: number;
    }) => {
      const response = await api.post('/social-activities', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-activities'] });
      toast.success('הפעילות נוצרה בהצלחה!');
      resetForm();
      setShowCreateModal(false);
    },
    onError: () => {
      toast.error('שגיאה ביצירת הפעילות');
    },
  });

  // Join activity mutation
  const joinMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await api.post(`/social-activities/${activityId}/join`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-activities'] });
      toast.success('הצטרפת לפעילות!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בהצטרפות');
    },
  });

  // Confirm arrival mutation
  const confirmMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await api.post(`/social-activities/${activityId}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-activities'] });
      toast.success('אישרת הגעה!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה באישור הגעה');
    },
  });

  // Leave activity mutation
  const leaveMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await api.post(`/social-activities/${activityId}/leave`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-activities'] });
      toast.success('יצאת מהפעילות');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה ביציאה');
    },
  });

  // Cancel activity mutation
  const cancelMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await api.delete(`/social-activities/${activityId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-activities'] });
      toast.success('הפעילות בוטלה');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בביטול');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPlace('');
    setStartTime('');
    setEndTime('');
    setMaxParticipants('');
  };

  const handleCreate = () => {
    if (!title.trim() || !place.trim() || !startTime) {
      toast.error('נא למלא כותרת, מקום וזמן התחלה');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      place: place.trim(),
      startTime: new Date(startTime).toISOString(),
      endTime: endTime ? new Date(endTime).toISOString() : undefined,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
    });
  };

  const getParticipantStatus = (activity: SocialActivity): ParticipantStatus | null => {
    const participant = activity.participants.find(p => p.userId === user?.id);
    return participant?.status || null;
  };

  const isCreator = (activity: SocialActivity) => activity.createdById === user?.id;

  const getStatusBadge = (status: SocialActivityStatus) => {
    const variants: Record<SocialActivityStatus, 'success' | 'warning' | 'danger' | 'info'> = {
      OPEN: 'success',
      FULL: 'warning',
      IN_PROGRESS: 'info',
      COMPLETED: 'info',
      CANCELLED: 'danger',
    };
    return <Badge variant={variants[status]}>{SOCIAL_ACTIVITY_STATUS_LABELS[status]}</Badge>;
  };

  const getConfirmedParticipants = (activity: SocialActivity) => {
    return activity.participants.filter(p => p.status === 'CONFIRMED');
  };

  const getJoinedParticipants = (activity: SocialActivity) => {
    return activity.participants.filter(p => p.status === 'JOINED');
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-military-700">יוזמות חברתיות</h1>
            <p className="text-gray-600 mt-1">יוזמים פעילות? מזמינים חברים להצטרף!</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 ml-2" />
            יוזמה חדשה
          </Button>
        </div>

        {/* Activities List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const participantStatus = getParticipantStatus(activity);
              const amCreator = isCreator(activity);
              const confirmedList = getConfirmedParticipants(activity);
              const joinedList = getJoinedParticipants(activity);
              const isExpanded = expandedActivity === activity.id;
              const startDate = new Date(activity.startTime);
              const isUpcoming = startDate > new Date();

              return (
                <Card
                  key={activity.id}
                  className={cn(
                    'overflow-hidden transition-all',
                    amCreator && 'border-military-300 bg-military-50/30'
                  )}
                >
                  {/* Activity Header */}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-gray-900">{activity.title}</h3>
                          {amCreator && (
                            <Badge variant="info" className="text-xs">יוזם</Badge>
                          )}
                          {getStatusBadge(activity.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          יוזם: {activity.createdBy.fullName}
                        </p>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">
                            {activity._count.participants}
                            {activity.maxParticipants && `/${activity.maxParticipants}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Activity Details */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-military-600" />
                        <span>{activity.place}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-military-600" />
                        <span>{formatDate(activity.startTime, 'EEEE dd/MM')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 col-span-2">
                        <Clock className="w-4 h-4 text-military-600" />
                        <span>
                          {formatDate(activity.startTime, 'HH:mm')}
                          {activity.endTime && ` - ${formatDate(activity.endTime, 'HH:mm')}`}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {activity.description && (
                      <p className="text-gray-600 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                        {activity.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {activity.status === 'OPEN' && !participantStatus && !amCreator && (
                        <Button
                          size="sm"
                          onClick={() => joinMutation.mutate(activity.id)}
                          isLoading={joinMutation.isPending}
                        >
                          <UserPlus className="w-4 h-4 ml-1" />
                          הצטרף
                        </Button>
                      )}

                      {participantStatus === 'JOINED' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => confirmMutation.mutate(activity.id)}
                            isLoading={confirmMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 ml-1" />
                            אישור הגעה
                          </Button>
                          {!amCreator && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => leaveMutation.mutate(activity.id)}
                              isLoading={leaveMutation.isPending}
                            >
                              <X className="w-4 h-4 ml-1" />
                              ביטול
                            </Button>
                          )}
                        </>
                      )}

                      {participantStatus === 'CONFIRMED' && (
                        <Badge variant="success" className="py-2">
                          <UserCheck className="w-4 h-4 ml-1" />
                          אישרת הגעה
                        </Badge>
                      )}

                      {amCreator && activity.status === 'OPEN' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm('האם לבטל את הפעילות?')) {
                              cancelMutation.mutate(activity.id);
                            }
                          }}
                          isLoading={cancelMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          בטל פעילות
                        </Button>
                      )}
                    </div>

                    {/* Confirmed Participants Preview */}
                    {confirmedList.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2">
                          אישרו הגעה ({confirmedList.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {confirmedList.slice(0, 5).map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs"
                            >
                              <UserCheck className="w-3 h-3" />
                              {p.user.fullName}
                            </div>
                          ))}
                          {confirmedList.length > 5 && (
                            <span className="text-xs text-gray-500">
                              +{confirmedList.length - 5} נוספים
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expand/Collapse Participants */}
                    {activity.participants.length > 0 && (
                      <button
                        onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                        className="flex items-center gap-1 text-sm text-military-600 hover:text-military-800"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            הסתר משתתפים
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            הצג כל המשתתפים ({activity.participants.length})
                          </>
                        )}
                      </button>
                    )}

                    {/* Expanded Participants List */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid gap-2">
                          {activity.participants.map((p) => (
                            <div
                              key={p.id}
                              className={cn(
                                'flex items-center justify-between p-2 rounded-lg',
                                p.status === 'CONFIRMED' && 'bg-green-50',
                                p.status === 'JOINED' && 'bg-yellow-50',
                                p.status === 'CANCELLED' && 'bg-gray-50 opacity-50'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {p.status === 'CONFIRMED' ? (
                                  <UserCheck className="w-4 h-4 text-green-600" />
                                ) : p.status === 'JOINED' ? (
                                  <Users className="w-4 h-4 text-yellow-600" />
                                ) : (
                                  <X className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="font-medium">{p.user.fullName}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {p.status === 'CONFIRMED' && p.confirmedAt
                                  ? `אושר ${formatDate(p.confirmedAt, 'HH:mm')}`
                                  : formatDate(p.joinedAt, 'HH:mm')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">אין פעילויות פתוחות כרגע</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 ml-2" />
                צור יוזמה חדשה
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Activity Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="יוזמה חברתית חדשה"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="כותרת הפעילות"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="לדוגמה: ארוחת צהריים משותפת"
          />

          <div>
            <label className="label">תיאור / תכנון (אופציונלי)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פרטים נוספים על הפעילות..."
              className="input min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          <Input
            label="מקום"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="לדוגמה: מסעדת שווארמה בכניסה לבסיס"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">זמן התחלה</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">זמן סיום (אופציונלי)</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <Input
            label="מקסימום משתתפים (אופציונלי)"
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="השאר ריק ללא הגבלה"
            min={2}
          />

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleCreate}
              isLoading={createMutation.isPending}
              className="flex-1"
            >
              <Plus className="w-4 h-4 ml-2" />
              צור יוזמה
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </UserLayout>
  );
}
