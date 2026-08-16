const CACHE_NAME = 'nutritracker-v1.0.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// INSTALL EVENT - Cache core static assets & skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ACTIVATE EVENT - Clean up old cache versions & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH EVENT - NETWORK FIRST WITH AUTOMATIC CACHE FALLBACK (Instant Web Updates)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If network response is valid, clone & update cache asynchronously
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails (offline), return cached asset
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If HTML page requested offline, serve index.html
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// LISTEN FOR SKIP_WAITING MESSAGE FROM APP CLIENT
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
