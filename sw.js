// İskenderPay Service Worker — v1.2
const CACHE = 'ip-cache-v3';

self.addEventListener('install', e => {
  // skipWaiting YOK — banner göründükten sonra manuel geçiş
  e.waitUntil(
    caches.open(CACHE).then(c => c.add('./index.html').catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Sayfadan SKIP_WAITING mesajı gelince aktif ol
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('exchangerate-api') ||
      url.includes('gold-api')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (!resp || resp.status !== 200 || e.request.method !== 'GET') return resp;
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => cached);
    })
  );
});
