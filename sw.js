// İskenderPay Service Worker — v2.0 (v8.8 Güncelleme Garantili)
const CACHE = 'ip-static-v2'; // Sürüm v2 yapıldı, eski statik cache'ler temizlenecek

// Sadece değişmeyen statik dosyalar cache'e alınır
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

  // Firebase, API vb. dinamik veri akışları → Her zaman doğrudan internete gider (Asla cache'lenmez)
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('exchangerate-api') ||
      url.includes('gold-api')) {
    return;
  }

  // index.html, ana dizin ve version.json → Tarayıcı ve Sunucu kilidini kırmak için zaman damgasıyla (Cache-Busting) zorla çekilir!
  if (url.endsWith('/') || url.endsWith('index.html') || url.endsWith('version.json')) {
    let newUrl = url;
    
    // URL sonuna benzersiz milisaniye ekleyerek tarayıcının eski hafızayı getirmesini engelliyoruz
    if (url.endsWith('version.json')) {
      newUrl = url + '?t=' + Date.now();
    } else if (url.endsWith('index.html') || url.endsWith('/')) {
      const baseUrl = url.endsWith('/') ? url + 'index.html' : url;
      newUrl = baseUrl + '?t=' + Date.now();
    }

    e.respondWith(
      fetch(new Request(newUrl, { cache: 'no-store' })).then(resp => {
        // Ağdan başarılı geldiyse ve istek version.json ise, sadece çevrimdışı kalma durumu için yedekle
        if (resp.ok && url.includes('version.json')) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request)) // Eğer internet tamamen yoksa, mecburen eski yedekten göster
    );
    return;
  }

  // Diğer yan resim, ikon, manifest gibi değişmeyen dosyalar → Önce hafızaya bak, yoksa internetten al
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request);
    })
  );
});
