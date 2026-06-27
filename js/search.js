// js/search.js — iskenderpay
// Global arama, ayarlar sekmesi

import { getKnownBuild } from './version.js';
import { toTRY, araNormalize } from './util.js';

function execGlobalSearch() {
  const query = araNormalize(document.getElementById('SRCHINP').value);
  const resDiv = document.getElementById('SRCHRES');
  if (!query) { resDiv.innerHTML = '<div style="text-align:center;color:var(--tc);opacity:.5;padding:20px 0">Yazmaya başlayın...</div>'; return; }
  let html = '', count = 0;
  (window.pays||[]).forEach(p => {
    if (!(araNormalize(p.name).includes(query)||String(p.amount||'').includes(query))) return;
    count++;
    // v8.193: Plan matrisi paritesi — TRY karsiligi ana deger + orijinal doviz kucuk rozet.
    // Eskiden ham p.amount'a duz ₺ yapistiriliyordu (38 gr altin -> "₺38", 5820 EUR -> "₺5.820").
    const a = window.fmt(toTRY(p.amount, p.currency||'TRY', window.rates));
    const orig = (p.currency && p.currency!=='TRY') ? ` <span style="opacity:.55;font-size:.78em">${window.fmtA(p.amount,p.currency)}</span>` : '';
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ffd200">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${window.esc(p.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>📅 Plan Ödemesi (${p.date||''})</span><span class="mono" style="color:#ffd200">${a}${orig}</span>
      </div></div>`;
  });
  (window.paidItems||[]).forEach(pi => {
    if (!(araNormalize(pi.name).includes(query)||String(pi.amount||'').includes(query))) return;
    count++;
    // v8.192: log.js/hesap.js paidOf paritesi — duzenleme p.paid'e yazilir (savePaidItem),
    // markOk her zaman paid=toTRY(amount) yazar. Eskiden ham pi.amount gosteriliyordu.
    // v8.193: orijinal doviz rozeti eklendi (Plan matrisi paritesi).
    const tryAmt = pi.paid != null ? pi.paid : toTRY(pi.amount, pi.currency||'TRY', window.rates);
    const a = window.fmt(tryAmt);
    const orig = (pi.currency && pi.currency!=='TRY') ? ` <span style="opacity:.55;font-size:.78em">${window.fmtA(pi.amount,pi.currency)}</span>` : '';
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #00ebc7">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${window.esc(pi.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>✅ Gerçekleşen Ödeme (${pi.date||''})</span><span class="mono" style="color:#00ebc7">${a}${orig}</span>
      </div></div>`;
  });
  (window.creds||[]).forEach(c => {
    if (!araNormalize(c.name).includes(query)) return;
    count++;
    const total = (c.pays||[]).reduce((s,p)=>s+p.amount,0);
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ff5e62">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${window.esc(c.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>💳 ${(c.pays||[]).length} taksit</span><span class="mono" style="color:#ff5e62">₺${Number(total).toLocaleString('tr-TR',{maximumFractionDigits:0})}</span>
      </div></div>`;
  });
  (window.notes||[]).forEach(n => {
    if (!(araNormalize(n.title).includes(query)||araNormalize(n.content||n.text).includes(query))) return;
    count++;
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ff8e3c">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${window.esc(n.title||'Başlıksız Not')}</div>
      <div style="font-size:.8rem;opacity:.6;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📝 ${window.esc(n.content||n.text||'')}</div>
    </div>`;
  });
  (window.rehber||[]).forEach(r => {
    const name = araNormalize(r.name);
    const phone = (r.phones||[]).map(p=>p.num).join(' ');
    if (!(name.includes(query)||phone.includes(query)||araNormalize(r.company).includes(query))) return;
    count++;
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #38ef7d">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${window.esc(r.name||'')}</div>
      <div style="font-size:.8rem;opacity:.7;margin-top:4px;font-family:monospace">${phone?'📞 '+phone:''} ${r.company?'🏢 '+r.company:''}</div>
    </div>`;
  });
  resDiv.innerHTML = count ? html : '<div style="text-align:center;color:var(--tc);opacity:.5;padding:20px 0">Eşleşen sonuç bulunamadı.</div>';
}

function renderAI() {
  // Tum hesaplar Hesap modulune delege — tutarsizlik onlendi
  const ozet = window.Hesap.buAyOzeti();
  const buAyTot = ozet.tot, buAyOdendi = ozet.ok, buAyGec = ozet.gec;

  const top = window.Hesap.toplamOzeti();
  const toplamBekleyen = top.paysBekleyen, krediBekleyen = top.krediBekleyen;

  const trend = window.Hesap.trend(3);
  const trendMax = Math.max(...trend.map(t=>t.tot), 1);
  const trendBars = trend.map(t=>`
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1">
      <div style="font-size:10px;color:var(--muted);font-family:'IBM Plex Mono',monospace">${window.fmt(t.tot)}</div>
      <div style="width:100%;height:${Math.round((t.tot/trendMax)*48)+4}px;background:rgba(74,222,128,.35);border-radius:4px 4px 0 0;min-height:4px;transition:height .3s"></div>
      <div style="font-size:10px;color:var(--muted)">${t.lbl}</div>
    </div>`).join('');

  document.getElementById('AI').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <span style="color:var(--txt);font-size:14px;font-weight:700">${window.APP_VERSION}</span>
      <span style="background:rgba(96,165,250,.15);color:var(--blue);border-radius:5px;padding:2px 9px;font-size:11px;font-family:'IBM Plex Mono',monospace">${getKnownBuild()||window.APP_BUILD}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--surf2);border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">Bu ay toplam</div>
        <div style="font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace">${window.fmt(buAyTot)}</div>
        <div style="font-size:10px;color:var(--ok);margin-top:2px">✓ ${window.fmt(buAyOdendi)} ödendi</div>
      </div>
      <div style="background:var(--surf2);border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">Toplam bekleyen</div>
        <div style="font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace">${window.fmt(toplamBekleyen+krediBekleyen)}</div>
        <div style="font-size:10px;color:var(--danger);margin-top:2px">${buAyGec>0?'⚡ '+window.fmt(buAyGec)+' gecikmiş':window.pays.length+' kayıt · '+window.creds.length+' kredi'}</div>
      </div>
    </div>

    <div style="font-size:10px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.8px">Son 3 ay gerçekleşen</div>
    <div style="display:flex;gap:6px;align-items:flex-end;height:72px;margin-bottom:14px;padding:0 4px">
      ${trendBars}
    </div>

    <div style="font-size:10px;color:var(--muted);border-top:1px solid var(--bdr);padding-top:10px;display:flex;gap:12px;flex-wrap:wrap">
      <span>🔐 AES-256-GCM</span>
      <span>📦 ${window.pays.length} ödeme · ${window.creds.length} kredi</span>
      <span>📒 ${window.rehber.length} kişi</span>
      <span>☁️ Firebase sync</span>
    </div>
  `;

  const r = JSON.parse(localStorage.getItem('v5-rates-'+window.Store.planId)||localStorage.getItem('v5-rates')||'{}');
  if (r.EUR)  document.getElementById('ME').value = r.EUR.toFixed(2);
  if (r.USD)  document.getElementById('MU').value = r.USD.toFixed(2);
  if (r.GOLD) document.getElementById('MG').value = r.GOLD.toFixed(0);
}


// ── STORE EVENT LISTENER (v9.0) ─────────────────────────────────────────────
// Ayarlar sekmesi aktifken Store degisirse renderAI'yi yenile
window.addEventListener('store:change', e => {
  if (window.curTab !== 5) return;
  if (window.Store && window.Store._affects(e.detail, ['pays','creds','paidItems','rehber'])) renderAI();
});


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.execGlobalSearch = execGlobalSearch;
window.renderAI = renderAI;
