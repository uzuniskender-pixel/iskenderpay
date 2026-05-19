// İskenderPay Service Worker — v1.3
const CACHE = 'ip-static-v2'; // Sürümü v2 yaptık, eski cache çöpe gidecek!;

// Sadece statik dosyaları cache'le, index.html HİÇBİR ZAMAN
const STATIC = ['./icon-192.png', './icon-512.png', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase, API → network only
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('exchangerate-api') ||
      url.includes('gold-api')) {
    return;
  }

  // index.html ve version.json → her zaman ağdan, offline'da cache fallback
  if (url.endsWith('/') || url.endsWith('index.html') || url.endsWith('version.json')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        // Başarılıysa version.json'u cache'le (offline için)
        if (resp.ok && url.endsWith('version.json')) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // Diğer statik dosyalar → cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp?.ok && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
