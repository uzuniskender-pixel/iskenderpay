// js/salt-freeze.js — iskenderpay (Faz B HAZIRLIK / SPIKE — CANLI yola HENUZ baglanmadi)
//
// AMAC: kripto-namespace'i auth'tan ayirmak. Bugun PIN salt'i `Store.fbUid`'den
// turuyor (crypto.js#getSaltAsync) ve hem pinHash hem wrappedKey'i cozen anahtari
// besliyor. Auth Firebase->Supabase olunca fbUid degisir -> salt degisir ->
// wrappedKey ACILMAZ + pinHash TUTMAZ -> kullanici kendi E2E verisine KILITLENIR.
//
// COZUM: salt'i BIR KEZ (bugunku uretimle BIREBIR AYNI bayt) hesaplayip kalici
// "dondur" (freeze): localStorage + (cihaz degisimi icin) backend meta. Sonra HEP
// saklanandan oku. Boylece auth uid degisse de salt KIPIRDAMAZ -> kilitlenme yok.
// Freeze, mevcut uretimden BIREBIR ayni bayti aldigi icin mevcut kullaniciyi de
// kilitlemez (geriye-uyumlu). Auth'tan bagimsizlik -> gelecekteki HER auth
// degisikligini de de-risk eder.
//
// Bu modul SAF + bagimlilik-enjeksiyonlu (DI) -> DOM/Firebase olmadan tam test edilir.
// Canli baglanti (callers'i buna cevirme + backend meta save/load) AYRI bir adim;
// onay alinmadan yapilmaz.

export const FROZEN_SALT_LS = 'v8-pin-salt-frozen';

export function bytesToB64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
export function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

/**
 * Auth-bagimsiz PIN salt cozumleyici (freeze-once).
 * Oncelik: (1) yerel cache -> (2) backend meta -> (3) FREEZE: bugunku uretimden
 * tureti, sakla. legacyDerive yalniz HENUZ DONDURULMAMIS durumda cagrilir.
 *
 * @param {object}   deps
 * @param {() => Promise<Uint8Array>} deps.legacyDerive  Bugunku salt uretimi (crypto.js#getSaltAsync cekirdegi).
 * @param {{get:(k:string)=>string|null, set:(k:string,v:string)=>void}} deps.store  localStorage benzeri.
 * @param {{load:()=>Promise<string|null>, save:(b64:string)=>Promise<void>}|null} [deps.backend]  meta sync (opsiyonel).
 * @returns {Promise<Uint8Array>}  Dondurulmus salt baytlari.
 */
export async function resolvePinSaltCore({ legacyDerive, store, backend }) {
  // 1) Yerel cache (en hizli; birincil cihazda goc sonrasi hep buraya duser).
  const cached = store.get(FROZEN_SALT_LS);
  if (cached) return b64ToBytes(cached);

  // 2) Backend meta (yeni cihaza giris: yerel cache yok ama meta'da dondurulmus salt var).
  if (backend && backend.load) {
    let fromMeta = null;
    try { fromMeta = await backend.load(); } catch { fromMeta = null; } // offline vb. -> 3'e dus
    if (fromMeta) { store.set(FROZEN_SALT_LS, fromMeta); return b64ToBytes(fromMeta); }
  }

  // 3) FREEZE: henuz dondurulmamis -> bugunku uretimle (BIREBIR ayni bayt) tureti, sakla.
  const bytes = await legacyDerive();
  const b64 = bytesToB64(bytes);
  store.set(FROZEN_SALT_LS, b64);
  if (backend && backend.save) {
    try { await backend.save(b64); } catch { /* best-effort; yerel cache tek basina yeterli */ }
  }
  return bytes;
}
