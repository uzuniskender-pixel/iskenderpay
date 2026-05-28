# DEVAM NOTU — sonraki oturum için brief

_Son oturum: 2026-05-28 · son commit: **v8.128 / 20260528-53** (`a7ca043`)_

CLAUDE.md = canonical referans (versiyon geçmişi, mimari notlar, dosya yapısı).
Bu dosya = oturumlar arası **kısa devir notu**. Detay için CLAUDE.md'ye bak.

---

## TL;DR

Bu oturum baştan sona **Store sahipliği konsolidasyonu** + **modül ayrıştırmaları** + ikincil temizlikler oldu.
v8.95'te başlayan Hesap modülünden v8.128'e kadar 30+ patch. İki ana hat:
1. Dağınık `window._X` durum değişkenleri tek otorite **`Store`** altında toplandı (10 persist flag + session namespace + planId).
2. Monolitik dosyalar concern'lerine ayrıldı: **auth-pin.js** (v8.110), **app.css** (v8.126), **firestore.js + persist.js** (v8.127).

---

## Tamamlanan — versiyon grupları

| Grup | Versiyonlar | Özet |
|---|---|---|
| **Hesap modülü + Store Phase 3** | v8.95 → v8.97 | `js/hesap.js` tek hesap kaynağı; manuel saveSecure çağrıları temizlendi; `Store.replace` autoSave hotfix |
| **Lookup maps → Store** | v8.98 | `_lookupDirty` + 3 Map data.js'ten Store'a |
| **Ölü kod + redundant invalidate** | v8.99 | `ui.js`/`ui-data.js`/`ui-misc.js` silindi; 5 manuel `invalidateLookups()` çağrısı kaldırıldı |
| **Event-based render + firebase race hotfix** | v8.100 | `store:change` CustomEvent (microtask-coalesced); plan.js race defensive guard |
| **Ulaşılamaz else fallback temizlikleri** | v8.102, v8.105 | `if (window.Store) {} else {}` dead branch'ları silindi |
| **Auth duplikasyonu + lifecycle** | v8.103, v8.107 | db.js'in firebase.js ile aynı `onAuthStateChanged`/login/signOut tanımları silindi; `_fbStopListen` aktive edildi; `migrateToV7b` silindi (v8.73'te zaten devre dışıydı); ModalManager bypass fix |
| **8 persist flag → Store** | v8.108 | `_dirty`/`_saveTimer`/`_syncTimer`/`_fbSyncNeeded`/`_lastUpdated`/`_syncCb`/`_suppressSave`/`_logSaveTimer` |
| **personId gruplama** | v8.109 → v8.112 | persons.id + pays.personId + Hesap._displayNames personId-aware; legacy data için 2-pass backfill (`app.js#_backfillPersonIds`) |
| **auth-pin.js ayrımı** | v8.110 | `doLogin` + `chPass` db.js'ten yeni dosyaya |
| **`_fbUid` → Store.fbUid + load-order race kalıcı fix** | v8.113 | firebase.js ana modül bloğuna taşındı; v8.100 defensive guard kaldırıldı |
| **savePay person-mismatch toast** | v8.114 | İsim persons'ta yoksa engelleyici olmayan warn-toast |
| **Session → Store.session** | v8.115 | `_cryptoKey`/`_dataKeyRaw`/`_plainPin` → `Store.session.X`; crypto.js'ten 5 dead export silindi |
| **Bundle: planId + knownBuild + temizlikler** | v8.116-v8.120 | `_planId` → `Store.planId` (setter localStorage'a otomatik yazar); `_knownBuild` → version.js module-private + named export; rehber.js + app.js#migrationRunning modül-local |
| **rehber.js event delegation** | v8.121 | Inline `_rhbPhones[i]...` handler'lar container'a delegated; `window._rhbPhones` export silindi |
| **Konsol debug helper** | v8.122 | `window.debugState()` — 5 console.table grubu |
| **`_doSave` integrity check** | v8.123 | pays/creds/persons için tip/varlık doğrulama (silent fix değil, forensic log) |
| **ui-plan.js section header'lar** | v8.124 | 7 başlık, kod okunabilirliği |
| **Cred "(Kredi)" suffix** | v8.125 | `hesap.js#_displayNames`'de post-pass — plan matrisi + kredi paneli + arama tutarlı |
| **CSS → app.css** | v8.126 | index.html'in `<style>` bloğu ayrıldı, %30 küçüldü; CACHE v9; CSS network-first |
| **db.js → firestore.js + persist.js** | v8.127 | Firestore I/O (11 fn) ve encrypt/storage/migration (5 fn) ayrımı; window.* API yüzeyi korundu (0 caller değişikliği); sahiplik haritası: firebase.js → firestore.js → persist.js → auth-pin.js |
| **persist.js 4 dead alias temizliği** | v8.128 | `window.save`/`savePersons`/`saveNotes`/`loadNotes` shim'leri silindi (v8.96 sonrası 0 caller); v8.127 öncesi persist.js import edilmiyordu → runtime'da bile bağlanmıyorlardı |

---

## Açık kalan maddeler

**CLAUDE.md Sıradaki adımlar:** _liste boş_ — büyük Store ve modül ayrıştırma ailesi tamamlandı.

**Implicit / olası yönler** (henüz görev değil):

1. **`persist.js#_doSave` integrity check → `validate.js` ayrımı** — v8.123'te eklenen integrity check ~40 satır. `persist.js`'in CLAUDE.md entry'sinde "sonraki refactor adayı (`validate.js`)" notu var. Mantıksal sınır net (encrypt/storage'dan ayrı concern).
2. **`Store.session` security hardening** — `Store.session.cryptoKey/dataKeyRaw/plainPin` hâlâ `window.Store.session` üzerinden console-accessible. v8.115'te kabul edilen trade-off, ama mevcut konsol attack surface. Closure-based hiding + ephemeral key wrap pattern.
3. **`window._rhbPhones` event delegation testi** — v8.121'de mantıksal doğru ama gerçek mobil/desktop test yapılmadı. Bir sonraki manuel test fırsatında doğrulanmalı.
4. **`debugState()` SW cache testi** — v8.122'de eklendi ama bir noktada "expose edilmemiş" raporu geldi (gerçekte mevcut, muhtemelen stale tab). Gizli sekme veya hard reload ile doğrulanmalı.
5. **Tarihi `db.js` yorum referansları** — `app.js:227` ("SYNC UI (db.js tarafından çağrılır)"), `index.html:442` (history yorum), `store.js:40,48`, `firebase.js:74` — kozmetik, davranış etkilenmez ama bir sonraki temizlik turunda toplu güncellenebilir.

