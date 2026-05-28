# DEVAM NOTU — sonraki oturum için brief

_Son oturum: 2026-05-29 · son code commit: **v8.165 / 20260529-05** (c08ddd7) · **v8.166-stable** tag yeni baseline_

CLAUDE.md = canonical referans (versiyon geçmişi, mimari notlar, dosya yapısı).
Bu dosya = oturumlar arası **kısa devir notu**. Detay için CLAUDE.md'ye bak.

---

## TL;DR

Bu oturum baştan sona **Store sahipliği konsolidasyonu** + **modül ayrıştırmaları** + ikincil temizlikler + **log UI olgunlaşması** + **plan matrisi bug fix** + **ui-plan.js 3 dosyaya bölündü** + **legacy actLog backfill** + **detail panel zenginleşmesi** + **kredi kart paneli geliştirildi** + **actLog group filter** + **boş ay sütunları gizlendi** + **kişi özet kartı** + **cred kart → DV re-route** + **notes/persons event delegation** oldu.
v8.95'te başlayan Hesap modülünden v8.166'a kadar 70+ patch. On bir ana hat:
1. Dağınık `window._X` durum değişkenleri tek otorite **`Store`** altında toplandı (10 persist flag + session namespace + planId).
2. Monolitik dosyalar concern'lerine ayrıldı: **auth-pin.js** (v8.110), **app.css** (v8.126), **firestore.js + persist.js** (v8.127), **validate.js** (v8.135), **ui-plan.js → render/detail/actions** (v8.150), **integrity.js** (v8.155).
3. Ölü kod toplu temizliği (v8.128-v8.133): persist alias'ları, firestore salt helper'ları, util artıkları, UI handler'ları, Firebase window expose'ları — toplam ~70 satır.
4. `addLog` zenginleştirildi (v8.136 + v8.139 + v8.140 + v8.146 + v8.156): yeni `ctx = {personId, groupId, credId}` 5. parametre + log render rozetleri + 7 caller bağlandı (v8.140) + 6 ui-plan caller'a `personId` eklendi (v8.146) + saveCred caller'ı `personId+credId` taşır (v8.156).
5. **Log UI olgunlaştı** (v8.143-v8.145 + v8.160): "Kişi" silme modu + 📋/👤 icon jump + .jump-flash highlight + Hepsi/Bugün/Bu hafta/Bu ay tarih filtresi + person dropdown filter + **groupId dropdown filter** (v8.160 — üç filter AND-combine: date + person + group).
6. **Plan matrisi bug fix** (v8.147): `togglePaidMonths` özelliği ay-bazlı filter yapıyordu (yanlış), satır-bazlı olarak düzeltildi.
7. **Legacy actLog backfill** (v8.148): `_backfillPersonIds`'a Pass 3 eklendi — v8.140 öncesi entry'lere `detail` segmentinden isim eşleşmesiyle `personId` atanır.
8. **rehber.js event delegation tamamlandı** (v8.151): v8.121 pattern devam ettirildi — kalan 6 inline `onclick` handler container delegation'a çevrildi; 6 window export silindi.
9. **Detail panel zenginleşmesi** (v8.152 + v8.159): `convertToCredit` + `editByKey` actions.js'ten **detail.js**'e (mantıksal sahiplik); openRow DV paneline kişi adı rozeti + actLog history (son 10 entry groupId match) eklendi — DV artık zenginleşmiş kontekstte açılır.
10. **Kredi kart paneli geliştirildi** (v8.158): `Hesap.krediler()` `remaining` / `nextDays` / `overdueCount` / `lastDate` alanları ekledi; UI panel kalan taksit/gün hesabı + gecikme uyarısı + son taksit tarihiyle zenginleşti.
11. **UX iyileştirmeleri** (v8.163-v8.166): plan matrisi boş ay sütunları gizlendi (v8.163); persons modal'a kişi-bazlı toplam borç/ödeme/gecikmiş özet kartı eklendi (v8.164); kredi özet kartları tıklanabilir → openRow DV taksit takvimi modal'ı (v8.165); ui-notes + ui-persons inline onclick'leri event delegation pattern'ına çevrildi (v8.166 — v8.121/v8.151 devamı).

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
| **convertToCredit + editByKey detail.js'e** | v8.152 | v8.150 üçlü split sonrası iki dialog-flow orchestrator yanlış dosyadaydı. **Caller analizi**: `convertToCredit` yalnız `openRow`'un "Krediye Dönüştür" butonundan; `editByKey` yalnız `openRow` + `openCell`'den. Her ikisi de DV → başka modal geçişi — detail panel'in mantıksal devamı, CRUD primitive değil. **Mekanik taşıma**: ~46 satır + 2 window export `ui-plan-actions.js`'ten `ui-plan-detail.js#openKM` sonrasına yeni `// DIALOG FLOW (DV → diğer modal) //` section'ı altına. **Section header rasyonalize**: actions.js'in `KREDİYE DÖNÜŞÜR` silindi; `SATIR / AY CRUD` → `SATIR / AY SİL`. Davranış değişikliği SIFIR (click-time `window.*` resolution; load order güvende). actions.js: 208→159, detail.js: 156→210. |
| **render() helper extraction** | v8.154 | `ui-plan-render.js#render`'ın iç hesaplama/template bloklarından bir kısmı module-local helper fonksiyonlara ayrıldı — kod okunabilirliği + sonraki refactor için zemin. Cross-module davranış değişikliği yok. |
| **groupId normalization → integrity.js** | v8.155 | v8.135 (validate.js) pattern'ı sürdürüldü. **persist.js#_doSave L19-39** (24 satır groupId normalization try/catch) yeni `js/integrity.js`'e `normalizeBeforeSave()` olarak taşındı. `_doSave` artık iki ardışık helper çağırır: `normalizeBeforeSave()` (mutation, integrity.js) → `validateBeforeSave()` (read-only, validate.js). Sahiplik haritası: integrity = mutation/normalize, validate = read-only schema check. Import sırası: validate → integrity → persist. sw.js STATIC listesi güncel. Caller değişikliği SIFIR. Net Δ: persist.js −22, +integrity.js (~30). |
| **saveCred addLog ctx + credId field** | v8.156 | v8.140'ta "cred → groupId yok" gerekçesiyle dokunulmamış `saveCred`'in 2 addLog çağrısı artık `{personId, credId}` taşıyor. **ui-pay.js#saveCred** başına `_resolvePersonId(name)` (savePay L49 pattern); edit + new branch'lerde ctx geçirilir. **app.js#addLog** truthy guard'a `if (ctx.credId) entry.credId = ctx.credId` eklendi. v8.143 person-modu del + v8.145 person-filter + v8.144 👤 ikon jump artık cred entry'lerini de yakalar. Pass 3 backfill dokunulmadı (`cred_add` skip + `'taksit'` skip mantığı korundu). |
| **Kredi kart paneli zenginleştirildi** | v8.158 | `Hesap.krediler()` API genişletildi: `remaining` (kalan taksit), `nextDays` (sonraki ödenmemiş taksite gün farkı), `overdueCount` (gecikmiş taksit sayısı), `lastDate` (son taksit tarihi). UI panel buna göre güncellendi — kalan taksit / gün bilgisi + gecikmiş varsa kırmızı sayaç + son taksit tarihi gösterilir. `ui-pay.js#renderCredSummary` consume eder. |
| **openRow DV: kişi adı + actLog history** | v8.159 | **(A)** DV detail panelinin title altına `👤 AHMET` rozetli satır — ilk pay item'ından `personId` çözülür, `persons.find(p=>p.id===pid).name` ile lookup. personId yok / silinmiş → satır render edilmez. **(B)** Aylar listesi sonrası, dacts'tan önce **actLog history section** — `key.startsWith('g_')` → `groupId`; `pay_*` → ilk item.groupId; `cred_*` → null (skip). `actLog.filter(e => e.groupId === groupId).slice(0, 10)` ile son 10 entry: title + ` · ` + detail (tek satır ellipsis) + `fmtLogTime` time. Davranış değişikliği yok — info-only öğeler. |
| **actLog groupId bazlı filtre** | v8.160 | v8.145 person-filter pattern'ı groupId için aynen klonlandı. **Yeni state**: `_logGroupFilter`. **Yeni helper**: `_passesGroupFilter`. **Yeni dropdown**: `_renderLogGroupFilterOptions` (actLog'taki benzersiz groupId'ler × `findPaysByGroup(gid)[0].name` join + count; silinmiş grup "(silinmiş grup)"). **Yeni setter**: `setLogGroupFilter`. renderActLog üç filter combine: `date && person && group` AND. Empty message öncelik: group > person > date. **HTML**: LOG_FILT_BAR içine `LOG_FILT_GROUP <select>` (margin-top 6px). Cred entry'leri (groupId yok) grup filter aktifken görünmez. v8.139 öncesi entry'ler eşleşmez. Net Δ: log.js +~40, index.html +1. |
| **Ayarlar T5 compact grid** | v8.161-v8.162 | Ayarlar sekmesi tek-kolon ardışık `.acard` yapısı → `.acard-grid` 2-kolon (`repeat(auto-fit, minmax(280px, 1fr))` + `align-items:start`). 6 kart (Şifre/Kur/Yedek/Güncelleme/Oturum/Bilgi) responsive grid içinde; 4 sub-açıklama kısaltıldı. JS dokunulmadı. |
| **Boş ay sütunları gizlendi** | v8.163 | `ui-plan-render.js#render` `monthSet`'in gelecek `aheadVal` ay padding'i koşulsuzdu (boş aylar görünüyordu). Fix: `rowKeys` finalize edildikten sonra `allMonths.filter(m => rowKeys.some(k => mx[k]?.[m]?.items?.length > 0))` ile sadece kayıtlı aylar görünür. **UX trade-off (kabul edildi)**: empty cell "+" affordance gider — yeni ay eklemek için `openRow` detail panel veya üst "+Ekle" butonu. Net Δ: 2 satır. **NOT**: SW cache nedeniyle gerçek tarayıcı testi yapılamadı, gizli sekme/hard reload gerekir. |
| **openPersonHist özet kartı** | v8.164 | `ui-persons.js#openPersonHist` modal başlığın altına 2-kolon özet bloğu eklendi: **BEKLEYEN** (orange, tutar + sayım, gecikme dahil) \| **ÖDENEN** (green, tutar + sayım); gecikmiş>0 ise alt satır `⚠ kırmızı gecikmiş tutar + sayım`. Yeni helper `_buildPersonSummary(personId, personName)`: pays + paidItems filtre (personId > name fallback) + `Hesap.toplamOzeti` pattern'iyle tutarlı tanım (paysBekleyen = gecikme dahil). Empty state'ten önce gösterilir. |
| **Cred özet kart → DV re-route** | v8.165 | `ui-pay.js#renderCredSummary` kredi kartları artık tıklanabilir → `openRow('cred_<credId>')` çağrısıyla DV modal (ui-plan-detail.js) açılır: ay-ay taksit listesi + tarih + tutar + status badge + işlem butonları (markOk/openKM/resetPartial/undoCell). Kredi paneli (info) → DV (action) kısa yolu. |
| **ui-notes + ui-persons event delegation** | v8.166 | v8.121/v8.151 event delegation pattern'ı devamı. **renderNotes (NL)**: `data-note-edit`/`data-note-del` (nid) + `_nlHandlersAttached` one-shot. **renderPaid (PL)**: `data-paid-edit`/`data-paid-del` (paidId) + `_plHandlersAttached`. **Window export temizliği**: `editNote`/`delNote`/`openPaidEdit`/`delPaidItem` silindi (NL/PL delegation'dan çağrılır, statik caller yok). Korundu: `renderNotes`/`openNoteModal`/`saveNote`/`renderPaid`/`savePaidItem`. ui-persons.js paralel delegation v8.164 commit'inde (e53bb7d) bundle edilmişti — v8.166 ui-notes parçasını tamamlar. |

