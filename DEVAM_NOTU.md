## 2026-05-30 — #1 Faz B: cakisma karari shouldBlock ayristirildi + test (v8.200 -> v8.201) — 88/88 YESIL (sandbox), RUNTIME DEGISTI -> SAHA-TEST BEKLIYOR
Faz A (test paketi, push yesil) sonrasi Faz B. Sync'in EN KRITIK dali (compare-and-swap cakisma karari) v8.199'da "Firestore getDoc/setDoc mock gerekir, atlandi" denmisti. Cozum: kararin SAF kismini ayri modle cikar -> SDK olmadan test edilir.

YENI DOSYA: js/conflict.js (saf, DIS BAGIMLILIK YOK):
  export function shouldBlock(remoteTs, base) { return base > 0 && remoteTs > base; }
  base<=0 (ilk yazim/baseline yok) -> bloklamA; remote ESIT (senkron/kendi yazimimiz) -> bloklamA; remote GERIDE -> bloklamA; remote ILERIDE (baska cihaz sonra yazmis) -> BLOKLA. firestore.js SDK import ettiginden test edilemiyordu; conflict.js import etmedigi icin sandbox/CI'da dogrudan import + test edilir.

DEGISEN: js/firestore.js
  - import { shouldBlock } from './conflict.js'; (SDK import'unun altina)
  - _fbSave icindeki inline `if (remoteTs > base)` -> `if (shouldBlock(remoteTs, base))`.
  - DIS `if (base > 0)` guard'i KORUNDU: base==0'da network getDoc'u atlama davranisi (perf) korunsun diye. Ic blokta base>0 zaten gecerli oldugundan shouldBlock(remoteTs,base) == (remoteTs>base) -> DAVRANIS BIREBIR AYNI, sadece karar merkezi + test edilebilir.

DEGISEN: sw.js
  - STATIC'e './js/conflict.js' eklendi (firestore.js'in altina) -> offline precache.
  - CACHE 'ip-static-v10' -> 'ip-static-v11': install addAll yeni dosyayi ceker; activate eski cache'i siler + SW_UPDATED mesaji tek-sefer reload tetikler (mevcut v8.79 akisi).

YENI: tests/conflict.test.js (8): base 0/negatif -> false (3+1); remote ileride -> true (200>100, 101>100); esit -> false; geride -> false; remote updatedAt 0 -> false; gercekci ms-epoch (base+5000 -> true, base==base -> false).

MUTASYON DOGRULAMASI: conflict.js'te `base > 0 &&` guard'i dusuruldu (return remoteTs > base) -> TAM ve YALNIZ 2 baseline testi kirildi (base 0 / negatif), diger 6 gecti -> ilk yazimda SAHTE CAKISMA ureten bug sinifi yakalanir. Orijinal geri yuklendi (node --check PASS), 88/88 tekrar yesil.

DOGRULAMA (sandbox): node --check conflict.js + firestore.js + sw.js PASS. npm test -> Test Files 6 passed, Tests 88 passed (80 + 8 yeni). Mojibake yok.

VERSION: v8.201 / 20260530-04 (version.json + index.html APP_VERSION/APP_BUILD + package.json 8.201.0). SW cache bump YAPILDI (v10->v11) cunku yeni js dosyasi STATIC'e girdi.

SAHA-TEST GEREKLI (RUNTIME DEGISTI; gizli sekme + cache temizle — caches.keys().then(...delete...).then(reload) veya incognito):
1. (regresyon) Tek cihaz: odeme/kredi ekle-duzenle -> normal kaydeder, sync dot calisir, SAHTE CAKISMA TOAST'I CIKMAZ. (base>0 guard + shouldBlock dogru calisiyor mu)
2. (cakisma yolu — v8.199 ile ayni) A ve B sekmesi acik+senkron. Konsolda `Store.lastUpdated=1` ile bayat baseline yarat -> bir kayit ekle, kaydet -> SARI UYARI SERIDI cikmali + eklenen satir buluttaki haline donmeli (uzak veri korunur, local edit uyariyla degisir). VEYA iki gercek sekme ile: A'da ekle+kaydet, B'de (B poll etmeden) farkli ekle+kaydet -> B cakisma uyarisi.
Davranis v8.199 ile birebir AYNI olmali (bu sadece refactor + test). Fark gorunurse shouldBlock/guard yanlis baglanmis demektir.

OTURUM HIJYENI: Faz B kod TAMAM + sandbox 88/88. Ama RUNTIME degistigi icin saha-test PASS olmadan baseline ILAN EDILMEZ. Buket push -> CI (Tests 88/88 + Auto Tag v8.201-20260530-04) -> sonra saha-test (2 adim). PASS -> baseline v8.201-stable. Bu oturumda #1 (test kapsami) Faz A+B bitti; sonraki dusuk-oncelik persist/sync SDK-mock testleri (daha agir) VEYA mimari oneri #2 (@ts-check/JSDoc) — konu degisecekse YENI sohbet.

---


