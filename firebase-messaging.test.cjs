// Run with Node.js 18+: node --test firebase-messaging.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const html = readFileSync(__dirname + '/index.html', 'utf8');
const config = readFileSync(__dirname + '/firebase-config.js', 'utf8');
const sw = readFileSync(__dirname + '/firebase-messaging-sw.js', 'utf8');
const scope = 'https://mrcourses04-star.github.io/Tafylah-aqarat-/';
const pageCode = html.slice(html.indexOf('<!-- كود إشعارات فايربيس -->')).split('</script>')[0]
  .replace(/^[\s\S]*?<script type="module">/, '').replace(/^\s*import .*;\s*$/gm, '');

function page({ permission = 'granted', supported = true, failure, active = true } = {}) {
  const calls = { alerts: [], register: [], tokens: [] };
  const worker = { state: 'installing', addEventListener: (_, fn) => { calls.statechange = fn; }, removeEventListener() {} };
  const registration = { active: active ? {} : null, installing: worker };
  const context = vm.createContext({ URL, setTimeout, clearTimeout, console: { log() {}, error() {} },
    alert: (text) => calls.alerts.push(text), isSecureContext: true, location: { href: scope },
    Notification: { requestPermission: async () => permission },
    navigator: { serviceWorker: { register: async (url) => { calls.register.push(url); if (failure) throw Error(failure); return registration; } } },
    initializeApp: (value) => { calls.config = value; return {}; },
    isSupported: async () => supported, getMessaging: () => ({}),
    onMessage: (_, callback) => { calls.foreground = callback; },
    getToken: async (_, options) => { calls.tokens.push(options); return 'test-registration-token'; }
  });
  context.window = context;
  vm.runInContext(config, context);
  vm.runInContext(pageCode, context);
  return { calls, registration, worker, run: () => context.requestNotificationPermission() };
}

function serviceWorker(windows = []) {
  const calls = { notifications: [], opened: [], imports: [] };
  const context = vm.createContext({ URL,
    registration: { scope, showNotification: async (...args) => calls.notifications.push(args) },
    addEventListener: (name, fn) => { calls[name] = fn; },
    importScripts: (url) => { calls.imports.push(url); if (url === './firebase-config.js') vm.runInContext(config, context); else assert.ok(calls.notificationclick, 'click handler precedes Firebase imports'); },
    firebase: { initializeApp: (value) => { calls.config = value; }, messaging: () => ({ onBackgroundMessage: (fn) => { calls.background = fn; } }) },
    clients: { matchAll: async () => windows, openWindow: async (url) => calls.opened.push(url) }
  });
  context.self = context;
  vm.runInContext(sw, context);
  calls.click = async (data) => {
    let done;
    calls.notificationclick({ notification: { data, close: () => { calls.closed = true; } },
      stopImmediatePropagation: () => { calls.stopped = true; }, waitUntil: (promise) => { done = promise; } });
    await done;
  };
  return calls;
}

test('subscription uses the GitHub Pages worker registration and confirmed VAPID key', async () => {
  const p = page(); await p.run();
  assert.equal(p.calls.register[0], scope + 'firebase-messaging-sw.js');
  assert.equal(p.calls.tokens[0].serviceWorkerRegistration, p.registration);
  assert.equal(p.calls.tokens[0].vapidKey, 'BDrC3ir0aOEX7XkuItDqhZ67roRPBP3tkxySaa8Znnkny0ohWuq1-joOIlTMct5hmfIVB2bsU7IlLzEOKXiEhOM');
});
test('permission denied does not subscribe or report success', async () => {
  const p = page({ permission: 'denied' }); await p.run();
  assert.equal(p.calls.register.length, 0); assert.equal(p.calls.tokens.length, 0);
  assert.ok(!p.calls.alerts.some(x => x.includes('بنجاح')));
});
test('unsupported browsers show feedback without requesting a token', async () => {
  const p = page({ supported: false }); await p.run();
  assert.equal(p.calls.tokens.length, 0); assert.equal(p.calls.alerts.length, 1);
});
test('registration failure is visible and never reports success', async () => {
  const p = page({ failure: 'network error' }); await p.run();
  assert.equal(p.calls.tokens.length, 0); assert.match(p.calls.alerts[0], /تعذر/);
});
test('token request waits for worker activation; duplicate button clicks are ignored', async () => {
  const p = page({ active: false }); const pending = p.run();
  await new Promise(resolve => setImmediate(resolve));
  await p.run(); assert.equal(p.calls.register.length, 1); assert.equal(p.calls.tokens.length, 0);
  p.worker.state = 'activated'; p.calls.statechange(); await pending;
  assert.equal(p.calls.tokens.length, 1);
});
test('failed worker installation surfaces an error', async () => {
  const p = page({ active: false }); const pending = p.run();
  await new Promise(resolve => setImmediate(resolve));
  p.worker.state = 'redundant'; p.calls.statechange(); await pending;
  assert.equal(p.calls.tokens.length, 0); assert.match(p.calls.alerts[0], /تعذر/);
});
test('foreground messages are displayed', async () => {
  const p = page(); await p.run();
  p.calls.foreground({ notification: { title: 'عنوان', body: 'رسالة' } });
  assert.equal(p.calls.alerts.at(-1), 'عنوان\nرسالة');
});
test('page and service worker initialize the same Firebase project configuration', async () => {
  const p = page(); await p.run(); const w = serviceWorker();
  assert.equal(JSON.stringify(p.calls.config), JSON.stringify(w.config));
  assert.equal(w.config.apiKey, 'AIzaSyBAInCbFZlGJNfwbIAEYb7bNMC22B_nfTw');
  assert.equal(w.config.messagingSenderId, '729805047644');
});
test('notification payloads do not create a second background notification', async () => {
  const w = serviceWorker(); await w.background({ notification: { title: 'Automatic' }, data: { title: 'Duplicate' } });
  assert.equal(w.notifications.length, 0);
});
test('data-only messages display once with the existing icon and preserve their target', async () => {
  const w = serviceWorker(); await w.background({ data: { title: 'عقار', body: 'جديد', url: '?property=42' } });
  assert.equal(w.notifications.length, 1); assert.equal(w.notifications[0][0], 'عقار');
  assert.equal(w.notifications[0][1].icon, scope + 'icon-512x512.png');
  assert.equal(w.notifications[0][1].data.url, '?property=42');
});
test('SDK-owned notification clicks are left to Firebase', async () => {
  const w = serviceWorker(); await w.click({ FCM_MSG: {} });
  assert.equal(w.closed, undefined); assert.equal(w.stopped, undefined); assert.equal(w.opened.length, 0);
});
test('data notification click navigates an existing app tab to the target', async () => {
  let navigated, focused = false;
  const w = serviceWorker([{ url: scope, navigate: async (url) => { navigated = url; return { focus: () => { focused = true; } }; } }]);
  await w.click({ url: '?property=42' });
  assert.equal(navigated, scope + '?property=42'); assert.ok(focused); assert.equal(w.opened.length, 0);
});
test('click does not reuse unrelated GitHub Pages tabs; off-site URLs fall back to the app', async () => {
  const w = serviceWorker([{ url: 'https://mrcourses04-star.github.io/another-project/', focus() { throw Error('wrong tab'); } }]);
  await w.click({ url: 'https://example.com/' }); assert.equal(w.opened[0], scope);
});
