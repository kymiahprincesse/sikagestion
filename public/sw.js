// SIKA INDUSTRIE — Service Worker PWA Amélioré
// CACHE_VERSION est remplacé automatiquement par un timestamp à chaque `vite build`
const CACHE_NAME = 'sikagestion-v2.0';

// Ressources à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-384.png',
];

// URLs à ne jamais cacher
const NEVER_CACHE = [
  'supabase.co',
  'supabase.in',
  'api.ipify.org',
  'chrome-extension',
  'moz-extension'
];

// Vérifie si une URL doit être ignorée
function shouldIgnore(url) {
  return NEVER_CACHE.some(pattern => url.includes(pattern));
}

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

// ── MESSAGE (skip waiting / force update / clear cache) ─
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'FORCE_UPDATE') {
    self.skipWaiting();
    self.clients.claim();
  }
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});

// ── STRATÉGIE CACHE INTELLIGENTE ─────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Ignore les requêtes non-GET et certaines URLs
  if (event.request.method !== 'GET') return;
  if (shouldIgnore(url)) return;

  // Stratégie différente selon le type de ressource
  
  // 1. Assets statiques (JS, CSS, images) : Cache First, Network Fallback
  if (url.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|otf|eot)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          // Rafraîchir en arrière-plan
          fetch(event.request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(c => c.put(event.request, response));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 2. Pages HTML : Network First, Cache Fallback (pour avoir les mises à jour)
  if (event.request.mode === 'navigate' || url.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cached =>
            cached || caches.match('/').then(fallback =>
              fallback || new Response('Application hors ligne', { 
                status: 503, 
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              })
            )
          )
        )
    );
    return;
  }

  // 3. Autres requêtes : Network First avec cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match('/')
        )
      )
  );
});

// ── SYNCHRONISATION EN ARRIÈRE-PLAN ─────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-supabase') {
    console.log('[SW SIKA] Sync en arrière-plan demandée');
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_REQUEST' });
        });
      })
    );
  }
});

// ── NOTIFICATIONS PERSISTANTES ─────────────────────────
self.addEventListener('pushsubscriptionchange', event => {
  console.log('[SW SIKA] Changement de subscription push');
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    })
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
      self.clients.openWindow(event.notification.data?.url || '/dashboard')
    );
  }
});
