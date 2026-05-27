// sw.js — iskenderpay PWA cache (v8.31)

const CACHE = 'ip-static-v7';
const STATIC = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  './version.json',
  './js/firebase.js',
  './js/state.js',
  './js/util.js',
  './js/compat.js',
  './js/crypto.js',
  './js/modal.js',
  './js/data.js',
  './js/db.js',
  './js/app.js',
  './js/plan.js',
  './js/sync.js',
  './js/kur.js',
  './js/backup.js',
  './js/version.js',
  './js/ui-plan.js',
  './js/ui-pay.js',
  './js/ui-persons.js',
  './js/ui-notes.js',
  './js/rehber.js',
  './js/log.js',
  './js/search.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
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

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('exchangerate-api') ||
    url.includes('gold-api')
  ) return;

  if (url.endsWith('/') || url.endsWith('index.html') || url.endsWith('version.json')) {
    const noCache = new Request(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    e.respondWith(
      fetch(noCache).then(resp => {
        if (resp.ok && url.includes('version.json')) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
