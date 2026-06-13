const CACHE_NAME = 'staff-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/404',
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching basic app assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Serve with Stale-While-Revalidate pattern (except for API calls)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not cache API requests
  if (url.pathname.includes('/api/')) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.log('[SW] Network fetch failed, relying on cache or offline page:', err);
        // If offline and cache missing, return cached root as fallback
        return cachedResponse || caches.match('/');
      });

      return cachedResponse || fetchPromise;
    })
  );
});
