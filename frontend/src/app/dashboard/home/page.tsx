'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Bell, Calendar, MapPin, Building2, User, Phone, ChevronLeft, CheckCircle2, Image } from 'lucide-react';
import { PushNotificationToggle } from '@/components/ui/PushNotificationToggle';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { MILITARY_ROLE_LABELS, MilitaryRole, MessageTargetAudience, ShiftType, SHIFT_TYPE_LABELS } from '@/types';
import { formatWhatsAppLink, formatDate } from '@/lib/utils';

interface ShiftPost {
  id: string;
  date: string;
  shiftType: ShiftType;
  message?: string;
  imageUrl?: string;
  createdAt: string;
}

interface ShiftInfo {
  id: string;
  date: string;
  shiftTemplate: {
    displayName: string;
    startTime: string;
    endTime: string;
  };
  task?: {
    name: string;
    zone?: {
      id: string;
      name: string;
    };
  };
}

interface HomeData {
  user: {
    fullName: string;
    militaryRole: MilitaryRole;
    department?: {
      id: string;
      name: string;
    };
    activeZone?: {
      id: string;
      name: string;
    } | null;
    commander?: {
      id: string;
      fullName: string;
      phone: string;
      militaryRole?: MilitaryRole;
    } | null;
  };
  currentShift: ShiftInfo | null;
  nextShift: ShiftInfo | null;
  notifications: Array<{
    id: string;
    title: string;
    content: string;
    isRead: boolean;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    title: string;
    content: string;
    priority: string;
    type: string;
    targetAudience: MessageTargetAudience;
    requiresConfirmation: boolean;
    isConfirmed?: boolean;
    confirmedAt?: string | null;
    createdAt: string;
  }>;
}

