// js/app.js — iskenderpay (v1.0)
// Uygulama yaşam döngüsü, sekme yönetimi, kur, yedek/geri yükleme, versiyon.
// Tüm state window.* üzerinden okunur/yazılır.

// ── PLAN ADI ─────────────────────────────────────────────────────────────────
function getPlanName(planId) {
  return localStorage.getItem('v6-name-' + planId) || (planId === 'plan1' ? 'Plan 1' : 'Plan 2');
}

function editPlanName(planId) {
  const elId = planId === 'plan1' ? 'PLS_NAME1' : 'PLS_NAME2';
  const el = document.getElementById(elId);
  if (!el || el.querySelector('input')) return;
  const current = el.textContent;
  el.innerHTML = '';
  const inp = document.createElement('input');
  inp.value = current;
  inp.style.cssText = 'background:rgba(255,255,255,.1);border:1px solid var(--acc);border-radius:6px;color:var(--txt);font-size:14px;font-weight:600;padding:2px 8px;width:140px;outline:none';
  el.appendChild(inp);
  inp.focus(); inp.select();
  function save() {
    const val = inp.value.trim();
    if (val) localStorage.setItem('v6-name-' + planId, val);
    renderPlanNames();
  }
  inp.addEventListener('blur', save);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { inp.blur(); }
    if (e.key === 'Escape') { inp.value = current; inp.blur(); }
  });
}

function renderPlanNames() {
  const n1 = getPlanName('plan1');
  const n2 = getPlanName('plan2');
  const el1 = document.getElementById('PLS_NAME1');
  const el2 = document.getElementById('PLS_NAME2');
  if (el1) el1.textContent = n1;
  if (el2) el2.textContent = n2;
}

// ── PLAN SEÇ ─────────────────────────────────────────────────────────────────
function selectPlan(planId) {
  window._planId = planId;
  localStorage.setItem('v6-active-plan', planId);
  // Veri dizilerini sıfırla — _cryptoKey ve _dataKeyRaw KORUNUYOR
  window.pays=[]; window.creds=[]; window.hist=[]; window.persons=[];
  window.notes=[]; window.paidItems=[]; window.rehber=[]; window.actLog=[];
  document.getElementById('PLS').style.display = 'none';
  const psEl = document.getElementById('PS');
  psEl.style.display = '';
  psEl.classList.add('active');
  const planName = getPlanName(planId);
  const subEl = document.querySelector('.pin-sub');
  if (subEl) subEl.textContent = planName + ' şifresini girin';
  const pi = document.getElementById('PI');
  if (pi) pi.value = '';
}

// ── APP GİRİŞİ ───────────────────────────────────────────────────────────────
function enterApp() {
  document.getElementById('PS').classList.remove('active');
  document.getElementById('PS').style.display = 'none';
  document.getElementById('APP').style.display = '';
  rhbNormalizeCompanies();
  if (!window._migrationRunning) {
    window._migrationRunning = true;
    migrateToV7().then(() => migrateToV7b())
      .catch(e => console.warn('Migrasyon hatası:', e))
      .finally(() => { window._migrationRunning = false; });
  }
  initApp();
  startRealtimeSync();
}

function rhbNormalizeCompanies() {
  let changed = false;
  (window.rehber || []).forEach(p => {
    const norm = (p.company||'').toLocaleUpperCase('tr').trim();
    if (norm !== (p.company||'')) { p.company = norm; changed = true; }
    const normName = (p.name||'').toLocaleUpperCase('tr').trim();
    if (normName !== (p.name||'')) { p.name = normName; changed = true; }
  });
  if (changed) rhbSave();
}

function rhbSave() { saveSecure(); }

function openRehber() { go(6); }

// ── SEKME YÖNETİMİ ───────────────────────────────────────────────────────────
function go(n) {
  window.curTab = n;
  [0,1,2,3,4,5,6,7].forEach(i => {
    const t = document.getElementById('T'+i); if (t) t.style.display = i===n ? '' : 'none';
    const m = document.getElementById('m'+i); if (m) m.classList.toggle('on', i===n);
    const s = document.getElementById('s'+i); if (s) s.classList.toggle('on', i===n);
  });
  if (n===0) render();
  if (n===1) renderPaid();
  if (n===2) renderPersons();
  if (n===3) renderNotes();
  if (n===4) renderHist();
  if (n===5) renderAI();
  if (n===6) renderRhb();
  if (n===7) renderActLog();
}

