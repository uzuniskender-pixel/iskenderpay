// js/ui.js
// iskenderpay — Arayüz ve Matris Render Motoru (v8.16)

import { state } from './state.js';

export function renderAI() {
  const aiEl = document.getElementById('AI');
  if (!aiEl) return;
  const buildStr = window._knownBuild || '20260521-02'; 
  
  let h = '';
  h += `<div style="margin-bottom: 6px;"><strong>Sürüm:</strong> <span class="mono">v8.16</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Build:</strong> <span class="mono">${buildStr}</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Aktif Plan:</strong> <span class="mono">${window._planId || 'plan1'}</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Ödeme (pays):</strong> <span class="mono">${state.pays ? state.pays.length : 0} kayıt</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Kredi/Taksit:</strong> <span class="mono">${state.creds ? state.creds.length : 0} adet</span></div>`;
  
  aiEl.innerHTML = h;
}

export function getPlanName(planId) {
  return localStorage.getItem('v6-name-' + planId) || (planId === 'plan1' ? 'Plan 1' : 'Plan 2');
}

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

window.editPlanName = function(planId) {
  const currentName = getPlanName(planId);
  const newName = prompt(`${planId === 'plan1' ? '1. Plan' : '2. Plan'} için yeni bir ad girin:`, currentName);
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed) return;
  localStorage.setItem('v6-name-' + planId, trimmed);
  renderPlanNames();
};

export function render() {
  console.log("[UI] Ana render döngüsü çalışıyor...");
  renderAI();
  renderPlanNames();

  const mainGrid = document.getElementById('MAIN_GRID');
  const matrisSummary = document.getElementById('MATRIS_SUMMARY');
  
  if (mainGrid) {
    // Veri yoksa veya şifre çözülmediyse kullanıcı dostu uyarı ve test verisi oluşturma butonu sun
    if (!state.pays || state.pays.length === 0) {
      mainGrid.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--para);">
          <div style="font-size: 40px; margin-bottom: 12px;">🔒</div>
          <h3>Şifreli Veri Bulunmamaktadır veya PIN Girişi Bekleniyor</h3>
          <p style="margin-top: 6px; font-size:12px; opacity:0.7; margin-bottom:15px;">Eğer bu planı ilk kez açıyorsanız aşağıdan test verisi yükleyerek matrisi başlatabilirsiniz.</p>
          <button class="btn bp btn-sm" id="LOAD_DEMO_BTN">⚡ İlk Veri Girişini / Profilini Oluştur</button>
        </div>
      `;
      
      // İlk veri oluşturma butonu tetikleyicisi
      setTimeout(() => {
        const demoBtn = document.getElementById('LOAD_DEMO_BTN');
        if (demoBtn) {
          demoBtn.addEventListener('click', () => {
            const initialPays = [
              { name: "Kira Ödemesi", amt: 15000, date: "2026-05-01", isPaid: false, groupId: "g_kira" },
              { name: "Kira Ödemesi", amt: 15000, date: "2026-06-01", isPaid: false, groupId: "g_kira" },
              { name: "Elektrik Faturası", amt: 1200, date: "2026-05-15", isPaid: true, groupId: "g_elek" }
            ];
            const initialCreds = [
              { name: "Araba Kredisi", aylikTutar: 8500, taksitSayisi: 12 }
            ];
            state.pays = initialPays;
            state.creds = initialCreds;
            window.pays = initialPays;
            window.creds = initialCreds;
            render();
          });
        }
      }, 50);

      if (matrisSummary) matrisSummary.innerHTML = '';
      return;
    }

    // Aylar dizisini oluştur
    let months = [];
    state.pays.forEach(p => {
      if (p.date) {
        let m = p.date.substring(0, 7);
        if (!months.includes(m)) months.push(m);
      }
    });
    months.sort();
    if (months.length === 0) months.push(new Date().toISOString().substring(0, 7));

    // Satırları eşleştir
    let rowsMap = {};
    state.pays.forEach(p => {
      let gid = p.groupId || ('g_' + p.name);
      if (!rowsMap[gid]) rowsMap[gid] = { name: p.name, items: [] };
      rowsMap[gid].items.push(p);
    });

    let h = `<table class="m-tbl"><thead><tr><th>ÖDEME ADI / AYLAR</th>`;
    months.forEach(m => h += `<th class="mono">${m}</th>`);
    h += `</tr></thead><tbody>`;

    let sortedGids = Object.keys(rowsMap).sort((a,b) => rowsMap[a].name.localeCompare(rowsMap[b].name));

    sortedGids.forEach(gid => {
      let row = rowsMap[gid];
      h += `<tr><td>${row.name}</td>`;
      months.forEach(m => {
        let match = row.items.find(p => p.date && p.date.substring(0, 7) === m);
        if (match) {
          let isPaid = match.isPaid ? 'line-through; opacity: 0.5;' : '';
          let color = match.isPaid ? '#2e7d32' : 'var(--bbutton)';
          h += `<td class="mono" style="${isPaid} color: ${color}; font-weight:600; cursor:pointer;">${Number(match.amt).toLocaleString('tr-TR', {minimumFractionDigits:2})} ₺</td>`;
        } else {
          h += `<td style="opacity:0.15; text-align:center;">-</td>`;
        }
      });
      h += `</tr>`;
    });

    h += `</tbody></table>`;
    mainGrid.innerHTML = h;

    // Özet alanını render et
    if (matrisSummary) {
      let unpaid = 0, paid = 0;
      state.pays.forEach(p => { p.isPaid ? paid += Number(p.amt||0) : unpaid += Number(p.amt||0); });
      matrisSummary.innerHTML = `
        <div class="c-row">
          <div class="c-card"><span class="c-lbl">Gelecek Ödemeler</span><span class="c-val mono" style="color:var(--sec);">${unpaid.toLocaleString('tr-TR')} ₺</span></div>
          <div class="c-card"><span class="c-lbl">Tamamlanan Ödemeler</span><span class="c-val mono" style="color:#2e7d32;">${paid.toLocaleString('tr-TR')} ₺</span></div>
          <div class="c-card"><span class="c-lbl">Toplam Plan Boyutu</span><span class="c-val mono">${(unpaid+paid).toLocaleString('tr-TR')} ₺</span></div>
        </div>
      `;
    }
  }
  _renderSubTabs();
}

function _renderSubTabs() {
  const krediContent = document.getElementById('KREDI_CONTENT');
  if (krediContent && state.creds) {
    if (state.creds.length === 0) {
      krediContent.innerHTML = `<p style="opacity:0.4; padding:20px;">Kayıtlı aktif kredi/taksit bulunamadı.</p>`;
    } else {
      let kh = `<div style="display:flex; flex-direction:column; gap:10px;">`;
      state.creds.forEach(c => {
        kh += `<div class="c-card"><div style="display:flex; justify-content:space-between;"><strong>${c.name}</strong><span class="mono">${c.taksitSayisi || 0} Taksit</span></div><div style="font-size:16px; margin-top:4px;" class="mono">Aylık: <strong>${Number(c.aylikTutar||0).toLocaleString('tr-TR')} ₺</strong></div></div>`;
      });
      krediContent.innerHTML = kh + `</div>`;
    }
  }
}
