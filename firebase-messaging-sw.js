importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBAInCbFZ1GJnfwIAEYb7bNMC22_B_nfTw",
  authDomain: "al-tafylah-aqarat.firebaseapp.com",
  projectId: "al-tafylah-aqarat",
  storageBucket: "al-tafylah-aqarat.firebasestorage.app",
  messagingSenderId: "729805047644",
  appId: "1:729805047644:web:80eae6947f4bbd908ee399"
});

const messaging = firebase.messaging();

// استقبال إشعارات Firebase عندما يكون التطبيق في الخلفية أو مغلقاً.
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Background message received:',
    payload
  );

  const notificationTitle =
    payload.notification?.title ||
    payload.data?.title ||
    'عقارات الطفيلة';

  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      'لديك إشعار جديد',

    icon:
      payload.notification?.icon ||
      payload.data?.icon ||
      '/icon-192.png',

    badge:
      payload.notification?.badge ||
      payload.data?.badge ||
      '/icon-192.png',

    data: payload.data || {},

    tag:
      payload.data?.tag ||
      'al-tafylah-aqarat-notification',

    renotify: true
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// فتح التطبيق عند الضغط على الإشعار.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url ||
    event.notification?.data?.click_action ||
    '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {

      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

    })
  );
});
