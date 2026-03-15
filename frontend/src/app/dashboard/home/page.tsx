'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Bell, Calendar, MapPin, Building2, User, Phone, ChevronLeft } from 'lucide-react';
import { PushNotificationToggle } from '@/components/ui/PushNotificationToggle';
import Link from 'next/link';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { MILITARY_ROLE_LABELS, MilitaryRole } from '@/types';
import { formatWhatsAppLink } from '@/lib/utils';

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
    createdAt: string;
  }>;
}

export default function HomePage() {
  const { user, isAuthenticated, isHydrated } = useAuth();

  const { data: homeData, isLoading: homeLoading } = useQuery<HomeData>({
    queryKey: ['home-data'],
    queryFn: async () => {
      const response = await api.get('/users/me/home');
      return response.data;
    },
    // Only run query when auth is confirmed ready
    enabled: isAuthenticated && isHydrated,
  });

  // Use data from homeData instead of separate queries
  const notifications = homeData?.notifications || [];
  const messages = homeData?.messages || [];

  return (
    <UserLayout>
      {/* Welcome Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-military-700 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-xl">
              {user?.fullName?.charAt(0) || 'י'}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-military-700">
              ברוך שובך, {user?.fullName}
            </h1>
            <p className="text-sm text-gray-600">מערכת פלוגת יוגב</p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="mb-4">
        <CardContent className="py-4">
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">אזור פעילות:</span>
                <span className="font-medium">{homeData?.user?.activeZone?.name || 'לא מוגדר'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">מחלקה:</span>
                <span className="font-medium">{homeData?.user?.department?.name || user?.department?.name || 'לא מוגדר'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">תפקיד:</span>
                <span className="font-medium">
                  {user?.militaryRole ? MILITARY_ROLE_LABELS[user.militaryRole] : 'לא מוגדר'}
                </span>
              </div>
              {homeData?.user?.commander && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">מפקד:</span>
                  <a
                    href={formatWhatsAppLink(homeData.user.commander.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-green-600 hover:underline"
                  >
                    {homeData.user.commander.fullName}
                  </a>
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
              {messages.slice(0, 3).map((message) => (
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
                  <h4 className="font-medium text-sm">{message.title}</h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </UserLayout>
  );
}
