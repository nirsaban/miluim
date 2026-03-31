'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Phone,
  RefreshCw,
  Play,
  X,
  User,
  PhoneCall,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { EmergencyEvent, EmergencyUser } from '@/types';
import { cn } from '@/lib/utils';

interface EmergencyAdminPanelProps {
  className?: string;
}

const DURATION_OPTIONS = [
  { value: 5, label: '5 דקות' },
  { value: 10, label: '10 דקות' },
  { value: 15, label: '15 דקות' },
  { value: 30, label: '30 דקות' },
  { value: 45, label: '45 דקות' },
  { value: 60, label: 'שעה' },
  { value: 90, label: 'שעה וחצי' },
  { value: 120, label: 'שעתיים' },
];

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('פג תוקף');
        setIsExpired(true);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        setIsExpired(false);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={cn(
      'font-mono text-lg font-bold',
      isExpired ? 'text-red-600' : 'text-green-600'
    )}>
      {timeLeft}
    </span>
  );
}

function UserList({
  users,
  title,
  emptyMessage,
  icon,
  variant = 'default',
  showCallAll = false,
  onCallAll,
}: {
  users: EmergencyUser[];
  title: string;
  emptyMessage: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'danger';
  showCallAll?: boolean;
  onCallAll?: () => void;
}) {
  const bgColor = variant === 'success'
    ? 'bg-green-50 border-green-200'
    : variant === 'danger'
    ? 'bg-red-50 border-red-200'
    : 'bg-gray-50 border-gray-200';

  const headerColor = variant === 'success'
    ? 'bg-green-100 text-green-800'
    : variant === 'danger'
    ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-800';

  return (
    <div className={cn('rounded-lg border overflow-hidden', bgColor)}>
      <div className={cn('px-4 py-2 flex items-center justify-between font-medium', headerColor)}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{title} ({users.length})</span>
        </div>
        {showCallAll && users.length > 0 && onCallAll && (
          <button
            onClick={onCallAll}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <PhoneCall className="w-3 h-3" />
            התקשר לכולם
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {users.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-sm">{emptyMessage}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-2 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.fullName}</p>
                    <p className="text-xs text-gray-500">{user.armyNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.reportedAt && (
                    <span className="text-xs text-green-600">
                      {new Date(user.reportedAt).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                  <a
                    href={`tel:${user.phone}`}
                    className="p-1.5 text-military-600 hover:bg-military-50 rounded-full"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmergencyAdminPanel({ className }: EmergencyAdminPanelProps) {
  const queryClient = useQueryClient();
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCallAllModal, setShowCallAllModal] = useState(false);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [currentCallIndex, setCurrentCallIndex] = useState(0);

  // Fetch active emergency
  const { data: emergency, isLoading, refetch } = useQuery<EmergencyEvent | null>({
    queryKey: ['emergency-active'],
    queryFn: async () => {
      const response = await api.get('/emergency/active');
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds when active
  });

  // Start emergency mutation
  const startMutation = useMutation({
    mutationFn: async (data: { title?: string; durationMinutes: number }) => {
      const response = await api.post('/emergency/start', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('מצב חירום הופעל');
      queryClient.invalidateQueries({ queryKey: ['emergency-active'] });
      setShowStartModal(false);
      setTitle('');
      setDurationMinutes(30);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בהפעלת מצב חירום');
    },
  });

  // Cancel emergency mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/emergency/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('מצב חירום בוטל');
      queryClient.invalidateQueries({ queryKey: ['emergency-active'] });
      setShowCancelModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בביטול מצב חירום');
    },
  });

  // Handle "Call All" - opens sequential phone calls
  const handleCallAll = () => {
    if (!emergency?.notReportedUsers?.length) return;
    setCurrentCallIndex(0);
    setShowCallAllModal(true);
  };

  const handleNextCall = () => {
    const users = emergency?.notReportedUsers || [];
    if (currentCallIndex < users.length - 1) {
      setCurrentCallIndex(currentCallIndex + 1);
    } else {
      setShowCallAllModal(false);
      setCurrentCallIndex(0);
    }
  };

  const handleCallCurrent = () => {
    const users = emergency?.notReportedUsers || [];
    if (users[currentCallIndex]) {
      window.location.href = `tel:${users[currentCallIndex].phone}`;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex justify-center py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  // No active emergency - show start button
  if (!emergency) {
    return (
      <>
        <Card className={cn('border-2 border-dashed border-red-300', className)}>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">בדיקת מצב חירום</h3>
              <p className="text-gray-600 mb-6">
                הפעל מצב חירום כדי לבקש מכל הלוחמים לדווח שהם בטוחים
              </p>
              <Button
                onClick={() => setShowStartModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Play className="w-4 h-4 ml-2" />
                הפעל מצב חירום
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Start Emergency Modal */}
        <Modal
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
          title="הפעלת מצב חירום"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">שים לב</p>
                  <p className="text-sm text-red-700">
                    הפעלת מצב חירום תשלח התראה לכל הלוחמים בבסיס ותבקש מהם לדווח שהם בטוחים.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                כותרת (אופציונלי)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="למשל: תרגיל, אירוע ביטחוני..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline ml-1" />
                משך הזמן
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDurationMinutes(option.value)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg border transition-colors',
                      durationMinutes === option.value
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-red-300'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => startMutation.mutate({
                  title: title || undefined,
                  durationMinutes
                })}
                isLoading={startMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <AlertTriangle className="w-4 h-4 ml-2" />
                הפעל מצב חירום
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowStartModal(false)}
              >
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // Active emergency - show status
  const progressPercent = emergency.stats.totalTargetUsers > 0
    ? (emergency.stats.reportedCount / emergency.stats.totalTargetUsers) * 100
    : 0;

  const notReportedUsers = emergency.notReportedUsers || [];

  return (
    <>
      <Card className={cn('border-2 border-red-500 bg-red-50', className)}>
        <CardHeader className="bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="font-bold">מצב חירום פעיל</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetch()}
            className="bg-red-700 hover:bg-red-800 border-red-700 text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title & Time */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {emergency.title || 'בדיקת מצב חירום'}
              </p>
              <p className="text-xs text-gray-500">
                התחיל: {new Date(emergency.startedAt).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">זמן נותר</p>
              <TimeRemaining expiresAt={emergency.expiresAt} />
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">התקדמות</span>
              <span className="font-bold text-green-600">
                {emergency.stats.reportedCount} / {emergency.stats.totalTargetUsers}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 text-center border">
              <Users className="w-5 h-5 mx-auto text-gray-600 mb-1" />
              <p className="text-xl font-bold text-gray-800">
                {emergency.stats.totalTargetUsers}
              </p>
              <p className="text-xs text-gray-500">סה״כ</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <CheckCircle className="w-5 h-5 mx-auto text-green-600 mb-1" />
              <p className="text-xl font-bold text-green-700">
                {emergency.stats.reportedCount}
              </p>
              <p className="text-xs text-green-600">דיווחו</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <XCircle className="w-5 h-5 mx-auto text-red-600 mb-1" />
              <p className="text-xl font-bold text-red-700">
                {emergency.stats.notReportedCount}
              </p>
              <p className="text-xs text-red-600">טרם דיווחו</p>
            </div>
          </div>

          {/* User Lists */}
          <div className="space-y-3">
            <UserList
              users={notReportedUsers}
              title="טרם דיווחו"
              emptyMessage="כולם דיווחו!"
              icon={<XCircle className="w-4 h-4" />}
              variant="danger"
              showCallAll={true}
              onCallAll={handleCallAll}
            />
            <UserList
              users={emergency.reportedUsers || []}
              title="דיווחו בטוח"
              emptyMessage="עדיין אף אחד לא דיווח"
              icon={<CheckCircle className="w-4 h-4" />}
              variant="success"
            />
          </div>

          {/* Cancel Button */}
          <div className="pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowCancelModal(true)}
              className="w-full border-red-300 text-red-600 hover:bg-red-100"
            >
              <X className="w-4 h-4 ml-2" />
              בטל מצב חירום
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="ביטול מצב חירום"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            האם אתה בטוח שברצונך לבטל את מצב החירום?
          </p>
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={() => cancelMutation.mutate(emergency.id)}
              isLoading={cancelMutation.isPending}
              className="flex-1"
            >
              כן, בטל
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCancelModal(false)}
            >
              לא
            </Button>
          </div>
        </div>
      </Modal>

      {/* Call All Modal - Sequential Calling */}
      <Modal
        isOpen={showCallAllModal}
        onClose={() => setShowCallAllModal(false)}
        title="התקשר לכל מי שטרם דיווח"
        size="sm"
      >
        <div className="space-y-4">
          {notReportedUsers[currentCallIndex] && (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-red-600" />
                </div>
                <p className="font-bold text-lg">
                  {notReportedUsers[currentCallIndex].fullName}
                </p>
                <p className="text-gray-500 text-sm">
                  {notReportedUsers[currentCallIndex].phone}
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  {currentCallIndex + 1} מתוך {notReportedUsers.length}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleCallCurrent}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Phone className="w-4 h-4 ml-2" />
                  התקשר
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleNextCall}
                  className="flex-1"
                >
                  {currentCallIndex < notReportedUsers.length - 1 ? 'הבא' : 'סיום'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
