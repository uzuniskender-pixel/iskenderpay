# iskenderpay — Devam Notu

_Son güncelleme: 2026-05-25_

---

## Çalışma Kuralları

- **Her iş bitiminde versiyon güncellenir — İKİ DOSYA BİRLİKTE:**
  1. `index.html` → `var APP_VERSION = 'vX.XX';` ve `var APP_BUILD = '...';`
  2. `version.json` → `{"v": "X.XX", "build": "YYYYMMDD-NN"}`
  - Patch (bug fix, refactor): üçüncü hane — `v8.61` → `v8.62`
  - Minor (yeni özellik): ikinci hane — `v8.x` → `v9.0`
  - Build formatı: `YYYYMMDD-NN`
- **İş bitmeden CLAUDE.md güncellenmez**
- `fix_groupids.js` root'ta kalır — konsola yapıştırılarak çalıştırılır
- Service worker cache agresif — deploy sonrası gizli sekme ile test et
- `Cross-Origin-Opener-Policy` uyarıları Google popup'tan, zararsız
- SW cache sürümü: `ip-static-v6` — yeni modül eklenince artır

---

## Mevcut Durum (25 Mayıs 2026) — v8.62 / 20260524-20

### Sağlık Göstergeleri

| Metrik | Değer |
|---|---|
| Syntax hatası | 0 (21 dosya node --check OK) |
| Bare array erişimi | 0 |
| window.window | 0 |
| Tanımsız onclick | 0 |
| Toplam export | 207 |
| Auto-tag | Çalışıyor (v8.61-20260524-19) |

### Dosya Yapısı

```
index.html              873 satır — HTML + Firebase init + ince glue
version.json            {"v": "8.62", "build": "20260524-20"}
sw.js                   ip-static-v6 · 27 dosya
manifest.json           PWA manifest
fix_groupids.js         Konsol fix scripti (tek seferlik)
.github/workflows/
  auto-tag.yml          Her push'ta otomatik tag oluşturur

js/
  firebase.js           Firebase init + auth UI + Google login/logout
  state.js              Global state, clearState(), window.* senkronizasyonu
  util.js               18 pure fonksiyon (ES module export)
  compat.js             util.js → window.* bridge
  crypto.js             AES-GCM + AES-KW + PBKDF2
  modal.js              ModalManager (open/close/ESC/backdrop)
  data.js               Lookup maps (findPayById, findPaysByGroup, findCredById)
  db.js                 Firebase köprüsü, doLogin, loadSecure, saveSecure
  app.js                App lifecycle, go(), initApp, addLog
  plan.js               Plan adı, seçim, geçiş
  sync.js               Realtime sync, dot, toast
  kur.js                Kur çekme, render, sıradaki ödeme
  backup.js             Yedek al/geri yükle (snapshot+undo), CSV export
  version.js            initBuild, checkVersion, banner (auto-çalışır)
  ui-plan.js            Plan matrisi, hücre detayları, durum aksiyonları
  ui-pay.js             Ödeme/kredi CRUD, kredi özet paneli
  ui-persons.js         Kişiler + geçmiş
  ui-notes.js           Notlar + yapılan ödemeler
  rehber.js             Rehber CRUD, CSV import/export
  log.js                Aktivite logu, filtre, sil
  search.js             Global arama + ayarlar (renderAI)
```

### Mimari Notlar (kritik)

- **window.* zorunlu**: Tüm modüller `window.pays`, `window.creds` vb. kullanır
- **c.pays**: Kredi nesnesinin taksit dizisi — `window.pays` değil, doğru
- **firebase.js → db.js sırası**: Import listesinde firebase.js önce
- **Classic Script 3** (26 satır): `var _cryptoKey`, `_dataKeyRaw`, `_plainPin` — doLogin'e bağlı, taşınamaz
- **doLogin**: db.js'te — `window._cryptoKey`, `window._plainPin`, `window._dataKeyRaw` kullanır
- **Bare dış çağrı kuralı**: Başka modülde tanımlı fonksiyonlar `window.X()` olarak çağrılmalı
- **Yeni modül eklenince**: import listesi (index.html), sw.js cache, export → window.* kontrol et

