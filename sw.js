const CACHE_NAME = 'vidala-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/presentacion.html',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/audio/musica.mp3',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Install event - cache essential resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto: ' + CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Handle range requests for audio
  if (event.request.headers.has('range')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request.url).then(res => {
          if (!res) {
            return fetch(event.request).then(fetchRes => {
              cache.put(event.request.url, fetchRes.clone());
              return fetchRes;
            });
          }
          return res.arrayBuffer().then(ab => {
            const rangeHeader = event.request.headers.get('range');
            const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            const start = Number(matches[1]);
            const end = matches[2] ? Number(matches[2]) : ab.byteLength - 1;
            return new Response(
              ab.slice(start, end + 1),
              {
                status: 206,
                statusText: 'Partial Content',
                headers: [
                  ['Content-Range', 'bytes ' + start + '-' + end + '/' + ab.byteLength],
                  ['Content-Length', String(end - start + 1)],
                  ['Content-Type', res.headers.get('Content-Type') || 'audio/mpeg']
                ]
              }
            );
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});
