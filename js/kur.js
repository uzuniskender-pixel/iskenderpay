// js/kur.js — iskenderpay
// Kur çekme, kur bar render, sıradaki ödeme

import { todayMidnight, toTRY } from './util.js';

async function fetchRates(force=false) {
  if (!window.rates) window.rates = {EUR:null, USD:null, GOLD:null};
  const s = localStorage.getItem('v5-rates-'+window.Store.planId) || localStorage.getItem('v5-rates');
  if (s) try { const parsed = JSON.parse(s); Object.assign(window.rates, parsed); } catch(e) {}
  renderKur();
  // Son 30 dakika içinde çekildiyse API'ye gitme
  if (!force && window.rates._fetchedAt) {
    const ageMin = (Date.now() - new Date(window.rates._fetchedAt).getTime()) / 60000;
    if (ageMin < 30 && window.rates.EUR && window.rates.USD && window.rates.GOLD) return;
  }
  let anySuccess = false;
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (r.ok) { const d=await r.json(); window.rates.USD=d.rates.TRY; window.rates.EUR=d.rates.TRY/d.rates.EUR; anySuccess=true; }
    else console.warn('exchangerate-api HTTP hatası:', r.status);
  } catch(e) { console.warn('exchangerate-api erişim hatası:', e.message); }
  try {
    const r2 = await fetch('https://api.gold-api.com/price/XAU');
    if (r2.ok) { const d=await r2.json(); if(window.rates.USD) window.rates.GOLD=(d.price/31.1035)*window.rates.USD; anySuccess=true; }
    else console.warn('gold-api HTTP hatası:', r2.status);
  } catch(e) { console.warn('gold-api erişim hatası:', e.message); }
  if (anySuccess) {
    window.rates._fetchedAt = new Date().toISOString();
    localStorage.setItem('v5-rates-'+window.Store.planId, JSON.stringify(window.rates));
  }
  renderKur();
  if (window.curTab === 0) window.render();
}

function renderKur() {
  let timeLabel = '';
  if (window.rates._fetchedAt) {
    const d = new Date(window.rates._fetchedAt);
    const ageMin = Math.round((Date.now()-d.getTime())/60000);
    const timeStr = d.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
    if (ageMin > 60) {
      const ageH = Math.floor(ageMin/60);
      timeLabel = `<span class="ktime" style="color:var(--danger)" title="${timeStr} tarihli kur — güncel olmayabilir">⚠ ${ageH}s önce</span>`;
    } else {
      timeLabel = `<span class="ktime">${timeStr}</span>`;
    }
  } else if (window.rates.USD || window.rates.EUR || window.rates.GOLD) {
    timeLabel = `<span class="ktime" style="color:var(--danger)" title="Kurun ne zaman çekildiği bilinmiyor">⚠ önbellek</span>`;
  }
  let h = '';
  if (window.rates.EUR)  h += `<div class="ki"><span class="kl">EUR</span><span class="kv e">₺${window.rates.EUR.toFixed(2)}</span></div><div class="ksep"></div>`;
  if (window.rates.USD)  h += `<div class="ki"><span class="kl">USD</span><span class="kv u">₺${window.rates.USD.toFixed(2)}</span></div><div class="ksep"></div>`;
  if (window.rates.GOLD) h += `<div class="ki"><span class="kl">Altın/gr</span><span class="kv g">₺${window.rates.GOLD.toFixed(0)}</span></div><div class="ksep"></div>`;
  if (h) {
    h += timeLabel + `<button class="kbtn" onclick="fetchRates(true)">🔄</button>`;
  } else {
    h = `<span style="font-size:11px;color:var(--danger)">Kur alınamadı</span><button class="kbtn" onclick="window.go(5)" style="color:var(--acc);font-weight:600;font-size:11px;margin-left:6px">Manuel Gir →</button><button class="kbtn" onclick="fetchRates()">🔄</button>`;
  }
  h += `<span id="sync-dot" title="Canlı sync"></span>`;
  h += `<span id="ver-tag" onclick="window.go(5)" title="Sürüm bilgisi" style="margin-left:auto;font-size:10px;font-family:'IBM Plex Mono',monospace;color:var(--muted);cursor:pointer;flex-shrink:0;padding:2px 6px;border:1px solid var(--bdr);border-radius:4px">${window.APP_VERSION}</span>`;
  document.getElementById('KB').innerHTML = h;
  renderSiradaki();
}

function saveRates() {
  const e = parseFloat(document.getElementById('ME').value)||0;
  const u = parseFloat(document.getElementById('MU').value)||0;
  const g = parseFloat(document.getElementById('MG').value)||0;
  if (e) window.rates.EUR=e; if (u) window.rates.USD=u; if (g) window.rates.GOLD=g;
  localStorage.setItem('v5-rates-'+window.Store.planId, JSON.stringify(window.rates));
  renderKur();
  if (window.curTab === 0) window.render();
  alert('Kurlar kaydedildi!');
}

function renderSiradaki() {
  const el = document.getElementById('SIRADAKI');
  if (!el || !window.pays) return;
  const today = todayMidnight();
  const bekleyenler = (window.pays||[])
    .filter(p => (p.status||'pending') !== 'paid' && window.parseLocalDate(p.date) >= today)
    .sort((a,b) => window.parseLocalDate(a.date) - window.parseLocalDate(b.date));
  if (!bekleyenler.length) { el.style.display = 'none'; return; }
  const p = bekleyenler[0];
  const d = window.parseLocalDate(p.date);
  const kalan = Math.round((d - today) / 86400000);
  const kalanStr = kalan === 0 ? 'Bugün' : kalan === 1 ? 'Yarın' : kalan + ' gün';
  const tryAmt = toTRY(p.amount, p.currency||'TRY', window.rates);
  el.style.display = '';
  el.innerHTML = `<span style="opacity:.5;font-size:10px">Sıradaki:</span> <span style="font-size:11px;font-weight:600;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle">${window.esc(p.name)}</span> <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--ok)">${window.fmt(tryAmt)}</span> <span style="font-size:10px;color:var(--muted)">${kalanStr}</span>`;
}


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.fetchRates         = fetchRates;
window.renderSiradaki     = renderSiradaki;
window.saveRates          = saveRates;