Mimari degerlendirme sonucu secilen #1 (test kapsami genisletme) basladi. 36 test yalniz saf hesap fonksiyonlarini (hesap.js/util.js) tutuyordu; EN COK gecmis hatasi olan moduller (Store v8.175, integrity v8.176/179/182, validate) SIFIR test idi. "Bir duzenleme baska yeri bozmasin" guvencesi katman sayisindan degil, bu tur otomatik kontrolden gelir — bu paket o bosluğun ilk parcasi.

KARAR: Faz A = SADECE SAF/IN-MEMORY moduller, RUNTIME DEGISMEZ (v8.198 paterni: yalniz test + version sabitleri, saha-test gerekmez, SW cache bump gerekmez, CI yesili yeterli). Cakisma mantigi (firestore.js _fbSave) Faz B'ye birakildi cunku modul ustte gstatic'ten Firestore SDK import eder -> sandbox/CI'da yuklenmez; test icin saf shouldBlock(remoteTs, base) cikarmak gerekir = RUNTIME degisikligi = saha-test. Faz B kullanici onayina birakildi.

YENI DOSYALAR (3, toplam 44 test):
- tests/integrity.test.js (13): normalizeBeforeSave 5 pass — (1) idx-sizan kredi taksiti temizligi (v8.179: idx'li pay silinir, normal kalir, idx yoksa dokunma), (2) groupId isim normalize (ayni groupId farkli isim -> en SIK isim canonical; tek-eleman/zaten-ayni dokunulmaz; gruplar izole), (3) paidItems dedupe (paidId bazli ilk tutulur; paidId'siz dokunulmaz), (4) actLog orphan ref (silinmis person/cred -> ALAN silinir entry KALIR), (5) zombi pay id/groupId backfill (v8.176: id sayi + groupId 'fix_' onekli; tam pay dokunulmaz; coklu zombi BENZERSIZ id -> pay_NaN cokmesi onlenir). + idempotency (2. cagri JSON-snapshot ayni = no-op).
- tests/validate.test.js (13): validateBeforeSave errN sayaci — bos pay=5 hata (id/name/amount/date/groupId), id=null 1, amount string 1, amount NaN 1, groupId '' 1, id=0 GECERLI (0 hata); bos cred=3 (monthly NaN dahil); bos person=2; koleksiyonlar-arasi toplam=10. Mutate ETMEZ, yalniz sayar.
- tests/store.test.js (18): mutation API (push/unshift/spliceAt-donus/mutateItem/replace); REGRESYON v8.175 removeWhere index-predicate (eski bug: filter(x=>!pred(x)) tek-arg -> i=undefined -> hicbir sey silinmezdi; fix filter((x,i)=>!pred(x,i)); test Set([1]) ile ortadaki index siler + coklu Set([0,2])); lookup findPayById (String normalize + null), findPaysByGroup (groupId; YOKSA String(Math.floor(Number(id))) fallback), findCredById; mutation sonrasi invalidation (yeni kayit gorulur, silinen null); hydrate+clearAll SILENT (window.saveSecure vi.fn() cagrilMAZ) ama push autoSave cagirir (1x); tx batch (3 push -> 1 save, finally); window setter koprusu (window.pays=X -> dirty=true ama autoSave YOK).

MUTASYON DOGRULAMASI (kalkan gercekten yakaliyor mu): store.js v8.175 fix'i geri alindi (removeWhere (x,i) -> x) -> TAM ve YALNIZ 2 index-predicate testi kirildi (element-predicate + diger 16 gecti) -> kalkan hassas, yanlis-pozitif yok. Orijinal geri yuklendi (node --check PASS), 80/80 tekrar yesil.

TEKNIK NOT (test izolasyonu): integrity/validate testleri Store IMPORT ETMEZ -> window.pays vb. duz veri property'si, fonksiyonun KENDI mantigi sinanir. store.test.js Store'u import eder, beforeEach Store.clearAll + window.saveSecure=vi.fn(); vitest dosya-bazli izolasyon (her .test.js ayri context) -> window.* cakismasi yok. config clearMocks/restoreMocks zaten acik.

DOGRULAMA (sandbox): npm test -> Test Files 5 passed, Tests 80 passed (36 mevcut etkilenmedi + 44 yeni). node --check store.js PASS. Mojibake yok.

VERSION: v8.200 / 20260530-03 (version.json + index.html APP_VERSION/APP_BUILD + package.json 8.200.0). SW cache bump GEREKMEZ (tests/ PWA'da cache'lenmez, sw.js STATIC degismedi). Yeni dosyalar tests/ altinda -> sw.js'e EKLENMEZ (v8.198'de de eklenmemisti).

BUKET ICIN (PowerShell + Indirilenler akisi): Patch zip 3 YENI dosya (tests/integrity.test.js, tests/validate.test.js, tests/store.test.js) + 3 DEGISEN (index.html, version.json, package.json) + 2 DOK (CLAUDE.md, DEVAM_NOTU.md). node_modules .gitignore'da -> commit'e girmez (CI yukler). Lokalde test kosturmaya GEREK YOK (kural: sandbox/CI). Push -> Actions: Auto Tag (v8.200-20260530-03) + Tests (80/80 yesil olmali, actions sekmesinden dogrula). Bu surum SAHA-TEST GEREKTIRMEZ (UI/runtime degismedi); CI yesili yeterli.

