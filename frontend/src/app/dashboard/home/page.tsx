'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Bell, Calendar, MapPin, Building2, User, Phone, ChevronLeft, CheckCircle2, Image, FlaskConical, RotateCcw, Copy, Check, BellRing, Timer } from 'lucide-react';
import { PushNotificationToggle } from '@/components/ui/PushNotificationToggle';
import { PWAInstallPrompt, usePWAInstall } from '@/components/ui/PWAInstallPrompt';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import api from '@/lib/api';
import { MILITARY_ROLE_LABELS, MilitaryRole, MessageTargetAudience, ShiftType, SHIFT_TYPE_LABELS, ReserveServiceCycle, ServiceAttendance } from '@/types';
import { formatWhatsAppLink, formatDate } from '@/lib/utils';

interface TestUser {
  personalId: string;
  fullName: string;
  email: string;
  role: string;
  scenario: string;
  password: string;
}

interface TestSetupResult {
  registeredUsers: number;
  createdShifts: number;
  createdWorkloadShifts: number;
  createdLeaves: number;
  createdMessages: number;
  shiftOfficer: { fullName: string; personalId: string } | null;
  todayShiftsSummary: {
    morning: number;
    afternoon: number;
    night: number;
    total: number;
  };
  sampleUsers: TestUser[];
}

interface RollbackResult {
  deletedShifts: number;
  deletedSchedules: number;
  deletedLeaves: number;
  deletedMessages: number;
  deletedServiceCycles: number;
  resetUsers: number;
}

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
  // Service cycle data
  activeCycle?: ReserveServiceCycle | null;
  myAttendance?: ServiceAttendance | null;
}

