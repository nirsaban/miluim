'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Fetch VAPID public key
  useEffect(() => {
    const fetchVapidKey = async () => {
      try {
        const response = await api.get('/push/vapid-public-key');
        setVapidPublicKey(response.data.publicKey);
      } catch (error) {
        console.error('Failed to fetch VAPID public key:', error);
      }
    };

    if (isSupported) {
      fetchVapidKey();
    }
  }, [isSupported]);

  // Check current subscription status with retry
  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();

        if (registration?.active) {
          // SW is active, check subscription
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
          setIsLoading(false);
        } else if (attempts < maxAttempts) {
          // SW not active yet, retry
          attempts++;
          setTimeout(checkSubscription, 500);
        } else {
          // Give up after max attempts
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to check subscription:', error);
        setIsLoading(false);
      }
    };

    // Start checking after a short delay
    const timer = setTimeout(checkSubscription, 500);
    return () => clearTimeout(timer);
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !vapidPublicKey) {
      console.error('Push notifications not supported or VAPID key not available');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const permissionResult = await requestPermission();
        if (permissionResult !== 'granted') {
          setIsLoading(false);
          return false;
        }
      }

      // Get or wait for service worker registration
      let registration = await navigator.serviceWorker.getRegistration();

      // If no active SW, wait a bit for it to activate
      if (!registration?.active) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        registration = await navigator.serviceWorker.getRegistration();
      }

      if (!registration) {
        console.error('No service worker registration found');
        setIsLoading(false);
        return false;
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Send subscription to server
      const subscriptionJson = subscription.toJSON();
      await api.post('/push/subscribe', {
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
        },
      });

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidPublicKey, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          // Unsubscribe from push
          await subscription.unsubscribe();

          // Notify server
          await api.delete('/push/unsubscribe', {
            data: { endpoint: subscription.endpoint },
          });
        }
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}
