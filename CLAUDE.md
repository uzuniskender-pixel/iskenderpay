# iskenderpay — Devam Notu

_Son güncelleme: 2026-05-22_

---

## Çalışma Kuralları

- **Her iş bitiminde versiyon güncellenir — İKİ DOSYA BİRLİKTE:**
  1. `index.html` → `const APP_VERSION = 'vX.XX';` ve `const APP_BUILD = '...';`
  2. `version.json` → `{"v": "X.XX", "build": "YYYYMMDD-NN"}`
  - Patch (bug fix, refactor): üçüncü hane — `v8.21` → `v8.22`
  - Minor (yeni özellik): ikinci hane — `v8.x` → `v9.0`
  - Build formatı: `YYYYMMDD-NN` (aynı günde sıralı)
- **İş bitmeden CLAUDE.md güncellenmez** — biten iş kayıt altına alınır, sıradaki planlanır
- `fix_groupids.js` root'ta kalır — konsola yapıştırılarak çalıştırılır, `js/`'ye taşınmaz
- Service worker cache'i agresif — deploy sonrası gizli sekme ile test et
- `Cross-Origin-Opener-Policy` hataları Google popup'tan geliyor, işlevselliği etkilemiyor

---

## Mevcut Durum (22 Mayıs 2026) — v8.22 / 20260522-09

Modüler yapıya **kademeli geçiş** devam ediyor.
`index.html` hâlâ çalışıyor, `js/` klasörü adım adım ekleniyor.

### Tamamlanan modüller

| Dosya | İçerik | Durum |
|---|---|---|
| `js/state.js` | Tüm global değişkenler, `clearState()` | ✅ Deploy edildi, hata yok |
| `js/util.js` | 18 pure fonksiyon: `esc`, `fmt`, `fmtA`, `dd`, `sCls`… | ✅ Deploy edildi, hata yok |
| `js/crypto.js` | `wrapDataKey`, `unwrapDataKey`, `encryptData`, `decryptData`, `hashPin`, `getSaltAsync`… | ✅ Deploy edildi, PIN testi OK |
| `js/db.js` | Firebase köprüsü, `doLogin`, `loadSecure`, `saveSecure`, migrasyon | ⚠️ Import eklendi — TEST GEREKLİ |

### db.js entegrasyon notları (kritik)

db.js'in çalışması için index.html'de yapılan değişiklikler:

1. **`var` dönüşümü**: `let pays/creds/hist/...` → `var` yapıldı. `var` top-level inline script'te `window.*` ile alias — db.js `window.pays = [...]` yazdığında render() otomatik yeni veriyi görür.
2. **`window.*` sync eklendi**: `loadSecure`, `startRealtimeSync`, `selectPlan`, `doRestore`, migrate fonksiyonları, silme fonksiyonları — hepsinde `pays = window.pays = ...` pattern.
3. **Firebase guard**: db.js `getApps().length ? getApp() : initializeApp(...)` kullanıyor — çift init hatası engellendi.
4. **Çift listener**: index.html ve db.js ikisi de `onAuthStateChanged` dinliyor — harmless duplication, ikisi de aynı şeyi yapıyor.

### Sıradaki adımlar (öncelik sırası)

1. **db.js testi** — Google girişi, PIN, plan değişimi, veri kaybolmaması
2. **index.html'den doLogin/loadSecure/saveSecure yorum satırına al** — db.js import test geçtikten sonra
3. **`js/ui.js`** — render fonksiyonları (render, renderPaid, renderHist, renderRhb vb.)
4. **`js/app.js`** — initApp, selectPlan, init (en son)

---

## Crypto Mimarisi (kritik — değiştirme)

```
PIN
 └→ PBKDF2 (pinSalt) → AES-KW anahtarı
      └→ AES-KW ile wrap edilmiş dataKey (Firebase _meta'da + localStorage'da)
           └→ dataKey ile AES-GCM şifreleme (plan verisi)
```

