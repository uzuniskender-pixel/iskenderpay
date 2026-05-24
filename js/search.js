// js/search.js — iskenderpay
// Global arama, ayarlar sekmesi

function execGlobalSearch() {
  const query = document.getElementById('SRCHINP').value.trim().toLocaleLowerCase('tr');
  const resDiv = document.getElementById('SRCHRES');
  if (!query) { resDiv.innerHTML = '<div style="text-align:center;color:var(--tc);opacity:.5;padding:20px 0">Yazmaya başlayın...</div>'; return; }
  let html = '', count = 0;
  (window.pays||[]).forEach(p => {
    if (!((p.name||'').toLocaleLowerCase('tr').includes(query)||(String(p.amount||'')).includes(query))) return;
    count++;
    const a = Number(p.amount||0).toLocaleString('tr-TR',{maximumFractionDigits:0});
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ffd200">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(p.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>📅 Plan Ödemesi (${p.date||''})</span><span class="mono" style="color:#ffd200">₺${a}</span>
      </div></div>`;
  });
  (window.paidItems||[]).forEach(pi => {
    if (!((pi.name||'').toLocaleLowerCase('tr').includes(query)||(String(pi.amount||'')).includes(query))) return;
    count++;
    const a = Number(pi.amount||0).toLocaleString('tr-TR',{maximumFractionDigits:0});
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #00ebc7">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(pi.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>✅ Gerçekleşen Ödeme (${pi.date||''})</span><span class="mono" style="color:#00ebc7">₺${a}</span>
      </div></div>`;
  });
  (window.creds||[]).forEach(c => {
    if (!((c.name||'').toLocaleLowerCase('tr').includes(query))) return;
    count++;
    const total = (c.pays||[]).reduce((s,p)=>s+p.amount,0);
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ff5e62">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(c.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>💳 ${(c.pays||[]).length} taksit</span><span class="mono" style="color:#ff5e62">₺${Number(total).toLocaleString('tr-TR',{maximumFractionDigits:0})}</span>
      </div></div>`;
  });
  (window.notes||[]).forEach(n => {
    if (!((n.title||'').toLocaleLowerCase('tr').includes(query)||(n.content||n.text||'').toLocaleLowerCase('tr').includes(query))) return;
    count++;
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ff8e3c">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(n.title||'Başlıksız Not')}</div>
      <div style="font-size:.8rem;opacity:.6;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📝 ${esc(n.content||n.text||'')}</div>
    </div>`;
  });
  (window.rehber||[]).forEach(r => {
    const name = (r.name||'').toLocaleLowerCase('tr');
    const phone = (r.phones||[]).map(p=>p.num).join(' ');
    if (!(name.includes(query)||phone.includes(query)||(r.company||'').toLocaleLowerCase('tr').includes(query))) return;
    count++;
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #38ef7d">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(r.name||'')}</div>
      <div style="font-size:.8rem;opacity:.7;margin-top:4px;font-family:monospace">${phone?'📞 '+phone:''} ${r.company?'🏢 '+r.company:''}</div>
    </div>`;
  });
  resDiv.innerHTML = count ? html : '<div style="text-align:center;color:var(--tc);opacity:.5;padding:20px 0">Eşleşen sonuç bulunamadı.</div>';
}

function renderAI() {
  const pays     = window.pays     || [];
  const creds    = window.creds    || [];
  const paidItems= window.paidItems|| [];
  const rehber   = window.rehber   || [];

  // Bu ay istatistikleri
  const now  = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth();
  const buAy = window.pays.filter(p => {
    const d = parseLocalDate(p.date);
    return d.getFullYear()===nowY && d.getMonth()===nowM;
  });
  const buAyTot  = buAy.reduce((s,p) => s+toTRY(p.amount,p.currency||'TRY'), 0);
  const buAyOdendi = buAy.filter(p=>(p.status||'pending')==='paid').reduce((s,p)=>s+toTRY(p.amount,p.currency||'TRY'),0);
  const buAyGec  = buAy.filter(p=>(p.status||'pending')!=='paid'&&isOD(p)).reduce((s,p)=>s+toTRY(p.amount,p.currency||'TRY'),0);

  // Genel toplam borç (tüm ödenmemiş)
  const toplamBekleyen = window.pays.filter(p=>(p.status||'pending')!=='paid')
    .reduce((s,p)=>s+toTRY(p.amount,p.currency||'TRY'),0);
  const krediBekleyen = creds.reduce((s,c)=>s+c.pays.filter(p=>(p.status||'pending')!=='paid')
    .reduce((a,p)=>a+p.amount,0),0);

  // Son 3 ay ödeme trendi
  const trend = [];
  for(let i=2;i>=0;i--){
    const tM=new Date(nowY,nowM-i,1);
    const tY=tM.getFullYear(), tMo=tM.getMonth();
    const mPays=window.paidItems.filter(p=>{const d=parseLocalDate(p.date);return d.getFullYear()===tY&&d.getMonth()===tMo;});
    const mTot=mPays.reduce((s,p)=>s+(p.paid||toTRY(p.amount,p.currency||'TRY')),0);
    trend.push({lbl:tM.toLocaleDateString('tr-TR',{month:'short'}), tot:mTot});
  }
  const trendMax = Math.max(...trend.map(t=>t.tot), 1);
  const trendBars = trend.map(t=>`
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1">
      <div style="font-size:10px;color:var(--muted);font-family:'IBM Plex Mono',monospace">${fmt(t.tot)}</div>
      <div style="width:100%;height:${Math.round((t.tot/trendMax)*48)+4}px;background:rgba(74,222,128,.35);border-radius:4px 4px 0 0;min-height:4px;transition:height .3s"></div>
      <div style="font-size:10px;color:var(--muted)">${t.lbl}</div>
    </div>`).join('');

  document.getElementById('AI').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <span style="color:var(--txt);font-size:14px;font-weight:700">${window.APP_VERSION}</span>
      <span style="background:rgba(96,165,250,.15);color:var(--blue);border-radius:5px;padding:2px 9px;font-size:11px;font-family:'IBM Plex Mono',monospace">${window._knownBuild||window.APP_BUILD}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--surf2);border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">Bu ay toplam</div>
        <div style="font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace">${fmt(buAyTot)}</div>
        <div style="font-size:10px;color:var(--ok);margin-top:2px">✓ ${fmt(buAyOdendi)} ödendi</div>
      </div>
      <div style="background:var(--surf2);border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">Toplam bekleyen</div>
        <div style="font-size:16px;font-weight:700;font-family:'IBM Plex Mono',monospace">${fmt(toplamBekleyen+krediBekleyen)}</div>
        <div style="font-size:10px;color:var(--danger);margin-top:2px">${buAyGec>0?'⚡ '+fmt(buAyGec)+' gecikmiş':pays.length+' kayıt · '+creds.length+' kredi'}</div>
      </div>
    </div>

    <div style="font-size:10px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.8px">Son 3 ay gerçekleşen</div>
    <div style="display:flex;gap:6px;align-items:flex-end;height:72px;margin-bottom:14px;padding:0 4px">
      ${trendBars}
    </div>

    <div style="font-size:10px;color:var(--muted);border-top:1px solid var(--bdr);padding-top:10px;display:flex;gap:12px;flex-wrap:wrap">
      <span>🔐 AES-256-GCM</span>
      <span>📦 ${pays.length} ödeme · ${creds.length} kredi</span>
      <span>📒 ${rehber.length} kişi</span>
      <span>☁️ Firebase sync</span>
    </div>
  `;

  const r = JSON.parse(localStorage.getItem('v5-rates-'+window._planId)||localStorage.getItem('v5-rates')||'{}');
  if (r.EUR)  document.getElementById('ME').value = r.EUR.toFixed(2);
  if (r.USD)  document.getElementById('MU').value = r.USD.toFixed(2);
  if (r.GOLD) document.getElementById('MG').value = r.GOLD.toFixed(0);
}


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.execGlobalSearch = execGlobalSearch;
window.renderAI = renderAI;
