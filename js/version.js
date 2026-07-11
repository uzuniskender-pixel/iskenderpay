// js/version.js — iskenderpay
// Surum kontrolu + guncelleme banner + Ayarlar "Guncelleme" durum satiri.
//
// KIYAS MANTIGI (v8.230+): "guncel mi?" karari, canli version.json (d.build) ile
// YUKLU surumun build'ini (window.APP_BUILD; index.html'de build-time gomulu)
// karsilastirarak verilir. Onceki surum _knownBuild'e bakiyordu; checkVersion onu
// gunceller-di -> banner ciktiktan sonra "Guncelleme Kontrol Et" yanlislikla
// "guncelsiniz" + ESKI APP_VERSION gosteriyordu (224 vs 231 hatasi). Artik yuklu vs
// canli net kiyas. Ayrica ILK ACILISTA durum satiri OTOMATIK dolar (buton beklemez).

let _knownBuild = null;

// canli d vs YUKLU surum -> yeni surum var mi?
function _yeniMi(d) {
  return !!(d && d.build && d.build !== (window.APP_BUILD || ''));
}

// Ayarlar'daki #UPD_STATUS satirini + #UPD_BTN gorunurlugunu canli veriye gore yaz
function _durumYaz(d) {
  const el = document.getElementById('UPD_STATUS');
  const btn = document.getElementById('UPD_BTN');
  if (!d) return;
  const canliV = d.v || (window.APP_VERSION || '').replace(/^v/, '');
  if (el) {
    el.textContent = _yeniMi(d)
      ? '🔄 Yeni sürüm mevcut: v' + canliV
      : '✅ Güncel sürümdesiniz (v' + canliV + ')';
  }
  if (btn) btn.style.display = _yeniMi(d) ? '' : 'none';
}

async function _fetchVer() {
  const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Acilis: durum satirini HEMEN doldur (butona basmadan) + gerekiyorsa banner
async function initBuild() {
  try {
    const d = await _fetchVer();
    _knownBuild = d.build || null;
    _durumYaz(d);
    if (_yeniMi(d)) showUpdBanner(d.v);
  } catch (e) {}
}

// Periyodik kontrol: yeni deploy olduysa banner + durum guncelle
async function checkVersion() {
  try {
    const d = await _fetchVer();
    _durumYaz(d);
    if (_yeniMi(d) && d.build !== _knownBuild) {
      _knownBuild = d.build;
      showUpdBanner(d.v);
    }
  } catch (e) {}
}

function showUpdBanner(newVer) {
  const b = document.getElementById('upd-banner');
  if (!b) return;
  const txt = b.querySelector('.upd-txt');
  if (txt) txt.textContent = '🔄 Yeni sürüm: v' + (newVer || '');
  b.classList.add('show');
}

function updApply() {
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .finally(() => { window.location.reload(true); });
}

// Buton: elle kontrol (ayni _durumYaz mantigi; canli deger gosterir)
async function manualCheckUpdate() {
  const statusEl = document.getElementById('UPD_STATUS');
  const btnEl = document.getElementById('UPD_BTN');
  if (statusEl) statusEl.textContent = 'Kontrol ediliyor...';
  if (btnEl) btnEl.disabled = true;
  try {
    const d = await _fetchVer();
    _durumYaz(d);
    if (_yeniMi(d)) showUpdBanner(d.v);
  } catch (e) {
    if (statusEl) statusEl.textContent = '❌ Kontrol edilemedi: ' + e.message;
  }
  if (btnEl) btnEl.disabled = false;
}

// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.manualCheckUpdate = manualCheckUpdate;

// Sayfa acilisinda otomatik — modul yuklenince calisir
initBuild();
setTimeout(checkVersion, 3000);
setInterval(checkVersion, 5 * 60 * 1000);
window.checkVersion = checkVersion;
window.updApply = updApply;

// ── NAMED EXPORT (v8.118) ──────────────────────────────────────────────────
export function getKnownBuild() { return _knownBuild; }
