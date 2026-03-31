'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Shield, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { EmergencyUserStatus } from '@/types';
import { cn } from '@/lib/utils';

interface EmergencySafeButtonProps {
  className?: string;
}

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('');
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return null;

  return (
    <span className="font-mono text-white/90 text-sm">
      {timeLeft}
    </span>
  );
}

export function EmergencySafeButton({ className }: EmergencySafeButtonProps) {
  const queryClient = useQueryClient();

  // Fetch user's emergency status
  const { data: status, isLoading } = useQuery<EmergencyUserStatus>({
    queryKey: ['emergency-status'],
    queryFn: async () => {
      const response = await api.get('/emergency/status');
      return response.data;
    },
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Report safe mutation
  const reportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/emergency/report-safe');
      return response.data;
    },
    onSuccess: () => {
      toast.success('דווחת בהצלחה!');
      queryClient.invalidateQueries({ queryKey: ['emergency-status'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בדיווח');
    },
  });

  // Don't render if loading or no active emergency
  if (isLoading || !status?.hasActiveEmergency) {
    return null;
  }

  // Don't render if user is not a target (e.g., they're at home)
  if (!status.isTargetUser) {
    return null;
  }

  // User already reported
  if (status.hasReported) {
    return (
      <div className={cn(
        'bg-green-600 text-white rounded-xl p-4 shadow-lg',
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">דווחת בהצלחה</p>
            <p className="text-white/80 text-sm">
              סומן שאתה בטוח ב-
              {status.reportedAt && new Date(status.reportedAt).toLocaleTimeString('he-IL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User needs to report
  return (
    <div className={cn(
      'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-4 shadow-lg animate-pulse',
      className
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 animate-bounce" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-lg">מצב חירום!</p>
          <p className="text-white/80 text-sm">
            {status.title || 'נדרש דיווח שאתה בטוח'}
          </p>
        </div>
        {status.expiresAt && (
          <div className="text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 opacity-80" />
            <TimeRemaining expiresAt={status.expiresAt} />
          </div>
        )}
      </div>

      <Button
        onClick={() => reportMutation.mutate()}
        isLoading={reportMutation.isPending}
        className="w-full bg-white text-red-600 hover:bg-red-50 font-bold py-3 text-lg"
      >
        <Shield className="w-5 h-5 ml-2" />
        אני בטוח - דווח עכשיו
      </Button>
    </div>
  );
}
