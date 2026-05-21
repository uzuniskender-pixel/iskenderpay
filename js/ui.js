// js/ui.js
// iskenderpay — Arayüz ve Render Yönetim Modülü (v8.16)

import { state } from './state.js';

/**
 * Sol/Yan menüde yer alan yapay zeka ve sistem metrikleri panelini render eder.
 * version.json'dan okunan ve global _knownBuild'e set edilen build bilgisini baz alır.
 */
export function renderAI() {
  const aiEl = document.getElementById('AI');
  if (!aiEl) return;
  
  // version.json'dan okunan aktif build bilgisi veya fallback olarak statik değer
  const buildStr = (typeof window._knownBuild !== 'undefined' && window._knownBuild) ? window._knownBuild : '20260521-02'; 
  
  let h = '';
  h += `<div style="margin-bottom: 8px;"><strong>Sürüm:</strong> <span class="mono">v8.16</span></div>`;
  h += `<div style="margin-bottom: 8px;"><strong>Build:</strong> <span class="mono">${buildStr}</span></div>`;
  h += `<div style="margin-bottom: 8px;"><strong>Aktif Plan ID:</strong> <span class="mono">${window._planId || 'plan1'}</span></div>`;
  h += `<div style="margin-bottom: 8px;"><strong>Veri Boyutu (Pays):</strong> <span class="mono">${state.pays.length} kayıt</span></div>`;
  h += `<div style="margin-bottom: 8px;"><strong>Kredi/Taksit Sayısı:</strong> <span class="mono">${state.creds.length} adet</span></div>`;
  h += `<div style="margin-bottom: 8px;"><strong>Yapılan Ödemeler:</strong> <span class="mono">${state.paidItems.length} kayıt</span></div>`;
  h += `<div style="margin-bottom: 8px;"><strong>Kullanıcı UID:</strong> <span class="mono" style="font-size: 10px;">${window._fbUid || 'Giriş yapılmadı'}</span></div>`;
  
  aiEl.innerHTML = h;
}

/**
 * Plan adlarını ("Ev", "İş" vb.) localStorage'dan okuyarak getiren yardımcı işlev
 */
export function getPlanName(planId) {
  return localStorage.getItem('v6-name-' + planId) || (planId === 'plan1' ? 'Plan 1' : 'Plan 2');
}

/**
 * Sidebar veya plan seçim alanındaki plan isimlerini ve düzenleme butonlarını render eder.
 */
export function renderPlanNames() {
  const p1Btn = document.getElementById('PLAN1_BTN');
  const p2Btn = document.getElementById('PLAN2_BTN');
  const sidebarTitle = document.getElementById('SIDEBAR_PLAN_TITLE');
  
  const name1 = getPlanName('plan1');
  const name2 = getPlanName('plan2');
  
  if (p1Btn) p1Btn.innerHTML = `📁 ${name1} <span onclick="event.stopPropagation(); window.editPlanName('plan1');" style="margin-left:auto; cursor:pointer; opacity:0.6;">✏️</span>`;
  if (p2Btn) p2Btn.innerHTML = `📁 ${name2} <span onclick="event.stopPropagation(); window.editPlanName('plan2');" style="margin-left:auto; cursor:pointer; opacity:0.6;">✏️</span>`;
  if (sidebarTitle) sidebarTitle.textContent = window._planId === 'plan1' ? name1 : name2;
}

/**
 * Uygulamanın ana matris tablosunu, özet barlarını ve listelerini çizen devasa fonksiyon.
 * index.html içindeki eski global diziler yerine artık tamamen 'state.*' yapılarını dinler.
 */
export function render() {
  console.log("[UI] Ana render döngüsü tetiklendi.");
  
  // ⚠️ NOT: index.html içindeki mevcut devasa `function render() { ... }` gövdenizi
  // (döngüler, filtreler, tablo oluşturma mantığı) birebir buraya taşıyın.
  // Sadece içerideki "pays", "creds", "paidItems" referanslarını "state.pays", 
  // "state.creds", "state.paidItems" olacak şekilde güncellediğinizden emin olun.

  // ÖRNEK TASLAK (Sizin kodunuz bunun yerini alacak):
  const mainDiv = document.getElementById('MAIN_GRID');
  if (mainDiv) {
    // Sizin tablonuzu çizen döngüleriniz ve mantığınız burada çalışacak
  }

  // Render işlemleri bittikten sonra yan panelleri ve alt sistemleri tazeleyin
  renderAI();
  renderPlanNames();
}