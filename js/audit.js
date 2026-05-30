// js/audit.js — iskenderpay (v1.0) — KATMAN 3: yakalayici write-audit log
// Her kalici yazimi METADATA olarak halka-tampona (ring buffer, son 50) kaydeder.
//
// AMAC (kullanici fikri — savunma derinligi): veri bir gun YANLIS gorunurse son N yazimi
// ve KAYNAGINI gormek. Ornek: pays sayisi 80 -> 0 dustugu an hangi yazimda, hangi sonucla
// (ok/conflict/error) oldu? auditLog() ile gorulur.
//
// GIZLILIK (kullanici sarti — "disaridan kimse iskenderpay verisini gormeyecek"):
//   Bu log DEGER / SIFRELI BLOB ICERIGI ASLA YAZMAZ. Yalniz METADATA:
//   {zaman, kaynak, hedef, sonuc, boyut(byte), koleksiyon SAYILARI}. Yani log'un kendisi
//   bir veri-sizma kanali OLAMAZ. localStorage'da LOCAL-ONLY saklanir (sifreli blob'a
//   girmez, backend'e SENKRONLANMAZ) -> reload sonrasi forensic icin sayilar/zamanlar kalir.

const MAX = 50;
const LS_KEY = 'ip-audit';   // yalniz METADATA; gercek veri/blob icermez, sync edilmez
let _log = [];

// Modul yuklenince onceki metadata log'u geri yukle (reload sonrasi forensic surekliligi).
try { const r = localStorage.getItem(LS_KEY); if (r) _log = JSON.parse(r) || []; } catch (e) { _log = []; }

function _persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(_log)); } catch (e) {}
}

// entry: { source, target, result, size, counts }
//   counts = {pays:N, creds:N, ...} — yalniz SAYI (deger DEGIL).
export function recordWrite(entry) {
  entry = entry || {};
  const e = {
    ts:     Date.now(),
    iso:    new Date().toISOString(),
    source: entry.source || '?',     // ornek: 'persist:_doSave'
    target: entry.target || '?',     // 'localStorage' | 'localStorage+firebase' | ...
    result: entry.result || '?',     // 'ok' | 'conflict' | 'skipped' | 'error' | 'no-fb'
    size:   entry.size   || 0,       // sifreli blob BOYUTU (icerik degil)
    counts: entry.counts || null,    // koleksiyon SAYILARI (deger sizmaz)
  };
  _log.push(e);
  if (_log.length > MAX) _log.splice(0, _log.length - MAX);  // halka-tampon
  _persist();
  return e;
}

export function getAudit()  { return _log.slice(); }            // kopya dondur (disari mutasyon yok)
export function auditReset() { _log = []; try { localStorage.removeItem(LS_KEY); } catch (e) {} }

// ── Konsol erisimi (window) ────────────────────────────────────────────────
window.recordWrite = recordWrite;
window.getAudit    = getAudit;
window.auditReset  = auditReset;
window.auditLog = function () {
  try {
    console.table(_log.map(e => ({
      zaman: e.iso, kaynak: e.source, hedef: e.target, sonuc: e.result, boyut: e.size,
      ...(e.counts || {})
    })));
  } catch (_) { console.log(_log); }
  return _log.length;
};
