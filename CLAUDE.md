# iskenderpay — Devam Notu

_Son güncelleme: 2026-05-20_

---

## Çalışma kuralları

- **Her iş bitiminde versiyon güncellenir — İKİ DOSYA BİRLİKTE:**
  1. `index.html` → `const APP_VERSION = 'vX.XX';`
  2. `version.json` → `{"v": "X.XX", "build": "YYYYMMDD-NN"}`
  - ⚠️ Sadece biri güncellenirse uygulama yanlış versiyon gösterir
  - Patch (bug fix, refactor): üçüncü hane — `v8.13` → `v8.14`
  - Minor (yeni özellik): ikinci hane — `v8.x` → `v9.0`
  - Build formatı: `YYYYMMDD-NN` (aynı günde sıralı) — örn. `20260520-04`
- **İş bitmeden CLAUDE.md güncellenmez** — biten iş kayıt altına alınır, sıradaki planlanır

---

## Tamamlananlar

### v8.8 → `version.json` single source of truth (`20260520-01`)
- `_knownBuild` artık `APP_BUILD` sabitiyle değil `initBuild()` ile `version.json`'dan initialize ediliyor
- `initBuild()` sayfa açılışında bir kez çalışıyor; polling ve `manualCheckUpdate` bu baseline'a güveniyor
- `APP_BUILD` sabiti sadece `renderAI()` UI fallback'i olarak kaldı — fonksiyonel mantık yok

### v8.11 → Kur API hata yönetimi (`20260520-03`)
- `fetchRates` sessiz `catch(e){}` kaldırıldı, `console.warn` eklendi
- `rates._fetchedAt` ISO timestamp — `renderKur` artık gerçek fetch zamanını gösteriyor
- 1 saatten eski kur ⚠ kırmızı gösteriyor, `localStorage.setItem` sadece başarılı fetch'te çağrılıyor

### v8.12 → Sync race condition düzeltme (`20260520-03`)
- `_fbPoll`: `_saveTimer !== null` iken poll callback atlanıyor
- `_doSave`: Firebase yazımı sonrası `window._lastUpdated = Date.now()` — poll kendi verisini tekrar yüklemiyor

### v8.13 → Arama tutarı + debounce (`20260520-04`)
- Arama: `p.amt` → `p.amount`, `pi.amt` → `pi.amount`, `c.amt` → kredi taksit toplamı
- `saveSecure()` debounce kaldırıldı — anında `_doSave()` çağrısı, race window tamamen kapandı
- `version.json` v8.13'e güncellendi

### v8.9 → PIN/dataKey mimarisi (`20260520-02`)
- **Sorun:** `_cryptoKey` doğrudan PIN'den türetiliyordu. PIN değişince veri yeniden şifreleniyor, sync başarısızsa kalıcı veri kaybı riski vardı.
- **Çözüm:** Rastgele `dataKey` (32 byte) üretilir, PIN ile AES-KW wrap edilir. PIN değişince sadece wrap yenilenir, veri dokunulmaz.
- Yeni fonksiyonlar: `importDataKey`, `wrapDataKey`, `unwrapDataKey`
- Yeni storage key: `v8-wrapped-key` (localStorage + Firebase `users/{uid}_meta`)
- `migrateToV8()`: v5 deriveKey mimarisinden tek seferlik geçiş — her iki planı çözüp yeni key ile yeniden şifreler
- `chPass`: `saveSecureNow()` çağrısı kaldırıldı — veri değişmiyor artık
- Yeni global: `_dataKeyRaw` (Uint8Array, oturumda bellekte — PIN değişiminde wrap için)

---

## Sıradaki: bilinen sorunlar (öncelik sırası)

1. **Firebase compat mode v10.12.0** — deprecated yol. Acil değil ama modular API geçişi planlanmalı.
2. **Tek dosya büyümesi** — ~3.510 satır. Bir sonraki büyük özellik öncesi fonksiyon gruplarını `<script>` tag'lerine ayırmak düşünülebilir (build tool olmadan).

---

## Dosya yapısı referansı

```
index.html        Ana uygulama — tek dosya, 3457 satır
version.json      {"v": "8.13", "build": "20260520-04"}
sw.js             Service Worker — network-first index.html, cache-first assets
manifest.json     PWA manifest
fix_groupids.js   Grup ID migrasyon yardımcısı
```

## Kritik global değişkenler

| Değişken | Açıklama |
|---|---|
| `_plainPin` | Oturum PIN'i — bellekte, localStorage'a yazılmaz |
| `_cryptoKey` | AES-256-GCM CryptoKey — dataKey'den import edilmiş |
| `_dataKeyRaw` | Ham 32 byte dataKey — PIN değişiminde wrap için tutulur |
| `_knownBuild` | Aktif build — `initBuild()` ile version.json'dan set edilir |
| `window._planId` | Aktif plan (`plan1` / `plan2`) |
| `window._fbDb` | Firebase Firestore referansı |
| `window._fbUid` | Firebase Auth UID |

## Storage key haritası

| Key | Nerede | Açıklama |
|---|---|---|
| `v5-pin-salt` | localStorage + Firebase | PIN hash salt — değişmiyor |
| `v5-data-salt` | localStorage | Artık kullanılmıyor (v8 sonrası) |
| `v8-wrapped-key` | localStorage + Firebase `_meta` | AES-KW wrap edilmiş dataKey |
| `v5-data-{planId}` | localStorage + Firebase | Şifreli veri |
| `v8-migrated-{uid}` | localStorage | Migrasyon flag |