OTURUM HIJYENI: Faz A bitti, 80/80 yesil (CI sonrasi v8.200 = test-korumali baseline). Faz B (cakisma shouldBlock) AYRI is, RUNTIME degisir + saha-test ister -> kullanici karari. Devam edilecekse ayni sohbette surdurulebilir; konu degisirse yeni sohbet.

---


DEVAM_NOTU #3 (tek seferlik guvenlik kontrolu). Hedef: her kullanici yalniz kendi verisine erisebilmeli (rol DEGIL).

BULGU (Firebase Console, proje iskenderpay-a23d1, Firestore > Rules, aktif kural 18 May 2026):
  match /{document=**} { allow read, write: if request.auth != null && request.auth.token.email == "uzuniskender@gmail.com"; }
VERDIKT: GUVENLI (PASS). Kural ACIK DEGIL (if true yok). Tum dokumanlara erisim "giris VE email == uzuniskender@gmail.com" sartina bagli; email Google dogrulamali kimlik jetonundan -> taklit edilemez. Baska Google hesabi reddedilir; girissiz reddedilir. Kimlik-bazli (rol-bazli DEGIL). wrappedKey/pinHash baskasinca okunamaz -> cevrimdisi PIN brute-force kapali; vandalizm/DoS kapali.

KARAR: KURAL DEGISTIRILMEDI. Onceki oturumda onerdigim uid-onek kurali (users/{docId} docId baslangici uid+'_') aslinda DAHA GEVSEK olurdu cunku HERHANGI bir Google kullanicisinin giris yapip kendi verisini olusturmasina izin verirdi. Email-kilidi uygulamayi TEK hesaba kapatir (kimse giris bile yapamaz) -> kisisel/tek-kullanici app icin daha siki ve daha dogru. Tek-kullanici teyidi: Authentication > Users'ta yalniz 1 kayit (uzuniskender@gmail.com, Google, uid hTvBT4ab3GZQRtikksQygWxlssw1).

DIKKAT (kaygi degil): email sabit yazili -> Google e-postasi degisirse veya ikinci hesap/kullanici eklenirse kural elle guncellenmeli. Eklenecekse defense-in-depth: email sartina ek olarak docId onek-sahipligi (uid+'_') eklenebilir.

