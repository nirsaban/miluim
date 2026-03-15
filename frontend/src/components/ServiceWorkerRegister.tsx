'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check if sw.js exists before trying to register
      fetch('/sw.js', { method: 'HEAD' })
        .then((response) => {
          if (response.ok) {
            navigator.serviceWorker
              .register('/sw.js')
              .then((registration) => {
                console.log('SW registered successfully:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                  console.log('SW update found');
                });
              })
              .catch((error) => {
                console.error('SW registration failed:', error);
              });
          }
        })
        .catch(() => {
          // sw.js doesn't exist, skip registration (development mode)
        });
    }
  }, []);

  return null;
}
