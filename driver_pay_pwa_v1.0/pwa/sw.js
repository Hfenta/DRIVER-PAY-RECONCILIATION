// ─── Driver Pay PWA Service Worker ───────────────────────────────
// Version: 1.0.0  |  Erta Ale LLC
// All assets are LOCAL — guaranteed offline after first visit

const CACHE_NAME = 'driver-pay-v1.0.0';
const OFFLINE_URL = './index.html';

// Every file is local — no CDN dependencies
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './xlsx.full.min.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-maskable.svg',
];

// ── Install: cache everything upfront ────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching all local assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for all assets ────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).protocol === 'chrome-extension:') return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Serve from cache instantly; refresh cache in background
        const refresh = fetch(request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          }
          return res;
        }).catch(() => {});
        return cached;
      }
      // Not in cache — fetch and store
      return fetch(request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// ── Force update on message ───────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
