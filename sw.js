// KasiScore Service Worker v162
// Handles: offline shell caching + Web Push notifications
const CACHE = 'kasiscore-shell-v162';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

// ── Install: cache the app shell ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

// ── Activate: purge old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: shell-first for navigation, network-first for API ─
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const apiPaths = ['/api/', '/fixtures', '/live', '/odds', '/dashboard-summary',
    '/ai-predictions', '/prediction-markets', '/sports/', '/team/', '/players/',
    '/rugby/', '/push/', '/lottery/', '/auth/', '/webhooks/', '/analytics/'];
  if (apiPaths.some(p => url.pathname.startsWith(p))) return; // skip cache for API calls
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/index.html', copy)); return r; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => cached))
  );
});

// ── Web Push: show notification ──────────────────────────────
self.addEventListener('push', event => {
  let payload = { title: 'KasiScore', body: 'New update available!', url: '/' };
  if (event.data) {
    try { Object.assign(payload, JSON.parse(event.data.text())); } catch (_) {}
  }
  const options = {
    body:    payload.body,
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    tag:     'kasiscore-alert',
    renotify: true,
    data:    { url: payload.url || '/' },
    actions: [
      { action: 'open',    title: '📊 View Predictions' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// ── Notification click: open the app ─────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) return existing.focus().then(c => c.navigate(url));
      return clients.openWindow(url);
    })
  );
});
