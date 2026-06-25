# iskenderpay — bu repo artık yalnız DEPLOY HEDEFİDİR

> ⚠️ **Geliştirme buradan TAŞINDI.** Bu `main` branch'i uygulama kodu TUTMAZ.

## Nerede ne var

| | Yer |
|---|---|
| **Kaynak / geliştirme** | `github.com/uzuniskender/ozler-platform` → `apps/iskenderpay` |
| **Canlı yayın (PWA)** | `gh-pages` branch'i — https://uzuniskender.github.io/iskenderpay/ |
| **Deploy mekanizması** | ozler-platform CI (`deploy.yml`) build edip `gh-pages`'e otomatik push eder |
| **GitHub Pages kaynağı** | `gh-pages` / (root) — **`main` DEĞİL** |

## Neden boş?

Cutover'dan (30 May 2026) önce geliştirme bu repodaydı. Cutover sonrası kaynak
`ozler-platform` monorepo'suna taşındı; canlı yayın artık `gh-pages`'ten gelir.
Bu `main` branch'inde kalan eski kopya (PIN min-4, WO-15 güvenlik kilidi YOK,
ama güncel "8.203" etiketli) **karışıklık ve veri-kaybı footgun'ı** yaratıyordu:
biri bunu kaynak sanabilir veya Pages kaynağı yanlışlıkla `main`'e çevrilirse
eski/kırılgan kod canlıya iner. Bu yüzden uygulama kodu kaldırıldı
(geçmiş `git log` / etiketlerde erişilebilir).

## Kurallar

- Bu `main`'e **uygulama kodu koymayın.** Değişiklikler `ozler-platform/apps/iskenderpay`'de yapılır.
- GitHub Pages kaynağını **`main`'e çevirmeyin** — `gh-pages` / (root) kalsın.
- Yeni deploy: `ozler-platform` `main`'e push → CI testten geçirip `gh-pages`'e yazar.
