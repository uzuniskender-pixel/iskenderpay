// js/app.js — v8.17 (onAuthStateChanged kaldırıldı, db.js yönetiyor)

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
    } catch(e) {}
  }, 60000);
}

window.updApply = function() { window.location.reload(); };

// Plan değiştirme — loadSecure'u tetikler, kendi başına render YAPMAZ
window.selectPlan = async function(planId) {
  window._planId = planId;
  localStorage.setItem('v6-active-plan', planId);
  console.log(`[Plan] ${planId} seçildi`);

  renderPlanNames();
  renderAI();

  if (window._fbUid) {
    await loadSecure();
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await initBuild();

  // Plan butonları
  const p1 = document.getElementById('PLAN1_BTN');
  const p2 = document.getElementById('PLAN2_BTN');
  if (p1) p1.addEventListener('click', () => window.selectPlan('plan1'));
  if (p2) p2.addEventListener('click', () => window.selectPlan('plan2'));

  checkVersionPolling();

  // NOT: onAuthStateChanged artık sadece db.js'de — buradan kaldırıldı
});