function chSort(v) { window.sortMode = v; render(); }
async function chAhead(v) { localStorage.setItem('v5-ahead', v); render(); }
function genRec() {} // v7'de kaldırıldı — compat için boş

// ── MİGRASYON (kredi tarihleri) ──────────────────────────────────────────────
async function migrateCredDates() {
  (window.creds || []).forEach(c => {
    if (!c.start || !c.pays || !c.window.pays.length) return;
    const [_sy,_sm,_sd] = c.start.split('-').map(Number);
    const startDay=_sd, startMo=_sm-1, startYr=_sy;
    c.window.pays.forEach((p,i) => {
      const totalMo = startMo + i;
      const yr = startYr + Math.floor(totalMo/12), mo = totalMo%12;
      const lastDay = new Date(yr, mo+1, 0).getDate();
      const correct = toLocalISO(yr, mo, Math.min(startDay, lastDay));
      if (p.date !== correct) p.date = correct;
    });
  });
  genRec();
}

// ── SYNC UI ──────────────────────────────────────────────────────────────────
function setSyncDot(state) {
  const d = document.getElementById('sync-dot');
  if (!d) return;
  d.className = state;
  const labels = {connecting:'Bağlanıyor...', active:'Sync aktif', synced:'Senkronize edildi'};
  d.title = labels[state] || '';
}

