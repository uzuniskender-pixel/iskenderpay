# iskenderpay — Devam Notu

_Son güncelleme: 2026-05-20_

---

## Tamamlananlar

### `version.json` single source of truth
- `_knownBuild` artık `APP_BUILD` sabitiyle değil `initBuild()` ile `version.json`'dan initialize ediliyor
- `initBuild()` sayfa açılışında bir kez çalışıyor; polling ve `manualCheckUpdate` bu baseline'a güveniyor
- `APP_BUILD` sabiti sadece `renderAI()` UI fallback'i olarak kaldı — fonksiyonel mantık yok

---

## Sıradaki: PIN/key mimari değişikliği

### Sorun
Şu an veri şifreleme anahtarı doğrudan PIN'den türetiliyor:

```
PIN → PBKDF2(PIN, dataSalt) → _cryptoKey → tüm veriyi şifreler
```

PIN değiştiğinde (`chPass`):
1. Yeni PIN ile yeni `_cryptoKey` türetiliyor
2. Veri yeni key ile yeniden şifreleniyor (`saveSecureNow()`)
3. **Ama Firebase/localStorage sync başarısız olursa eski şifreli veri + yeni key → kalıcı veri kaybı**

Daha kötü senaryo: multi-device. Cihaz A'da PIN değişti, cihaz B henüz sync olmadı → cihaz B eski şifreli veriyi yeni key ile çözmeye çalışıyor → `decrypt_failed`.

### Çözüm: Data key mimarisi

```
Kurulum (bir kez):
  dataKey = crypto.getRandomValues(32 byte)  ← rastgele, PIN'den bağımsız
  wrappedKey = AES-KW(dataKey, PBKDF2(PIN, pinSalt))
  localStorage/Firebase: wrappedKey saklanır, dataKey saklanmaz

Giriş:
  PIN → PBKDF2 → unwrapKey(wrappedKey) → dataKey → veri çöz

PIN değişince:
  dataKey değişmez
  wrappedKey yeni PIN ile yeniden wrap edilir
  Veri dokunulmaz
```

### Uygulama planı

#### 1. Yeni crypto fonksiyonları
```js
// dataKey'i PIN ile wrap et (AES-KW)
async function wrapDataKey(dataKey, pin, pinSalt) { ... }

// wrap'lı dataKey'i PIN ile unwrap et
async function unwrapDataKey(wrappedKeyB64, pin, pinSalt) { ... }

// İlk kurulumda rastgele dataKey üret
function generateDataKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}
```

#### 2. localStorage/Firebase'e ne yazılır
| Key | İçerik | Nerede |
|---|---|---|
| `v5-pin-salt` | PIN hash salt | Mevcut, değişmiyor |
| `v5-data-salt` | **Kaldırılıyor** | — |
| `v8-wrapped-key` | AES-KW ile wrap edilmiş dataKey | localStorage + Firebase |
| `v8-data-key-iv` | wrap işleminin IV'si | localStorage + Firebase |

#### 3. `doLogin` değişimi
```js
// Şu an:
_cryptoKey = await deriveKey(val, dataSalt);

// Yeni:
const wrappedKey = getWrappedKey(); // localStorage veya Firebase'den
_cryptoKey = await unwrapDataKey(wrappedKey, val, pinSalt);
```

#### 4. `chPass` değişimi
```js
// Şu an: yeni PIN ile yeni key türet, veriyi yeniden şifrele
// Yeni: dataKey'i al, yeni PIN ile yeniden wrap et, veriyi DOKUNMA

_plainPin = nw;
const newWrappedKey = await wrapDataKey(_dataKey, nw, pinSalt);
saveWrappedKey(newWrappedKey); // Firebase + localStorage
// saveSecureNow() ÇAĞRILMAZ — veri değişmedi
```

#### 5. Migrasyon: `migrateToV8()`
Mevcut kullanıcılar v5 data-salt mimarisinden geliyor. Tek seferlik:
```
1. Eski PIN ile _cryptoKey türet (v5 yöntemi)
2. Veriyi çöz
3. Yeni rastgele dataKey üret
4. Veriyi yeni dataKey ile yeniden şifrele
5. dataKey'i PIN ile wrap et, v8-wrapped-key'e yaz
6. Migrasyon flag'i koy: localStorage.setItem('v8-mig', '1')
```

**Kritik:** Migrasyon sırasında hem eski hem yeni format geçici olarak yazılmalı. Firebase yazımı başarısız olursa migrasyon tamamlanmamış sayılıp tekrar denenebilmeli.

### Risk ve dikkat noktaları
- `_dataKey` (raw CryptoKey veya Uint8Array) oturumda bellekte tutulmalı — `_cryptoKey` gibi. `_plainPin` ile birlikte.
- Multi-plan (`plan1`, `plan2`): her plan için ayrı `wrappedKey` gerekiyor mu? Evet — her planın verisi bağımsız şifreli.
- Firebase sync'te `wrappedKey` ve `pinHash` aynı document'ta tutuluyor — bu devam edebilir.
- AES-KW için SubtleCrypto'da `wrapKey` / `unwrapKey` kullanılacak — `encrypt`/`decrypt` değil. Browser desteği tam.

---

## Diğer bilinen sorunlar (öncelik sırası)

1. **87 global ID / duplicate ID riski** — `go(N)` geçişlerinde `getElementById` null dönüyor, hata başka yerde patlıyor. Çözüm: kritik ID'leri wrapper fonksiyonla sarmak, null guard eklemek.
2. **`exchangerate-api` sessiz başarısız** — `catch(e){}` ile yutulmuş. `ktime` span'ı var ama son başarılı fetch zamanı yazılmıyor. Çözüm: `lastRateFetch` timestamp tutmak, UI'da göstermek.
3. **Firebase compat mode v10.12.0** — deprecated yol. Acil değil ama modular API geçişi planlanmalı.
4. **Tek dosya büyümesi** — 164 KB, 2506 satır JS. Bir sonraki büyük özellik öncesi fonksiyon gruplarını `<script>` tag'lerine ayırmak düşünülebilir (build tool olmadan).

---

## Dosya yapısı referansı

```
index.html        Ana uygulama — tek dosya, 164 KB
version.json      {"v": "8.8", "build": "20260520-01"}
sw.js             Service Worker — network-first index.html, cache-first assets
manifest.json     PWA manifest
fix_groupids.js   Grup ID migrasyon yardımcısı
```

## Kritik global değişkenler

| Değişken | Açıklama |
|---|---|
| `_plainPin` | Oturum PIN'i — bellekte, localStorage'a yazılmaz |
| `_cryptoKey` | AES-256-GCM CryptoKey — PIN'den türetilmiş |
| `_knownBuild` | Aktif build — `initBuild()` ile version.json'dan set edilir |
| `window._planId` | Aktif plan (`plan1` / `plan2`) |
| `window._fbDb` | Firebase Firestore referansı |
| `window._fbUid` | Firebase Auth UID |
