// Custom service worker code for push notifications

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event received but no data');
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      tag: data.tag || 'default',
      data: {
        url: data.url || '/',
      },
      vibrate: [100, 50, 100],
      requireInteraction: true,
      dir: 'rtl',
      lang: 'he',
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'התראה חדשה', options)
    );
  } catch (error) {
    console.error('Error processing push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');
  // The subscription has changed, need to resubscribe
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
    }).then((subscription) => {
      // Send the new subscription to the server
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
    })
  );
});