// Calculate days since cycle start
function calculateDaysSinceStart(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 to count the first day
}

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuth();
  const queryClient = useQueryClient();

  // PWA install prompt
  const { showPrompt: showPWAPrompt, closePrompt: closePWAPrompt } = usePWAInstall();

  // Push notification state
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribePush } = usePushNotifications();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const PUSH_PROMPT_DISMISSED_KEY = 'push-prompt-dismissed';

  // Test setup state (only for personalId 1234567)
  const [testResults, setTestResults] = useState<TestSetupResult | null>(null);
  const [rollbackResults, setRollbackResults] = useState<RollbackResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check and show push notification prompt
  useEffect(() => {
    if (!pushSupported || pushSubscribed || pushLoading) return;

    // Check if user dismissed the prompt recently
    const dismissed = localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      if (dismissedTime > threeDaysAgo) return;
    }

    // Show prompt after a delay
    const timer = setTimeout(() => {
      setShowPushPrompt(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [pushSupported, pushSubscribed, pushLoading]);

  const handleEnablePush = async () => {
    const success = await subscribePush();
    if (success) {
      toast.success('התראות הופעלו בהצלחה!');
    }
    setShowPushPrompt(false);
  };

  const handleDismissPush = () => {
    localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, Date.now().toString());
    setShowPushPrompt(false);
  };

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

  // Fetch current service cycle and attendance status
  const { data: currentCycle } = useQuery<ReserveServiceCycle | null>({
    queryKey: ['current-service-cycle'],
    queryFn: async () => {
      const response = await api.get('/service-cycles/current');
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });

  const { data: myAttendance } = useQuery<ServiceAttendance>({
    queryKey: ['my-service-attendance'],
    queryFn: async () => {
      const response = await api.get('/service-attendance/current/me');
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && !!currentCycle,
  });

  // Redirect to current-service if active cycle and not confirmed arrival
  useEffect(() => {
    if (
      currentCycle?.status === 'ACTIVE' &&
      myAttendance &&
      myAttendance.attendanceStatus === 'PENDING'
    ) {
      router.push('/dashboard/current-service');
    }
  }, [currentCycle, myAttendance, router]);

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

  // Test setup mutations (only for personalId 1234567)
  const runTestSetupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/test-setup/run');
      return response.data as TestSetupResult;
    },
    onSuccess: (data) => {
      setTestResults(data);
      setRollbackResults(null);
      toast.success(`נוצרו ${data.registeredUsers} משתמשים, ${data.createdShifts} משמרות, ${data.createdLeaves} יציאות`);
    },
    onError: () => {
      toast.error('שגיאה בהרצת הסקריפט');
    },
  });

  const rollbackTestDataMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/test-setup/rollback');
      return response.data as RollbackResult;
    },
    onSuccess: (data) => {
      setRollbackResults(data);
      setTestResults(null);
      toast.success(`נמחקו ${data.deletedShifts} משמרות, ${data.deletedLeaves} יציאות, ${data.resetUsers} משתמשים אופסו`);
    },
    onError: () => {
      toast.error('שגיאה בביטול הנתונים');
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Use data from homeData instead of separate queries
  const notifications = homeData?.notifications || [];
  const messages = homeData?.messages || [];

  // Calculate days in service
  const daysInService = currentCycle?.status === 'ACTIVE' && myAttendance?.attendanceStatus === 'ARRIVED'
    ? calculateDaysSinceStart(currentCycle.startDate)
    : null;

  return (
    <UserLayout>
      {/* PWA Install Prompt */}
      {showPWAPrompt && <PWAInstallPrompt onClose={closePWAPrompt} />}

      {/* Push Notification Prompt */}
      {showPushPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-military-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BellRing className="w-8 h-8 text-military-600" />
              </div>
              <h3 className="text-xl font-bold text-military-700 mb-2">
                הפעל התראות
              </h3>
              <p className="text-gray-600 mb-6">
                קבל התראות על משמרות, הודעות חשובות ועדכונים חדשים ישירות למכשיר שלך
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleDismissPush}
                  className="flex-1"
                >
                  לא עכשיו
                </Button>
                <Button
                  onClick={handleEnablePush}
                  className="flex-1"
                >
                  <BellRing className="w-4 h-4 ml-2" />
                  הפעל התראות
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <>
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

            {/* Days in Service Counter */}
            {daysInService !== null && (
              <div className="mt-3 p-3 bg-gradient-to-r from-military-100 to-military-50 rounded-xl border border-military-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-military-600" />
                    <span className="text-sm font-medium text-military-700">ימים בסבב:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-military-700">{daysInService}</span>
                    <span className="text-sm text-military-600">ימים</span>
                  </div>
                </div>
                {currentCycle && (
                  <p className="text-xs text-gray-500 mt-1">
                    {currentCycle.name} • התחלה: {new Date(currentCycle.startDate).toLocaleDateString('he-IL')}
                  </p>
                )}
              </div>
            )}
            </>
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
            משמרות
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

      {/* Test Setup Section - Only for personalId 1234567 */}
      {user?.personalId === '1234567' && (
        <Card className="mt-4 border-purple-200 bg-purple-50/50">
          <CardHeader className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            <span className="text-purple-800">כלי בדיקות (מפתחים)</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                כלי זה מאפשר להריץ סקריפט בדיקות שירשום את כל המשתמשים הלא רשומים עם נתוני בדיקה,
                ויצור משמרות, יציאות והודעות לבדיקה.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => runTestSetupMutation.mutate()}
                  isLoading={runTestSetupMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <FlaskConical className="w-4 h-4 ml-2" />
                  הרץ הגדרת בדיקה
                </Button>
                <Button
                  onClick={() => rollbackTestDataMutation.mutate()}
                  isLoading={rollbackTestDataMutation.isPending}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  בטל נתוני בדיקה
                </Button>
              </div>

              {/* Test Results */}
              {testResults && (
                <div className="bg-white rounded-lg p-4 border border-purple-200 space-y-4">
                  <h4 className="font-bold text-purple-800">תוצאות הרצה</h4>

                  {/* Shift Officer */}
                  {testResults.shiftOfficer && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-800">
                        <span className="font-medium">קצין תורן היום:</span>
                        <span>{testResults.shiftOfficer.fullName}</span>
                        <span className="text-xs text-blue-600">(מ.א. {testResults.shiftOfficer.personalId})</span>
                      </div>
                    </div>
                  )}

                  {/* Today's Shifts Summary */}
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <h5 className="font-medium text-yellow-800 mb-2">משמרות היום:</h5>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="text-lg font-bold text-yellow-600">{testResults.todayShiftsSummary.morning}</div>
                        <div className="text-xs">בוקר</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">{testResults.todayShiftsSummary.afternoon}</div>
                        <div className="text-xs">צהריים</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">{testResults.todayShiftsSummary.night}</div>
                        <div className="text-xs">לילה</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-800">{testResults.todayShiftsSummary.total}</div>
                        <div className="text-xs">סה״כ</div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="bg-purple-50 p-2 rounded text-center">
                      <div className="text-xl font-bold text-purple-600">{testResults.registeredUsers}</div>
                      <div className="text-xs text-gray-600">משתמשים נרשמו</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded text-center">
                      <div className="text-xl font-bold text-purple-600">{testResults.createdShifts}</div>
                      <div className="text-xs text-gray-600">משמרות היום</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded text-center">
                      <div className="text-xl font-bold text-purple-600">{testResults.createdWorkloadShifts}</div>
                      <div className="text-xs text-gray-600">עומסים (7 ימים)</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded text-center">
                      <div className="text-xl font-bold text-purple-600">{testResults.createdLeaves}</div>
                      <div className="text-xs text-gray-600">יציאות</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded text-center">
                      <div className="text-xl font-bold text-purple-600">{testResults.createdMessages}</div>
                      <div className="text-xs text-gray-600">הודעות</div>
                    </div>
                  </div>

                  {/* Sample Users with Scenarios */}
                  {testResults.sampleUsers.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">5 משתמשי בדיקה עם תרחישים:</h5>
                      <div className="space-y-2">
                        {testResults.sampleUsers.map((testUser, index) => (
                          <div
                            key={testUser.personalId}
                            className={`p-3 rounded-lg border ${
                              index === 0 ? 'bg-blue-50 border-blue-200' :
                              index === 1 ? 'bg-green-50 border-green-200' :
                              index === 2 ? 'bg-orange-50 border-orange-200' :
                              index === 3 ? 'bg-yellow-50 border-yellow-200' :
                              'bg-purple-50 border-purple-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{testUser.fullName}</span>
                                  <span className="text-xs px-2 py-0.5 bg-white rounded">{testUser.role}</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">{testUser.scenario}</div>
                                <div className="text-xs text-gray-500 mt-1 font-mono">
                                  מ.א.: {testUser.personalId} | סיסמה: {testUser.password}
                                </div>
                              </div>
                              <button
                                onClick={() => copyToClipboard(
                                  `מ.א.: ${testUser.personalId}\nסיסמה: ${testUser.password}`,
                                  testUser.personalId
                                )}
                                className="p-2 hover:bg-white rounded-lg"
                                title="העתק פרטי התחברות"
                              >
                                {copiedId === testUser.personalId ? (
                                  <Check className="w-5 h-5 text-green-500" />
                                ) : (
                                  <Copy className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rollback Results */}
              {rollbackResults && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-bold text-green-800 mb-3">תוצאות ביטול</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">{rollbackResults.deletedShifts}</div>
                      <div className="text-xs text-gray-600">משמרות נמחקו</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">{rollbackResults.deletedSchedules}</div>
                      <div className="text-xs text-gray-600">סידורים נמחקו</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">{rollbackResults.deletedLeaves}</div>
                      <div className="text-xs text-gray-600">יציאות נמחקו</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">{rollbackResults.deletedMessages}</div>
                      <div className="text-xs text-gray-600">הודעות נמחקו</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">{rollbackResults.deletedServiceCycles}</div>
                      <div className="text-xs text-gray-600">סבבים נמחקו</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">{rollbackResults.resetUsers}</div>
                      <div className="text-xs text-gray-600">משתמשים אופסו</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </UserLayout>
  );
}
