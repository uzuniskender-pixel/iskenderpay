## 2026-05-29 — DEPLOY DUZELTME (v8.190 -> v8.191): log.js gercekten gonderildi
v8.190 paketinde log.js Downloads'ta bulunamadigi icin commit'e GIRMEMISTI (repo v8.190 diyordu ama Log odeme-duzenle fix'i [v8.189 paidOf] canlida yoktu). v8.191 = ayni log.js fix'i + dürüst versiyon etiketi. Baska kod degisikligi yok.

---

## 2026-05-29 — QNB coklu grup ozet etiket fix (v8.189 -> v8.190) — KOD TAMAM, saha-test BEKLIYOR
KALAN ISLER #1 / ACIK HATA #1 KAPANDI. ui-persons.js#_buildPersonSummary.
KOK NEDEN: ayni kisinin coklu pay grubu, ozet breakdown'unda hepsi ham p.name ile ("QNB" x3) -> ayirt edilemiyor.
Toplamlar dogruydu (v8.170); sorun yalniz breakdown ETIKETLERINDE. FIX: (1) pay etiketi `name (desc||category)` (plan matrisi paritesi); (2) kalan cakismalara ' #2'/' #3' sayisal disambiguator. Tek dosya, toplamlar degismez.
Repro (sandbox): 5 grup (Kira/Elektrik/2x Diger) + 1 cred -> QNB (Kira)/QNB (Elektrik)/QNB (kredi)/QNB (Diger)/QNB (Diger) #2, hepsi benzersiz, toplam 3000.
TEST (gizli sekme): birden cok yukumlulugu olan kisiye Kisiler'den tikla -> ozet kartinin alt breakdown'unda her satir ayirt edilebilir etiket gostermeli.

---

## 2026-05-29 — Log 'odeme duzenle' bug fix (v8.188 -> v8.189) — KOD TAMAM, saha-test BEKLIYOR
Kullanici raporu: Log > Odemeler > Duzenle -> kaydet -> ekranda degisiklik yok.
KOK NEDEN (eski-beri, v8.188 ile ilgisiz): log.js `paidOf` status==='paid' kaleminde p.paid'i yok sayip toTRY(p.amount)'tan yeniden hesapliyordu; savePaidItem ise duzenlemeyi p.paid'e yaziyordu -> ledger okumuyor.
FIX (1 satir, log.js): `paidOf = p.paid!=null ? p.paid : (status==='paid'?toTRY(amount):0)`. markOk her zaman paid=toTRY(amount) yazdigindan duzenlenmemis kalem AYNI gorunur (regresyon yok). Yan kazanim: FX kalem artik odeme anindaki sabit TRY'yi gosterir (guncel kura gore kaymaz).
NOT (acik): hesap.js/search.js/ui-persons.js'teki odenen-toplam tuketicileri kendi mantigini kullanir; duzenleme su an YALNIZ Log ledger gorunumunu gunceller. Tam capraz-tutarlilik (tum ozetler duzenlemeyi yansitsin) ayri/buyuk is — gerekirse KALAN ISLER'e eklenir.
TEST (gizli sekme): Log > Odemeler > Duzenle -> tutar/ad/tarih degis -> kaydet -> ledger aninda guncellenmeli.

---

## 2026-05-29 — Gizli sekme olu kod temizligi (v8.187 -> v8.188) — KOD TAMAM, saha-test BEKLIYOR
Backlog #1 KAPANDI. T1 (Odemeler) + T4 (Gecmis) sekmelerinin tum olu kodu kaldirildi. Boylece v8.183 backlog'unun UCU DE kapandi (#1 bu, #2 v8.184, #3 v8.187).

NE KALDIRILDI:
- index.html: T1 + T4 panel HTML'leri (OPD/PFLT/PFLT2/PL/HD/HL), gizli nav butonlari (s1/m1/s4/m4). Python ile duzenlendi (encoding korumasi).
- ui-notes.js: renderPaid() fonksiyonu (~55 satir) + PL event delegation + _plHandlersAttached flag + window.renderPaid export.
- ui-persons.js: renderHist() fonksiyonu (~25 satir) + HL event delegation + _hlHandlersAttached flag + window.renderHist export.
- app.js#go(): `if(n===1)renderPaid()` + `if(n===4)renderHist()` handler'lari; iterasyon dizisi [0,1,2,3,4,5,6,7] -> [0,2,3,5,6,7].
- sync.js: realtime callback'teki renderHist()/renderPaid() satirlari (artik tanimsiz, guard no-op olurdu — temizlendi).

CAGRI YENIDEN BAGLAMA (davranis korundu):
- Paid/Hist verisi (window.paidItems / window.hist) ve defter islevleri Log ledger'inda (v8.177) — DOKUNULMADI.
- savePaidItem/saveHistItem: dead renderPaid()/renderHist() cikti, mevcut `if(curTab===7)renderActLog()` self-refresh kaldi.
- delPaidItem/restoreFromHist/delHist/clrHist: dead render cagrisi -> `if(curTab===7)renderActLog()` self-refresh oldu (artik kendi kendini yeniler).
- log.js ledger inline onclick'leri: action'lar self-refresh ettigi icin gereksiz `;renderActLog()` suffix'leri kaldirildi (cift-render onlendi).

KORUNDU: PIMOD/HIMOD modallari (Log ledger edit akisi) + 8 ledger window export (openPaidEdit/delPaidItem/savePaidItem/editHistItem/restoreFromHist/delHist/clrHist/saveHistItem) + renderNotes(T3)/renderPersons(T2) ve flag'leri (_nlHandlersAttached/_prlHandlersAttached).

DOGRULAMA: tum js `node --check` PASS; index.html'de T1/T4/s1/m1/s4/m4/renderPaid/renderHist 0 referans; Turkce karakter saglam (mojibake yok); tab yapisi tutarli (T0/T2/T3/T5/T6/T7). SW CACHE bump GEREKMEZ (index.html+js network-first no-store; STATIC dosya listesi degismedi). version v8.188 / 20260529-28.

SONRAKI ADIM (saha-test, gizli sekme + cache temizle):
1. Plan/Kisiler/Notlar/Ayarlar/Rehber/Log sekmeleri arasinda gecis — kayma/bos ekran olmamali.
2. Log > "Odemeler" filtresi: Duzenle (PIMOD kaydet) + Sil -> liste aninda yenilenmeli.
3. Log > "Silinenler" filtresi: Duzenle (HIMOD kaydet) + Geri Al + Sil + Tumunu temizle -> liste aninda yenilenmeli.
4. Konsol: `window.renderPaid`/`window.renderHist` -> undefined olmali.

---

## 2026-05-29 — Store.session hardening (v8.186 -> v8.187) — KOD TAMAM, saha-test BEKLIYOR
Backlog #3/#5 KAPANDI. Sirlar artik module-private closure'da; window.Store.session KALDIRILDI.

YENI DOSYA: js/session.js — module-private closure.
- Sirlar (_cryptoKey non-extractable, _plainPin) closure scope'unda; window'a HIC baglanmaz.
- Disari yalniz FIIL metotlari: encrypt/decrypt/verifyPin/decryptBackup/hasKey/clear/debugInfo. ISIM (key/pin) asla donmez.
- Tuketiciler ES named import: `import { Session } from './session.js'` (window uzerinden yol yok).

EPHEMERAL KEY WRAP:
- dataKeyRaw ARTIK RESIDENT DEGIL (eskiden chPass re-wrap icin window'da Uint8Array dururdu).
- chPass: ham anahtari MEVCUT PIN ile depodaki wrapped-blob'tan anlik unwrap -> nw ile wrap -> GC. Sira duzeltildi (once re-wrap dogrula, sonra hash kaydet -> tutarsizlik yok).
- doLogin her iki yol: cryptoKey importDataKey ile NON-EXTRACTABLE re-import; rawBytes fonksiyon scope'unda kalip GC'ye birakilir.

DEGISEN DOSYALAR: store.js (session+clearSession kaldirildi), persist.js/sync.js (Session.hasKey + Session.encrypt/decrypt), auth-pin.js (set/setPin/verifyPin + ephemeral chPass), app.js (debugState Session.debugInfo + readRF Session.decryptBackup), firebase.js (signOut'ta Session.clear -- LATENT BUG: cikista sirlar bellekte kaliyordu, kapatildi), plan.js+crypto.js (yorum), index.html (session.js import + APP_VERSION v8.187 + yorum), sw.js (STATIC'e session.js + CACHE v9->v10), version.json.

DURUST GUVENLIK SINIRI: bu refactor KEY/PIN HIRSIZLIGINI engeller (sir disari sizamaz/yeniden kullanilamaz). Oturum ACIKKEN arbitrary JS calistirabilen saldirgan (XSS) uygulama fiillerini hala kotuye kullanabilir -- XSS'e tam koruma DEGIL.

SONRAKI ADIM (saha-test, gizli sekme + cache temizle):
1. Ilk kurulum (storedHash yok) -> PIN belirle -> giris.
2. Cikip ayni PIN ile tekrar giris (returning/unwrap yolu).
3. chPass: sifre degistir -> cikis -> yeni sifre ile giris (ephemeral re-wrap dogrula).
4. Yedek al -> geri yukle (Session.decryptBackup).
5. Plan1<->Plan2 gecisi (ayni key korunmali).
6. Konsol: `window.Store.session` -> undefined olmali; `debugState()` Session tablosu hasKey/pinLen gostermeli (sir yok).
NOT: version dosyalari user-managed -- paralel terminal v8.187'yi ileri bumpladiysa ayarla.

---

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

ACIK BACKLOG (sonraki oturum, oncelik sirasi): — ✅ HEPSI KAPANDI
1. ✅ KAPANDI (v8.188): gizlenen sekmelerin panel(T1/T4)+render(renderPaid/renderHist)+go() handler olu kodu tamamen kaldirildi.
2. ✅ KAPANDI (v8.184): idx-temizligi loadSecure'da da calisir (acilista dar pass + dirty->saveSecure ile kalicilasir). Manuel console tetigi artik gerekmiyor.
3. ✅ KAPANDI (v8.187): Store.session module-private closure'a alindi; window.Store.session KALDIRILDI (key/pin disari sizamaz). Not: XSS'e tam koruma degil — saha-testi hala bekliyor.

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

1. ✅ KAPANDI (v8.190): QNB çoklu grup özet — breakdown etiket çakışması düzeltildi. (Eski not:) Çoklu grupta kişi özeti — `openPersonHist` özet kartı bir kişinin **birden çok groupId'si** varsa (örn QNB cred + QNB pay grupları) bunları kayıp/eksik gösterebiliyor. `_buildPersonSummary` personId filter > name fallback yapıyor; multi-group durumunda groupId çözümü net değil. Repro: aynı kişiye birden fazla farklı `groupId`'li pay → özet kayıp.
2. ✅ KOD DOĞRULANDI (v8.190 oturumu, review + sandbox harness) — v8.163 + v8.180 boş/ödenmiş ay gizleme mantığı 4 senaryoda doğru çalışıyor (showPaid aç/kapa × boş ay/tamamı-paid ay). buildMx `status='paid'` ancak `items.every(paid)` ile set ediyor; ay filtresi `c.status!=='paid'` buna güvenli dayanıyor. Geriye yalnız tarayıcı onayı kaldı (SW cache): Test: gizli sekme + hard reload (Ctrl+Shift+R) + `caches.keys().then(k=>Promise.all(k.map(c=>caches.delete(c)))).then(()=>location.reload())`. SW cache `ip-static-v9` (v8.126'da bumped) — yeni CACHE bump gerekirse `sw.js#CACHE` artırılmalı.
3. **openCell istatistik bölümü veri yetersiz** — DV cell'inde kişi/grup history bölümü v8.159'da eklendi ama eski entry'ler henüz personId/groupId taşımıyor (v8.148 Pass 3 sadece personId) → bazı hücreler boş history görüyor. Zamanla yeni entry'ler birikince dolacak. groupId backfill düşünülebilir (yeni Pass 4: detail.split(' · ')[0] → findPaysByGroup match).
4. **`Store.session` security trade-off** — `Store.session.cryptoKey/dataKeyRaw/plainPin` console-accessible. v8.115'te kabul edildi (organizational, security değil). Real hardening: closure scope + ephemeral key wrap.
5. **`personId` data quality ⚠️ göstergesi** — v8.137'de hesap.js'de `g_*/pay_*` personId-siz rowKey'lere `⚠️` suffix eklenir. Kalıcı UX mı yoksa geçici teşvik mi belirsiz. Gözlem altında.
6. **v8.153/v8.157 atlanmış versiyon numaraları** — git log v8.152 → v8.154 → v8.155 → v8.156 → v8.158 → ... v8.153 ve v8.157 yok. Linter/parallel commit yarışı sonucu boşluk. Kozmetik.

---

## 4. KALAN İŞLER (öncelik sırası)

1. ✅ KAPANDI (v8.190): QNB çoklu grup özet breakdown etiketleri ayrıştırıldı (`name (desc||category)` + sayısal disambiguator). Toplamlar zaten doğruydu (v8.170); sorun etiket çakışmasıydı.
2. ✅ KOD DOĞRULANDI (v8.190 oturumu): boş/ödenmiş ay gizleme mantığı review + harness ile doğru bulundu. Kod değişikliği gerekmedi. Geriye yalnız tarayıcı onayı: gizli sekme + cache temizle → boş gelecek aylar ve tamamı ödenmiş aylar sütun olarak görünmemeli; 'Ödendiler' toggle açınca geri gelmeli.
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
