'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PushNotificationToggle } from '@/components/ui/PushNotificationToggle';
import api from '@/lib/api';
import { Notification } from '@/types';
import { formatRelativeTime, cn } from '@/lib/utils';

export function NotificationsSection() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <Card id="notifications">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <span>התראות מערכת</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PushNotificationToggle />
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              isLoading={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 ml-1" />
              סמן הכל כנקרא
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  notification.isRead
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-military-50 border-military-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-gray-600 text-sm mt-1">
                      {notification.content}
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      className="p-1 text-military-600 hover:bg-military-100 rounded transition-colors"
                      title="סמן כנקרא"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">אין התראות חדשות</p>
        )}
      </CardContent>
    </Card>
  );
}
