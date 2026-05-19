const CACHE = 'ip-static-v3';
const STATIC = ['./icon-192.png', './icon-512.png', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('firestore.googleapis.com') || url.includes('firebase') || url.includes('exchangerate-api')) return;

  if (url.endsWith('/') || url.endsWith('index.html') || url.endsWith('version.json')) {
    let newUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    e.respondWith(
      fetch(new Request(newUrl, { cache: 'no-store' })).then(resp => {
        if (resp.ok && url.includes('version.json')) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});