function showSyncToast() {
  const t = document.getElementById('sync-toast');
  if (!t) return;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function toggleEye(id) {
  const i = document.getElementById(id);
  if (!i) return;
  i.type = i.type === 'password' ? 'text' : 'password';
}

// ── KUR ──────────────────────────────────────────────────────────────────────

// ── AYARLAR SEKMESİ ──────────────────────────────────────────────────────────
function renderAI() {
  const pays     = window.pays     || [];
  const creds    = window.creds    || [];
  const paidItems= window.paidItems|| [];
  const rehber   = window.rehber   || [];

  // Bu ay istatistikleri
  const now  = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth();
  const buAy = pays.filter(p => {
    const d = parseLocalDate(p.date);
    return d.getFullYear()===nowY && d.getMonth()===nowM;
  });
  const buAyTot  = buAy.reduce((s,p) => s+toTRY(p.amount,p.currency||'TRY'), 0);
  const buAyOdendi = buAy.filter(p=>(p.status||'pending')==='paid').reduce((s,p)=>s+toTRY(p.amount,p.currency||'TRY'),0);
  const buAyGec  = buAy.filter(p=>(p.status||'pending')!=='paid'&&isOD(p)).reduce((s,p)=>s+toTRY(p.amount,p.currency||'TRY'),0);

  // Genel toplam borç (tüm ödenmemiş)
  const toplamBekleyen = pays.filter(p=>(p.status||'pending')!=='paid')
    .reduce((s,p)=>s+toTRY(p.amount,p.currency||'TRY'),0);
  const krediBekleyen = creds.reduce((s,c)=>s+c.pays.filter(p=>(p.status||'pending')!=='paid')
    .reduce((a,p)=>a+p.amount,0),0);

  // Son 3 ay ödeme trendi
  const trend = [];
  for(let i=2;i>=0;i--){
    const tM=new Date(nowY,nowM-i,1);
    const tY=tM.getFullYear(), tMo=tM.getMonth();
    const mPays=paidItems.filter(p=>{const d=parseLocalDate(p.date);return d.getFullYear()===tY&&d.getMonth()===tMo;});
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

// ── YEDEK / GERİ YÜKLE ───────────────────────────────────────────────────────

// ── CSV EXPORT ───────────────────────────────────────────────────────────────

function switchPlan() {
  if (!confirm('Plan değiştirilecek. Mevcut plan kaydedildi.')) return;
  document.getElementById('APP').style.display = 'none';
  document.getElementById('PLS').style.display = 'flex';
}

// ── AKTİVİTE LOGU ────────────────────────────────────────────────────────────
function addLog(type, title, detail, navTab) {
  try {
    const entry = {
      id: Date.now() + Math.random(),
      type, title: String(title||''), detail: String(detail||''),
      navTab: (navTab !== undefined && navTab !== null) ? navTab : -1,
      at: new Date().toISOString()
    };
    (window.actLog || []).unshift(entry);
    clearTimeout(window._logSaveTimer);
    window._logSaveTimer = setTimeout(() => { try { saveSecure(); } catch(e) {} }, 800);
  } catch(e) { console.warn('addLog hata:', e); }
}

// ── INIT ─────────────────────────────────────────────────────────────────────
function initApp() {
  const ah = localStorage.getItem('v5-ahead') || '6';
  document.getElementById('AH').value = ah;
  const sortEl = document.getElementById('SORT');
  if (sortEl) sortEl.value = window.sortMode;
  const planName = getPlanName(window._planId);
  const planBtn = document.getElementById('PLANBTN');
  if (planBtn) planBtn.textContent = '🔄 ' + planName + ' › Değiştir';
  migrateCredDates();
  go(0);
  fetchRates();
}

// ── GÜNCELLEME ───────────────────────────────────────────────────────────────

// ── GLOBAL COMPAT ─────────────────────────────────────────────────────────────
window.getPlanName        = getPlanName;
window.editPlanName       = editPlanName;
window.renderPlanNames    = renderPlanNames;
window.selectPlan         = selectPlan;
window.enterApp           = enterApp;
window.rhbNormalizeCompanies = rhbNormalizeCompanies;
window.rhbSave            = rhbSave;
window.openRehber         = openRehber;
window.go                 = go;
window.chSort             = chSort;
window.chAhead            = chAhead;
window.genRec             = genRec;
window.migrateCredDates   = migrateCredDates;
window.setSyncDot         = setSyncDot;
window.showSyncToast      = showSyncToast;
window.toggleEye          = toggleEye;
window.renderAI           = renderAI;
window.switchPlan         = switchPlan;
window.addLog             = addLog;
window.initApp            = initApp;

// ── SAYFA AÇILIŞINDA OTOMATİK ────────────────────────────────────────────────
// Modules deferred olduğundan DOM hazır olduğunda çalışır

// ── SYNC UI (db.js tarafından çağrılır) ───────────────────────────────────────
async function startRealtimeSync() {
  if (!window._fbStartListen) return;
  setSyncDot('connecting');
  window._lastUpdated = 0;
  window._fbStartListen(async encData => {
    if (!window._cryptoKey) return;
    try {
      const d = await decryptData(encData, window._cryptoKey);
      window.pays      = d.pays      || [];
      window.creds     = d.creds     || [];
      window.hist      = d.hist      || [];
      window.persons   = d.persons   || [];
      window.notes     = d.notes     || [];
      window.paidItems = d.paidItems || [];
      window.rehber    = d.rehber    || [];
      window.actLog    = d.actLog    || [];
      if (window.invalidateLookups) window.invalidateLookups();
      if (window.render)       window.render();
      if (window.renderHist)   window.renderHist();
      if (window.renderPaid)   window.renderPaid();
      if (window.renderPersons)window.renderPersons();
      if (window.renderNotes)  window.renderNotes();
      if (window.renderRhb)    window.renderRhb();
      setSyncDot('synced');
      showSyncToast();
    } catch(e) { console.warn('Sync decrypt hatasi:', e); }
  });
}

function showPinErr(msg) {
  const inp = document.getElementById('PI');
  if (!inp) return;
  inp.classList.add('err');
  const pe = document.getElementById('PE');
  if (pe) pe.textContent = msg;
  setTimeout(() => {
    inp.classList.remove('err');
    if (pe) pe.textContent = '';
    inp.value = '';
  }, 2000);
}

function readRF(inp) {
  const f = inp.files[0]; if (!f) return;
  const st = document.getElementById('RS');
  const fr = new FileReader();
  fr.onload = e => {
    try {
      const raw = JSON.parse(e.target.result);
      const pin = window._plainPin;
      let data;
      if (raw.enc && raw.data) {
        const dec = xDec(raw.data, pin);
        if (!dec) { st.style.color='var(--danger)'; st.textContent='Şifre eşleşmiyor.'; return; }
        data = JSON.parse(dec);
      } else { st.style.color='var(--danger)'; st.textContent='Geçersiz dosya'; return; }
      st.style.color = 'var(--ok)';
      st.textContent = (data.pays||[]).length+' ödeme, '+(data.creds||[]).length+" kredi bulundu. Geri Yükle'ye bas.";
      st.dataset.d = JSON.stringify(data);
    } catch(err) { st.style.color='var(--danger)'; st.textContent='Hata: '+err.message; }
  };
  fr.readAsText(f);
}

window.startRealtimeSync = startRealtimeSync;
window.showPinErr        = showPinErr;
window.readRF            = readRF;

// ── VİSİBİLİTY SYNC POLL ─────────────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (window.setSyncDot) setSyncDot('connecting');
    setTimeout(() => { if (window._fbPoll) window._fbPoll(); }, 500);
  }
});
