# DEVAM NOTU — sonraki oturum için brief

_Son oturum: 2026-05-28 · son commit: **v8.151 / 20260528-71**_

CLAUDE.md = canonical referans (versiyon geçmişi, mimari notlar, dosya yapısı).
Bu dosya = oturumlar arası **kısa devir notu**. Detay için CLAUDE.md'ye bak.

---

## TL;DR

Bu oturum baştan sona **Store sahipliği konsolidasyonu** + **modül ayrıştırmaları** + ikincil temizlikler + **log UI olgunlaşması** + **plan matrisi bug fix** + **ui-plan.js 3 dosyaya bölündü** + **legacy actLog backfill** oldu.
v8.95'te başlayan Hesap modülünden v8.151'e kadar 58+ patch. Sekiz ana hat:
1. Dağınık `window._X` durum değişkenleri tek otorite **`Store`** altında toplandı (10 persist flag + session namespace + planId).
2. Monolitik dosyalar concern'lerine ayrıldı: **auth-pin.js** (v8.110), **app.css** (v8.126), **firestore.js + persist.js** (v8.127), **validate.js** (v8.135), **ui-plan.js → render/detail/actions** (v8.150).
3. Ölü kod toplu temizliği (v8.128-v8.133): persist alias'ları, firestore salt helper'ları, util artıkları, UI handler'ları, Firebase window expose'ları — toplam ~70 satır.
4. `addLog` zenginleştirildi (v8.136 + v8.139 + v8.140 + v8.146): yeni `ctx = {personId, groupId}` 5. parametre + log render rozetleri + 7 caller bağlandı (v8.140) + 6 ui-plan caller'a `personId` eklendi (v8.146).
5. **Log UI olgunlaştı** (v8.143-v8.145): "Kişi" silme modu (LOG_DEL_BAR 3. mode) + 📋/👤 icon jump + .jump-flash highlight (v8.144) + Hepsi/Bugün/Bu hafta/Bu ay tarih filtresi (v8.145) + person dropdown filter (v8.145 wiring) — actLog artık zengin metadata + zengin UI ile tüketiliyor.
6. **Plan matrisi bug fix** (v8.147): `togglePaidMonths` özelliği ay-bazlı filter yapıyordu (yanlış), satır-bazlı olarak düzeltildi.
7. **Legacy actLog backfill** (v8.148): `_backfillPersonIds`'a Pass 3 eklendi — v8.140 öncesi entry'lere `detail` segmentinden isim eşleşmesiyle `personId` atanır (rhb_*/cred_add/taksit skip'leri ile false positive azaltıldı). Person-modu del + person-filter eski entry'leri de yakalar.
8. **rehber.js event delegation tamamlandı** (v8.151): v8.121'de başlayan pattern devam ettirildi — kalan 6 inline `onclick` handler container delegation'a çevrildi (`renderRhb` card + `openRhbDetail` 5 buton); 6 window export silindi (0 caller).

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
| **2 ölü Firestore helper** | v8.129 | `_fbSaveSalt` + `_fbLoadSalt` (firestore.js); v8.96'dan beri PIN salt `getSaltAsync` ile türetiliyor — generic salt store gereksizdi |
| **3 ölü util artığı** | v8.131 | `dd` + `fmtDS` + `parseLocalDate2` (util.js export'ları + compat.js bridge'i); v8.96 sonrası 0 caller |
| **2 ölü UI handler** | v8.132 | `openCred` (ui-pay.js, ~10 satır) + `openRehber` (app.js, 1 satır); rehber tam-ekran pattern'ine geçince wrapper'lar atıl kaldı |
| **3 ölü Firebase window expose** | v8.133 | `window._firebaseApp` / `_firebaseAuth` / `_firebaseDb` (firebase.js); v8.103'te db.js consumer'ları silinmişti, expose'lar artık takıdır |
| **warn-toast resting fix** | v8.134, v8.137 | `#warn-toast` resting `translateY(-80px)` → `-160px` (v8.134, ekran içinde kalan bug fix) → `-200px` (v8.137, mobil header marjı için ek artış) |
| **validate.js ayrımı** | v8.135 | persist.js'teki integrity check bloğu (~40 satır) ayrı modüle taşındı; `_doSave` artık `window.validateBeforeSave()` çağırıyor — encrypt/storage'tan validate concern'i ayrı |
| **addLog ctx + log render** | v8.136, v8.139, v8.140 | `addLog` 5. param `ctx = {personId, groupId}` opsiyonel obj; truthy guard ile entry'i kirletmiyor; `log.js` render personId/groupId rozetli görüntüler; v8.140'ta 7 caller bağlandı (`savePay` → {personId, groupId}; `addToMonth`/`markOk`/`delByKey g_+pay_`/`delMonthEntry` → {groupId}) + `undoCell`'e yeni `plan_undo` addLog eklendi |
| **log silme: kişi modu** | v8.143 | LOG_DEL_BAR'a 3. mode (`person`) — persons dropdown'dan seçilen kişinin tüm entry'leri silinir (v8.140 entry.personId'ye bağımlı); DRY `setBtnStyle` helper'ı buton stillerini birleştirdi |
| **log jump + flash** | v8.144 | actLog 📋/👤 ikonları tıklanabilir — `logJumpGroup`/`logJumpPerson` plan matrisi / persons tab'ında ilgili row/card'a smooth scroll + `.jump-flash` 1.5sn keyframe; `tr[data-row-key]` ve `[data-person-id]` selector'ları eklendi |
| **log tarih filtresi** | v8.145 | T7 `.ph` altına 4 buton (Hepsi/Bugün/Bu hafta/Bu ay); module-local `_logFilter`, `_passesLogFilter` ISO hafta Pzt başlangıç; renderActLog orijinal actLog index'ini korur; toggleSelectAllLogs/toggleLogItem date + person filter ikisini birden hesaplar; sayaç `X / Y hareket` formatı |
| **log person filter dropdown** | v8.145 | `LOG_FILT_BAR` + `LOG_FILT_PERSON <select>` (actLog'taki benzersiz personId × persons.name join + count, silinmiş kişi "(silinmiş kişi)"); module-local `_logPersonFilter` + `setLogPersonFilter`; renderActLog combine `_passesLogFilter && _passesPersonFilter` |
| **ui-plan addLog personId** | v8.146 | 6 caller'a ctx'e `personId` eklendi (addToMonth → refItem.personId; markOk/undoCell/delMonthEntry → p.personId; delByKey g_+pay_ → toDelete[0].personId); cred del dokunulmadı; v8.143 person-del + v8.145 person-filter artık bu entry'leri yakalar (v8.140 öncesi entry'ler hâlâ "kişi-bağımsız") |
| **paid rows hide bug fix** | v8.147 | `ui-plan.js#render` togglePaidMonths özelliği — bug: `allMonths.filter(...)` ay-bazlı (yanlış); fix: `rowKeys.filter(monthKeys.some(status!=='paid'))` satır-bazlı; months hep allMonths; dnMap paid filter SONRASI (disambiguation doğru); boş satır korunur |
| **log-jump CSS class** | v8.149 | log.js'teki inline span style'ları (`👤`/`📋` jump ikonları) `.log-jump` CSS class'ına refactor edildi (app.css'e taşındı); padding 2px 5px + border-radius + hover transition + tıklama alanı genişledi; davranış aynı, kod temizlendi |
| **actLog personId backfill (Pass 3)** | v8.148 | `app.js#_backfillPersonIds`'a 3. pass: v8.140 öncesi entry'lere `detail`'in ilk ` · ` segmentinden `Hesap._baseOf` + persons Map lookup ile `personId` atanır. Skip kuralları: (1) entry.personId set (idempotent), (2) `e.type` `rhb_*` (rehber ≠ plan participant), (3) `e.type === 'cred_add'`, (4) `detail` `' taksit'` içeriyor (cred plan_edit/del'i yakalar), (5) boş namePart. Her `mutateItem` autoSave debounce'a düşer (tek batch). Console: `[backfill] N actLog personId atandı`. Etki: eski entry'ler artık person-modu del + person-filter dropdown'a görünür. Net Δ: +18 satır. |
| **ui-plan.js 3 dosyaya bölündü** | v8.150 | 626 satırlık monolitik dosya 3 sorumluluğa ayrıştırıldı: **`ui-plan-render.js`** (~272 satır): `getAllItems`/`buildMx`/`render`/`renderHaftaWidget`/`renderGecWidget` + `store:change` listener; **`ui-plan-detail.js`**: hücre/satır detay paneli (`openRow`/`openCell`/`closeDV`/`closeRDET`/`openEmptyCell`); **`ui-plan-actions.js`**: CRUD + krediye dönüştürme + ödenmiş ay toggle. Cross-module bağımlılıklar `window.*` üzerinden. `index.html` import sırası: render → detail → actions. Davranış değişikliği 0. |
| **rehber.js event delegation tamamlandı** | v8.151 | v8.121 pattern devamı — kalan 6 inline `onclick` event delegation'a çevrildi. **renderRhb**: card `onclick="openRhbDetail(...)"` → `data-detail-id` + RHB_LIST one-shot delegation. **openRhbDetail** 5 buton: copy → `data-copy`, edit → `data-edit-id`, del → `data-del-id`, close → `data-close` + RDET_C delegation. **6 window export silindi** (0 caller): `openRhbDetail`/`rhbCopy`/`rhbFallback`/`rhbFeedback`/`openRhbEdit`/`rhbDel`. `closeRDET` korundu (index.html caller). One-shot flag (`_rhbListHandlerAttached`/`_rdetHandlerAttached`) memory leak engelleyici. |

