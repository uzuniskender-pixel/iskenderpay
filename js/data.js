// js/data.js — iskenderpay (v2.0)
// Yedek codec (xDec/xEnc) + Store lookup API'sine compat shim.
// _lookupDirty + _mapPaysById/_mapPaysByGroup/_mapCredsById v8.98'de Store'a taşındı.

// ── YEDEK UYUMLULUK ───────────────────────────────────────────────────────────
// Yedek al/geri yükle (app.js confirmBackup + readRF tarafından kullanılır)

function xDec(e, p) {
  try {
    const t = decodeURIComponent(escape(atob(e)));
    let r = '';
    for (let i = 0; i < t.length; i++) r += String.fromCharCode(t.charCodeAt(i) ^ p.charCodeAt(i % p.length));
    return r;
  } catch(e) { return null; }
}

function xEnc(t, p) {
  let r = '';
  for (let i = 0; i < t.length; i++) r += String.fromCharCode(t.charCodeAt(i) ^ p.charCodeAt(i % p.length));
  return btoa(unescape(encodeURIComponent(r)));
}

// ── WO-16: yedek payload cozumu (PIN'den BAGIMSIZ, saf) ───────────────────────
// Sorun: bir yedek ALINDIGI ANDAKI PIN ile xEnc'lenir (backup.js#confirmBackup).
// PIN sonradan degisirse aktif oturum PIN'i (Session.decryptBackup) o yedegi ACMAZ;
// xDec yanlis PIN'de cop string dondurur -> JSON.parse patlar -> SESSIZ hata.
// (2026-05-30 veri-kurtarma vakasinda elle "eski PIN ile xDec" yapilarak asilmisti.)
// Cozum: verilen aday PIN ile coz + YAPISAL dogrula; yanlis PIN'i cop yerine null'a indir.
// Boylece app.js#readRF, oturum PIN'i tutmazsa kullanicidan "yedek sifresi" isteyebilir.

// Cozulen nesne gercek bir yedek mi? (yanlis-PIN copunun tesadufen kabulunu engeller)
function _looksLikeBackup(o) {
  return !!o && typeof o === 'object'
    && Array.isArray(o.pays)
    && (o.creds === undefined || Array.isArray(o.creds))
    && (typeof o.v === 'string' || typeof o.at === 'string');
}

// b64data'yi verilen PIN ile coz. Donus: gecerli yedek nesnesi VEYA null.
// null = yanlis PIN / bozuk dosya / yapi tutmadi (cop ASLA kabul edilmez).
function decodeBackupPayload(b64data, pin) {
  if (!b64data || !pin) return null;
  const dec = xDec(b64data, pin);          // yanlis PIN -> cop string (atob b64'u acar, XOR cop)
  if (dec == null) return null;            // gecersiz base64
  let obj;
  try { obj = JSON.parse(dec); } catch(e) { return null; }  // cop string -> parse patlar -> null
  return _looksLikeBackup(obj) ? obj : null;
}

// ── GLOBAL COMPAT ─────────────────────────────────────────────────────────────
// Lookup API'leri Store'a delege — eski çağrı site'leri (window.findPayById vb.)
// kırılmadan Store metotlarına yönlenir.
window.invalidateLookups = () => window.Store.invalidateLookups();
window.findPayById       = (id)  => window.Store.findPayById(id);
window.findPaysByGroup   = (gid) => window.Store.findPaysByGroup(gid);
window.findCredById      = (id)  => window.Store.findCredById(id);
window.xDec              = xDec;
window.xEnc              = xEnc;
window.decodeBackupPayload = decodeBackupPayload;   // WO-16
window._looksLikeBackup    = _looksLikeBackup;       // WO-16
