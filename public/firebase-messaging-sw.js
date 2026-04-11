importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDrVp_P44GAYbFXOXDwina6BzHmwF729_0",
  authDomain: "mzansi-videos-app-26.firebaseapp.com",
  projectId: "mzansi-videos-app-26",
  storageBucket: "mzansi-videos-app-26.firebasestorage.app",
  messagingSenderId: "935072282423",
  appId: "1:935072282423:web:5f4e2a1a5207ce53018cb2"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Mzansi Videos';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.data?.type || 'default',
    data: payload.data,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/app';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          return clients.openWindow(urlToOpen);
        })
    );
  }
});

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('Push event data:', data);
  }
});