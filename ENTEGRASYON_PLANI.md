# ENTEGRASYON PLANI — Tek Altyapı (ITP-WO-2026-002)

_Belge No: ITP-WO-2026-002 · Tarih: 30.05.2026 · Kaynak: kullanıcı tarafından sağlanan iş emri PDF'i_
_Durum: **ERTELENDI (SONRA)** — bkz. Karar bölümü. Maddeler bağımsız uygulanabilir._

## Amaç
İki uygulamayı (Özler UYS v3 — React/TS/Supabase; iskenderpay — Vanilla JS/Firebase/PWA) **tek programa
birleştirmek DEĞİL**; tek altyapı (tek Supabase + tek Auth + tek test + tek CI + tek monorepo) altında,
**verileri kesin ayrı tutarak** tek yerden yönetmek. Kod tabanları ayrı kalır (iskenderpay'i React'e
yeniden yazmak kapsam dışı). Ortak olan altyapıdır, kod değil. İki uygulama da aynı Google kimliğine
(uzuniskender@gmail.com) dayanır → tek-Auth doğal.

## Yapılacaklar (özet) ve fazlar

**Faz A — Monorepo + tek test + tek CI (düşük risk, backend'e dokunmaz):**
- EW-01 Monorepo (npm/pnpm workspaces): `ozler-platform/` → `apps/uys`, `apps/iskenderpay`, `packages/shared`.
- EW-02 Tek test: iskenderpay'i vitest 3'e yükselt; kök `vitest.workspace.ts` (UYS=node, iskenderpay=happy-dom).
- EW-03 Tek CI/CD: kök `.github/workflows` tek pipeline; her push iki app'i build+test; deploy app-bazlı job.

**Faz B — Tek Supabase'e geçiş (KOŞULLU — yalnız "tek Supabase" kesin şartsa):**
- EW-04 Tek Supabase, şema ile izolasyon: `ipay` şeması (veya `ipay_` prefix); UYS verisine dokunma; ayrı RLS + grant.
- EW-05 iskenderpay Firebase → Supabase Auth göçü (`signInWithOAuth google`; `Store.fbUid` → Supabase `auth.uid`).
- EW-06 `ipay_vault` + `ipay_meta` tabloları; `firestore.js`/`persist.js` Supabase'e; crypto/session/store/hesap + UI aynen.
  - `ipay_vault(user_id uuid, plan_id text, enc_data text, updated_at bigint, pin_hash text)`
  - `ipay_meta(user_id uuid, wrapped_key text)` · RLS: `auth.uid() = user_id`
  - **E2E korunur:** Supabase yalnız `enc_data` ciphertext'ini görür (Firebase gibi). crypto.js/session.js DEĞİŞMEZ.
- EW-07 Firebase'i emekliye ayır (önce salt-okunur yedek, sonra kapat).

**Faz C — Ortaklaştırma:**
- EW-08 `packages/shared`: ortak Supabase client fabrikası, env şeması, tipler, test helper'ları.
- EW-09 Test izolasyon deseni (UYS'in `test_run_id` Proxy enjeksiyonu) `shared`'a; iskenderpay entegrasyon testleri de kullansın.

## Karar (30 May 2026) — ERTELENDI
Bugünkü iş saha-test otomasyonu (Katman 1–3). Entegrasyon ayrı, günlere yayılan bir girişim. Gerekçe:

1. **Faz A:** düşük teknik risk ama bir **workflow değişikliği** — mevcut tek-repo + PowerShell/İndirilenler patch akışını ve GitHub Pages deploy'unu değiştirir; vitest 2→3 yeni-yeşil suite'e churn ekler. Kendi odaklı oturumunu hak eder.
2. **Faz B koşulludur:** planın kendisi "yalnız 'tek Supabase' şartı kesinse gereklidir" diyor. Blast-radius: tek Supabase+Auth = tek arıza noktası (şu an Firebase çökse UYS ayakta). Bilinçli karar olmalı.
3. **Faz B'de planın hafife aldığı KRİTİK TEHLİKE — veri kilitlenmesi (must-fix before B):**
   - `crypto.js#getSaltAsync(key)`: `salt_kaynağı = PBKDF2(uid + key)`, `uid = Store.fbUid` (Firebase UID).
   - Bu salt **pinHash**'i (PIN doğrulama) VE PIN→KEK türevini (yani **wrappedKey**'i çözen anahtarı) besler.
   - EW-05'te auth Firebase→Supabase olunca `Store.fbUid` = Supabase `auth.uid` (FARKLI değer) → salt değişir →
     **eski wrappedKey açılamaz + pinHash tutmaz → kullanıcı kendi şifreli verisine KİLİTLENİR.**
   - Plan "PIN→wrappedKey aynen kalır, iki tablo, düşük risk" derken kolay kısmı (blob'un yeni adresi) doğru,
     **zor kısmı (kripto-kimliğin yeniden bağlanması) atlıyor.** Çözüm seçenekleri (göçten ÖNCE tasarlanmalı):
     - (a) **Tek-seferlik re-wrap migrasyonu:** her iki UID de bilinirken eski salt'la çöz → yeni salt'la sar →
       pinHash yeniden hesapla (veri hâlâ çözülebilirken, geçiş penceresinde).
     - (b) **Kripto-namespace UID'sini sabitle:** auth kimliğini salt kimliğinden ayır; eski Firebase UID'sini
       sabit bir kripto-namespace değeri olarak tut.

## Önerilen sıralama (uygulanırsa)
- **Faz A** ayrı oturum: vitest yükseltmesi dikkatle test edilerek, patch/deploy akışı yeniden tasarlanarak.
- **Faz B** ancak: (1) "tek Supabase" kesin şartsa, (2) yukarıdaki kripto-kimlik re-wrap'i tasarlandıysa,
  (3) mevcut sağlamlaştırma (v8.199–202) sahada oturmuşsa. Firebase bir süre salt-okunur yedek.
- **Faz C** B'den sonra doğal olarak gelir.

## Açık soru (kullanıcıya)
"Tek Supabase" kesin bir şart mı, yoksa "tek koordinasyon + tek test" (Faz A) yeterli mi? Bu cevap B'nin hiç
gerekip gerekmediğini belirler.

## Korunacaklar (her durumda değişmez)
iskenderpay E2E şifreleme (backend yalnız ciphertext görür) · crypto.js/session.js closure-tabanlı sır saklama ·
PIN→wrappedKey akışı · offline-first (blob şifreli + localStorage-önce) · UYS RLS+RBAC + `test_run_id` izolasyonu.
