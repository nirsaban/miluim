'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Bell, Calendar, MapPin, Building2, User, Phone, ChevronLeft, ChevronRight, CheckCircle2, Image, FlaskConical, RotateCcw, Copy, Check, BellRing, Timer, AlertCircle, Info, Megaphone } from 'lucide-react';
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
import { formatWhatsAppLink, formatDate, cn } from '@/lib/utils';

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

// Inline Carousel Component for Messages
interface CarouselMessage {
  id: string;
  title: string;
  content: string;
  priority?: string;
  type?: string;
  createdAt: string;
  requiresConfirmation?: boolean;
  isConfirmed?: boolean;
}

function useCarousel(itemCount: number, autoSlideInterval = 5000) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToNext = useCallback(() => {
    if (itemCount > 1) {
      setCurrentIndex((prev) => (prev + 1) % itemCount);
    }
  }, [itemCount]);

  const goToPrev = useCallback(() => {
    if (itemCount > 1) {
      setCurrentIndex((prev) => (prev - 1 + itemCount) % itemCount);
    }
  }, [itemCount]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (isPaused || itemCount <= 1) return;

    const timer = setInterval(goToNext, autoSlideInterval);
    return () => clearInterval(timer);
  }, [autoSlideInterval, goToNext, isPaused, itemCount]);

  // Reset index if items change
  useEffect(() => {
    if (currentIndex >= itemCount && itemCount > 0) {
      setCurrentIndex(0);
    }
  }, [itemCount, currentIndex]);

  return {
    currentIndex,
    goToNext,
    goToPrev,
    goToIndex,
    setIsPaused,
  };
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

  // Use data from homeData - sort DESC by createdAt
  const notifications = [...(homeData?.notifications || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const messages = [...(homeData?.messages || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Carousel hooks for messages
  const messagesCarousel = useCarousel(messages.length, 6000);
  const notificationsCarousel = useCarousel(notifications.length, 5000);

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

      {/* Welcome Section - Improved Structure */}
      <div className="mb-5 sm:mb-6">
        <div className="bg-gradient-to-l from-military-50 via-white to-white rounded-2xl p-4 sm:p-5 border border-military-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-military-600 to-military-800 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl sm:text-2xl">
                  {user?.fullName?.charAt(0) || 'י'}
                </span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-military-700">
                  ברוך שובך, {user?.fullName?.split(' ')[0]}
                </h1>
                <p className="text-sm text-gray-500">
                  {user?.militaryRole ? MILITARY_ROLE_LABELS[user.militaryRole] : 'מילטק'}
                </p>
                {currentCycle?.status === 'ACTIVE' && myAttendance?.attendanceStatus === 'ARRIVED' && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-600 font-medium">במילואים</span>
                  </div>
                )}
              </div>
            </div>
            {/* Day Counter Badge */}
            {daysInService !== null && (
              <div className="text-center bg-military-600 text-white px-4 py-2 rounded-xl shadow-md">
                <div className="text-2xl sm:text-3xl font-bold">{daysInService}</div>
                <div className="text-xs opacity-90">ימים</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Info Card - Compact */}
      <Card className="mb-4">
        <CardContent className="py-3 sm:py-4">
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 bg-military-100 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-military-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-gray-400 text-[10px] block">אזור</span>
                  <span className="font-medium text-gray-900 text-xs truncate block">{homeData?.user?.activeZone?.name || 'לא מוגדר'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                <div className="p-1.5 bg-military-100 rounded-lg">
                  <Building2 className="w-3.5 h-3.5 text-military-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-gray-400 text-[10px] block">מחלקה</span>
                  <span className="font-medium text-gray-900 text-xs truncate block">{homeData?.user?.department?.name || user?.department?.name || 'לא מוגדר'}</span>
                </div>
              </div>
              {homeData?.user?.commander && (
                <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-xl col-span-2 sm:col-span-2">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <Phone className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-gray-400 text-[10px] block">מפקד</span>
                    <a
                      href={formatWhatsAppLink(homeData.user.commander.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-green-600 hover:underline text-xs truncate block"
                    >
                      {homeData.user.commander.fullName}
                    </a>
                  </div>
                </div>
              )}
              {/* Service cycle info when active */}
              {currentCycle?.status === 'ACTIVE' && (
                <div className={cn(
                  "flex items-center gap-2 p-2.5 rounded-xl",
                  homeData?.user?.commander ? "col-span-2 sm:col-span-4" : "col-span-2",
                  "bg-military-50 border border-military-100"
                )}>
                  <div className="p-1.5 bg-military-100 rounded-lg">
                    <Timer className="w-3.5 h-3.5 text-military-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-400 text-[10px] block">סבב נוכחי</span>
                    <span className="font-medium text-military-700 text-xs truncate block">{currentCycle.name}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Shifts Summary - Improved Visibility */}
      <Card className="mb-4 border-military-200 shadow-card">
        <CardHeader className="flex items-center justify-between bg-gradient-to-l from-military-50 to-transparent">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-military-100 rounded-lg">
              <Calendar className="w-5 h-5 text-military-600" />
            </div>
            <span className="font-bold text-military-800">המשמרות שלי</span>
          </div>
          <Link
            href="/dashboard/shifts"
            className="text-sm text-military-600 hover:text-military-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-military-100 transition-colors"
          >
            לוח משמרות
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : homeData?.currentShift || homeData?.nextShift ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Current Shift */}
              {homeData?.currentShift && (
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 border-2 border-green-300 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-sm">
                      משמרת נוכחית
                    </span>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg text-green-800">
                      {homeData.currentShift.shiftTemplate.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100/50 rounded-lg px-3 py-2">
                    <Timer className="w-4 h-4" />
                    <span className="font-medium">
                      {homeData.currentShift.shiftTemplate.startTime} - {homeData.currentShift.shiftTemplate.endTime}
                    </span>
                  </div>
                  {homeData.currentShift.task && (
                    <div className="mt-2 text-sm text-green-700">
                      <span className="font-medium">משימה:</span> {homeData.currentShift.task.name}
                      {homeData.currentShift.task.zone && (
                        <span className="text-green-600"> • {homeData.currentShift.task.zone.name}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Next Shift */}
              {homeData?.nextShift && (
                <div className={cn(
                  "bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-300 rounded-xl p-4 shadow-sm",
                  !homeData?.currentShift && "sm:col-span-2"
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-sm">
                      משמרת הבאה
                    </span>
                    {homeData.nextShift.date && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        {new Date(homeData.nextShift.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg text-blue-800">
                      {homeData.nextShift.shiftTemplate.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100/50 rounded-lg px-3 py-2">
                    <Timer className="w-4 h-4" />
                    <span className="font-medium">
                      {homeData.nextShift.shiftTemplate.startTime} - {homeData.nextShift.shiftTemplate.endTime}
                    </span>
                  </div>
                  {homeData.nextShift.task && (
                    <div className="mt-2 text-sm text-blue-700">
                      <span className="font-medium">משימה:</span> {homeData.nextShift.task.name}
                      {homeData.nextShift.task.zone && (
                        <span className="text-blue-600"> • {homeData.nextShift.task.zone.name}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-4">לא משובץ למשמרות כרגע</p>
              <Link
                href="/dashboard/shifts"
                className="inline-flex items-center gap-1 text-military-600 hover:text-military-700 font-medium bg-military-100 px-4 py-2 rounded-lg hover:bg-military-200 transition-colors"
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

      {/* System Notifications - Carousel */}
      <Card className="mb-4">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-500" />
            <span>התראות מערכת</span>
            {notifications.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 1 && (
              <span className="text-xs text-gray-400">{notificationsCarousel.currentIndex + 1}/{notifications.length}</span>
            )}
            <PushNotificationToggle />
          </div>
        </CardHeader>
        <CardContent>
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-gray-500 py-4">אין התראות חדשות</p>
          ) : (
            <div className="relative">
              {/* Carousel Container - LTR for proper slide behavior */}
              <div className="overflow-hidden rounded-xl" dir="ltr">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${notificationsCarousel.currentIndex * 100}%)` }}
                >
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="w-full flex-shrink-0"
                      style={{ minWidth: '100%' }}
                    >
                      {/* Content wrapper with RTL */}
                      <div dir="rtl" className="p-4 rounded-xl border-r-4 bg-gradient-to-l from-blue-50 to-white border-blue-500 min-h-[80px]">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                            <Bell className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-900">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.content}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {formatDate(notification.createdAt, 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows - RTL: Left=Next, Right=Prev */}
              {notifications.length > 1 && (
                <>
                  <button
                    onClick={notificationsCarousel.goToPrev}
                    className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1 w-8 h-8 bg-white/90 shadow-md rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
                    aria-label="התראה קודמת"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={notificationsCarousel.goToNext}
                    className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1 w-8 h-8 bg-white/90 shadow-md rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
                    aria-label="התראה הבאה"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {notifications.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {notifications.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => notificationsCarousel.goToIndex(index)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        index === notificationsCarousel.currentIndex
                          ? "bg-blue-500 w-4"
                          : "bg-gray-300 hover:bg-gray-400"
                      )}
                      aria-label={`עבור להתראה ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Messages - Carousel */}
      <Card className="mb-4">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-military-600" />
            <span>הודעות יומיות</span>
            {messages.length > 0 && (
              <span className="bg-military-100 text-military-700 text-xs px-2 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </div>
          {messages.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">{messagesCarousel.currentIndex + 1}/{messages.length}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {homeLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500 py-4">אין הודעות חדשות</p>
          ) : (
            <div className="relative">
              {/* Carousel Container - LTR for proper slide behavior */}
              <div className="overflow-hidden rounded-xl" dir="ltr">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${messagesCarousel.currentIndex * 100}%)` }}
                >
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="w-full flex-shrink-0"
                      style={{ minWidth: '100%' }}
                    >
                      {/* Content wrapper with RTL */}
                      <div
                        dir="rtl"
                        className={cn(
                          "p-4 rounded-xl border-r-4 min-h-[100px]",
                          message.priority === 'CRITICAL'
                            ? 'bg-red-50 border-red-500'
                            : message.priority === 'HIGH'
                              ? 'bg-orange-50 border-orange-500'
                              : 'bg-military-50 border-military-400'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {message.priority === 'CRITICAL' && (
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              )}
                              {message.priority === 'HIGH' && (
                                <Info className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              )}
                              <h4 className="font-bold text-sm text-gray-900 truncate">{message.title}</h4>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-3">{message.content}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {formatDate(message.createdAt, 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          {message.requiresConfirmation && (
                            <div className="flex-shrink-0">
                              {message.isConfirmed ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2.5 py-1.5 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  אושר
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => confirmMessageMutation.mutate(message.id)}
                                  isLoading={confirmMessageMutation.isPending}
                                  className="text-xs"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                                  אשר קריאה
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows - RTL: Left=Next, Right=Prev */}
              {messages.length > 1 && (
                <>
                  <button
                    onClick={messagesCarousel.goToPrev}
                    className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1 w-8 h-8 bg-white/90 shadow-md rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
                    aria-label="הודעה קודמת"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={messagesCarousel.goToNext}
                    className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1 w-8 h-8 bg-white/90 shadow-md rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
                    aria-label="הודעה הבאה"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {messages.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {messages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => messagesCarousel.goToIndex(index)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        index === messagesCarousel.currentIndex
                          ? "bg-military-600 w-4"
                          : "bg-gray-300 hover:bg-gray-400"
                      )}
                      aria-label={`עבור להודעה ${index + 1}`}
                    />
                  ))}
                </div>
              )}
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