---

## Açık kalan maddeler

**CLAUDE.md Sıradaki adımlar:** _liste boş_ — büyük Store ve modül ayrıştırma ailesi tamamlandı.

**Implicit / olası yönler** (henüz görev değil):

1. **`Store.session` security hardening** — `Store.session.cryptoKey/dataKeyRaw/plainPin` hâlâ `window.Store.session` üzerinden console-accessible. v8.115'te kabul edilen trade-off, ama mevcut konsol attack surface. Closure-based hiding + ephemeral key wrap pattern.
2. **`window._rhbPhones` event delegation testi** — v8.121'de mantıksal doğru ama gerçek mobil/desktop test yapılmadı. Bir sonraki manuel test fırsatında doğrulanmalı.
3. **`debugState()` SW cache testi** — v8.122'de eklendi ama bir noktada "expose edilmemiş" raporu geldi (gerçekte mevcut, muhtemelen stale tab). Gizli sekme veya hard reload ile doğrulanmalı.
4. **Tarihi `db.js` yorum referansları** — `app.js:227` ("SYNC UI (db.js tarafından çağrılır)"), `index.html:442` (history yorum), `store.js:40,48`, `firebase.js:74` — kozmetik, davranış etkilenmez ama bir sonraki temizlik turunda toplu güncellenebilir.
5. **`addLog` ctx caller migration — TAMAMLANDI v8.140 + v8.146** — v8.140: `savePay` (ui-pay.js) `{personId, groupId}` taşır; `addToMonth`/`markOk`/`undoCell`/`delByKey g_+pay_`/`delMonthEntry` (ui-plan.js) `{groupId}` taşır; `undoCell`'e yeni `plan_undo` addLog eklendi. v8.146: ui-plan'deki 6 caller'a `personId` de eklendi → v8.143 person-modu del + v8.145 person-filter dropdown bu entry'leri yakalar. Dokunulmayanlar: `saveCred` + `delByKey cred` (cred → groupId yok), `rehber.js` ×3 (kişi/rehber concern'i — kapsam dışı).
6. **`personId` data quality göstergesi UX kararı** — v8.137'de hesap.js'e eklendi (`g_*`/`pay_*` rowKey'lere `⚠️` suffix); kalıcı UX olarak doğru mu yoksa geçici "kullanıcıyı backfill'e teşvik" emoji'si mi? Net karar yok, gözlem altında.

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
| **`v8.150-stable`** _(öneri)_ | `19f0b90` | ui-plan.js 3 dosyaya bölünmüş (render/detail/actions ayrımı) + actLog personId backfill Pass 3 (v8.148) tamamlanmış baseline. Önceki baseline'lardan farkı: modül haritası daha temiz (626 satırlık monolitik dosya gitti) + eski actLog entry'leri person-filter'a görünür. v8.151 sadece rehber.js inline handler temizliği (event delegation), v8.149 sadece CSS polish — bu üç commit fonksiyonel davranışı değiştirmez, bu yüzden canonical restore tag v8.150 |
| `v8.147-stable` _(önceki)_ | `41a938f` | Log UI olgunlaşması (silme/jump/date+person filter) + ui-plan personId genişlemesi + paid rows hide bug fix dahil önceki baseline; ui-plan.js hâlâ monolitik (626 satır); actLog backfill Pass 3 yok |
| `v8.140-stable` | `f9d7fb5` | addLog ctx caller bağlama tamamlandı — addLog zenginleştirme paketi (v8.136 + v8.139 + v8.140) + validate.js ayrımı + warn-toast mobil fix dahil baseline; log UI henüz olgunlaşmamış |
| `v8.139-stable` | `73f9374` | actLog ctx render dahil ama caller'lar henüz bağlanmamış |
| `v8.128-stable` | `a7ca043` | Modül ayrıştırması (auth-pin + app.css + firestore/persist) tamamlanmış önceki baseline |
| `v8.120-stable` | `b99e570` | Store migration ailesi (v8.108-v8.120) + personId gruplama tamamlanmış stabil baseline |
| `v8.112-stable` | `d03d5bc` | Daha eski — personId backfill öncesi |

**Öneri:** v8.150 yeni baseline. ui-plan.js modülerleştirmesi + actLog backfill Pass 3 bu commit'te. Tag oluştur:
```
git tag v8.150-stable 19f0b90 && git push origin v8.150-stable
```

Önceki canonical (v8.147) zaten tag'lendi — `git tag --list` ile doğrula.

Geri dönüş (önceki baseline'a):
```
git reset --hard v8.147-stable
```

Daha eski baseline'a geri dönmek için:
```
git reset --hard v8.140-stable
```
