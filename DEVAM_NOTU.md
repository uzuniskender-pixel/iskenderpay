# iskenderpay — DEVAM NOTU

## Proje Özeti
Kişisel ödeme takip PWA'sı. **Tek dosya mimarisi:** tüm uygulama `index.html` içinde.
GitHub Pages'de yayında, PWA (manifest + service worker), Firebase auth + Firestore, AES-256-GCM lokal şifreleme.

---

## Mevcut Versiyon
- **APP_VERSION:** `v8.7`
- **Build:** `20260510-20`
- **index.html satır sayısı:** ~3.100 (bu oturum sonrası)

---

## Mimari Özet

### Veri Katmanları
| Dizi | İçerik | Kalıcılık |
|---|---|---|
| `pays[]` | Ana ödeme planı | Firebase + localStorage (şifreli) |
| `creds[]` | Kredi/taksit kayıtları | Firebase + localStorage (şifreli) |
| `paidItems[]` | Yapılan ödemeler (plan bağımsız) | Firebase + localStorage (şifreli) |
| `hist[]` | Silinen ödemeler geçmişi | Firebase + localStorage (şifreli) |
| `persons[]` | Kişi/firma listesi | Firebase + localStorage (şifreli) |
| `notes[]` | Şifreli notlar | Firebase + localStorage (şifreli) |
| `rehber[]` | Rehber (kişi detayları) | Firebase + localStorage (şifreli) |
| `actLog[]` | Aktivite logu | Firebase + localStorage (şifreli) |

### Temel Sistemler
- **saveSecure / loadSecure:** AES-256-GCM, PBKDF2, debounce 400ms, `saveSecureNow()` kritik işlemler için
- **invalidateLookups / rebuildLookups:** O(1) ID lookup (findPayById, findCredById, findPaysByGroup)
- **buildMx:** ödeme matrisini `{groupId → {ay → cell}}` formatında oluşturur
- **groupId:** aynı gruba ait ödemeleri matriste tek satırda birleştirir
- **Migrasyon zinciri:** migrateFromV4 → migrateToV7 → migrateToV7b

### Modal Sistemi (bu oturumda refactor edildi)
- **9 adet `.mov` modal:** PM2, CM, KM, RM, RMOD, NM, BPM, PRM, PIMOD
- **2 adet `.dov` panel:** DV (hücre detayı), RDET (rehber kişi detayı) — ModalManager dışında
- **ModalManager** (merkezi yönetim):
  - `ModalManager.open(id)` — `body.overflow:hidden` + state takibi
  - `ModalManager.close(id)` — son modal kapanınca scroll açılır
  - Click-outside-to-close (`.mov` arka planına tıklama)
  - ESC tuşu ile kapatma
  - `closeMov(id)` eski çağrılar için wrapper olarak kalıyor

---

## Bu Oturumda Yapılanlar

### Bug Fix 1 — Notlar sayfası Düzenle modalı açılmıyordu
- **Sebep:** `onclick="editNote(${JSON.stringify(n.nid)})"` → JSON.stringify string etrafına çift tırnak koyuyordu, HTML attribute çift tırnakla çevrildiği için onclick kırılıyordu
- **Fix:** `onclick="editNote('${n.nid}')"` (tek tırnak, nid formatı alphanumeric+underscore)
- Aynı bug `delNote` butonunda da vardı, ikisi birlikte düzeltildi

### Bug Fix 2 — Modal boyutu küçüktü
- `.modal` max-width: `460px → 560px`

### Yeni Özellik — Yapılan Ödemeler düzenle modalı
- **Eski:** `editPaidItem(idx)` üç adet `prompt()` açıyordu (address bar altında)
- **Yeni:** `PIMOD` modal eklendi (ad, tutar, tarih alanları)
- `openPaidEdit(paidId)` ve `savePaidItem()` fonksiyonları
- Array index yerine `paidId` kullanılıyor (filtre/sıralama sonrası index kayması problemi yok)
- `delPaidItem` da `paidId` ile çalışacak şekilde güncellendi

### Refactor — ModalManager (PDF mimarisinden)
- 14 adet dağınık `classList.add('open')` → `ModalManager.open(id)`
- Merkezi state, scroll lock, click-outside, ESC

---

## Backlog (PDF'lerden gelen öneriler — henüz uygulanmadı)

### Orta öncelik
- [ ] **`data-modal-open` attribute sistemi** — HTML buton onclick'lerini `data-modal-open="PM2"` ile temizlemek. Şu an 19 adet `closeMov()` inline onclick olarak duruyor. Event delegation ile bunlar kaldırılabilir.
- [ ] **`data-modal-close` attribute** — İptal butonlarındaki `onclick="closeMov('X')"` inline'larını temizler
- [ ] **`closeDV()` ve RDET close'unu ModalManager'a almak** — şu an `.dov` panelleri ayrı duruyor

### Düşük öncelik
- [ ] **editHistItem prompt'ları** — Silinen ödemeler sayfasındaki `editHistItem(idx)` hâlâ 3 adet `prompt()` kullanıyor. Modal'a taşınabilir (HIMOD veya PIMOD re-use)
- [ ] **editPlanName prompt** — Plan adı düzenleme `prompt()` ile, küçük bir inline input veya modal olabilir

---

## Önemli Teknik Notlar

- `nid` formatı: `'n' + Date.now() + '_' + Math.random().toString(36).slice(2,7)` → alfanümerik, tek tırnak safe
- `paidId` formatı: `'pi_' + Date.now() + '_' + Math.random()` → alfanümerik, tek tırnak safe
- `id` (pays): numeric artışlı string → onclick'te direkt sayı olarak kullanılabilir
- `groupId`: `'g' + timestamp` formatı
- Firebase doc path: `users/{uid}/plans/{planId}`
- localStorage key pattern: `v5-data-{planId}`, `v5-rates`, `v6-active-plan`, `v6-name-{planId}`
- Şifreleme salt: `'iskenderpay-v6'` sabit string + PBKDF2
- Plan sayısı: 2 (plan1, plan2), `_planId` global

---

## Dosya Yapısı
```
iskenderpay-main/
├── index.html          ← Tek kaynak dosya (tüm JS/CSS/HTML burada)
├── manifest.json
├── sw.js               ← Service worker (PWA)
├── version.json        ← {"v":"8.7","build":"20260510-20"}
├── icon-192.png
├── icon-512.png
├── CHANGELOG_v7.md
└── fix_groupids.js     ← Tek seferlik konsol fix scripti
```

---

## Oturum Kuralları
- Çalışma dosyası: `/tmp/iskenderpay-main/index.html`
- ZIP açma: `unzip -q /mnt/user-data/uploads/....zip -d /tmp/`
- Output: `/mnt/user-data/outputs/index.html`
- Her değişiklikten sonra doğrulama (grep / python3 kontrol) yapılır, ardından output'a kopyalanır
- Birden fazla dosya değişiyorsa hepsini listele, Buket hepsini birlikte gönderir, tek output