KAYIT: Aktif kural repoya `firestore.rules` olarak yazildi (KAYIT AMACLI; GitHub Pages deploy ETMEZ; aktif kural Console'da). Veri modeli notu dosyada.

VERSION: DEGISMEDI (v8.199 / 20260530-02). Yalniz dokuman + record dosyasi. SW/cache etkisi yok.

OTURUM HIJYENI: #3 dogrulandi (PASS), aktif acik is YOK. Stack raporu maddeleri #2/#3/#7 kapandi. -> YENI SOHBET.

---

## 2026-05-30 — #2 SYNC CAKISMA (hafif): cakisma bekcisi + odak/online pull (v8.198 -> v8.199) — SAHA-TEST PASS, baseline v8.199-stable
SAHA-TEST SONUCU (30 May, gizli sekme): 1 regresyon (tek cihaz normal kayit, false-toast yok) PASS; 2 odak-pull (B'ye gecince aninda cekti) PASS; 3 cakisma uyarisi (konsol `Store.lastUpdated=1` -> bayat baseline -> kaydet -> SARI UYARI SERIDI cikti + eklenen satir buluttaki haline dondu) PASS; 4 offline ayni `_fbSave`->conflict kod yolu (ayrica staj gerekmez). #2 KAPANDI.

DEVAM_NOTU #2 (ikincil bosluk). Tam-dokuman LWW'de iki cihazda araklı düzenleme ikinci kaydedenin ilkini SESSIZCE ezmesini onler.

SORUN (gunluk dil): uygulama iki bilgisayarda acik. Kaydedince TUM sifreli blob buluta gidip oradakini degistirir. Bir cihaz bayat kopyayla kaydederse digerinin (gormedigi) degisikligini ezer — habersiz veri kaybi. Ek: tA/tB farkli makine saatlerinden -> siralama saat kaymasina hassas.

KARAR: Kullanici "sen sec / basit anlat" dedi -> Secenek #2 secildi (tazeleme + bekci). #1 (sadece pull) nadir es-zamanli kaybi yakalamaz; #3 (Yenile/Uzerine Yaz modali) tek-kullanici/iki-makine icin fazla. #2 = gundelik koruma + hicbir seyi habersiz atmama.

DEGISIKLIK (3 dosya, tek render-set kaynagi):
- firestore.js `_fbSave` = compare-and-swap. base=Store.lastUpdated (en son bildigimiz UZAK updatedAt). base>0 ve uzak updatedAt > base ise baska cihaz bizden sonra yazmis -> {conflict, remote, remoteTs} (YAZMAZ). Degilse setDoc + {ok, updatedAt}. fbUid yoksa {skipped}. Baseline ARTIK uzak doc'un updatedAt'i (Date.now degil) -> saat kaymasi-dayanikli (ayni alanin degeri karsilastirilir). Read-then-write mikro-yarisi tek-kullanici icin ihmal (tam atomiklik runTransaction; "hafif" kapsam disi). Okuma hata verirse eski davranisa don (yine yaz; veri kaybetme).
- persist.js `_doSave` yapilandirilmis donusu isler: ok -> lastUpdated=res.updatedAt (skew-safe), fbSyncNeeded=false. conflict -> uzeri YAZMA, lastUpdated=res.remoteTs, fbSyncNeeded=false (bayat blob poll'da push edilmez), `applyRemote(res.remote)` ile uzak veriyi yukle + setSyncDot('synced') + showWarnToast("baska cihazda degisiklik, son degisikligini tekrar yap"). hydrate silent + dirty finally'de temizlenir -> discard edilen local edit tekrar push edilmez.
- sync.js: `applyRemote(encData)` cikarildi = decrypt+hydrate+render(render/persons/notes/rhb/actLog), DIRTY GUARD YOK (cagiran yonetir). realtime callback artik onu kullanir (dirty/hasKey guard'lari callback'te kaldi). `_attachFocusHooks` (modul-flag, bir kez): visibilitychange(visible)/window focus/online -> aninda _fbPoll(). _fbPoll zaten dirty/saveTimer/_pollRunning guard'li -> odak-pull guvenli, ucustaki local edit'i ezmez. window.applyRemote export.
- firestore.js `_fbPoll` offline-retry (fbSyncNeeded) kolu da conflict donusunu isler: cevrimdisi edit gonderilemezse uzak veriyi al (applyRemote) + uyar; bayat blob'u push etme.

POLITIKA: Cakismada UZAK (gorulmeyen) veri korunur; bu cihazdaki kaydedilmemis son edit uyariyla degisir. "Local kazansin" istenirse #3 (modal) ileride. Tradeoff DEVAM'a not edildi.

DOGRULAMA (sandbox): node --check sync/firestore/persist PASS, mojibake yok. npm test 36/36 (mevcut util/hesap testleri etkilenmedi). Conflict mantigi unit-test'siz — Firestore getDoc/setDoc mock gerektirir; istenirse pure `shouldBlock(remoteTs, base)` cikarilip test edilebilir (simdilik atlandi, hafif tutuldu).

SAHA-TEST (gizli sekme + cache temizle; iki sekme/cihaz gerekir):
1. (regresyon) Tek cihaz: odeme/kredi ekle-duzenle -> normal kaydeder, sync dot calisir, cakisma toast'i CIKMAZ.
2. (odak-pull) A ve B sekmesi acik+senkron. A'da bir kayit ekle, kaydet (sync dot 'synced'). B sekmesine GEC (focus) -> B 30sn beklemeden ~birkac sn icinde A'nin degisikligini cekmeli (pull on focus).
3. (cakisma) A ve B acik+senkron. A'da bir kayit ekle, kaydet. B'de (A'nin yazisini B poll etmeden once) farkli bir kayit ekle -> B'nin kaydi CAKISMA tespit etmeli: uzeri yazMAMALI, A'nin verisini yuklemeli + sari uyari toast ("baska cihazda degisiklik..."). A'nin eklemesi B'de gorunmeli; B'nin son edit'i kaybolur (toast ile bildirilir, sessiz degil).
4. (offline) B'yi cevrimdisi yap, bir kayit ekle (fbSyncNeeded olur). A'da baska kayit ekle+kaydet. B'yi online yap -> B'nin offline edit'i gonderilemez (cakisma): A'nin verisi yuklenir + uyari. Veri kaybi yok (A korunur).

VERSION: v8.199 / 20260530-02 (version.json + index.html + package.json 8.199.0). SW cache bump: js network-first -> GEREKMEZ.

BUKET ICIN: Patch zip + duzeltilmis PS akisi (git rev-parse ile repo otomatik, & { } sarmali return calisir). Push -> Actions: Auto Tag (v8.199-20260530-02) + Tests (36/36).

OTURUM HIJYENI: saha-test PASS -> baseline v8.199-stable ilan edildi. Aktif acik kod isi YOK -> YENI SOHBET. Sonraki dusuk-oncelik: #3 "kendi-uid Firestore kurali" dogrulamasi (rol degil) — tek seferlik kontrol.

---

## 2026-05-30 — #7 OTOMATIK TEST ALTYAPISI KURULDU (v8.197 -> v8.198) — 36/36 YESIL (sandbox)
DEVAM_NOTU #7 (stack raporunun tek yuksek-getirili maddesi) tamam. iskenderpay'e vitest kuruldu, hesap.js + util.js birim testleri yazildi.

NE YAPILDI:
- Stack: vitest 2.1 + happy-dom 15 (jsdom'dan hafif, CI'da hizli). environment=happy-dom cunku hesap.js modul yuklenirken `window.Hesap=Hesap` set ediyor ve util.js esc() document kullaniyor.
- YENI DOSYALAR: package.json (type:module, devDeps vitest+happy-dom, scriptler test/test:watch/test:ui), vitest.config.js (include tests/**/*.test.js, globals:false), .gitignore (node_modules/coverage), tests/_helpers.js, tests/util.test.js, tests/hesap.test.js, .github/workflows/test.yml.
- _helpers.wireGlobals(): compat.js PARITESINDE gercek util.js fonksiyonlarini (toTRY/parseLocalDate/isOD/todayMidnight) window'a baglar -> testler stub degil GERCEK uretim davranisini sinar (asil regresyon kalkani amaci). TEST_RATES EUR=50/GOLD=6000 (yuvarlak, zihinden dogrulanir).
- tests/util.test.js (15): toTRY (TRY/EUR/GOLD/rate-eksik fallback/USD ham), parseLocalDate (UTC kaymasi yok), todayMidnight (00:00:00.000), isOD (paid/gecmis/gelecek/bugun/status-yok/partial).
- tests/hesap.test.js (21):
  * Hesap.kalan: currency yok (amount-paid), paid yok=0, asiri odeme 0-kirpma, TRY, EUR (x50 sonra TRY paid dusulur), GOLD (x6000), amount null.  -> v8.170 "kalan tek-kaynak" kalkani.
  * toplamOzeti: pays odenmis-haric + partial + FX; cred nested partial; toplam. Bos=0. Hepsi-odenmis=0.
  * krediler: paid/total/remaining/pct/bekleyen/overdueCount/nextPay/nextDays/lastDate/done. buildMx yok -> dispName _baseOf(name) fallback ("QNB 1"->"QNB"). Tamamen-odenmis kredi. Bos liste.
  * trend: son 3 ay eskiden yeniye, pencere disi elenir, monthKey YYYY-MM. EUR kalemi ham DEGIL toTRY (x50); paid set ise paid kullanilir (toTRY DEGIL). -> v8.192/193 FX gosterim kalkani.
  * buAyOzeti: refDate ENJEKTE edilebilir (deterministik) -> ay filtre + ok/bek/gec + FX.
- CI: .github/workflows/test.yml her push + PR'da node22 -> npm install -> npm test. auto-tag.yml DOKUNULMADI (deploy/tag akisi aynen).

KARARLAR:
- PRE-PUSH HUSKY EKLENMEDI. Kural: "build/test claude.ai sandbox'ta kosar, makinemde degil". Husky pre-push Buket'in makinesinde vitest kosturur -> kurala ters. Dogru baglama = CI (sandbox-only ile uyumlu). DEVAM_NOTU #7 zaten "pre-push VEYA CI" diyordu; CI secildi.
- Testler GERCEK util fonksiyonlariyla (stub degil) -> uretim davranisi degisirse test yakalar.

DOGRULAMA (sandbox):
- npm test -> Test Files 2 passed, Tests 36 passed (36). 
- MUTASYON TESTI: hesap.js kalan() 0-kirpmasi kaldirildi -> TAM ilgili 2 test kirildi (asiri-odeme + amount-null), gerisi gecti, dosya gecerli kaldi -> kalkan gercekten yakaliyor. Orijinal geri yuklendi (node --check PASS).
- node --check hesap.js/util.js PASS, mojibake yok.

VERSION: v8.198 / 20260530-01 (version.json + index.html APP_VERSION/APP_BUILD + package.json 8.198.0). SW cache bump GEREKMEZ (runtime davranisi degismedi; yalniz test + version sabitleri).

BUKET ICIN SONRAKI ADIM (PowerShell + Indirilenler akisi):
1. Patch zip'i indir, repo koklasorune Expand-Archive -> dosyalari tek tek Copy-Item (yeni: package.json, vitest.config.js, .gitignore, tests/, .github/workflows/test.yml; degisen: index.html, version.json, CLAUDE.md, DEVAM_NOTU.md).
2. node_modules .gitignore'da -> commit'e GIRMEZ (CI yukler). Lokalde test kosturmana GEREK YOK (kural geregi sandbox/CI kosar).
3. git add -A; git status (yeni 7 dosya + degisen 4 gormeli); commit; push.
4. Push sonrasi GitHub Actions iki workflow kosar: "Auto Tag" (v8.198-20260530-01 tag) + "Tests" (36/36 yesil olmali — actions sekmesinden dogrula).
5. Indirilenler temizle.
NOT: Bu surum saha-test gerektirmez (UI/runtime degismedi); CI yesili yeterli. Baseline v8.198 = yesil + test korumali.

OTURUM HIJYENI: #7 kapandi, baseline yesil -> YENI SOHBET. Sonraki dusuk-oncelik: #2 sync conflict (hafif) + #3 "kendi-uid Firestore kurali" dogrulamasi (rol degil).

---

## 2026-05-29 — STABILIZASYON: v8.197-stable baseline (saha-test 7/7 + v8.195/196/197 PASS)
Bu oturumdaki TUM isler saha-test PASS. Stabil baseline ilan edildi.

SAHA-TEST PASS OZETI:
- v8.187-193 sprint: 7/7 adim PASS (session, sekme/olu-kod, Log odeme-duzenle, Log silinenler, kisi ozet etiket, arama FX, bos/odenmis ay).
- v8.194: cift-v kozmetik (Ayarlar surum metni) — canli dogrulandi.
- v8.195: Pass 4 actLog groupId backfill — BERKAY BIRINCI DV panelinde AKTIVITE GECMISI gorundu (ACIK HATA #3 kapandi).
- v8.196: (A) backfill uid+planId guard — konsolda "[backfill] atandi" tekrari yok; (B) ⚠️ gostergesi kaldirildi — Plan matrisi temiz (ACIK HATA #5).
- v8.197: Kisiler'de olmayan isimle odeme/kredi kaydi SERT ENGEL — test PASS (kayitsiz isim reddediliyor, eklenince geciyor).

BASELINE: v8.197 / 20260529-37 — TAM YESIL. Aktif acik kod isi YOK.

SONRAKI OTURUM — ILK IS: #7 Otomatik test altyapisi (stack analizi raporunun gercekten gecerli tek yuksek-getirili maddesi).
Hedef: iskenderpay'e vitest kur + hesap.js birim testleri (kalan / odenen / toTRY / trend / Hesap.kalan). Bu oturumda hesap.js'te bulunan tutarsizliklar (v8.170 kalan tek-kaynak, v8.192/193 FX gosterim) tam da test yazilmasi gereken alanlar — regresyon kalkani.
NOT (stack raporu degerlendirmesi): rapordaki #1 merkezi state / #6 audit log / #4 service layer / #10 CI-CD ZATEN VAR; #3 "rol bazli" ve #9 backend API uygulamaya yersiz/ters (tek-kullanici, E2E sifreli, offline-first). Gercek bosluk: #7 (test), ikincil #2 (sync conflict, hafif) ve #3'u "kendi-uid Firestore kurali" olarak (rol degil) bir kez dogrulamak.

OTURUM HIJYENI: Baseline yesil -> YENI SOHBET. Yeni sohbette once DEVAM_NOTU.md + CLAUDE.md oku, #7 ile basla.

---

## 2026-05-29 — Kisiler'de olmayan isimle kayit SERT ENGEL (v8.196 -> v8.197) — KOD TAMAM, saha-test BEKLIYOR
KULLANICI ISTEGI: "isim listesinde olmayan birinin kaydinin yapilmasini istemiyorum." Pasif uyari (v8.137 ⚠️, v8.196'da kaldirilmisti) + savePay soft toast kacirilabiliyordu -> sert engele cevrildi.
FIX (ui-pay.js, savePay + saveCred): _resolvePersonId null donerse (isim Kisiler'de yok) kayit REDDEDILIR — alert "once Kisiler'e ekleyin" + return.
KAPSAM (grandfather): engel yalniz YENI kayit VEYA isim degisiminde. Mevcut kayitsiz bir kaydin (isim ayni) tutar/tarih duzenlemesi gecer — eski veriyi tuzaga dusurmemek icin. Yeni orphan kayit (Kisiler'e bagli olmayan odeme/kredi) artik olusturulamaz.
NOT: showWarnToast (modal.js) artik cagrilmiyor; reusable primitif + #warn-toast DOM/CSS mevcut oldugundan bilerek korundu (ileride toast gerekirse). Tek dosya degisti (ui-pay.js).
node --check PASS, mojibake yok. SW cache bump GEREKMEZ.
TEST (gizli sekme + cache temizle):
1. Yeni odeme ekle, isim alanina Kisiler'de OLMAYAN bir ad yaz (orn TESTXYZ) -> kaydet -> ALERT cikip kayit YAPILMAMALI. Plan'da TESTXYZ gorunmemeli.
2. Ayni adi once Kisiler'e ekle, sonra ayni odemeyi tekrar dene -> kayit GECMELI.
3. Kredi icin de ayni (1) ve (2).
4. Mevcut (Kisiler'de olan) bir kaydi normal ekle/duzenle -> sorunsuz.
5. (grandfather) Eger elde Kisiler'de olmayan ESKI bir kayit varsa, ismini degistirmeden tutarini duzenle -> gecmeli (engel yalniz isim degisince).

---

## 2026-05-29 — (A) backfill ardisik-tetik fix + (B) ⚠️ gostergesi kaldirildi (v8.195 -> v8.196) — KOD TAMAM, saha-test BEKLIYOR
v8.195 saha-test PASS (BERKAY BIRINCI DV panelinde AKTIVITE GECMISI gorundu — ACIK HATA #3 kapandi). Bu oturumda iki housekeeping daha:

(A) app.js#enterApp — backfill ardisik-tetik fix:
SORUN: _backfillPersonIds her enterApp'ta kosuyordu (.then(_backfillPersonIds)). migrateToV7 kendi localStorage guard'iyla (v7-migrated-{uid}-{plan}) bir kez kossa da backfill .then'i her seferinde calisiyordu -> konsol "[backfill] 5 atandi" x3.
FIX: _backfilledFor = uid+planId modul-local guard (migrateToV7 migKey deseni). Ayni yuk icin bir kez. Plan degisiminde planId degisir -> yeni planda yine kosar (selectPlan clearAll yapar); ayni plana donuste kayitli veri zaten backfilled -> no-op. Idempotency artik tetik-sayisindan bagimsiz.

(B) hesap.js#_displayNames — ⚠️ gostergesi kaldirildi (ACIK HATA #5 karari):
KARAR: v8.137'de eklenen personId'siz pay satirlarina ⚠️ ekleme KALDIRILDI. Pass 2 backfill her acilista isimle personId atar; geriye ⚠️ alan satirlar cogunlukla Kisiler'de kaydi olmayan odeme alicilari (kasitli/normal durum, hata degil). Normal veriyi her matris satirinda "sorunlu" gibi isaretlemek gurultuydu. Tek kullanim yeriydi, baska tuketici yok. Gercek veri-kalite denetimi istenirse ayri gorunum konusu.

node --check PASS (app.js + hesap.js), mojibake yok. SW cache bump GEREKMEZ (js network-first).
TEST (gizli sekme + cache temizle):
1. (A) Konsol: acilista "[backfill] ... atandi" en fazla 1 kez gormeli (onceden 3x). Plan1<->Plan2 gecisinde yeni planda 1 kez daha olabilir (beklenen).
2. (B) Plan matrisinde satir isimlerinde ⚠️ gorunmemeli (personId'siz/kayitsiz alici satirlari dahil temiz isim).

---

## 2026-05-29 — Pass 4 actLog groupId backfill (v8.194 -> v8.195) — KOD TAMAM, saha-test BEKLIYOR
ACIK HATA #3 kapaniyor. app.js#_backfillPersonIds'a Pass 4 eklendi.
SORUN: eski actLog entry'leri groupId tasimiyordu -> DV detay paneli + openCell grup-history (actLog.filter(e=>e.groupId===gid)) bazi hucrelerde bos.
COZUM: v8.148 Pass 3 (personId) pattern'i groupId icin klonlandi. baz isim (detail ilk segment) -> groupsByBase Map (base -> Set<groupId>).
KRITIK KISIT: atama YALNIZ ismin tek grubu varsa (gset.size===1). Coklu grup (QNB Kira+Elektrik) -> isimden hangisi belli degil -> ATLA. Yanlis atama riski yok.
SKIP: rhb_*, cred_add, ' taksit' iceren, isimsiz, zaten groupId'li (idempotent). Self-cleaning.
HARNESS DOGRULANDI: AHMET (tek grup) -> g1 atandi; QNB (2 grup) atlandi; taksit/rhb/cred/grup-yok/isimsiz/mevcut atlandi.
node --check PASS, mojibake yok. SW cache bump GEREKMEZ (js network-first).
TEST (gizli sekme): coklu kaydi olan tek-gruplu bir kisi/grubun DV detay panelini (satira tikla) ve hucresini ac -> alt history bolumu eski entry'leri de gostermeli (onceden bos olabilirdi). Coklu gruplu isimde (QNB) degisiklik beklenmez (guvenli atlama).
NOT: actLog'da groupId hic tasimayan ve adi coklu-gruplu olan eski entry'ler hala history'de gorunmez (kasitli — ambiguous). Tam cozum icin entry'ye uretim aninda groupId yazilmasi gerekir (v8.146 sonrasi yeni entry'ler zaten tasiyor).

---

## 2026-05-29 — SPRINT KAPANIS (v8.193 -> v8.194): saha-test 7/7 PASS + cift-v kozmetik
Bu oturumun ve onceki bekleyen patch'lerin saha-testi TAMAMLANDI. v8.187-v8.193 araliginda "saha-test BEKLIYOR" olan her sey artik PASS.

SAHA-TEST SONUCLARI (gizli sekme + cache temizle, canli v8.193/34 uzerinde):
1. Session hardening (v8.187): window.Store.session=undefined ✓; debugState Session tablosu cryptoKey:true + plainPinLen:6 (sir yok) ✓ — PASS
2. Sekme gecisleri + olu kod (v8.188): gecisler temiz; window.renderPaid/renderHist=undefined ✓ — PASS
3. Log odeme duzenle (v8.189): Log>Odemeler>Duzenle ledger aninda guncelleniyor ✓ — PASS
4. Log Silinenler (v8.188): Duzenle/GeriAl/Sil/Tumunu temizle aninda yeniliyor ✓ — PASS
5. Kisi ozet etiketleri (v8.190): coklu grup breakdown ayirt edilebilir ✓ — PASS
6. Global arama FX (v8.192+v8.193): "suleyman" -> ₺254.608 38,00gr / ₺310.987 €5.820,00 (TRY karsiligi + orijinal rozet) ✓ — PASS
7. Bos/odenmis ay sutunlari (v8.190 mantik): gizleniyor, Odendiler toggle ile geri ✓ — PASS

v8.194 (bu kapanis commit'i): version.js cift-v kozmetik — "Guncel surumdesiniz (vv8.192)" -> APP_VERSION zaten v'li, ekstra v kaldirildi. Bonus: d.v gosterimleri (Yeni surum mevcut / banner) v-prefix tutarli hale getirildi. Salt metin, davranis degisikligi yok.

TASARIM KARARLARI (bu oturum, kapali):
- Arama FX gosterimi: "TRY karsiligi + orijinal doviz kucuk rozet" hali KORUNDU (sadece-orijinal'e gecilmedi — kullanici onayladi, matris paritesi).

BASELINE: v8.194 / 20260529-34 — tam yesil. Aktif acik kod isi YOK. Backlog (DEVAM_NOTU bolum 4 + ACIK HATALAR): Pass 4 groupId backfill (DV history bos hucreler), personId ⚠️ gostergesi karari, openCell istatistik veri yetersizligi — hicbiri acil degil.

OTURUM HIJYENI: Sprint bitti + baseline yesil -> SONRAKI KONU/IS ICIN YENI SOHBET. Yeni sohbette once DEVAM_NOTU.md + CLAUDE.md oku, kaldigin yerden surdur.

---

## 2026-05-29 — search.js FX gosterimi matris paritesi (v8.192 -> v8.193) — KOD TAMAM, saha-test BEKLIYOR
SAHA-TESTTE YAKALANDI (adim 6): kullanici "suleyman" aradi -> 38 gr altin "₺38", 5820 EUR "₺5.820" gosteriliyordu.
KOK NEDEN: v8.192 yalniz paidItems (Gerceklesen Odeme) TRY cevrimini duzeltti; ama (1) PLAN ODEMESI (pays) blogu HIC dokunulmamisti, hala ham amount'a duz ₺; (2) paidItems'ta orijinal doviz rozeti yoktu.
FIX (tek dosya, iki blok): ikisi de Plan matrisi paritesine alindi -> ana deger `fmt(toTRY(amount,currency))`, currency!==TRY ise yaninda kucuk rozet `fmtA(amount,currency)`.
Ornek dogrulama (GOLD=6700, EUR=53.43): 38 GOLD -> "₺254.608 38,00gr"; 5820 EUR -> "₺310.987 €5.820,00"; 20000 TRY -> "₺20.000" (rozet yok).
KORUNDU: arama eslesme kosulu + count hala ham amount (kullanici orijinal tutari arar); krediler blogu zaten currency:'TRY' normalize (matris L8), dokunulmadi.
ACIK TASARIM SORUSU: kullanici "olmasi lazim" derken belki SADECE orijinali (₺ olmadan) istiyordu; uygulama geneli "TRY ana + orijinal kucuk" paritesi oldugundan o secildi. Kullanici sadece-orijinal isterse fmtA tek basina (tek satir degisiklik).
SW CACHE bump GEREKMEZ. node --check PASS, mojibake yok.
TEST (gizli sekme): Ayarlar > Ara -> doviz/altin cinsli bir plan odemesi ara -> "₺<TRY karsiligi> <orijinal>" gormeli (ham yabanci tutara ₺ degil).

---

## 2026-05-29 — search.js odeme tutari tutarliligi (v8.191 -> v8.192) — KOD TAMAM, saha-test BEKLIYOR
v8.189 capraz-tutarlilik zincirinin SON TUKETICISI kapandi. KALAN ISLER eski #1 (search.js).
KOK NEDEN: execGlobalSearch paidItems sonucunda odeme tutarini ham `pi.amount` ile basiyordu
-> (1) Log duzenlemesini (savePaidItem -> p.paid) yok sayiyor, (2) FX kaleminde yabanci tutari ₺ ile yanlis gosteriyordu.
FIX (tek dosya): log.js/hesap.js `paidOf` paritesi -> `tryAmt = pi.paid != null ? pi.paid : toTRY(pi.amount, pi.currency||'TRY')`.
KORUNDU: arama eslesme kosulu + count HALA ham pi.amount uzerinde (kullanici orijinal fatura tutarini arar — kasitli).
Artik dort tuketici paritede: search / log (paidOf) / hesap (trend) / ui-persons (_buildPersonSummary).
SW CACHE bump GEREKMEZ (search.js network-first/no-store; STATIC liste degismedi). node --check PASS, mojibake yok.
TEST (gizli sekme): Ayarlar > global arama -> FX'li bir gerceklesen odemeyi ara -> TRY karsiligi gosterilmeli (yabanci tutar degil);
Log'dan tutari duzenlenmis bir odemeyi ara -> duzenlenen deger gorunmeli.

---

## 2026-05-29 — DEPLOY DUZELTME (v8.190 -> v8.191): log.js gercekten gonderildi
v8.190 paketinde log.js Downloads'ta bulunamadigi icin commit'e GIRMEMISTI (repo v8.190 diyordu ama Log odeme-duzenle fix'i [v8.189 paidOf] canlida yoktu). v8.191 = ayni log.js fix'i + dürüst versiyon etiketi + #4 bayat 'db.js' yorum referanslari temizligi (store.js:40/48, app.js SYNC UI header, index.html flag yorumu -> gercek sahip: persist.js/firestore.js/store.js). Dogru tarihsel referanslar (firestore/persist/auth-pin 'db.js'ten ayristirildi') korundu. Runtime degisikligi yok (yorumlar).

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
4. ✅ KAPANDI (v8.191): bayat `db.js` yorum referansları gerçek sahibine yönlendirildi (store.js/app.js/index.html). Doğru tarihsel referanslar korundu. (firebase.js:74 zaten önceki temizlikte gitmişti.)

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
| **`v8.197-stable`** _(öneri)_ | `(push sonrası tag)` | Bu oturum tam yeşil: sprint v8.187-193 + Pass4 groupId backfill + backfill guard + ⚠️ kaldırma + kayıt sert engel. Tüm saha-test PASS. |
| **`v8.166-stable`** _(önceki)_ | `c08ddd7` | En zengin baseline. UX dalgası (boş ay gizleme + kişi özet + cred→DV + delegation) v8.160 üzerinde. |
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
