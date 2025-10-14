
// Simple SW: cache app shell + runtime audio
const CACHE_NAME = 'theater-app-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-first for same-origin navigation and audio files (incl. Firebase Storage CDN)
  const isAudio = url.pathname.match(/\.(mp3|wav|m4a|ogg)$/i) 
    || url.hostname.endsWith('googleusercontent.com')
    || url.hostname.endsWith('firebasestorage.googleapis.com') || url.hostname.endsWith('firebasestorage.app');

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put('./', copy));
        return r;
      }).catch(() => caches.match('./'))
    );
    return;
  }

  if (isAudio || url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(networkResp => {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return networkResp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
