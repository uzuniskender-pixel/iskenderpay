// js/app.js
// iskenderpay — Ana Giriş ve Yaşam Döngüsü Koordinatörü (v8.16)

import { auth, loadSecure, loginWithGoogle, logoutUser } from './db.js';
import { render, renderAI, renderPlanNames } from './ui.js';
import { clearState } from './state.js';
import { clearCryptoSession } from './crypto.js';

/**
 * Uygulamanın en güncel derleme sürümünü single-source-of-truth 
 * prensibine göre sorgular ve hafızaya alır.
 */
async function initBuild() {
  try {
    const r = await fetch('version.json?t=' + Date.now());
    const j = await r.json();
    window._knownBuild = j.build;
  } catch(e) {
    console.warn("[App] version.json okunamadı, fallback build kullanılıyor.");
    window._knownBuild = '20260521-02';
  }
}

/**
 * PWA Güncelleme Banner'ını tetikleyen Polling Kontrolü
 */
function checkVersionPolling() {
  setInterval(async () => {
    try {
      const r = await fetch('version.json?t=' + Date.now());
      const j = await r.json();
      if (window._knownBuild && j.build !== window._knownBuild) {
        const banner = document.getElementById('upd-banner');
        if (banner) banner.classList.add('open');
      }
    } catch (e) {
      console.error("[Polling] Versiyon kontrol hatası:", e);
    }
  }, 60000); // Her 60 saniyede bir arka planda kontrol eder
}

// ── GLOBAL PENCERE ARABİRİMLERİ (HTML onClick Bağlantıları İçin) ─────────────
// HTML içindeki onclick="editPlanName()" gibi çağrıların modüler yapıda 
// kırılmaması için bunları pencere (window) seviyesinde paylaşıyoruz.
window.editPlanName = function(planId) {
  const currentName = localStorage.getItem('v6-name-' + planId) || (planId === 'plan1' ? 'Plan 1' : 'Plan 2');
  const newName = prompt(`${planId === 'plan1' ? '1. Plan' : '2. Plan'} için yeni bir ad girin:`, currentName);
  
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed) {
    alert('Plan adı boş olamaz.');
    return;
  }
  
  localStorage.setItem('v6-name-' + planId, trimmed);
  renderPlanNames();
  render();
};

window.updApply = function() {
  window.location.reload();
};

window.handleLogout = async function() {
  if (confirm("Oturumu kapatmak istediğinize emin misiniz? Bellek temizlenecektir.")) {
    await logoutUser();
    clearState();
    clearCryptoSession();
    window.location.reload();
  }
};

// ── BOOTSTRAP / UYGULAMAYI AYAĞA KALDIRMA ────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Sürüm doğrulaması ve baseline kilitlerini yükle
  await initBuild();
  
  // 2. İlk UI durumunu göster (Boş iskelet / İstatistik paneli baseline)
  renderAI();
  renderPlanNames();

  // 3. Firebase Auth Değişikliklerini Takip Et (Realtime Listener)
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log(`[App] Kullanıcı girişi algılandı: ${user.email} (${user.uid})`);
      window._fbUid = user.uid;
      
      // Şifreli veriyi yüklemeyi dene
      const isLoaded = await loadSecure();
      if (isLoaded) {
        render(); // Veri varsa matrisi çiz
      } else {
        console.log("[App] Oturum PIN girişi bekleniyor...");
        // PIN Giriş modalınızı açacak fonksiyon tetikleyicisi buraya gelebilir
      }
    } else {
      console.log("[App] Aktif kullanıcı oturumu yok.");
      window._fbUid = null;
      // Giriş ekranı veya login modalını gösteren fonksiyon tetikleyicisi
    }
  });

  // 4. Arka plan versiyon takip mekanizmasını başlat
  checkVersionPolling();
});