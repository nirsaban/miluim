'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register simple push service worker
      navigator.serviceWorker
        .register('/sw-push.js')
        .then((registration) => {
          console.log('Push SW registered:', registration.scope);
        })
        .catch((error) => {
          console.error('Push SW registration failed:', error);
        });
    }
  }, []);

  return null;
}
