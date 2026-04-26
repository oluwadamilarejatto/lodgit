const CACHE_NAME = 'lodgit-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Lodgit';
  const options = {
    body: data.body || 'You have pending requests',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open Lodgit' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// Background sync for reminders
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'reminder-sync') {
    event.waitUntil(sendReminder());
  }
});

async function sendReminder() {
  const now = new Date();
  const hour = now.getHours();
  // Only notify at 9am, 1pm, 5pm
  if (hour === 9 || hour === 13 || hour === 17) {
    self.registration.showNotification('Lodgit Reminder 🔔', {
      body: 'Check your open requests — stay on top of things!',
      icon: '/icon.png',
      vibrate: [200, 100, 200],
    });
  }
}