- **pinSalt** deterministik — `getSaltAsync('v5-pin-salt')` → UID + key stringinden PBKDF2 ile türetilir, hiçbir yere kaydedilmez
- **wrappedKey** → Firebase `users/{uid}_meta` belgesi + `localStorage('v8-wrapped-key')`
- **Veri** → Firebase `users/{uid}_{planId}` belgesi, `data` alanı

---

## Firebase Veri Yapısı

```
users/{uid}_meta
  wrappedKey: string  (base64, AES-KW wrap edilmiş 32 byte dataKey)

users/{uid}_{planId}
  data:      string  (base64, AES-GCM şifreli JSON)
  pinHash:   string  (base64, PBKDF2 hash — doğrulama için)
  updatedAt: number
```

---

## Kritik Global Değişkenler

| Değişken | Açıklama |
|---|---|
| `_plainPin` | Oturum PIN'i — bellekte, localStorage'a yazılmaz |
| `_cryptoKey` | AES-256-GCM CryptoKey — dataKey'den import edilmiş |
| `_dataKeyRaw` | Ham 32 byte dataKey — PIN değişiminde wrap için tutulur |
| `_knownBuild` | Aktif build — `initBuild()` ile version.json'dan set edilir |
| `window._planId` | Aktif plan (`plan1` / `plan2`) — sadece `state.js`'de tanımlanır |
| `window._fbUid` | Firebase Auth UID |

## Storage Key Haritası

| Key | Nerede | Açıklama |
|---|---|---|
| `v5-pin-salt` | localStorage | Eski fallback — `getSaltAsync` UID varsa kullanmaz |
| `v8-wrapped-key` | localStorage + Firebase `_meta` | AES-KW wrap edilmiş dataKey |
| `v6-active-plan` | localStorage | Aktif plan ID |
| `v8-migrated-{uid}` | localStorage | v8 migrasyon flag |
| `v7-migrated-{uid}-{planId}` | localStorage | v7 migrasyon flag |
| `v7b-migrated-{uid}-{planId}` | localStorage | v7b groupId fix flag |

---

## Dosya Yapısı

```
index.html          Ana uygulama (~3450 satır) — modüller tamamlanana kadar çalışmaya devam eder
js/state.js         Global state, clearState()
js/util.js          Pure yardımcı fonksiyonlar
js/crypto.js        Crypto altyapısı (AES-GCM + AES-KW + PBKDF2)
js/db.js            Firebase köprüsü + doLogin/loadSecure/saveSecure (import edildi, test bekliyor)
js/ui.js            (henüz yok)
js/app.js           (henüz yok)
version.json        {"v": "8.22", "build": "20260522-09"}
sw.js               Service Worker
manifest.json       PWA manifest
fix_groupids.js     Konsol fix scripti (tek seferlik, root'ta kalır)
```

---

## Versiyon Geçmişi (özet)

| Versiyon | Build | Değişiklik |
|---|---|---|
| v8.22 | 20260522-09 | db.js import + var dönüşümü + window sync + Firebase guard |
| v8.22 | 20260522-05 | Syntax fix (yorum bloğu bozulması) |
| v8.22 | 20260522-04 | db.js import geri alındı (scope sorunu) |
| v8.22 | 20260522-03 | `js/db.js` modüle taşındı (import denendi) |
| v8.22 | 20260522-01 | `js/state.js` + `js/util.js` modüle taşındı |
| v8.21 | 20260521-05 | Mevcut kararlı tek-dosya baseline |
| v8.18 | 20260521-02 | `migrateToV7/V7b` tek noktadan çalışma |
| v8.17 | 20260521-01 | Legacy crypto kaldırıldı |
| v8.13 | 20260520-04 | Arama tutarı + debounce fix |
| v8.12 | 20260520-03 | Sync race condition fix |
| v8.11 | 20260520-03 | Kur API hata yönetimi |
| v8.9  | 20260520-02 | PIN/dataKey AES-KW mimarisi |
| v8.8  | 20260520-01 | version.json single source of truth |
