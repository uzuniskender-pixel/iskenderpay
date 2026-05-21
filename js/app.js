// js/app.js
// iskenderpay — Ana Giriş ve Yaşam Döngüsü Koordinatörü (v8.16)

import { auth, loadSecure, logoutUser, loginWithGoogle } from './db.js';
import { render, renderAI, renderPlanNames } from './ui.js';
import { clearState } from './state.js';
import { clearCryptoSession } from './crypto.js';

async function initBuild() {
  try {
    const r = await fetch('version.json?t=' + Date.now());
    const j = await r.json();
    window._knownBuild = j.build;
  } catch(e) {
    console.warn("[App] version.json okunamadı.");
    window._knownBuild = '20260521-01';
  }
}

function checkVersionPolling() {
  setInterval(async () => {
    try {
      const r = await fetch('version.json?t=' + Date.now());
      const j = await r.json();
      if (window._knownBuild && j.build !== window._knownBuild) {
        const banner = document.getElementById('upd-banner');
        if (banner) banner.classList.add('open');
      }
    } catch (e) {}
  }, 60000);
}

// Global buton bağlantıları
window.updApply = function() { window.location.reload(); };
window.doGoogleLogin = loginWithGoogle;
window.doGoogleSignOut = async function() {
  if (confirm('Çıkış yapmak istiyor musunuz? Bellek temizlenecektir.')) {
    await logoutUser();
    clearState();
    clearCryptoSession();
    window.location.reload();
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await initBuild();
  renderAI();
  renderPlanNames();

  auth.onAuthStateChanged(async (user) => {
    const glsEl = document.getElementById('GLS');
    const plsEl = document.getElementById('PLS');
    const plsUser = document.getElementById('PLS_USER');

    if (user) {
      window._fbUid = user.uid;
      if (glsEl) glsEl.style.display = 'none';
      if (plsUser) plsUser.textContent = '👤 ' + (user.displayName || user.email);
      if (plsEl) plsEl.style.display = 'flex';
      
      const isLoaded = await loadSecure();
      if (isLoaded) {
        render();
      }
    } else {
      window._fbUid = null;
      if (glsEl) glsEl.style.display = 'flex';
      if (plsEl) plsEl.style.display = 'none';
    }
  });

  checkVersionPolling();
});