---

## Kritik mimari kararlar

### Tek sahip pattern (`window.X = Store.X`)
Her `window._X` flag tek bir noktada — `js/store.js` `_persistState` veya `_sessionState`. Çağıran kod `window.Store.X` üzerinden okur/yazar; backward compat **yok** (`window._X` direkt okuyan harici kod undefined görür — istenen davranış).

### `firebase.js` load-order
**v8.113'ten beri** `firebase.js` ana modül bloğunda `store.js`'ten **hemen sonra** import edilir (index.html'deki ayrı `<script type="module">` bloğu kaldırıldı). Bu, cached-auth `onAuthStateChanged` callback'inin Store yüklenmeden fire etme race'ini kalıcı çözer. **Önemli:** firebase.js'i ayrı bloğa geri taşıma — race geri gelir.

### `firestore.js` + `persist.js` import sırası
**v8.127'den beri** sıralama: `store → firebase → state → util → compat → crypto → **firestore → persist** → auth-pin → modal → ...`. `firestore.js` `firebase.js`'in expose ettiği `_planDoc`/`_metaDoc` closure'larına bağlı; `persist.js` `firestore.js`'in `window._fbSave/_fbLoad`'ine + `crypto.js`'in `encryptData/decryptData`'sına bağlı. Sıra bozulursa persist.js'in `if (window._fbSave)` guard'ı sessizce geçer → veri sadece localStorage'a yazılır (Firebase sync kopar).

### `Store.session` güvenlik trade-off
`Store.session.cryptoKey/dataKeyRaw/plainPin` console'dan erişilebilir. v8.115'te bilinçli kararla "sahiplik konsolidasyonu, security hardening değil" notuyla kabul edildi. Hardening yapılırsa: closure scope + ephemeral key wrap pattern.

### `_planId` → `Store.planId` setter localStorage'a yazar
`Store.planId = X` artık `localStorage.setItem('v6-active-plan', X)` otomatik. **Manuel `localStorage.setItem`'a gerek yok** — eski kod örnekleri redundant.

### Cred display name
`hesap.js#_displayNames` post-pass: `cred_` prefix'li rowKey'lere her zaman `' (Kredi)'` ekler. Numeric suffix mantığı (pays ile shared `countMap`) aynen çalışmaya devam eder — örn aynı `_baseOf` paylaşan pay + cred varsa: pay → `"GARANTİ"`, cred → `"GARANTİ 1 (Kredi)"`.

---

## Restore points

| Tag | Commit | Notlar |
|---|---|---|
| **`v8.120-stable`** | `b99e570` | Store migration ailesi (v8.108-v8.120) + personId gruplama tamamlanmış stabil baseline. |
| `v8.112-stable` | `d03d5bc` | Daha eski — personId backfill öncesi |

**Öneri:** Bu oturumun sonunda v8.128 yeni baseline. Modül ayrıştırması (auth-pin.js + app.css + firestore.js/persist.js) tamamlandı, integrity check yerleşti.
```
git tag v8.128-stable a7ca043 && git push origin v8.128-stable
```

Geri dönüş:
```
git reset --hard v8.120-stable
```