### Tamamlanan Özellikler

| Özellik | Detay |
|---|---|
| Modüler yapı | index.html 3550 → 873 satır, 21 modül |
| Auto-tag | .github/workflows/auto-tag.yml |
| Yedek (tam) | pays+creds+hist+persons+notes+paidItems+rehber+actLog |
| Restore snapshot | Geri yükleme öncesi localStorage snapshot, "Geri Al" butonu |
| Gecikmiş widget | Plan matrisinde kırmızı gecikmiş listesi |
| Bu hafta widget | Plan matrisinde sarı yaklaşan ödemeler |
| Kredi özet paneli | İlerleme barı, ödenen/kalan, sıradaki taksit |
| Sıradaki ödeme bar | Kur bar altında en yakın bekleyen |
| Auto-scroll | Plan matrisi mevcut aya scroll |
| renderAI stats | Bu ay/toplam borç + 3 ay bar chart |
| Sayfa başlığı badge | Gecikmiş varsa `(N gecikmiş) iskenderpay` |
| Nav badge | Mobil Plan butonunda kırmızı sayı |
| Ödendi ay toggle | "✓ Ödendiler" butonu — gizle/göster |
| Progress bar | OHS'te aylık ilerleme barı |
| cy sınıfı | 7 gün içi ödemeler sarı |

### Kalan Testler

- Geçmiş → Geri yükle
- Yedek al → Geri yükle (PIN + xDec akışı)
- Rehber CSV import/export
- Log filtre + seçili sil
- Kısmi ödeme → sıfırla
- Şifre değiştir (chPass)

---

## Crypto Mimarisi (değiştirme)

```
PIN
 └→ PBKDF2 (pinSalt) → AES-KW anahtarı
      └→ AES-KW ile wrap edilmiş dataKey (Firebase _meta + localStorage)
           └→ dataKey ile AES-GCM şifreleme (plan verisi)
```

---

## Firebase Veri Yapısı

```
users/{uid}_meta
  wrappedKey: string  (base64, AES-KW)

users/{uid}_{planId}
  data:      string  (base64, AES-GCM şifreli JSON)
  pinHash:   string
  updatedAt: number
```

---

## Versiyon Geçmişi (özet)

| Versiyon | Build | Değişiklik |
|---|---|---|
| v8.62 | 20260524-20 | Ödendi ay toggle |
| v8.61 | 20260524-19 | auto-tag.yml |
| v8.60 | 20260524-18 | Restore snapshot + undo |
| v8.59 | 20260524-17 | Yedekte rehber+actLog fix |
| v8.58 | 20260524-16 | 281 bare dış çağrı → window.* (kökten) |
| v8.57 | 20260524-15 | Syntax fix (template literal) |
| v8.56 | 20260524-14 | Nav badge, hücre geçmiş ödemeler |
| v8.55 | 20260524-13 | Kredi özet paneli |
| v8.54 | 20260524-12 | modal/renderGecWidget export fix |
| v8.53 | 20260524-11 | initBuild auto-call fix |
| v8.52 | 20260524-10 | search.js/ui-notes.js bare fix |
| v8.51 | 20260524-09 | Bare array final temizlik |
| v8.50 | 20260524-08 | c.window.pays / d.window.rates fix |
| v8.49 | 20260524-07 | sw.js v6, Script 3 temizlik, firebase duplikat |
| v8.48 | 20260524-06 | ui-data.js → ui-pay/ui-persons/ui-notes |
| v8.47 | 20260524-05 | ui-misc.js → rehber/log/search |
| v8.46 | 20260524-04 | app.js → plan.js + sync.js |
| v8.45 | 20260524-03 | app.js → kur/backup/version, Script 3 küçültme |
| v8.44 | 20260524-02 | rates state.js, data.js sırası, renderAI taşındı |
| v8.42 | 20260523-20 | Sıradaki bar, auto-scroll, gecikmiş widget |
| v8.22 | 20260522-09 | Başlangıç baseline |
