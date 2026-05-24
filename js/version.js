// js/version.js — iskenderpay
// Versiyon kontrolü, güncelleme banner

async function initBuild() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), {cache:'no-store'});
    if (!r.ok) return;
    const d = await r.json();
    if (d.build) window._knownBuild = d.build;
  } catch(e) {}
}

async function checkVersion() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), {cache:'no-store'});
    if (!r.ok) return;
    const d = await r.json();
    if (d.build && d.build !== window._knownBuild) {
      window._knownBuild = d.build;
      showUpdBanner(d.v);
    }
  } catch(e) {}
}

function showUpdBanner(newVer) {
  const b = document.getElementById('upd-banner');
  if (!b) return;
  const txt = b.querySelector('.upd-txt');
  if (txt) txt.textContent = '🔄 Yeni sürüm: ' + (newVer || '');
  b.classList.add('show');
}

function updApply() {
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .finally(() => { window.location.reload(true); });
}

async function manualCheckUpdate() {
  const statusEl = document.getElementById('UPD_STATUS');
  const btnEl    = document.getElementById('UPD_BTN');
  if (statusEl) statusEl.textContent = 'Kontrol ediliyor...';
  if (btnEl) btnEl.disabled = true;
  try {
    const r = await fetch('./version.json?t=' + Date.now(), {cache:'no-store'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (d.build && d.build !== window._knownBuild) {
      if (statusEl) statusEl.textContent = '🔄 Yeni sürüm mevcut: ' + d.v;
      showUpdBanner(d.v);
    } else {
      if (statusEl) statusEl.textContent = '✅ Güncel sürümdesiniz (v' + window.APP_VERSION + ')';
    }
  } catch(e) {
    if (statusEl) statusEl.textContent = '❌ Kontrol edilemedi: ' + e.message;
  }
  if (btnEl) btnEl.disabled = false;
}


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.manualCheckUpdate  = manualCheckUpdate;
window.initBuild          = initBuild;

// Sayfa açılışında otomatik — modül yüklenince çalışır
initBuild();
setTimeout(checkVersion, 3000);
setInterval(checkVersion, 5 * 60 * 1000);
window.checkVersion       = checkVersion;
window.showUpdBanner      = showUpdBanner;
window.updApply           = updApply;