---

## Açık kalan maddeler

**CLAUDE.md Sıradaki adımlar:** _liste boş_ — büyük Store ve modül ayrıştırma ailesi tamamlandı.

**Implicit / olası yönler** (henüz görev değil):

1. **`Store.session` security hardening** — `Store.session.cryptoKey/dataKeyRaw/plainPin` hâlâ `window.Store.session` üzerinden console-accessible. v8.115'te kabul edilen trade-off, ama mevcut konsol attack surface. Closure-based hiding + ephemeral key wrap pattern.
2. **`debugState()` SW cache testi** — v8.122'de eklendi ama bir noktada "expose edilmemiş" raporu geldi (gerçekte mevcut, muhtemelen stale tab). Gizli sekme veya hard reload ile doğrulanmalı.
3. **Tarihi `db.js` yorum referansları** — `app.js:227` ("SYNC UI (db.js tarafından çağrılır)"), `index.html:442` (history yorum), `store.js:40,48`, `firebase.js:74` — kozmetik, davranış etkilenmez ama bir sonraki temizlik turunda toplu güncellenebilir.
4. **`personId` data quality göstergesi UX kararı** — v8.137'de hesap.js'e eklendi (`g_*`/`pay_*` rowKey'lere `⚠️` suffix); kalıcı UX olarak doğru mu yoksa geçici "kullanıcıyı backfill'e teşvik" emoji'si mi? Net karar yok, gözlem altında.
5. **Log "Grup" silme modu** (v8.160'tan kalan) — actLog groupId filter dropdown eklendi ama `LOG_DEL_BAR`'da `person` modunun simetriği olan `group` mode eklenmedi. v8.143 person-mode pattern'i klonlanabilir: dropdown `_populateLogGroupSelect` + `doLogDelByGroup` (`Store.removeWhere('actLog', e => e.groupId===gid)`).
6. **integrity.js genişletme adayları** (v8.155'te header'da not edildi): deduplicate (aynı id'li paid item'lar), orphan reference temizliği (silinmiş person/cred'e referans veren entry'ler) — sonraki temizlik turunda.
7. **v8.153/v8.157 atlanmış versiyon numaraları** — git log'da v8.152 → v8.154 → v8.155 → v8.156 → v8.158 → v8.159 → v8.152 (gecikmeli) → v8.160 sırası var; v8.153/v8.157 yok. Linter/parallel commit yarışı sonucu numara boşluğu. Kozmetik, davranış etkilenmez.
8. **QNB benzeri çoklu-grup kişilerde özet görünmüyor** (v8.164 follow-up) — `openPersonHist` özet kartı tek bir kişi için tüm pays/paidItems'i topluyor, ama bir kişinin **birden çok groupId'si** varsa (örn QNB cred + QNB pay grupları) özet kartında bunlar görünmeyebilir. `_buildPersonSummary` personId filter > name fallback yapıyor; multi-group durumunda hangi groupId'lerin person'a ait olduğunu net çözmüyor olabilir. Reprodüksiyon: aynı kişiye birden fazla farklı `groupId`'li pay → özet kartı kayıp/eksik gösterir. Tanı + fix bir sonraki oturuma.
9. **v8.163 boş ay sütun gizleme SW cache nedeniyle test edilemedi** — kod doğru görünüyor (`grep "filter(m =>"` ui-plan-render.js'te 1 sonuç), ama tarayıcıda service worker eski versiyonu cache'te tutuyor. Test için: gizli sekme aç + hard reload (Ctrl+Shift+R) + `caches.keys().then(k=>Promise.all(k.map(c=>caches.delete(c)))).then(()=>location.reload())` konsola yapıştır. SW cache `ip-static-v9` (v8.126'da bumped) — yeni CACHE bump gerekirse `sw.js#CACHE` artırılmalı.

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

### Save-time concern ayrımı (v8.135 + v8.155)
`persist.js#_doSave` artık üç concern'i ardışık çağırır:
1. `normalizeBeforeSave()` → **integrity.js** (mutation, v8.155): groupId tutarlılığı vb.
2. `validateBeforeSave()` → **validate.js** (read-only, v8.135): pays/creds/persons tip/varlık doğrulama, hata log'lar ama save iptal değil
3. encrypt + localStorage + Firebase push

Sahiplik: integrity = mutation, validate = read-only. Sıra önemli — fix önce, sonra audit.

### Log filter pattern (v8.145 + v8.160)
Üç filter AND-combine: **date** (`_logFilter`), **person** (`_logPersonFilter`), **group** (`_logGroupFilter`). Her filter:
- Module-local state (persistence yok, page reload sıfırlar)
- `_passesXFilter(entry)` predicate
- Setter `setLogXFilter(v)` → state set + `_logSelected.clear()` + `renderActLog()` zinciri
- Empty message öncelik: group > person > date

Yeni filter eklemek için aynı pattern: state + predicate + setter + dropdown populator + renderActLog combine + HTML element.

---

## Mimari Kararlar ve Gerekçeler

Bu bölüm "ne yapıldı" değil **"neden öyle yapıldı"** anlatır — gelecek refactor'lar bu kararları aynen mi tutsun yoksa revize etsin sorusunu netleştirmek için.

### 1. Store pattern (v8.92)
**Karar:** `window.pays` direkt array erişimi yerine merkezi `js/store.js` Store.
**Gerekçe:** 5 farklı dosya (`db.js`, `ui.js`, `ui-data.js`, `ui-misc.js`, `ui-plan.js`) aynı array'i farklı şekillerde bozuyordu — biri `.push`, biri `.splice`, biri `=` ile reassignment. `dirty` flag senkronize değildi; aynı tick'te çoklu mutation'lar tek save'e batch'lenmiyordu. Store ile tek mutation API (`push/removeWhere/spliceAt/mutateItem/replace`) + otomatik `_dirty=true` + `saveSecure()` debounce + lookup invalidate.

### 2. localStorage önce, Firebase sonra (v8.89)
**Karar:** `_doSave` `localStorage.setItem` → `_fbSave` (önce-sonra sırası).
**Gerekçe:** Firebase çağrısı network hatası veya quota dolması ile fail olunca veri **kaybediliyordu** — `_doSave` exception fırlatıyordu, localStorage'a hiç yazmıyordu. Sıra ters çevrildi: önce localStorage (sync, hata vermez), sonra Firebase (async, fail durumunda `_fbSyncNeeded=true` ile retry işaretlenir). Tek nokta hata = sıfır veri kaybı.

### 3. firebase.js ana modül bloğuna taşındı (v8.113)
**Karar:** `index.html`'in ayrı `<script type="module">` bloğundaki `firebase.js` import'u ana bloğa (store.js'ten **hemen sonra**) taşındı.
**Gerekçe:** ES modules iki ayrı `<script type="module">` bloğunu bağımsız evaluate eder. firebase.js önce blokta olduğundan, `getRedirectResult` ve `onAuthStateChanged` callback'leri **cached auth** durumunda anında fire ediyordu — store.js henüz yüklenmediği için `window.Store.fbUid = uid` set'i `TypeError` atıyordu (v8.100 defensive guard'la maskelenmişti). Tek bloğa alınca sıra deterministik: store → firebase → state → ... Race kalıcı çözüldü, v8.100 guard kaldırıldı.

### 4. Store.session (v8.115)
**Karar:** `window._cryptoKey` / `_dataKeyRaw` / `_plainPin` → `Store.session.cryptoKey/dataKeyRaw/plainPin`.
**Gerekçe:** Bu değerler `window.*` üzerinde olduğundan **console attacker** veya 3rd party script direkt okuyabiliyordu. Store'a taşıyarak **sahiplik konsolide edildi** (tek yer, tek API). **NOT: security hardening değil** — `window.Store.session` hâlâ console-erişilebilir; sadece organizational netleşme. Gerçek hardening için closure scope + ephemeral key wrap gerekir (gelecek karar).

### 5. Event-based render (v8.100)
**Karar:** Store mutation API'leri `store:change` CustomEvent dispatch eder; render'lar listener'larla otomatik tetiklenir.
**Gerekçe:** Mutation sonrası `render()` çağrısı manuel idi — 22+ caller arasında bazıları unutuluyor, UI stale kalıyordu. Microtask-coalesced event ile aynı tick'teki çoklu mutation tek render'a indirgenir. `Store._affects(detail, watched)` helper ile listener selektif (`ui-plan.js` curTab=0 + `pays/creds/paidItems` → render). Manuel render kaldırıldı (ui-plan.js: 9 CRUD, ui-pay.js: 2, ui-persons.js: 1).

### 6. hesap.js (v8.95)
**Karar:** "Bu ay özeti", "toplam bekleyen borç", "kredi listesi", "trend" hesapları `js/hesap.js`'te tek otorite.
**Gerekçe:** Plan matrisi (`ui-plan.js#render`), ayarlar paneli (`search.js#renderAI`), kredi kart paneli (`ui-pay.js#renderCredSummary`) üç farklı yerde **aynı kavramı farklı formüllerle** hesaplıyordu — sonuçlar tutarsızdı (örn `bekleyenBorc` üç yerde farklı sayı). Hepsi `Hesap.X()` API'sine yönlendirildi; tek mantık, üç tüketici, tutarlı sonuç.

### 7. personId gruplama (v8.109)
**Karar:** Pay/cred satırlarını isim suffix'i ("AHMET 1", "AHMET 2") yerine `personId` (UUID) ile grupla.
**Gerekçe:** "AHMET 1/AHMET 2" mantığı **trigger-based confusing** — aynı kişi için iki ayrı pay grubu eklenince hangisi "1" hangisi "2" olacak belirsizdi; rename'de suffix'ler kayıyordu. `personId` ile kişi nesnesine kanonik bağlantı + display name `"AHMET (Kira)"` / `"AHMET (Elektrik)"` (`desc` veya `category` tag'iyle disambiguation). Self-cleaning backfill (v8.111/v8.112/v8.148) eski entry'leri retroactive bağlar.

### 8. integrity.js + validate.js ayrımı (v8.135 + v8.155)
**Karar:** `persist.js#_doSave`'in `try/catch` blokları iki ayrı modüle: `validate.js` (read-only schema check) + `integrity.js` (mutation/normalize).
**Gerekçe:** `_doSave` 60+ satır integrity + validate inline kodu içeriyordu — concern karışıktı, test edilemezdi. Mutation (groupId tutarsızlığı düzeltme) ve read-only audit (tip/varlık kontrolü) **farklı sorumluluklar**. Sıra: `normalizeBeforeSave()` (fix first) → `validateBeforeSave()` (audit after) → encrypt. Genişleme adayları: `integrity.js`'e dedupe + orphan ref temizliği (header'da not).

### 9. db.js → firestore.js + persist.js (v8.127)
**Karar:** 274 satırlık `db.js` iki dosyaya: `firestore.js` (saf Firestore I/O: 11 helper) + `persist.js` (encrypt + localStorage + migration: 5 fn).
**Gerekçe:** Auth zaten `firebase.js`'e taşınmıştı (v8.103). Kalan db.js'te **3 farklı concern karışmıştı**: Firestore CRUD, AES encrypt/decrypt, migration script'leri. Sahiplik haritası: `firebase.js` (auth init/listener) → `firestore.js` (data I/O) → `persist.js` (encrypt/storage/migration) → `auth-pin.js` (PIN doğrulama). 0 caller değişikliği (window.* API yüzeyi korundu).

### 10. CSS → app.css (v8.126)
**Karar:** `index.html`'in `<style>` bloğu (278 satır) ayrı `app.css` dosyasına.
**Gerekçe:** index.html %39'u CSS'ti — Python ile düzenliyorduk (PowerShell Türkçe karakter bozar kuralı). Her CSS değişikliğinde **encoding riski**: `/* GOOGLE GİRİŞ */` gibi Türkçe yorumlar utf-8 hatasına yol açabiliyordu. Ayrı dosyada bu risk yok + dev tools'ta CSS source map daha temiz. Critical CSS (12 satır, FOUC önleyici) inline kaldı. sw.js `cache:'no-cache'` ile CSS network-first (JS pattern'iyle aynı).

### 11. ui-plan.js → 3 dosya (v8.150)
**Karar:** 612 satırlık `ui-plan.js` → `ui-plan-render.js` (272) + `ui-plan-detail.js` (156) + `ui-plan-actions.js` (208).
**Gerekçe:** Render + detail panel + CRUD aynı dosyada — bir bug fix'i diğer bölümleri etkileme riski yüksekti. **Concern ayrımı**: render = read-only HTML üretme; detail = modal açma; actions = CRUD + dialog-flow. v8.152'de iki dialog-flow (`convertToCredit` + `editByKey`) actions'tan detail'e taşındı (sahiplik düzeltmesi). v8.154 helper extraction render içinde.

### 12. Event delegation pattern (v8.121 + v8.151 + v8.166)
**Karar:** Inline `onclick="..."` handler'lar → container `addEventListener` + `data-*` attribute.
**Gerekçe:** Inline `onclick` **her render'da yeniden bind** ediyordu — büyük listede memory pressure + window export şişmesi (her caller window.X = X ile bind ediliyordu). Container delegation `_xHandlersAttached` one-shot flag ile **tek bağlama, tüm event'lere bakar**. Yan kazanım: window export'lar silinebildi (`editNote`/`delNote`/`openPaidEdit`/`delPaidItem` vb.) — global namespace temizlendi. Yeni element ekleme delegation içinde otomatik çalışır.

### 13. addLog ctx (v8.136)
**Karar:** `addLog(type, title, detail, navTab)` → `addLog(type, title, detail, navTab, ctx = {personId, groupId, credId})`.
**Gerekçe:** actLog kayıtları **kişi/gruba bağlı değildi** — kullanıcı "AHMET'in tüm log'larını filtrele" diyemiyordu, sadece text search vardı. Yeni opsiyonel `ctx` 5. parametresi backward compat (mevcut 12 caller `undefined` geçer, entry kirletmez). v8.140'ta caller'lar bağlandı, v8.143-v8.145'te filter UI eklendi. Sonuç: actLog tam observability — 3 dropdown filter (date + person + group).

### 14. actLog backfill Pass 3 (v8.148)
**Karar:** `_backfillPersonIds`'a 3. pass: v8.140 öncesi entry'lere `detail`'in ilk segmentinden isim eşleşmesiyle retroactive `personId` atanır.
**Gerekçe:** v8.140 yeni log'ları zenginleştirdi ama **eski log'lar kişi-bağımsız** kalıyordu — person filter dropdown'da görünmüyorlardı. Pass 3 `detail.split(' · ')[0]` → `Hesap._baseOf` → `persons` Map lookup ile eşleştirme yapar. Skip kuralları (rhb_*, cred_add, taksit içeren) false positive azaltır. İdempotent (mutateItem'da `e.personId` set'liyse skip) + self-cleaning (sonraki açılışta no-op).

---

## Restore points

| Tag | Commit | Notlar |
|---|---|---|
| **`v8.166-stable`** _(öneri)_ | `c08ddd7` | En zengin baseline. v8.160 (group filter) sonrası UX dalgası: v8.161-v8.162 Ayarlar grid, v8.163 boş ay sütun gizleme, v8.164 kişi özet kartı, v8.165 cred kart → DV re-route, v8.166 notes/persons event delegation. **Plan matrisi clean** (boş sütun yok), **persons modal'ı zengin** (özet kartı), **kredi panel + DV bağlandı**, **delegation pattern ui-notes/persons'a yayıldı**. |
| `v8.160-stable` _(önceki)_ | `40d8fc8` | v8.150 ui-plan modülerleştirmesi + v8.151 rehber event delegation + v8.152 actions/detail sahiplik düzeltmesi + v8.154/v8.155 helper extraction + integrity.js ayrımı + v8.156 saveCred credId + v8.158 kredi paneli zenginleştirme + v8.159 DV kişi+history + v8.160 group filter dahil. **Üç filter tam aktif** (date + person + group), **DV zenginleşmiş** (kişi rozeti + log history), **kredi paneli olgun** (kalan/gün/gecikme/son tarih). |
| `v8.150-stable` | `19f0b90` | ui-plan.js 3 dosyaya bölünmüş (render/detail/actions ayrımı) + actLog personId backfill Pass 3 (v8.148) tamamlanmış baseline. Modül haritası temiz; eski actLog entry'leri person-filter'a görünür. |
| `v8.147-stable` | `41a938f` | Log UI olgunlaşması (silme/jump/date+person filter) + ui-plan personId genişlemesi + paid rows hide bug fix dahil önceki baseline; ui-plan.js hâlâ monolitik (626 satır); actLog backfill Pass 3 yok |
| `v8.140-stable` | `f9d7fb5` | addLog ctx caller bağlama tamamlandı — addLog zenginleştirme paketi (v8.136 + v8.139 + v8.140) + validate.js ayrımı + warn-toast mobil fix dahil baseline; log UI henüz olgunlaşmamış |
| `v8.139-stable` | `73f9374` | actLog ctx render dahil ama caller'lar henüz bağlanmamış |
| `v8.128-stable` | `a7ca043` | Modül ayrıştırması (auth-pin + app.css + firestore/persist) tamamlanmış önceki baseline |
| `v8.120-stable` | `b99e570` | Store migration ailesi (v8.108-v8.120) + personId gruplama tamamlanmış stabil baseline |
| `v8.112-stable` | `d03d5bc` | Daha eski — personId backfill öncesi |

**Öneri:** v8.166 yeni baseline. UX iyileştirme dalgası (boş ay temizlik + kişi özet + cred→DV + delegation) v8.160 üzerine kuruldu. Tag zaten oluşturuldu:
```
git tag v8.166-stable c08ddd7   # zaten yapıldı
git push origin v8.166-stable    # zaten yapıldı
```

Geri dönüş (önceki baseline'a):
```
git reset --hard v8.160-stable
```

Daha eski baseline'a geri dönmek için:
```
git reset --hard v8.150-stable    # ui-plan modülerleştirmesi öncesi
git reset --hard v8.140-stable    # log UI olgunlaşması öncesi
```
