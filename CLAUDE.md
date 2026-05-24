# iskenderpay — Devam Notu

_Son güncelleme: 2026-05-24_

---

## Çalışma Kuralları

- **Her iş bitiminde versiyon güncellenir — İKİ DOSYA BİRLİKTE:**
  1. `index.html` → `var APP_VERSION = 'vX.XX';` ve `var APP_BUILD = '...';`
  2. `version.json` → `{"v": "X.XX", "build": "YYYYMMDD-NN"}`
  - Patch (bug fix, refactor): üçüncü hane — `v8.41` → `v8.42`
  - Minor (yeni özellik): ikinci hane — `v8.x` → `v9.0`
  - Build formatı: `YYYYMMDD-NN` (aynı günde sıralı)
- **İş bitmeden CLAUDE.md güncellenmez** — biten iş kayıt altına alınır, sıradaki planlanır
- `fix_groupids.js` root'ta kalır — konsola yapıştırılarak çalıştırılır
- Service worker cache'i agresif — deploy sonrası gizli sekme ile test et
- `Cross-Origin-Opener-Policy` hataları Google popup'tan geliyor, zararsız
- sw.js cache sürümü: `ip-static-v5` — yeni modül eklenince versiyon yükseltilmeli

---

## Mevcut Durum (24 Mayıs 2026) — v8.42 / 20260523-20

Modüler yapı **tamamlandı**. `index.html` artık sadece HTML markup + Firebase init + 3 ince script.

### Dosya Yapısı

```
index.html              Ana uygulama (875 satır — HTML + Firebase init + ince glue)
version.json            {"v": "8.42", "build": "20260523-20"}
sw.js                   Service Worker — ip-static-v5
manifest.json           PWA manifest
fix_groupids.js         Konsol fix scripti (tek seferlik, root'ta kalır)

js/firebase.js          Firebase init + auth UI + Google login/logout (97 satır)
js/state.js             Global state, clearState(), window.* senkronizasyonu
js/util.js              18 pure fonksiyon: esc, fmt, fmtA, dd, sCls, toTRY…
js/compat.js            util.js → window.* bridge
js/crypto.js            AES-GCM + AES-KW + PBKDF2
js/modal.js             ModalManager (open/close/ESC/backdrop)
js/data.js              Lookup maps (findPayById, findPaysByGroup, findCredById)
js/db.js                Firebase köprüsü, doLogin, loadSecure, saveSecure, migrasyon
js/app.js               App lifecycle, go(), initApp, fetchRates, renderKur, renderAI…
js/ui-plan.js           Plan matrisi, hücre detayları, ödeme durum aksiyonları
js/ui-data.js           Ödeme/Kredi/Kişi/Not/Geçmiş/Yapılan CRUD
js/ui-misc.js           Rehber, Aktivite Logu, Global Arama
```

### Önemli Mimari Notlar

- **window.* zorunlu**: Tüm modüller `window.pays`, `window.creds` vb. kullanır.
  `db.js`'in `loadSecure`'u `window.pays = data.pays` yazdığında modül-scope `pays` stale kalır.
  `ui-*.js`, `app.js` içindeki tüm array erişimleri `window.*` üzerinden yapılıyor.
- **c.pays**: Kredi nesnesi içindeki taksit array'i — `window.pays` DEĞİL. `c.pays.find(...)` doğrudur.
- **firebase.js → db.js sırası**: Import listesinde `firebase.js` önce gelir (init), `db.js` sonra (`getApp()` guard).
- **Classic script (Script 3)**: `var _cryptoKey`, `var _dataKeyRaw`, `var _plainPin` burada — bunlar `window.*`'a bağlı.
- **doLogin**: `db.js`'te — `window._cryptoKey`, `window._plainPin`, `window._dataKeyRaw` kullanır.

### Tamamlanan Özellikler (bu oturumda)

| Özellik | Detay |
|---|---|
| Modüler yapı | index.html 3550 → 875 satır, 12 modül |
| window.* fix | Tüm array erişimleri (76 değişiklik) |
| c.window.pays fix | Kredi taksit array'i karışıklığı |
| Log fix | addToMonth, saveCred, doPartial addLog çağrıları eklendi |
| Sayfa başlığı badge | Gecikmiş ödeme varsa `(3 gecikmiş) iskenderpay` |
| cy sınıfı | 7 gün içi ödemeler sarı |
| Bu hafta widget | Plan matrisinde yaklaşan ödemeler (bugün/yarın/N gün) |
| Gecikmiş widget | Plan matrisinde kırmızı gecikmiş listesi (max 5, +N daha) |
| Auto-scroll | Plan matrisi mevcut aya otomatik scroll |
| Sıradaki ödeme bar | Kur bar altında en yakın bekleyen ödeme |
| renderAI stats | Bu ay / toplam borç kartları + 3 ay trend bar chart |
| sw.js temizlik | Duplikat kayıtlar silindi, ip-static-v5 |

