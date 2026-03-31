'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Camera, Star, Utensils, ChevronLeft, MapPin, Clock, Users, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { SocialActivity } from '@/types';

interface SocialSectionProps {
  className?: string;
}

export function SocialSection({ className }: SocialSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch social activities
  const { data: activities, isLoading } = useQuery<SocialActivity[]>({
    queryKey: ['social-activities'],
    queryFn: async () => {
      const response = await api.get('/social-activities');
      return response.data;
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

  // Filter only open activities and get the last 5
  const openActivities = activities
    ?.filter((a) => a.status === 'OPEN')
    .slice(0, 5) || [];

  // Check if user is already a participant
  const isParticipant = (activity: SocialActivity) => {
    return activity.participants.some((p) => p.userId === user?.id) || activity.createdById === user?.id;
  };

  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span>חברתי והמלצות</span>
        </div>
        <Link
          href="/dashboard/social"
          className="text-sm text-military-600 hover:text-military-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-military-100 transition-colors"
        >
          עוד
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {/* Social Initiatives Banner */}
        <Link href="/dashboard/social/initiation">
          <div className="mb-4 bg-gradient-to-l from-military-600 to-military-700 rounded-xl p-4 cursor-pointer hover:from-military-700 hover:to-military-800 transition-all">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">יוזמות חברתיות</h3>
                <p className="text-white/80 text-sm truncate">מארגנים יציאה? מזמינים חברים!</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-white/60 flex-shrink-0" />
            </div>
          </div>
        </Link>

        {/* Social Initiatives List */}
        {isLoading ? (
          <div className="flex justify-center py-4 mb-4">
            <Spinner />
          </div>
        ) : openActivities.length > 0 ? (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-gray-500 font-medium">יוזמות פתוחות</p>
            {openActivities.map((activity) => {
              const alreadyJoined = isParticipant(activity);
              return (
                <div
                  key={activity.id}
                  className="p-3 bg-purple-50 border border-purple-200 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {activity.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {activity.place}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(activity.startTime, 'dd/MM HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Users className="w-3 h-3" />
                        <span>
                          {activity._count.participants}
                          {activity.maxParticipants && `/${activity.maxParticipants}`} משתתפים
                        </span>
                      </div>
                    </div>
                    {alreadyJoined ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0">
                        נרשמת
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => joinMutation.mutate(activity.id)}
                        isLoading={joinMutation.isPending}
                        className="flex-shrink-0 text-xs"
                      >
                        <UserPlus className="w-3 h-3 ml-1" />
                        הצטרף
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            <Link
              href="/dashboard/social/initiation"
              className="block text-center text-sm text-purple-600 hover:text-purple-700 py-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              כל היוזמות
            </Link>
          </div>
        ) : null}

        {/* Quick Links Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/dashboard/social"
            className="flex flex-col items-center gap-2 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Camera className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-700">גלריה</span>
          </Link>
          <Link
            href="/dashboard/social"
            className="flex flex-col items-center gap-2 p-3 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors"
          >
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-yellow-700">המלצות</span>
          </Link>
          <Link
            href="/dashboard/social"
            className="flex flex-col items-center gap-2 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Utensils className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-700">מזון</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
