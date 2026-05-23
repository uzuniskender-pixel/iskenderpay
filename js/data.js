// js/data.js — iskenderpay (v1.0)
// Lookup haritaları ve yedek compat fonksiyonları.
// saveSecure/loadSecure/doLogin db.js'te — buraya taşınmadı.

// ── LOOKUP MAPS ───────────────────────────────────────────────────────────────
// O(1) erişim için pays/creds haritaları — veri değişince invalidate edilir

let _lookupDirty = true;
const _mapPaysById    = new Map();
const _mapPaysByGroup = new Map();
const _mapCredsById   = new Map();

function invalidateLookups() { _lookupDirty = true; }

function rebuildLookups() {
  if (!_lookupDirty) return;
  _mapPaysById.clear();
  _mapPaysByGroup.clear();
  _mapCredsById.clear();
  (window.pays || []).forEach(p => {
    _mapPaysById.set(String(p.id), p);
    const gid = p.groupId || String(Math.floor(Number(p.id)));
    if (!_mapPaysByGroup.has(gid)) _mapPaysByGroup.set(gid, []);
    _mapPaysByGroup.get(gid).push(p);
  });
  (window.creds || []).forEach(c => _mapCredsById.set(String(c.id), c));
  _lookupDirty = false;
}

function findPayById(id)    { rebuildLookups(); return _mapPaysById.get(String(id)) || null; }
function findPaysByGroup(gid){ rebuildLookups(); return _mapPaysByGroup.get(gid) || []; }
function findCredById(id)   { rebuildLookups(); return _mapCredsById.get(String(id)) || null; }

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
window.invalidateLookups = invalidateLookups;
window.rebuildLookups    = rebuildLookups;
window.findPayById       = findPayById;
window.findPaysByGroup   = findPaysByGroup;
window.findCredById      = (id) => { rebuildLookups(); return _mapCredsById.get(String(id)) || null; };
window.xDec              = xDec;
window.xEnc              = xEnc;
