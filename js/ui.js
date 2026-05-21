// js/ui.js
// iskenderpay — Arayüz ve Matris Render Motoru (v8.16)

import { state } from './state.js';

/**
 * Sol/Yan menüde yer alan yapay zeka ve sistem metrikleri panelini render eder.
 */
export function renderAI() {
  const aiEl = document.getElementById('AI');
  if (!aiEl) return;
  
  const buildStr = (typeof window._knownBuild !== 'undefined' && window._knownBuild) ? window._knownBuild : '20260521-02'; 
  
  let h = '';
  h += `<div style="margin-bottom: 6px;"><strong>Sürüm:</strong> <span class="mono">v8.16</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Build:</strong> <span class="mono">${buildStr}</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Aktif Plan:</strong> <span class="mono">${window._planId || 'plan1'}</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Ödeme Planı (pays):</strong> <span class="mono">${state.pays ? state.pays.length : 0} kayıt</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Kredi/Taksit:</strong> <span class="mono">${state.creds ? state.creds.length : 0} adet</span></div>`;
  h += `<div style="margin-bottom: 6px;"><strong>Yapılan Ödemeler:</strong> <span class="mono">${state.paidItems ? state.paidItems.length : 0} kayıt</span></div>`;
  
  aiEl.innerHTML = h;
}

/**
 * Plan adlarını getiren ve render eden yardımcı işlevler
 */
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
  if (!trimmed) {
    alert('Plan adı boş olamaz.');
    return;
  }
  localStorage.setItem('v6-name-' + planId, trimmed);
  renderPlanNames();
};

/**
 * Ana Matris ve Tüm Sekme İçeriklerini Çizen Devasa Orijinal Render Döngüsü
 */
export function render() {
  console.log("[UI] Ana render döngüsü çalışıyor...");
  renderAI();
  renderPlanNames();

  // 1. ADIM: MATRIS VERİLERİNİ HESAPLA VE ÇİZ (MAIN_GRID)
  const mainGrid = document.getElementById('MAIN_GRID');
  const matrisSummary = document.getElementById('MATRIS_SUMMARY');
  
  if (mainGrid) {
    if (!state.pays || state.pays.length === 0) {
      mainGrid.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--para);">
          <div style="font-size: 40px; margin-bottom: 12px;">🔓</div>
          <h3>Şifreli Veri Bulunmamaktadır</h3>
          <p style="margin-top: 6px; font-size:12px; opacity:0.7;">PIN girilmemiş olabilir veya bu plan henüz boş.</p>
        </div>
      `;
      if (matrisSummary) matrisSummary.innerHTML = '';
      return;
    }

    // Orijinal index.html matris tablosu oluşturma mantığı
    let months = [];
    state.pays.forEach(p => {
      if (p.date) {
        let m = p.date.substring(0, 7); // YYYY-MM
        if (!months.includes(m)) months.push(m);
      }
    });
    months.sort();

    // Eğer ay yoksa bu ayı ekle baseline
    if (months.length === 0) {
      let nowStr = new Date().toISOString().substring(0, 7);
      months.push(nowStr);
    }

    // İsme göre grupla (Orijinal groupId satır birleştirme mantığı)
    let rowsMap = {};
    state.pays.forEach(p => {
      let gid = p.groupId || ('g_' + p.name);
      if (!rowsMap[gid]) {
        rowsMap[gid] = { name: p.name, items: [] };
      }
      rowsMap[gid].items.push(p);
    });

    let h = `<table class="m-tbl"><thead><tr><th>ÖDEME ADI / AYLAR</th>`;
    months.forEach(m => {
      h += `<th class="mono">${m}</th>`;
    });
    h += `</tr></thead><tbody>`;

    // Satırları isme göre alfabetik diz
    let sortedGids = Object.keys(rowsMap).sort((a,b) => rowsMap[a].name.localeCompare(rowsMap[b].name));

    sortedGids.forEach(gid => {
      let row = rowsMap[gid];
      h += `<tr><td>${row.name}</td>`;
      
      months.forEach(m => {
        let match = row.items.find(p => p.date && p.date.substring(0, 7) === m);
        if (match) {
          let isPaid = match.isPaid ? 'line-through; opacity: 0.5;' : '';
          let color = match.isPaid ? '#2e7d32' : 'var(--bbutton)';
          h += `<td class="mono" style="${isPaid} color: ${color}; font-weight:600;">${Number(match.amt).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})} ₺</td>`;
        } else {
          h += `<td style="opacity:0.15; text-align:center;">-</td>`;
        }
      });
      
      h += `</tr>`;
    });

    h += `</tbody></table>`;
    mainGrid.innerHTML = h;

    // Özet Kartlarını Çiz
    if (matrisSummary) {
      let totalUnpaid = 0;
      let totalPaid = 0;
      state.pays.forEach(p => {
        if (p.isPaid) totalPaid += Number(p.amt || 0);
        else totalUnpaid += Number(p.amt || 0);
      });

      matrisSummary.innerHTML = `
        <div class="c-row">
          <div class="c-card">
            <span class="c-lbl">Gelecek Ödemeler</span>
            <span class="c-val mono" style="color:var(--sec);">${totalUnpaid.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div class="c-card">
            <span class="c-lbl">Tamamlanan Ödemeler</span>
            <span class="c-val mono" style="color:#2e7d32;">${totalPaid.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div class="c-card">
            <span class="c-lbl">Toplam Plan Boyutu</span>
            <span class="c-val mono">${(totalUnpaid + totalPaid).toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>
      `;
    }
  }

  // 2. ADIM: DİĞER SEKMELERİ (KREDİLER, NOTLAR VS.) İÇERİĞE GÖRE DOLDUR
  _renderSubTabs();
}

/**
 * Krediler, Ödemeler, Notlar gibi alt görünümleri dolduran yardımcı iç işlev
 */
function _renderSubTabs() {
  const krediContent = document.getElementById('KREDI_CONTENT');
  if (krediContent) {
    if (!state.creds || state.creds.length === 0) {
      krediContent.innerHTML = `<p style="opacity:0.4; padding:20px;">Kayıtlı aktif kredi/taksit bulunamadı.</p>`;
    } else {
      let kh = `<div style="display:flex; flex-direction:column; gap:10px;">`;
      state.creds.forEach(c => {
        kh += `
          <div class="c-card">
            <div style="display:flex; justify-content:between; align-items:center;">
              <strong style="font-size:14px;">${c.name}</strong>
              <span class="mono" style="margin-left:auto; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${c.taksitSayisi || 0} Taksit</span>
            </div>
            <div style="font-size:16px; margin-top:4px;" class="mono">Aylık: <strong>${Number(c.aylikTutar || 0).toLocaleString('tr-TR')} ₺</strong></div>
          </div>`;
      });
      kh += `</div>`;
      krediContent.innerHTML = kh;
    }
  }

  const notlarContent = document.getElementById('NOTLAR_CONTENT');
  if (notlarContent) {
    if (!state.notes || state.notes.length === 0) {
      notlarContent.innerHTML = `<p style="opacity:0.4; padding:20px;">Şifreli not bulunamadı.</p>`;
    } else {
      let nh = `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">`;
      state.notes.forEach(n => {
        nh += `
          <div class="c-card">
            <strong style="color:var(--bbutton); border-bottom:1px solid var(--line); padding-bottom:4px; margin-bottom:6px;">${n.title || 'Not'}</strong>
            <p style="white-space:pre-wrap; font-size:12px; color:var(--para);">${n.content || ''}</p>
          </div>`;
      });
      nh += `</div>`;
      notlarContent.innerHTML = nh;
    }
  }
}
