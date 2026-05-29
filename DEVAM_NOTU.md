## 2026-05-29 — Tutarlilik + Log kontrol-merkezi sprint (v8.170 -> v8.183)
Baseline: v8.183 (8902a43). Hepsi push'li + saha-test yesili.

TUTARLILIK & VERI BUTUNLUGU:
- v8.170 hesap.js Hesap.kalan: bekleyen tutar tek kaynak (kredi paneli=toplam=kisi karti)
- v8.172 ui-plan-actions _findPaidIdx: ayni tarihli kredi taksitleri paidItems eslesme fix
- v8.175 store.js removeWhere(x,i): Log sec-sil hicbir kaydi silmiyordu, index predicate fix
- v8.176 integrity backfill: id/groupId'siz zombi pay onarimi
- v8.179 integrity: window.pays'e sizan idx'li kredi taksiti temizligi (semptom, son emniyet agi)
- v8.182 ui-persons restoreFromHist: idx/_cid/_ii soyma -> sizintinin KAYNAGI kapandi
- v8.183 log.js: ledger sayaclari (Odemeler/Silinenler) gercek defter kaynagindan (paidItems/hist)

LOG = KONTROL MERKEZI:
- v8.173 tur filtresi, v8.174 ledger-view, v8.177 tam parite (Odemeler defteri + Silinenler geri-yukle; openPaidEdit/delPaidItem/editHistItem/restoreFromHist/delHist window'a geri export edildi -- v8.166'da kaldirilmislardi, inline onclick'ler oluydu)
- v8.180 ui-plan-render: tamami odenmis ay sutunu gizlenir (showPaid toggle ile geri)
- v8.181 Odemeler(s1/m1)+Gecmis(s4/m4) nav butonlari display:none (islevler Log'da)

ACIK BACKLOG (sonraki oturum, oncelik sirasi):
1. 3C: gizlenen sekmelerin panel(T1/T4)+render(renderPaid/renderHist)+go() handler kodunu tamamen kaldir (kod temizligi, Buket istedi)
2. idx-temizligini loadSecure'da da calistir (su an save'e bagli, manuel tetik gerekti)
3. Ledger v1 rafine: kisi/tarih filtresi ledger modunda kombine olsun; edit-sonrasi yenileme
4. Store.session guvenlik (#5): console'dan cryptoKey/dataKeyRaw/plainPin erisilebilir -- ayri worktree + tam spec

Cevre: makinede ag flaky (QUIC/DNS); offline-commit + ag donunce push paterni kullanildi.

### OTURUM HIJYENI (Claude'a kalici hatirlatma)
- Bir sprint/konu = bir sohbet. Is mantiksal olarak bitince (baseline yesil + DEVAM_NOTU guncel) YENI sohbete gec; token dolusunu bekleme.
- Claude proaktif uyarsin: ~10+ versiyon cikinca, numara/durum kaymasi baslayinca, ya da konu degisince "yeni sohbet acalim, DEVAM_NOTU'dan devam" onerisini KENDISI getirsin.
- Yeni sohbet acilisinda Claude once DEVAM_NOTU.md + CLAUDE.md okur, kaldigi yerden surdurur.

---

# DEVAM NOTU — sonraki oturum için brief

_Son oturum: 2026-05-29 · son code commit: **v8.166 / 20260529-06** · **v8.166-stable** baseline_

CLAUDE.md = canonical referans (versiyon geçmişi, mimari notlar, dosya yapısı).
Bu dosya = oturumlar arası **kısa devir notu**.

---

## 1. KURALLAR

### Manuel git tag YAPMA
`.github/workflows/auto-tag.yml` her push'ta `version.json`'dan versiyon okuyup otomatik tag oluşturuyor (format: `v8.166-20260529-06`). **Manuel `git tag` + `git push origin <tag>` gereksiz** — zaten yapılıyor. **İstisna**: `-stable` suffix'li tag'ler (`v8.166-stable`) "stable baseline" insani karar olduğu için manuel oluştur. Normal release tag'leri auto.

### Python ile index.html düzenle (Türkçe karakter koruması)
PowerShell `Set-Content` veya direkt Write `index.html`'in UTF-8 BOM/encoding'ini bozar — `/* GOOGLE GİRİŞ */` gibi Türkçe yorumlar mojibake olur. **Kural**: index.html düzenleme **Python script ile** (`open(p,'r',encoding='utf-8')` + `re.sub` + `open(p,'w',encoding='utf-8')`). Diğer dosyalar Edit/Write tool serbest.

### Test: her deploy sonrası gizli sekmede
Service worker cache agresif (`ip-static-v9`). Aktif sekme deploy sonrası eski JS çalıştırıyor olabilir. **Kural**: deploy sonrası gizli sekme (incognito) aç → test. Veya: console'a `caches.keys().then(k=>Promise.all(k.map(c=>caches.delete(c)))).then(()=>location.reload())` yapıştır.

### Paralel terminal çakışması: version.json/index.html aynı anda değiştirilmez
Linter veya paralel terminal version dosyalarını ileri bumpler (bizim v8.163 → kullanıcı v8.166'ya bumpedlamış). **Kural**: kod commit'inde mümkünse version dosyalarına dokunma — kullanıcı manage etsin. Aksi halde commit message'a "version files user-managed" notu düş.

### Paralel CC = ayrı git worktree
Aynı repo kökünde birden çok Claude Code oturumu paralel çalışınca aynı working tree'yi paylaşır — biri stash/rebase yaparken diğerinin değişiklikleri kayboluyor/çakışıyor (bu oturumda integrity.js commit'i sırasında log.js + ui-persons.js stash karmaşası yaşandı). **Kural**: paralel CC oturumlarını **ayrı git worktree**'de çalıştır (`git worktree add ../iskenderpay-wt2 main`). Her oturum kendi working tree'sinde izole; push'larda yalnızca commit-düzeyi rebase çakışması olur, dosya-düzeyi stash savaşı olmaz.

### Store.replace autoSave tetikler
v8.97 hotfix: `Store.replace` artık `_autoSave()` çağırır. Manuel `saveSecure()` çağrısı **gereksiz** — Store mutation API'leri (push/removeWhere/spliceAt/mutateItem/replace) hepsi autoSave debounce tetikler. **Kural**: mutation sonrası manuel `saveSecure()` ekleme; `Store.touch()` zaten içerir.

### Supabase MCP: test önce, sonra prod
MCP üzerinden Supabase erişimi olunca **test instance** kullan (`cowgxwmhlogmswatbltz`), prod'a dokunma. Test'te şema/data doğrula, sonra migration apply.

---

## 2. MİMARİ KARARLAR VE GEREKÇELERİ

Bu bölüm "ne yapıldı" değil **"neden öyle yapıldı"** anlatır.

### 1. Store pattern (v8.92)
**Karar:** `window.pays` direkt array erişimi yerine merkezi `js/store.js` Store.
**Gerekçe:** 5 farklı dosya (`db.js`, `ui.js`, `ui-data.js`, `ui-misc.js`, `ui-plan.js`) aynı array'i farklı şekillerde bozuyordu — biri `.push`, biri `.splice`, biri `=` ile reassignment. `dirty` flag senkronize değildi; aynı tick'te çoklu mutation'lar tek save'e batch'lenmiyordu. Store ile tek mutation API + otomatik `_dirty=true` + `saveSecure()` debounce + lookup invalidate.

### 2. localStorage önce, Firebase sonra (v8.89)
**Karar:** `_doSave` `localStorage.setItem` → `_fbSave` (önce-sonra sırası).
**Gerekçe:** Firebase çağrısı network hatası veya quota dolması ile fail olunca veri **kaybediliyordu** — `_doSave` exception fırlatıyordu, localStorage'a hiç yazmıyordu. Sıra ters çevrildi: önce localStorage (sync), sonra Firebase (async, fail durumunda `_fbSyncNeeded=true` ile retry). Tek nokta hata = sıfır veri kaybı.

### 3. firebase.js ana modül bloğuna taşındı (v8.113)
**Karar:** `index.html`'in ayrı `<script type="module">` bloğundaki `firebase.js` import'u ana bloğa (store.js'ten **hemen sonra**) taşındı.
**Gerekçe:** ES modules iki ayrı blok bağımsız evaluate eder. firebase.js önce blokta olduğundan, `onAuthStateChanged` callback'i **cached auth** durumunda anında fire ediyordu — store.js henüz yüklenmediği için `Store.fbUid = uid` set'i `TypeError` atıyordu. Tek bloğa alınca sıra deterministik: store → firebase → state → ... Race kalıcı çözüldü.

### 4. Store.session (v8.115)
**Karar:** `window._cryptoKey` / `_dataKeyRaw` / `_plainPin` → `Store.session.X`.
**Gerekçe:** `window.*` üzerinde olduğundan console attacker direkt okuyabiliyordu. Store'a taşıyarak **sahiplik konsolide edildi**. **NOT: security hardening değil** — `window.Store.session` hâlâ console-erişilebilir; organizational netleşme. Gerçek hardening için closure scope + ephemeral key wrap gerekir.

### 5. Event-based render (v8.100)
**Karar:** Store mutation API'leri `store:change` CustomEvent dispatch eder; render'lar listener'larla otomatik tetiklenir.
**Gerekçe:** Mutation sonrası `render()` çağrısı manuel idi — 22+ caller arasında bazıları unutuluyor, UI stale kalıyordu. Microtask-coalesced event ile aynı tick'teki çoklu mutation tek render'a indirgenir. Manuel render kaldırıldı (ui-plan.js: 9 CRUD, ui-pay.js: 2, ui-persons.js: 1).

### 6. hesap.js (v8.95)
**Karar:** "Bu ay özeti", "toplam bekleyen borç", "kredi listesi", "trend" hesapları `js/hesap.js`'te tek otorite.
**Gerekçe:** Plan matrisi, ayarlar paneli, kredi kart paneli üç farklı yerde **aynı kavramı farklı formüllerle** hesaplıyordu — sonuçlar tutarsızdı. Hepsi `Hesap.X()` API'sine yönlendirildi; tek mantık, üç tüketici.

### 7. personId gruplama (v8.109)
**Karar:** Pay/cred satırlarını isim suffix'i ("AHMET 1") yerine `personId` (UUID) ile grupla.
**Gerekçe:** "AHMET 1/AHMET 2" mantığı confusing — rename'de suffix'ler kayıyordu. `personId` ile kişi nesnesine kanonik bağlantı + display name `"AHMET (Kira)"` / `"AHMET (Elektrik)"` disambiguation. Self-cleaning backfill (v8.111/v8.112/v8.148) eski entry'leri retroactive bağlar.

### 8. integrity.js + validate.js ayrımı (v8.135 + v8.155)
**Karar:** `persist.js#_doSave`'in `try/catch` blokları iki ayrı modüle: `validate.js` (read-only) + `integrity.js` (mutation).
**Gerekçe:** `_doSave` 60+ satır integrity + validate inline kodu içeriyordu — concern karışıktı. Sıra: `normalizeBeforeSave()` (fix first) → `validateBeforeSave()` (audit after) → encrypt.

### 9. db.js → firestore.js + persist.js (v8.127)
**Karar:** 274 satırlık `db.js` → `firestore.js` (11 helper) + `persist.js` (5 fn).
**Gerekçe:** Auth zaten `firebase.js`'e taşınmıştı. Kalan db.js'te Firestore CRUD + AES encrypt + migration **3 concern karışmıştı**. Sahiplik haritası: firebase.js → firestore.js → persist.js → auth-pin.js. 0 caller değişikliği.

### 10. CSS → app.css (v8.126)
**Karar:** `index.html`'in `<style>` bloğu (278 satır) ayrı `app.css` dosyasına.
**Gerekçe:** index.html %39'u CSS'ti — Python ile her değişiklikte **encoding riski** (Türkçe yorumlar utf-8 hatasına yol açabiliyordu). Ayrı dosyada bu risk yok + dev tools'ta source map daha temiz. Critical CSS (12 satır) inline kaldı (FOUC önleyici).

### 11. ui-plan.js → 3 dosya (v8.150)
**Karar:** 612 satırlık `ui-plan.js` → `render` (272) + `detail` (156) + `actions` (208).
**Gerekçe:** Render + detail panel + CRUD aynı dosyada — bug fix risk yüksekti. Concern ayrımı: render = read-only HTML; detail = modal aç; actions = CRUD + dialog-flow.

### 12. Event delegation pattern (v8.121 + v8.151 + v8.166)
**Karar:** Inline `onclick="..."` → container `addEventListener` + `data-*` attribute.
**Gerekçe:** Inline `onclick` her render'da yeniden bind ediyordu — memory pressure + window export şişmesi. Container delegation `_xHandlersAttached` one-shot flag ile tek bağlama. Yan kazanım: window export'lar silinebildi (editNote/delNote/openPaidEdit/delPaidItem vb.) — global namespace temizlendi.

### 13. addLog ctx (v8.136)
**Karar:** `addLog(type, title, detail, navTab)` → `addLog(..., ctx = {personId, groupId, credId})`.
**Gerekçe:** actLog kayıtları **kişi/gruba bağlı değildi** — kullanıcı "AHMET'in tüm log'ları" filtre yapamıyordu. Opsiyonel ctx backward compat. Sonuç: tam observability — 3 dropdown filter (date + person + group).

### 14. actLog backfill Pass 3 (v8.148)
**Karar:** `_backfillPersonIds`'a 3. pass: eski entry'lere `detail`'in ilk segmentinden retroactive `personId`.
**Gerekçe:** v8.140 yeni log'ları zenginleştirdi ama eski log'lar kişi-bağımsız kalıyordu. Pass 3 `detail.split(' · ')[0]` → `Hesap._baseOf` → `persons` Map lookup. Skip kuralları (rhb_*, cred_add, taksit) false positive azaltır. İdempotent + self-cleaning.

---

## 3. AÇIK HATALAR / NOTLAR

1. **QNB gibi çoklu grupta kişi özeti görünmüyor** (v8.164 follow-up) — `openPersonHist` özet kartı bir kişinin **birden çok groupId'si** varsa (örn QNB cred + QNB pay grupları) bunları kayıp/eksik gösterebiliyor. `_buildPersonSummary` personId filter > name fallback yapıyor; multi-group durumunda groupId çözümü net değil. Repro: aynı kişiye birden fazla farklı `groupId`'li pay → özet kayıp.
2. **Boş ay sütunu gizleme test edilemedi (SW cache)** — v8.163 kod doğru (`grep "filter(m =>"` ui-plan-render.js 1 sonuç), ama service worker eski versiyonu cache'liyor. Test: gizli sekme + hard reload (Ctrl+Shift+R) + `caches.keys().then(k=>Promise.all(k.map(c=>caches.delete(c)))).then(()=>location.reload())`. SW cache `ip-static-v9` (v8.126'da bumped) — yeni CACHE bump gerekirse `sw.js#CACHE` artırılmalı.
3. **openCell istatistik bölümü veri yetersiz** — DV cell'inde kişi/grup history bölümü v8.159'da eklendi ama eski entry'ler henüz personId/groupId taşımıyor (v8.148 Pass 3 sadece personId) → bazı hücreler boş history görüyor. Zamanla yeni entry'ler birikince dolacak. groupId backfill düşünülebilir (yeni Pass 4: detail.split(' · ')[0] → findPaysByGroup match).
4. **`Store.session` security trade-off** — `Store.session.cryptoKey/dataKeyRaw/plainPin` console-accessible. v8.115'te kabul edildi (organizational, security değil). Real hardening: closure scope + ephemeral key wrap.
5. **`personId` data quality ⚠️ göstergesi** — v8.137'de hesap.js'de `g_*/pay_*` personId-siz rowKey'lere `⚠️` suffix eklenir. Kalıcı UX mı yoksa geçici teşvik mi belirsiz. Gözlem altında.
6. **v8.153/v8.157 atlanmış versiyon numaraları** — git log v8.152 → v8.154 → v8.155 → v8.156 → v8.158 → ... v8.153 ve v8.157 yok. Linter/parallel commit yarışı sonucu boşluk. Kozmetik.

---

## 4. KALAN İŞLER (öncelik sırası)

1. **QNB çoklu grup özet fix** — `ui-persons.js#_buildPersonSummary` multi-group durumunda groupId çözümünü düzelt. Reprodüksiyon senaryosu test et: aynı kişiye 2 farklı groupId'li pay grubu ekle → öteki kaybolur mu?
2. **Boş ay sütunu debug** — v8.163 fix'ini gizli sekme + cache temizleyerek tarayıcıda doğrula. Çalışmıyorsa: `monthSet` filter mantığını tekrar incele. SW CACHE bump gerekebilir.
3. **`Store.session` security hardening — ⏭️ SIRADAKİ** — closure scope + ephemeral key wrap (büyük refactor, dikkatli incele). `Store.session.cryptoKey/dataKeyRaw/plainPin` console-accessible; gerçek hardening için module-private closure + ephemeral key wrap gerekir.
4. **Tarihi `db.js` yorum referansları** — `app.js:227`, `index.html:442`, `store.js:40,48`, `firebase.js:74` — kozmetik temizlik.

---

## 5. TAMAMLANAN ANA ÇALIŞMALAR

v8.95 → v8.166 arası **70+ patch**. Versiyon grupları halinde:

| Grup | Versiyonlar | Özet |
|---|---|---|
| Hesap modülü + Store Phase 3 | v8.95-v8.97 | `hesap.js` tek hesap kaynağı; manuel saveSecure temizlendi; Store.replace autoSave hotfix |
| Lookup maps → Store | v8.98 | `_lookupDirty` + 3 Map data.js'ten Store'a |
| Ölü kod + redundant invalidate | v8.99 | `ui.js`/`ui-data.js`/`ui-misc.js` silindi; 5 manuel `invalidateLookups()` |
| Event-based render + firebase race hotfix | v8.100 | `store:change` CustomEvent; plan.js race defensive guard |
| Auth duplikasyonu + lifecycle | v8.103, v8.107 | db.js auth duplicate'leri silindi; `_fbStopListen` aktive |
| 8 persist flag → Store | v8.108 | `_dirty`/`_saveTimer`/`_syncTimer`/... → Store.X |
| personId gruplama | v8.109-v8.112 | persons.id + pays.personId + 2-pass backfill |
| auth-pin.js ayrımı | v8.110 | doLogin + chPass db.js'ten ayrı dosyaya |
| `_fbUid` → Store.fbUid + load-order race fix | v8.113 | firebase.js ana modül bloğuna |
| Session → Store.session | v8.115 | `_cryptoKey/_dataKeyRaw/_plainPin` → Store.session.X |
| Bundle: planId + knownBuild + temizlikler | v8.116-v8.120 | `_planId` → Store.planId (setter localStorage'a) |
| rehber.js event delegation | v8.121 | Inline `_rhbPhones[i]...` → container delegated |
| Debug helper | v8.122 | `window.debugState()` — 5 console.table |
| `_doSave` integrity check | v8.123 | pays/creds/persons tip/varlık doğrulama |
| Cred "(Kredi)" suffix | v8.125 | `_displayNames` post-pass |
| CSS → app.css | v8.126 | `<style>` bloğu ayrıldı, CACHE v9 |
| db.js → firestore.js + persist.js | v8.127 | Firestore I/O ve encrypt/storage ayrımı |
| Ölü kod toplu temizliği | v8.128-v8.133 | persist alias'lar, firestore salt, util artıkları, UI handler'lar, Firebase expose |
| warn-toast resting fix | v8.134, v8.137 | `translateY(-80px)` → `-160px` → `-200px` mobil |
| validate.js ayrımı | v8.135 | persist.js integrity check ayrı modüle |
| addLog ctx + log render | v8.136, v8.139, v8.140 | `ctx = {personId, groupId}` + caller'lar bağlandı |
| personId ⚠️ data quality | v8.137 | personId-siz pay'lere `⚠️` suffix |
| Log silme: kişi modu | v8.143 | LOG_DEL_BAR 3. mode |
| Log jump + flash | v8.144 | 📋/👤 ikon click → smooth scroll + 1.5s keyframe |
| Log tarih + person filtresi | v8.145 | Hepsi/Bugün/Bu hafta/Bu ay + person dropdown |
| ui-plan addLog personId | v8.146 | 6 caller'a `personId` eklendi |
| paid rows hide bug fix | v8.147 | ay-bazlı (yanlış) → satır-bazlı |
| actLog personId backfill Pass 3 | v8.148 | Eski entry'lere isim eşleşmesiyle personId |
| log-jump CSS class | v8.149 | inline style → `.log-jump` class |
| **ui-plan.js → 3 dosya** | **v8.150** | render/detail/actions ayrımı, 626 → 272+156+208 |
| rehber.js delegation tamamlandı | v8.151 | Kalan 6 inline handler → container delegated |
| convertToCredit + editByKey → detail.js | v8.152 | Dialog-flow sahiplik düzeltmesi |
| render() helper extraction | v8.154 | render içi blokları module-local helper'lara |
| groupId normalization → integrity.js | v8.155 | persist.js normalize bloğu ayrıldı |
| saveCred addLog ctx + credId | v8.156 | saveCred 2 addLog `{personId, credId}` |
| Kredi kart paneli zenginleştirildi | v8.158 | `Hesap.krediler()` remaining/nextDays/overdueCount/lastDate |
| openRow DV: kişi adı + log history | v8.159 | DV'ye kişi rozeti + son 10 entry |
| actLog groupId bazlı filtre | v8.160 | 3. dropdown — date+person+group AND-combine |
| Ayarlar T5 compact grid | v8.161-v8.162 | 2-kolon responsive grid; 4 sub kısaltıldı |
| Boş ay sütunları gizlendi | v8.163 | `allMonths.filter(...)` rowKeys mevcudiyetli |
| openPersonHist özet kartı | v8.164 | 2-kolon BEKLEYEN/ÖDENEN + gecikmiş satırı |
| Cred özet kart → DV re-route | v8.165 | renderCredSummary → openRow('cred_X') |
| ui-notes + ui-persons delegation | v8.166 | Notes/Paid inline onclick → container delegation |

Detaylı satır-satır CLAUDE.md'de.

---

## 6. RESTORE NOKTALARI

| Tag | Commit | Notlar |
|---|---|---|
| **`v8.166-stable`** _(öneri)_ | `c08ddd7` | En zengin baseline. UX dalgası (boş ay gizleme + kişi özet + cred→DV + delegation) v8.160 üzerinde. |
| `v8.160-stable` _(önceki)_ | `40d8fc8` | Üç filter (date+person+group) + DV kişi+history + kredi paneli olgun |
| `v8.150-stable` | `19f0b90` | ui-plan.js modülerleştirme + actLog backfill Pass 3 |
| `v8.147-stable` | `41a938f` | Log UI olgunlaşması + ui-plan personId genişlemesi |
| `v8.140-stable` | `f9d7fb5` | addLog ctx caller bağlama + validate.js |
| `v8.139-stable` | `73f9374` | actLog ctx render (caller'lar yok) |
| `v8.128-stable` | `a7ca043` | Modül ayrıştırması (auth-pin + app.css + firestore/persist) |
| `v8.120-stable` | `b99e570` | Store migration + personId gruplama |
| `v8.112-stable` | `d03d5bc` | personId backfill öncesi |

**Geri dönüş:**
```bash
git reset --hard v8.160-stable    # önceki baseline
git reset --hard v8.150-stable    # ui-plan monolitik dönemi
git reset --hard v8.140-stable    # log UI öncesi
```

---

## 7. STACK BİLGİSİ

| Bileşen | Değer |
|---|---|
| Repo | `github.com/uzuniskender/iskenderpay` (main branch) |
| Hosting | GitHub Pages (otomatik deploy main push'tan) |
| Firebase project | `iskenderpay-a23d1` |
| Firebase config | `js/firebase.js` (apiKey, projectId, authDomain vb.) |
| Auth | Google sign-in (popup → redirect fallback) |
| Storage | Firestore (`users/{uid}_{plan1\|plan2}` doc + `users/{uid}_meta`) |
| Encryption | AES-GCM (data) + AES-KW (data key wrap) + PBKDF2 100k iter (PIN→KEK) |
| Client storage | localStorage (`v5-data-{planId}`, `v5-rates-{planId}`, `v8-wrapped-key`, `v6-active-plan` vb.) |
| PWA | `manifest.json` + `sw.js` (CACHE `ip-static-v9`) |
| Supabase MCP (debug) | Test: `cowgxwmhlogmswatbltz` · prod ayrı (dokunma) |
| Auto-tag workflow | `.github/workflows/auto-tag.yml` — her push → `v8.X-YYYYMMDD-NN` tag |
| Build versiyon kuralı | `version.json` `{v, build}` + `index.html` `APP_VERSION/APP_BUILD` ikisi senkron |
| Versiyon kuralı | Patch: 3. hane (v8.21 → v8.22); Minor: 2. hane (v8.x → v9.0); Build: YYYYMMDD-NN |
