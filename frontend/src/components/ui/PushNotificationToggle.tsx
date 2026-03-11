'use client';

import { BellRing, BellOff } from 'lucide-react';
import { Button } from './Button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import toast from 'react-hot-toast';

export function PushNotificationToggle() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success('התראות Push בוטלו');
      } else {
        toast.error('שגיאה בביטול התראות');
      }
    } else {
      if (permission === 'denied') {
        toast.error('התראות חסומות בדפדפן. אנא אפשר התראות בהגדרות הדפדפן');
        return;
      }
      const success = await subscribe();
      if (success) {
        toast.success('נרשמת לקבלת התראות Push');
      } else if (permission !== 'granted') {
        toast.error('נדרשת הרשאה להתראות');
      } else {
        toast.error('שגיאה בהרשמה להתראות');
      }
    }
  };

  return (
    <Button
      variant={isSubscribed ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      isLoading={isLoading}
      className="gap-1"
    >
      {isSubscribed ? (
        <>
          <BellOff className="w-4 h-4" />
          בטל התראות
        </>
      ) : (
        <>
          <BellRing className="w-4 h-4" />
          הפעל התראות
        </>
      )}
    </Button>
  );
}
