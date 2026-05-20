# iskenderpay — DEVAM NOTU

## Proje Özeti
Kişisel ödeme takip PWA'sı. **Tek dosya mimarisi:** tüm uygulama `index.html` içinde.
GitHub Pages'de yayında, PWA (manifest + service worker), Firebase auth + Firestore, AES-256-GCM lokal şifreleme.

---

## Mevcut Versiyon
- **APP_VERSION:** `v8.13`
- **Build:** `20260520-04`
- **index.html satır sayısı:** ~3.510

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
- **saveSecure / loadSecure:** AES-256-GCM + PBKDF2 (yerel kripto).
- **Sync Motoru:** 30sn polling (`_fbPoll`), `updatedAt` kontrolü.
- **UI Render:** Saf JS, dinamik tablo matrisi, CSS Değişkenleri.

---

## Yapılacaklar (Todo List)

- [x] **Global Arama Modalı (Search Modal)** — Tüm veri katmanlarında (`pays`, `paidItems`, `creds`, `notes`, `rehber`) lokal çözülmüş veriler üzerinden anlık arama desteği eklendi (v8.8).
- [x] **Kur API hata yönetimi** — `fetchRates` sessiz hata yutma giderildi, `_fetchedAt` timestamp eklendi, eski kur ⚠ ile gösteriliyor (v8.11).
- [x] **Sync race condition** — `_fbPoll` debounce aktifken atlanıyor, `_doSave` sonrası `_lastUpdated` güncelleniyor (v8.12).
- [x] **Arama tutar sıfır sorunu** — `p.amt` → `p.amount` düzeltildi (v8.13).
- [x] **Debounce kaldırıldı** — `saveSecure()` anında kaydediyor, race window tamamen kapandı (v8.13).
- [ ] **Geçmiş Detay Modalı (History Detail)** — Silinen geçmiş satırlarının (`hist[]`) detaylı görünümü ve tek tıkla geri yükleme altyapısı (HIMOD/PIMOD benzeri bir yapı taşınabilir).
- [ ] **editPlanName prompt** — Plan adlarının `prompt()` veya şık bir inline input ile ("Ev", "İş" vb.) özelleştirilebilmesi ve `localStorage` / Firebase üzerinde tutulması.

---

## ⚠️ VERSİYON GÜNCELLEME KURALI
Her `APP_VERSION` değişikliğinde **iki dosya birlikte** güncellenmeli:
1. `index.html` → `const APP_VERSION = 'vX.XX';`
2. `version.json` → `{"v": "X.XX", "build": "YYYYMMDD-NN"}`

`version.json` güncellenmezse uygulama "Güncel sürümdesiniz" der ama yanlış versiyon çalışır.

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
├── index.html          ← Tek kaynak dosya (Arama sistemi eklendi)
├── manifest.json
├── sw.js               ← Service worker (PWA)
├── version.json        ← {"v":"8.13","build":"20260520-04"}
├── icon-192.png
├── icon-512.png
├── CHANGELOG_v7.md
└── fix_groupids.js
```
