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

## Mevcut Durum (28 Mayıs 2026) — v8.96 / 20260528-24

Temel modüller (`state.js`, `util.js`, `crypto.js`, `db.js`, `app.js`, `plan.js`, `sync.js` vb.) tamamlandı ve deploy edildi. `index.html` artık tüm mantığı `js/` klasöründen import ediyor.

### Tamamlanan (bu oturum — 28 Mayıs)

| Versiyon | Build | Değişiklik |
|---|---|---|
| v8.96 | 20260528-24 | **Store Aşama 3 temizlik + bug fix**. (1) Store mutation API'leri zaten debounce save tetiklediği için redundant olan ~22 manuel `saveSecure()`/`save()`/`savePersons()`/`saveNotes()`/`rhbSave()` çağrısı kaldırıldı (log.js × 3, rehber.js × 3, ui-pay.js × 2, ui-plan.js × 9, ui-persons.js × 6, ui-notes.js × 4). Item-level mutation içeren fonksiyonlar (`saveCred`, `markOk`, `undoCell`, `doPartial`, `saveCellAmt`, `resetPartial`) için `Store.touch()` eklendi. `state.js` minimale indirildi — kullanılmayan setter'lar (`setState`, `setStateMany`, `setPlanId`, `setSortMode/CurTab/PartialCtx/SuppressSave/SaveTimer/LookupDirty/Rates`, `SAVE_DEBOUNCE_MS`) ve veri dizisi `let` bildirimleri (Store'a taşındı) silindi. Korunan: `addLog` 800ms timer (kasıtlı farklı zamanlama), `backup.js#saveSecureNow().then(...)` (senkronizasyon gerekli). (2) **Bug fix: convert-to-credit stale state** (`ui-pay.js#openCred`): Pays grubunu krediye dönüştürme akışında CM modal iptal/ESC/dış-tıklama ile kapatılırsa `window._convertSourceKey` ve `_convertSourcePays` window'da kalıyordu — sonraki "Yeni Kredi" kaydında stale kaynağa ait pays grubu silinebiliyordu. `openCred()` başına temizleme eklendi. |
| v8.95 | 20260528-23 | **Merkezi Hesap modülü** (`js/hesap.js`): `Hesap.buAyOzeti({all,refDate})` / `Hesap.toplamOzeti()` / `Hesap.krediler()` / `Hesap.trend(n)` + paylaşılan `_baseOf` / `_displayNames(mx,keys?)`. Üç dosyada (`ui-plan.js#render`, `search.js#renderAI`, `ui-pay.js#renderCredSummary`) duplicate hesap+display name kodları Hesap çağrılarıyla değiştirildi — tutarsızlık çözüldü. |
| v8.94 | 20260528-22 | `sync.js` realtime callback'ine `renderActLog` çağrısı eklendi — uzak sekmeden gelen actLog değişiklikleri artık aktivite log sekmesinde de yansıyor |
| v8.93 | 20260528-21 | **Merkezi Store pattern (Aşama 2)**: CRUD mutation site'ları Store API'ye geçirildi — `log.js` (actLog filter/clear → `removeWhere`/`replace`), `rehber.js` (push/filter/Object.assign → `push`/`removeWhere`/`mutateItem`), `ui-pay.js` (savePay/saveCred push'ları + convert-source filter), `ui-plan.js` (10+ site: addToMonth/markOk/undoCell/doPartial/resetPartial/delByKey/delMonthEntry/delCellItems), `ui-persons.js` (savePerson/delPerson/restoreFromHist/delHist/clrHist + saveHistItem mutateItem), `ui-notes.js` (saveNote/delNote/savePaidItem/delPaidItem). Manuel `window.saveSecure()`/`window.save()` çağrıları KORUNDU (debounce sayesinde çift yazma olmuyor — Aşama 3'te temizlenecek). Ölü dosyalar `ui.js`/`ui-data.js`/`ui-misc.js` (v8.90'da kaldırıldı, FS'te artık) atlandı. |
| v8.92 | 20260528-20 | **Merkezi Store pattern (Aşama 1)**: `js/store.js` eklendi — 8 dizi + rates için tek otorite; `window.<key>` getter/setter köprüsü (Object.defineProperty) — geriye uyum korunuyor; bulk reassign noktaları (`state.js#clearState`, `db.js#loadSecure`+`migrateToV7`, `sync.js`, `plan.js#selectPlan`, `backup.js#doRestore`+`undoRestore`) `Store.hydrate`/`Store.clearAll`/`Store.replace` API'lerine geçirildi. Yeni API: `Store.get/hydrate/replace/push/unshift/removeWhere/spliceAt/mutateItem/touch/tx/clearAll`. Mutation API'leri `invalidateLookups` + `_dirty=true` + `saveSecure()` debounce'unu otomatik tetikler. |

### Sıradaki adımlar (öncelik sırası)

1. **data.js → Store entegrasyonu** — `data.js`'in kendi `_lookupDirty` flag'i Store'a taşı (state duplication)
2. **Ölü dosyaları sil** — `ui.js`, `ui-data.js`, `ui-misc.js` FS'ten kaldır (v8.90'da import'tan çıkarıldı ama dosyalar duruyor)
3. **personId gruplama** (v8.66 yeniden yazılacak) — `ui-persons.js`, `ui-pay.js`, `ui-plan.js`

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
js/store.js         Merkezi Store — 8 dizi + rates tek otorite, window.* getter/setter köprüsü
js/state.js         UI durumu (curTab, sortMode, partialCtx) + _planId + clearState() — veri dizileri Store'da
js/util.js          Pure yardımcı fonksiyonlar
js/crypto.js        Crypto altyapısı (AES-GCM + AES-KW + PBKDF2)
js/db.js            Firebase köprüsü + doLogin/loadSecure/saveSecure/migrasyon
js/app.js           enterApp, initApp, go, sekme yönetimi
js/plan.js          Plan adı, plan seçimi, plan geçişi
js/sync.js          setSyncDot, startRealtimeSync
js/kur.js           Döviz/altın kur çekme
js/backup.js        Yedek alma/geri yükleme
js/version.js       Versiyon kontrolü, güncelleme banner
js/ui-plan.js       Plan matrisi, hücre işlemleri (openCell, markOk, saveCellAmt...) [ui.js/ui-data.js/ui-misc.js kaldırıldı]
js/hesap.js         Merkezi hesap modülü — buAyOzeti, toplamOzeti, krediler, trend + paylaşılan display name
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
version.json        {"v": "8.97", "build": "20260528-25"}
sw.js               Service Worker — ip-static-v8
manifest.json       PWA manifest
fix_groupids.js     Konsol fix scripti (groupId düzeltme, tek seferlik)
```

---

## Versiyon Geçmişi (özet)

| Versiyon | Build | Değişiklik |
|---|---|---|
| v8.96 | 20260528-24 | Bug fix: convert-to-credit modal iptal sonrası stale `_convertSourceKey` → openCred başında temizleme |
| v8.96 | 20260528-24 | Store Aşama 3 temizlik (manuel saveSecure çağrıları + state.js dead setter'lar) + convert-to-credit bug fix |
| v8.95 | 20260528-23 | Merkezi Hesap modülü — js/hesap.js + ui-plan.js/search.js/ui-pay.js duplicate hesaplar kaldırıldı |
| v8.94 | 20260528-22 | sync.js callback'ine renderActLog eklendi |
| v8.93 | 20260528-21 | Merkezi Store pattern Aşama 2 — tüm CRUD mutation site'ları Store API'ye geçirildi |
| v8.92 | 20260528-20 | Merkezi Store pattern Aşama 1 — js/store.js + bulk reassign migration |
| v8.91 | 20260528-19 | fix.py, fix_ver.py geçici dosyalar silindi |
| v8.90 | 20260528-18 | Dead code silindi: ui.js, ui-data.js, ui-misc.js kaldırıldı |
| v8.89 | 20260528-17 | localStorage önce yaz; _fbPoll concurrent guard + _fbSyncNeeded retry; backup.js saveSecureNow |
| v8.88 | 20260528-16 | kur.js: 30 dakika içinde çekildiyse API atlanır; 🔄 butonu force=true ile zorunlu yeniler |
| v8.87 | 20260528-15 | Küçük fixler: _doSave finally→dirty=false, loadSecure dirty=false, SW install log, mx._dn pollution fix |
| v8.86 | 20260528-14 | Kredi kartı display name: pays base name'leri de sayılır, plan matrisiyle tutarlı |
| v8.85 | 20260528-13 | Dirty flag: değişiklik varken sync in-memory'i ezmez; saveSecure→dirty=true, _doSave sonrası→dirty=false |
| v8.84 | 20260528-12 | _doSave öncesi groupId tutarlılık kontrolü: aynı groupId'de farklı isim varsa en yaygın isme normalize edilir |
| v8.83 | 20260528-11 | Kredi kartı paneli: plan matrisiyle aynı base name + suffix mantığı (QNB 1/2/3 → QNB/QNB 1/QNB 2) |
| v8.82 | 20260528-10 | saveCred edit: ödeme geçmişi korunur, paidItems adı güncellenir, yapı değişince paid status taşınır |
| v8.81 | 20260528-09 | SW fix: JS dosyaları cache:no-cache ile her zaman network'ten alınır — unregister sorunu çözüldü |
| v8.80 | 20260528-08 | Kredi paneli kart grid: auto-fill minmax(160px), kompakt layout |
| v8.79 | 20260528-07 | SW güncelleme: activate sonrası SW_UPDATED mesajı → sayfa otomatik reload (unregister gerekmez) |
| v8.78 | 20260528-06 | Display name: sondaki sayı soyulur, base name ile grupla — QNB 1/2/3 → QNB/QNB 1/QNB 2 (veri değişmez) |
| v8.77 | 20260528-05 | Suffix mantığı: ilk grup suffix almaz, ikincisi "1", üçüncüsü "2" (DENİZBANK + DENİZBANK 1) |
| v8.76 | 20260528-04 | savePay edit: isim/kategori değişince gruptaki tüm kayıtlara yayılır |
| v8.75 | 20260528-03 | Krediye Dönüştür: openRow butonu + convertToCredit() + saveCred sonrası pays temizleme |
| v8.74 | 20260528-02 | Kredi taksit override UX (openCell isCreditCell) |
| v8.73 | 20260528-01 | Veri kaybı fix: debounce, loadSecure, _fbPoll guard, migrateToV7b devre dışı, SW v8, search fix |
| v8.72 | 20260527-15 | search.js buAy getAllItems fix, SW cache v7 |
| v8.68 | 20260527-07 | Krediye Dönüştür (reset ile kayboldu) |
| v8.67 | 20260527-06 | Kredi taksit override (reset ile kayboldu) |
| v8.66 | 20260527-05 | personId gruplama (reset ile kayboldu) |
| v8.63 | 20260527-01 | Kararlı baseline (modüler yapı tamamlandı) |
