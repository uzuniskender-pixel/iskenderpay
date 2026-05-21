# iskenderpay — Modüler Yapıya Geçiş Devam Notu

## Mevcut Durum (21 Mayıs 2026)

Sistem şu an **tek dosya mimarisinde** çalışıyor:
- `index.html` — tüm JS, CSS, HTML tek dosyada (3538 satır)
- `fix_groupids.js` — konsola yapıştırılarak çalıştırılan yardımcı script
- `manifest.json`, `sw.js`, `version.json`, ikonlar

`js/` klasörü **kaldırıldı** — modüler yapıya geçiş girişimi başarısız oldu.

---

## Neden Başarısız Oldu

### Asıl Sorun: Crypto Mimarisi Yanlış Okundu
Eski sistem basit `PBKDF2 → AES-GCM` değil, **3 katmanlı** bir yapı kullanıyor:

```
PIN
 └→ PBKDF2 (pinSalt) → AES-KW anahtarı
      └→ AES-KW ile wrap edilmiş dataKey (Firebase _meta'da saklanır)
           └→ dataKey ile AES-GCM şifreleme (plan verisi)
```

**pinSalt** deterministik — `UID + 'v5-pin-salt'` stringinden PBKDF2 ile türetiliyor, localStorage veya Firestore'da saklanmıyor.

**wrappedKey** Firebase'de `users/{uid}_meta` belgesinde `wrappedKey` alanında tutuluyor.

**Veri** Firebase'de `users/{uid}_{planId}` belgesinde `data` alanında tutuluyor.

### Diğer Hatalar
- `window._planId` hem `db.js` hem `state.js`'de tanımlandı → yarış koşulu
- `window.doGoogleLogin/SignOut` hem `db.js` hem `app.js`'de tanımlandı → çakışma
- `onAuthStateChanged` içinden direkt `loadSecure` çağrıldı → PIN girilmeden key yok hatası
- `index.html`'deki PIN handler `setCryptoKey()` çağırmadan `loadSecure` tetikledi
- `encryptData`'da `...spread` ile `String.fromCharCode` → büyük veride stack overflow (sonradan düzeltildi)

---

## Modüler Yapıya Geçiş İçin Doğru Sıra

### Adım 1 — state.js (Güvenli, crypto yok)
```js
export const state = { pays, creds, hist, persons, notes, paidItems, rehber, actLog };
export function updateState(key, val) { state[key] = val; window[key] = val; }
export function clearState() { ... }
```
- `window._planId` sadece burada tanımlanmalı

### Adım 2 — ui.js (Güvenli, sadece render)
- Tüm render fonksiyonları buraya: `render()`, `renderAI()`, `renderPlanNames()`
- `state` import edilerek kullanılmalı
- **Dikkat:** eski sistemde alan adları `amount` (pays için), `amt` (creds için)
- **Dikkat:** ödeme durumu `status === 'paid'` veya `isPaid === true`

### Adım 3 — crypto.js (Kritik — olduğu gibi taşı)
Şu fonksiyonlar birebir aynı kalmalı:
```js
getSaltFromUid(uid, saltKey)   // UID + key → deterministik Uint8Array
importDataKey(rawBytes)         // AES-GCM key import
wrapDataKey(dataKeyRaw, pin, pinSalt)    // AES-KW wrap
unwrapDataKey(wrappedB64, pin, pinSalt) // AES-KW unwrap
deriveKeyLegacy(password, salt) // v5 fallback
hashPin(pin, salt)              // PIN doğrulama hash
encryptData(data, key)          // chunk'lı btoa — stack overflow önlemi
decryptData(encStr, key)        // for döngüsü ile — spread kullanma
```

### Adım 4 — db.js (Kritik — Firebase + PIN akışı)
`doLogin()` akışı birebir korunmalı:
1. Zaten key var + pin aynı → direkt `loadSecure()`
2. `pinSalt = getSaltFromUid(uid, 'v5-pin-salt')`
3. `storedHash = fbLoadPinHash()` → yoksa ilk kullanım
4. İlk kullanım: yeni dataKey üret, wrap et, kaydet
5. Hash doğrula → yanlışsa hata göster
6. `wrappedB64 = fbLoadWrappedKey() || localStorage('v8-wrapped-key')`
7. wrappedB64 yoksa: v5 legacy (`deriveKeyLegacy`) + `migrateToV8()`
8. `unwrapDataKey(wrappedB64, pin, pinSalt)` → cryptoKey
9. `loadSecure()` → başarısız olursa diğer planı dene

### Adım 5 — app.js (En son)
- `onAuthStateChanged`: user varsa PIN ekranını göster, `loadSecure` çağırma
- `window.submitPin` db.js'de tanımlanmalı, app.js çağırmamalı
- `selectPlan`: sadece `_planId` güncelle + UI render, `loadSecure` çağırma
- Oturum yoksa: `APP` görünür, `PS` gizli, `GLS` butonu görünür

---

## Firebase Veri Yapısı

```
users/{uid}_meta
  wrappedKey: string (base64, AES-KW ile wrap edilmiş 32 byte dataKey)

users/{uid}_{planId}   (örn: hTvBT4ab3GZQRtikksQygWxlssw1_plan1)
  data: string (base64, AES-GCM şifreli JSON)
  pinHash: string (base64, PBKDF2 hash)
  updatedAt: number
```

---

## Önemli Notlar

- `fix_groupids.js` root'ta kalmalı — `js/` klasörüne taşınmaz, konsola yapıştırılarak çalıştırılır
- Service worker (`sw.js`) cache'i agresif — deploy sonrası gizli sekme ile test et
- `Cross-Origin-Opener-Policy` hataları Google popup'tan geliyor, işlevselliği etkilemiyor
- Mevcut kullanıcının UID'si: `hTvBT4ab3GZQRtikksQygWxlssw1`
- Plan 1'de 158 kayıt mevcut, veriler sağlıklı
