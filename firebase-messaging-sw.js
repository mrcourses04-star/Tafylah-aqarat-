/* عقارات الطفيلة - Firebase Cloud Messaging Service Worker */
// Register before the SDK so custom data-message clicks are handled here.
self.addEventListener('notificationclick', (event) => {
  // Firebase owns clicks for the notifications it displays automatically.
  if (event.notification.data?.FCM_MSG) return;
  event.stopImmediatePropagation();
  event.notification.close();

  const scopeUrl = new URL(self.registration.scope);
  let targetUrl = scopeUrl.href;
  try {
    const requested = new URL(
      event.notification.data?.url || event.notification.data?.click_action || scopeUrl.href,
      scopeUrl
    );
    if (requested.origin === scopeUrl.origin && requested.pathname.startsWith(scopeUrl.pathname)) {
      targetUrl = requested.href;
    }
  } catch (_) {}

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const exact = windows.find((client) => client.url === targetUrl);
    if (exact) return exact.focus();

    const appWindow = windows.find((client) => {
      const url = new URL(client.url);
      return url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname);
    });
    if (appWindow && 'navigate' in appWindow) {
      const navigated = await appWindow.navigate(targetUrl);
      if (navigated) return navigated.focus();
    }
    return clients.openWindow(targetUrl);
  })());
});

importScripts('./firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp(globalThis.tafylahFirebaseConfig);

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  // Firebase already displays notification payloads in the background.
  if (payload.notification) return;
  const data = payload.data || {};
  return self.registration.showNotification(data.title || 'عقارات الطفيلة', {
    body: data.body || 'لديك إشعار جديد',
    icon: data.icon || new URL('icon-512x512.png', self.registration.scope).href,
    badge: data.badge || new URL('icon-512x512.png', self.registration.scope).href,
    data,
    tag: data.tag || 'al-tafylah-aqarat-notification',
    renotify: true,
    dir: 'rtl',
    lang: 'ar'
  });
});
