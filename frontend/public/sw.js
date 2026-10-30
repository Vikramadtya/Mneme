/* Memoriser service worker: offline app shell, cached reads for study data, and push reminders. */
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const API = 'memoriser-api'; // cleared by the page on sign-out so accounts never see each other's data

// Reads worth having offline. Everything else (auth, writes, public pages) always goes to the network.
const CACHEABLE_API = /^\/api\/v1\/(learning\/(today|dashboard-overview|progress)|vocabulary\/me|collections|analytics\/summary|settings)\/?$/;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.add('/')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, ASSETS, API].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackKey) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackKey ?? request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(fallbackKey ?? request);
    if (cached) return cached;
    throw error;
  }
}

// Hashed filenames change on every deploy, so old ones would pile up; keep only the newest entries.
const MAX_ASSETS = 120;
async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((key) => cache.delete(key)));
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/v1/')) {
    if (CACHEABLE_API.test(url.pathname)) {
      // The query string matters (collectionId, tz), so the full URL is the cache key.
      event.respondWith(networkFirst(request, API));
    }
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, '/'));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS)); // hashed filenames never change
  } else if (/\.(svg|png|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request, ASSETS));
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* ignore malformed payloads */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Memoriser', {
      body: data.body || 'You have words ready to review.',
      icon: '/favicon/web-app-manifest-192x192.png',
      badge: '/favicon/favicon-96x96.png',
      tag: 'daily-reminder',
      data: { url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => 'focus' in w);
      if (open) return open.navigate(target).then((w) => w && w.focus());
      return self.clients.openWindow(target);
    }),
  );
});
