/* عقارات الطفيلة - Firebase Cloud Messaging Service Worker */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBAInCbFZlGJNfwbIAEY7b7bNMC22_B_nfTw",
  authDomain: "al-tafylah-aqarat.firebaseapp.com",
  projectId: "al-tafylah-aqarat",
  storageBucket: "al-tafylah-aqarat.firebasestorage.app",
  messagingSenderId: "729805047644",
  appId: "1:729805047644:web:80eae6947f4bbd908ee399"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM] Background message received:', payload);

  const data = payload?.data || {};

  const notificationTitle =
    data.title ||
    payload?.notification?.title ||
    'عقارات الطفيلة';

  const notificationOptions = {
    body:
      data.body ||
      payload?.notification?.body ||
      'لديك إشعار جديد',

    icon:
      data.icon ||
      new URL('icon-192.png', self.registration.scope).href,

    badge:
      data.badge ||
      new URL('icon-192.png', self.registration.scope).href,

    data,

    tag:
      data.tag ||
      'al-tafylah-aqarat-notification',

    renotify: true,

    dir: 'rtl',
    lang: 'ar'
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawTarget =
    event.notification?.data?.url ||
    event.notification?.data?.click_action ||
    self.registration.scope;

  let targetUrl;

  try {
    targetUrl = new URL(
      rawTarget,
      self.registration.scope
    ).href;
  } catch (_) {
    targetUrl = self.registration.scope;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {

      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          const wantedUrl = new URL(targetUrl);

          if (
            clientUrl.origin === wantedUrl.origin &&
            'focus' in client
          ) {
            return client.focus();
          }

        } catch (_) {}
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