### Kalan Testler (bir sonraki oturumda)

- Geçmiş → Geri yükle
- Yedek al → Geri yükle (PIN doğrulama + xDec akışı)
- Rehber CSV import/export
- Log filtre + seçili sil
- Kısmi ödeme → sıfırla

---

## Crypto Mimarisi (değiştirme)

```
PIN
 └→ PBKDF2 (pinSalt) → AES-KW anahtarı
      └→ AES-KW ile wrap edilmiş dataKey (Firebase _meta + localStorage)
           └→ dataKey ile AES-GCM şifreleme (plan verisi)
```

- `pinSalt` → `getSaltAsync('v5-pin-salt')` — UID + key stringinden PBKDF2
- `wrappedKey` → Firebase `users/{uid}_meta` + `localStorage('v8-wrapped-key')`
- Veri → Firebase `users/{uid}_{planId}`, `data` alanı

---

## Firebase Veri Yapısı

```
users/{uid}_meta
  wrappedKey: string  (base64, AES-KW wrap edilmiş 32 byte dataKey)

users/{uid}_{planId}
  data:      string  (base64, AES-GCM şifreli JSON)
  pinHash:   string  (base64, PBKDF2 hash)
  updatedAt: number
```

---

## Kritik Global Değişkenler

| Değişken | Açıklama |
|---|---|
| `_plainPin` | Oturum PIN'i — bellekte, localStorage'a yazılmaz |
| `_cryptoKey` | AES-256-GCM CryptoKey |
| `_dataKeyRaw` | Ham 32 byte dataKey — PIN değişiminde wrap için |
| `_knownBuild` | `initBuild()` ile version.json'dan set edilir |
| `window._planId` | Aktif plan (`plan1` / `plan2`) |
| `window._fbUid` | Firebase Auth UID |

## Storage Key Haritası

| Key | Nerede | Açıklama |
|---|---|---|
| `v5-pin-salt` | localStorage | Fallback salt |
| `v8-wrapped-key` | localStorage + Firebase `_meta` | AES-KW wrap edilmiş dataKey |
| `v6-active-plan` | localStorage | Aktif plan ID |
| `v7-migrated-{uid}-{planId}` | localStorage | v7 migrasyon flag |
| `v7b-migrated-{uid}-{planId}` | localStorage | v7b groupId fix flag |

---

## Versiyon Geçmişi (özet)

| Versiyon | Build | Değişiklik |
|---|---|---|
| v8.42 | 20260523-20 | Sıradaki ödeme bar, auto-scroll |
| v8.41 | 20260523-19 | Gecikmiş widget + todayMidnight fix |
| v8.40 | 20260523-18 | Bu hafta widget, legend |
| v8.39 | 20260523-17 | renderAI stats + 3 ay bar chart |
| v8.38 | 20260523-16 | firebase.js duplikat temizlik |
| v8.37 | 20260523-15 | firebase.js modülü (Script 1 taşındı) |
| v8.36 | 20260523-14 | cy class, 7 gün uyarı, sayfa başlığı badge |
| v8.35 | 20260523-13 | c.window.pays fix, doPartial addLog |
| v8.34 | 20260523-12 | window.* array erişimleri (76 değişiklik) |
| v8.33 | 20260523-11 | addToMonth + saveCred addLog |
| v8.32 | 20260523-10 | doLogin → db.js, let→var fix |
| v8.31 | 20260523-09 | ui.js → ui-plan/ui-data/ui-misc |
| v8.30 | 20260523-08 | chPass → db.js, visibilitychange temizlik |
| v8.29 | 20260523-07 | data.js, ölü kod temizlik, startRealtimeSync fix |
| v8.28 | 20260523-06 | data.js modülü, db.js entegrasyon tamamlandı |
| v8.27 | 20260523-05 | addToMonth log fix |
| v8.26 | 20260523-04 | buildMx isOD fix |
| v8.25 | 20260523-03 | ui.js duplicate delMonthEntry fix |
| v8.24 | 20260523-02 | app.js modülü |
| v8.23 | 20260523-01 | Faz 1+2 tamamlandı (modal.js, compat.js) |
| v8.22 | 20260522-09 | Başlangıç baseline |
