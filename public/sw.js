// SIKA INDUSTRIE — Service Worker PWA
const CACHE_NAME = 'sikagestion-v1.0';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours

// Ressources à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
];

// ── INSTALLATION ─────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW SIKA] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATION ───────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW SIKA] Activation...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── MESSAGE (skip waiting) ───────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── STRATÉGIE CACHE : Network First, Cache Fallback ─────
self.addEventListener('fetch', event => {
  // Ignore les requêtes non-GET et Supabase
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('api.ipify.org')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Met en cache la réponse fraîche
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Hors ligne : retourne le cache
        caches.match(event.request).then(cached =>
          cached || caches.match('/')
        )
      )
  );
});

// ── NOTIFICATIONS PUSH ───────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'SIKA GESTION', {
      body:    data.body    || 'Nouvelle notification',
      icon:    '/icon-192.png',
      badge:   '/favicon.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/dashboard' },
      actions: [
        { action: 'open',   title: 'Ouvrir' },
        { action: 'close',  title: 'Fermer' },
      ],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/dashboard')
    );
  }
});
