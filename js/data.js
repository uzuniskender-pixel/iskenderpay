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

// ── GLOBAL COMPAT ─────────────────────────────────────────────────────────────
// Lookup API'leri Store'a delege — eski çağrı site'leri (window.findPayById vb.)
// kırılmadan Store metotlarına yönlenir.
window.invalidateLookups = () => window.Store.invalidateLookups();
window.findPayById       = (id)  => window.Store.findPayById(id);
window.findPaysByGroup   = (gid) => window.Store.findPaysByGroup(gid);
window.findCredById      = (id)  => window.Store.findCredById(id);
window.xDec              = xDec;
window.xEnc              = xEnc;
