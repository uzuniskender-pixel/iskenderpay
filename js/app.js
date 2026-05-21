// js/app.js
// iskenderpay — Ana Giriş ve Yaşam Döngüsü (v8.18-fixed)

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
    window._knownBuild = '20260521-02';
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

window.selectPlan = async function(planId) {
  window._planId = planId;
  localStorage.setItem('v6-active-plan', planId);
  console.log(`[Plan] ${planId} seçildi, veriler yükleniyor...`);
  renderPlanNames();
  renderAI();
};

document.addEventListener('DOMContentLoaded', async () => {
  await initBuild();
  renderAI();
  renderPlanNames();

  const p1 = document.getElementById('PLAN1_BTN');
  const p2 = document.getElementById('PLAN2_BTN');
  if (p1) p1.addEventListener('click', () => window.selectPlan('plan1'));
  if (p2) p2.addEventListener('click', () => window.selectPlan('plan2'));

  auth.onAuthStateChanged(async (user) => {
    const glsEl   = document.getElementById('GLS');
    const plsEl   = document.getElementById('PLS');
    const plsUser = document.getElementById('PLS_USER');
    const psEl    = document.getElementById('PS');
    const appEl   = document.getElementById('APP');

    if (user) {
      // Giriş yapıldı — PIN ekranını göster
      window._fbUid = user.uid;
      if (glsEl)   glsEl.style.display = 'none';
      if (plsUser) plsUser.textContent = '👤 ' + (user.displayName || user.email);
      if (plsEl)   plsEl.style.display = 'flex';
      if (appEl)   appEl.style.display = 'flex';
      if (psEl)    { psEl.style.display = 'flex'; psEl.classList.add('active'); }
      renderPlanNames();
      renderAI();
    } else {
      // Oturum yok — login butonunu göster
      window._fbUid = null;
      if (appEl)  appEl.style.display = 'flex';
      if (psEl)   { psEl.style.display = 'none'; psEl.classList.remove('active'); }
      if (glsEl)  glsEl.style.display = 'flex';
      if (plsEl)  plsEl.style.display = 'none';
      clearState();
    }
  });

  checkVersionPolling();
});