export default function HomePage() {
  const { user, isAuthenticated, isHydrated } = useAuth();
  const queryClient = useQueryClient();

  const { data: homeData, isLoading: homeLoading } = useQuery<HomeData>({
    queryKey: ['home-data'],
    queryFn: async () => {
      const response = await api.get('/users/me/home');
      return response.data;
    },
    // Only run query when auth is confirmed ready
    enabled: isAuthenticated && isHydrated,
  });

  const { data: shiftPosts } = useQuery<ShiftPost[]>({
    queryKey: ['shift-posts-latest'],
    queryFn: async () => {
      const response = await api.get('/shifts/latest?limit=3');
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });

  const confirmMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await api.post(`/messages/${messageId}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-data'] });
      toast.success('אישור קריאה נשמר');
    },
    onError: () => {
      toast.error('שגיאה בשמירת אישור הקריאה');
    },
  });

  // Use data from homeData instead of separate queries
  const notifications = homeData?.notifications || [];
  const messages = homeData?.messages || [];

  return (
    <UserLayout>
      {/* Welcome Section */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-military-600 to-military-800 rounded-2xl flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg sm:text-xl">
              {user?.fullName?.charAt(0) || 'י'}
            </span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-military-700">
              ברוך שובך, {user?.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">מערכת פלוגת יוגב</p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="mb-4">
        <CardContent className="py-3 sm:py-4">
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-2 bg-military-100 rounded-lg">
                  <MapPin className="w-4 h-4 text-military-600" />
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">אזור פעילות</span>
                  <span className="font-medium text-gray-900">{homeData?.user?.activeZone?.name || 'לא מוגדר'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-2 bg-military-100 rounded-lg">
                  <Building2 className="w-4 h-4 text-military-600" />
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">מחלקה</span>
                  <span className="font-medium text-gray-900">{homeData?.user?.department?.name || user?.department?.name || 'לא מוגדר'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-2 bg-military-100 rounded-lg">
                  <User className="w-4 h-4 text-military-600" />
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">תפקיד</span>
                  <span className="font-medium text-gray-900">
                    {user?.militaryRole ? MILITARY_ROLE_LABELS[user.militaryRole] : 'לא מוגדר'}
                  </span>
                </div>
              </div>
              {homeData?.user?.commander && (
                <div className="flex items-center gap-2.5 p-2.5 bg-green-50 rounded-xl">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">מפקד</span>
                    <a
                      href={formatWhatsAppLink(homeData.user.commander.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-green-600 hover:underline"
                    >
                      {homeData.user.commander.fullName}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Shifts Summary */}
      <Card className="mb-4">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-military-600" />
            <span>המשמרות שלי</span>
          </div>
          <Link
            href="/dashboard/shifts"
            className="text-sm text-military-600 hover:text-military-700 flex items-center gap-1"
          >
            צפייה בכל המשמרות
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : homeData?.currentShift || homeData?.nextShift ? (
            <div className="space-y-3">
              {/* Current Shift */}
              {homeData?.currentShift && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded">משמרת נוכחית</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-green-700">
                      {homeData.currentShift.shiftTemplate.displayName}
                    </span>
                    <span className="text-sm text-gray-600">
                      {homeData.currentShift.shiftTemplate.startTime} - {homeData.currentShift.shiftTemplate.endTime}
                    </span>
                  </div>
                  {homeData.currentShift.task && (
                    <p className="text-sm text-gray-600">
                      משימה: {homeData.currentShift.task.name}
                      {homeData.currentShift.task.zone && ` • ${homeData.currentShift.task.zone.name}`}
                    </p>
                  )}
                </div>
              )}

              {/* Next Shift */}
              {homeData?.nextShift && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">משמרת הבאה</span>
                    {homeData.nextShift.date && (
                      <span className="text-xs text-gray-500">
                        {new Date(homeData.nextShift.date).toLocaleDateString('he-IL')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-blue-700">
                      {homeData.nextShift.shiftTemplate.displayName}
                    </span>
                    <span className="text-sm text-gray-600">
                      {homeData.nextShift.shiftTemplate.startTime} - {homeData.nextShift.shiftTemplate.endTime}
                    </span>
                  </div>
                  {homeData.nextShift.task && (
                    <p className="text-sm text-gray-600">
                      משימה: {homeData.nextShift.task.name}
                      {homeData.nextShift.task.zone && ` • ${homeData.nextShift.task.zone.name}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-3">לא משובץ למשמרות כרגע</p>
              <Link
                href="/dashboard/shifts"
                className="inline-flex items-center gap-1 text-military-600 hover:text-military-700 font-medium"
              >
                צפייה בלוח המשמרות
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Posts Section */}
      {shiftPosts && shiftPosts.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-600" />
              <span>סידור משמרות</span>
            </div>
            <Link
              href="/dashboard/shifts"
              className="text-sm text-military-600 hover:text-military-700 flex items-center gap-1"
            >
              צפייה בכל הסידורים
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {shiftPosts.map((post) => (
                <div
                  key={post.id}
                  className="relative rounded-lg overflow-hidden border border-gray-200 group cursor-pointer"
                >
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={`סידור משמרת ${formatDate(post.date, 'dd/MM')}`}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <div className="flex items-center justify-between text-white">
                      <span className="text-xs font-medium">
                        {formatDate(post.date, 'dd/MM/yyyy')}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-purple-500 rounded">
                        {SHIFT_TYPE_LABELS[post.shiftType]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Notifications */}
      <Card className="mb-4">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-500" />
            <span>התראות מערכת</span>
            {notifications.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <PushNotificationToggle />
        </CardHeader>
        <CardContent>
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-gray-500 py-4">אין התראות חדשות</p>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 rounded-lg border-r-4 bg-blue-50 border-blue-500"
                >
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{notification.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Messages */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <span>הודעות יומיות</span>
        </CardHeader>
        <CardContent>
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500 py-4">אין הודעות חדשות</p>
          ) : (
            <div className="space-y-3">
              {messages.slice(0, 5).map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg border-r-4 ${
                    message.priority === 'CRITICAL'
                      ? 'bg-red-50 border-red-500'
                      : message.priority === 'HIGH'
                        ? 'bg-orange-50 border-orange-500'
                        : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{message.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{message.content}</p>
                    </div>
                    {message.requiresConfirmation && (
                      <div className="flex-shrink-0">
                        {message.isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            אושר
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => confirmMessageMutation.mutate(message.id)}
                            isLoading={confirmMessageMutation.isPending}
                            className="text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 ml-1" />
                            אשר קריאה
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </UserLayout>
  );
}
