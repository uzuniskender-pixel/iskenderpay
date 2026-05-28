# iskenderpay — Devam Notu

_Son güncelleme: 2026-05-28_

---

## Çalışma Kuralları

- **Her iş bitiminde versiyon güncellenir — İKİ DOSYA BİRLİKTE:**
  1. `index.html` → `const APP_VERSION = 'vX.XX';` ve `const APP_BUILD = '...';`
  2. `version.json` → `{"v": "X.XX", "build": "YYYYMMDD-NN"}`
  - Patch (bug fix, refactor): üçüncü hane — `v8.21` → `v8.22`
  - Minor (yeni özellik): ikinci hane — `v8.x` → `v9.0`
  - Build formatı: `YYYYMMDD-NN` (aynı günde sıralı)
- **Her iş bitiminde CLAUDE.md güncellenir** — biten iş kayıt altına alınır, sıradaki planlanır
- `fix_groupids.js` root'ta kalır — konsola yapıştırılarak çalıştırılır, `js/`'ye taşınmaz
- Service worker cache'i agresif — deploy sonrası gizli sekme ile test et
- `Cross-Origin-Opener-Policy` hataları Google popup'tan geliyor, işlevselliği etkilemiyor
- **index.html'e Set-Content ile dokunma** — Python ile güncelle (encoding bozulur)
- **Dosya değişikliği Python ile yapılır** — PowerShell string replace Türkçe karakterleri bozuyor

---

## Mevcut Durum (28 Mayıs 2026) — v8.75 / 20260528-03

Temel modüller (`state.js`, `util.js`, `crypto.js`, `db.js`, `app.js`, `plan.js`, `sync.js` vb.) tamamlandı ve deploy edildi. `index.html` artık tüm mantığı `js/` klasöründen import ediyor.

### Tamamlanan (bu oturum — 28 Mayıs)

| Versiyon | Build | Değişiklik |
|---|---|---|
| v8.73 | 20260528-01 | `saveSecure` 400ms debounce eklendi (veri kaybı düzeltildi); `loadSecure` Firebase'e gereksiz yazma kaldırıldı; `_fbPoll` guard `window._saveTimer` kullanıyor; `migrateToV7b` devre dışı; SW cache `ip-static-v8`; `search.js` buAy `getAllItems` + partial ödeme `Math.max` fix |
| v8.74 | 20260528-02 | Kredi taksit override UX: `openCell` kredi hücresi için "Bu Taksiti Düzenle (₺)" etiketi, `creditAmt` ile gerçek taksit tutarı, "Tüm Krediyi Düzenle" butonu |

### Sıradaki adımlar (öncelik sırası)

1. **personId gruplama** (v8.66 yeniden yazılacak) — `ui-persons.js`, `ui-pay.js`, `ui-plan.js`

---

## Kritik Mimari Notlar

### Veri Akışı
```
Firebase (Firestore) ←→ loadSecure/saveSecure (db.js) ←→ window.pays/creds/...
                                                        ↑
                                              400ms debounce ile yazılır
```

### Sync Mantığı
- `_fbPoll` her 30 saniyede bir Firestore'u kontrol eder
- `_lastUpdated > 0` ve Firestore `updatedAt > _lastUpdated` ise `_syncCb` tetiklenir
- `visibilitychange` (sekme geri gelince) 500ms sonra poll tetikler
- `loadSecure` artık Firebase'e GERİ YAZMIYOR — sadece Firebase boşsa (yeni hesap) yazar

### saveSecure / saveSecureNow Farkı
- `saveSecure()` → 400ms debounce, normal değişikliklerde kullan
- `saveSecureNow()` → anında kayıt, migrasyon/şifre değişimi gibi kritik işlemlerde kullan

### groupId Mantığı
- Her kayıt grubuna benzersiz `groupId` atanır — aynı groupId'li kayıtlar matriste tek satır
- `savePay()` yeni gruba `String(Date.now())` atar
- `fix_groupids.js` → konsola yapıştırılarak bozuk groupId'leri düzeltir (tek seferlik)
- `migrateToV7b` DEVRE DIŞI — çalışırsa isim bazlı gruplama yaparak veriyi bozuyordu

---

## Dosya Yapısı

```
index.html          Ana uygulama — tüm JS import ile yükleniyor
js/state.js         Global state, clearState()
js/util.js          Pure yardımcı fonksiyonlar
js/crypto.js        Crypto altyapısı (AES-GCM + AES-KW + PBKDF2)
js/db.js            Firebase köprüsü + doLogin/loadSecure/saveSecure/migrasyon
js/app.js           enterApp, initApp, go, sekme yönetimi
js/plan.js          Plan adı, plan seçimi, plan geçişi
js/sync.js          setSyncDot, startRealtimeSync
js/kur.js           Döviz/altın kur çekme
js/backup.js        Yedek alma/geri yükleme
js/version.js       Versiyon kontrolü, güncelleme banner
js/ui-plan.js       Plan matrisi, hücre işlemleri (openCell, markOk, saveCellAmt...)
js/ui-pay.js        Ödeme ekleme/düzenleme modalı (savePay)
js/ui-persons.js    Kişi yönetimi
js/ui-notes.js      Notlar
js/rehber.js        Rehber
js/log.js           Aktivite logu
js/search.js        Arama + Ayarlar (renderAI)
js/modal.js         Modal yardımcıları
js/data.js          Veri yardımcıları
js/compat.js        Eski uyumluluk shim'leri
js/firebase.js      Firebase init
version.json        {"v": "8.74", "build": "20260528-02"}
sw.js               Service Worker — ip-static-v8
manifest.json       PWA manifest
fix_groupids.js     Konsol fix scripti (groupId düzeltme, tek seferlik)
```

---

## Versiyon Geçmişi (özet)

| Versiyon | Build | Değişiklik |
|---|---|---|
| v8.75 | 20260528-03 | Krediye Dönüştür: openRow butonu + convertToCredit() + saveCred sonrası pays temizleme |
| v8.74 | 20260528-02 | Kredi taksit override UX (openCell isCreditCell) |
| v8.73 | 20260528-01 | Veri kaybı fix: debounce, loadSecure, _fbPoll guard, migrateToV7b devre dışı, SW v8, search fix |
| v8.72 | 20260527-15 | search.js buAy getAllItems fix, SW cache v7 |
| v8.68 | 20260527-07 | Krediye Dönüştür (reset ile kayboldu) |
| v8.67 | 20260527-06 | Kredi taksit override (reset ile kayboldu) |
| v8.66 | 20260527-05 | personId gruplama (reset ile kayboldu) |
| v8.63 | 20260527-01 | Kararlı baseline (modüler yapı tamamlandı) |
