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
async function fetchRates() {
  const s = localStorage.getItem('v5-rates-'+window._planId) || localStorage.getItem('v5-rates');
  if (s) try { Object.assign(rates, JSON.parse(s)); } catch(e) {}
  renderKur();
  let anySuccess = false;
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (r.ok) { const d=await r.json(); rates.USD=d.rates.TRY; rates.EUR=d.rates.TRY/d.rates.EUR; anySuccess=true; }
    else console.warn('exchangerate-api HTTP hatası:', r.status);
  } catch(e) { console.warn('exchangerate-api erişim hatası:', e.message); }
  try {
    const r2 = await fetch('https://api.gold-api.com/price/XAU');
    if (r2.ok) { const d=await r2.json(); if(rates.USD) rates.GOLD=(d.price/31.1035)*rates.USD; anySuccess=true; }
    else console.warn('gold-api HTTP hatası:', r2.status);
  } catch(e) { console.warn('gold-api erişim hatası:', e.message); }
  if (anySuccess) {
    rates._fetchedAt = new Date().toISOString();
    localStorage.setItem('v5-rates-'+window._planId, JSON.stringify(rates));
  }
  renderKur();
  if (window.curTab === 0) render();
}

function renderKur() {
  let timeLabel = '';
  if (rates._fetchedAt) {
    const d = new Date(rates._fetchedAt);
    const ageMin = Math.round((Date.now()-d.getTime())/60000);
    const timeStr = d.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
    if (ageMin > 60) {
      const ageH = Math.floor(ageMin/60);
      timeLabel = `<span class="ktime" style="color:var(--danger)" title="${timeStr} tarihli kur — güncel olmayabilir">⚠ ${ageH}s önce</span>`;
    } else {
      timeLabel = `<span class="ktime">${timeStr}</span>`;
    }
  } else if (rates.USD || rates.EUR || rates.GOLD) {
    timeLabel = `<span class="ktime" style="color:var(--danger)" title="Kurun ne zaman çekildiği bilinmiyor">⚠ önbellek</span>`;
  }
  let h = '';
  if (rates.EUR)  h += `<div class="ki"><span class="kl">EUR</span><span class="kv e">₺${rates.EUR.toFixed(2)}</span></div><div class="ksep"></div>`;
  if (rates.USD)  h += `<div class="ki"><span class="kl">USD</span><span class="kv u">₺${rates.USD.toFixed(2)}</span></div><div class="ksep"></div>`;
  if (rates.GOLD) h += `<div class="ki"><span class="kl">Altın/gr</span><span class="kv g">₺${rates.GOLD.toFixed(0)}</span></div><div class="ksep"></div>`;
  if (h) {
    h += timeLabel + `<button class="kbtn" onclick="fetchRates()">🔄</button>`;
  } else {
    h = `<span style="font-size:11px;color:var(--danger)">Kur alınamadı</span><button class="kbtn" onclick="go(5)" style="color:var(--acc);font-weight:600;font-size:11px;margin-left:6px">Manuel Gir →</button><button class="kbtn" onclick="fetchRates()">🔄</button>`;
  }
  h += `<span id="sync-dot" title="Canlı sync"></span>`;
  h += `<span id="ver-tag" onclick="go(5)" title="Sürüm bilgisi" style="margin-left:auto;font-size:10px;font-family:'IBM Plex Mono',monospace;color:var(--muted);cursor:pointer;flex-shrink:0;padding:2px 6px;border:1px solid var(--bdr);border-radius:4px">${window.APP_VERSION}</span>`;
  document.getElementById('KB').innerHTML = h;
}

function saveRates() {
  const e = parseFloat(document.getElementById('ME').value)||0;
  const u = parseFloat(document.getElementById('MU').value)||0;
  const g = parseFloat(document.getElementById('MG').value)||0;
  if (e) rates.EUR=e; if (u) rates.USD=u; if (g) rates.GOLD=g;
  localStorage.setItem('v5-rates-'+window._planId, JSON.stringify(rates));
  renderKur();
  if (window.curTab === 0) render();
  alert('Kurlar kaydedildi!');
}

// ── AYARLAR SEKMESİ ──────────────────────────────────────────────────────────
function renderAI() {
  document.getElementById('AI').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="color:var(--txt);font-size:15px;font-weight:800;letter-spacing:.5px">${window.APP_VERSION}</span>
      <span style="background:rgba(96,165,250,.15);color:var(--blue);border-radius:5px;padding:3px 10px;font-size:12px;font-family:'IBM Plex Mono',monospace">${window._knownBuild || window.APP_BUILD}</span>
    </div>
    <div>🔐 AES-256-GCM şifreli</div>
    <div>📦 ${(window.pays||[]).length} ödeme · ${(window.creds||[]).length} kredi · ${(window.paidItems||[]).length} yapılan</div>
    <div>📒 ${(window.rehber||[]).length} rehber kaydı</div>
    <div>☁️ Firebase Realtime Sync aktif</div>
  `;
  const r = JSON.parse(localStorage.getItem('v5-rates-'+window._planId)||localStorage.getItem('v5-rates')||'{}');
  if (r.EUR)  document.getElementById('ME').value = r.EUR.toFixed(2);
  if (r.USD)  document.getElementById('MU').value = r.USD.toFixed(2);
  if (r.GOLD) document.getElementById('MG').value = r.GOLD.toFixed(0);
}

// ── YEDEK / GERİ YÜKLE ───────────────────────────────────────────────────────
function doBackup() {
  document.getElementById('BPP').value = '';
  document.getElementById('BPERR').textContent = '';
  ModalManager.open('BPM');
}

async function confirmBackup() {
  const entered = document.getElementById('BPP').value;
  const pinSalt = await getSaltAsync('v5-pin-salt');
  let storedHash = null;
  if (window._fbLoadPinHash) { try { storedHash = await window._fbLoadPinHash(); } catch(e) {} }
  const enteredHash = await hashPin(entered, pinSalt);
  if (enteredHash !== storedHash) {
    document.getElementById('BPERR').textContent = 'Hatalı şifre!';
    document.getElementById('BPP').value = '';
    return;
  }
  closeMov('BPM');
  const data = {pays, creds, hist, persons, notes, paidItems, at:new Date().toISOString(), v:'7.0'};
  const enc = xEnc(JSON.stringify(data), entered);
  const payload = JSON.stringify({enc:true, data:enc, v:'7.0', hint:'odeme-takvimi-backup'});
  const blob = new Blob([payload], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const planName = getPlanName(window._planId).replace(/\s+/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'yedek-'+planName+'-'+new Date().toISOString().split('T')[0]+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert('Yedek alındı!\nDosya şifrenizle şifrelendi.');
}

function doRestore() {
  const st = document.getElementById('RS');
  if (!st.dataset.d) { st.textContent = 'Önce dosya seç'; return; }
  if (!confirm('Mevcut veriler silinecek. Emin misin?')) return;
  const d = JSON.parse(st.dataset.d);
  window.pays=d.pays||[]; window.creds=d.creds||[]; window.hist=d.hist||[];
  window.persons=d.persons||[]; window.notes=d.notes||[]; window.paidItems=d.paidItems||[];
  window.rehber=d.rehber||[]; window.actLog=d.actLog||[];
  invalidateLookups();
  save().then(() => { migrateCredDates(); closeMov('RM'); render(); });
  alert('Veriler yüklendi!');
}

// ── CSV EXPORT ───────────────────────────────────────────────────────────────
function exportExcel() {
  const all = getAllItems();
  const mx = buildMx(all);
  let rowKeys = Object.keys(mx).filter(k => mx[k]._name !== undefined);
  rowKeys.sort((a,b) => {
    const dayOf = k => {
      const mks = Object.keys(mx[k]).filter(x => !x.startsWith('_')).sort();
      if (!mks.length) return 99;
      const items = mx[k][mks[0]]?.items||[];
      return items[0] ? parseLocalDate(items[0].date).getDate() : 99;
    };
    const da=dayOf(a), db=dayOf(b);
    if (da !== db) return da-db;
    return (mx[a]._name||'').localeCompare(mx[b]._name||'','tr');
  });
  const monthSet = new Set();
  all.forEach(p => {
    const d = parseLocalDate(p.date);
    monthSet.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  });
  const months = Array.from(monthSet).sort();
  const mLabels = months.map(m => {
    const [y,mo] = m.split('-');
    return new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'short',year:'numeric'});
  });
  const SEP = ';';
  const rows = [];
  rows.push(['Odeme','Gun',...mLabels,'Kalan Toplam'].join(SEP));
  rowKeys.forEach(k => {
    const dispName = mx[k]._name || k;
    const _firstMk = Object.keys(mx[k]).filter(x => !x.startsWith('_')).sort()[0];
    const _dayNum = _firstMk && mx[k][_firstMk]?.items?.[0]?.date ? parseLocalDate(mx[k][_firstMk].items[0].date).getDate() : '';
    const cells = months.map(m => {
      const c = mx[k]?.[m];
      if (!c) return '';
      if (c.status === 'paid') return 'Odendi';
      const totalPaid = c.items.reduce((a,p) => a+(p.paid||0), 0);
      const kalan = Math.round(c.try-totalPaid);
      if (c.status === 'partial') return kalan;
      return Math.round(c.try);
    });
    const rKalan = Math.round(months.reduce((acc,m) => {
      const c = mx[k]?.[m]; if (!c) return acc;
      if (c.status === 'paid') return acc;
      if (c.status === 'partial') return acc+(c.try-c.items.reduce((a,p)=>a+(p.paid||0),0));
      return acc+c.try;
    }, 0));
    rows.push([dispName, _dayNum, ...cells, rKalan].join(SEP));
  });
  const colTots = months.map(m => rowKeys.reduce((s,k) => {
    const c = mx[k]&&mx[k][m];
    if (!c) return s;
    if (c.status === 'paid') return s;
    if (c.status === 'partial') return s+(c.try-c.items.reduce((a,p)=>a+(p.paid||0),0));
    return s+c.try;
  }, 0));
  rows.push(['TOPLAM','',...colTots.map(t=>Math.round(t)),Math.round(colTots.reduce((a,b)=>a+b,0))].join(SEP));
  const csv = String.fromCharCode(65279) + rows.join(String.fromCharCode(10));
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'odeme-plani-'+new Date().toISOString().split('T')[0]+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
async function manualCheckUpdate() {
  const statusEl = document.getElementById('UPD_STATUS');
  const btnEl    = document.getElementById('UPD_BTN');
  if (statusEl) statusEl.textContent = 'Kontrol ediliyor...';
  if (btnEl) btnEl.disabled = true;
  try {
    const r = await fetch('./version.json?t=' + Date.now(), {cache:'no-store'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (d.build && d.build !== window._knownBuild) {
      if (statusEl) statusEl.textContent = '🔄 Yeni sürüm mevcut: ' + d.v;
      showUpdBanner(d.v);
    } else {
      if (statusEl) statusEl.textContent = '✅ Güncel sürümdesiniz (v' + window.APP_VERSION + ')';
    }
  } catch(e) {
    if (statusEl) statusEl.textContent = '❌ Kontrol edilemedi: ' + e.message;
  }
  if (btnEl) btnEl.disabled = false;
}

async function initBuild() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), {cache:'no-store'});
    if (!r.ok) return;
    const d = await r.json();
    if (d.build) window._knownBuild = d.build;
  } catch(e) {}
}

async function checkVersion() {
  try {
    const r = await fetch('./version.json?t=' + Date.now(), {cache:'no-store'});
    if (!r.ok) return;
    const d = await r.json();
    if (d.build && d.build !== window._knownBuild) {
      window._knownBuild = d.build;
      showUpdBanner(d.v);
    }
  } catch(e) {}
}

function showUpdBanner(newVer) {
  const b = document.getElementById('upd-banner');
  if (!b) return;
  const txt = b.querySelector('.upd-txt');
  if (txt) txt.textContent = '🔄 Yeni sürüm: ' + (newVer || '');
  b.classList.add('show');
}

function updApply() {
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .finally(() => { window.location.reload(true); });
}

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
window.fetchRates         = fetchRates;
window.renderKur          = renderKur;
window.saveRates          = saveRates;
window.renderAI           = renderAI;
window.doBackup           = doBackup;
window.confirmBackup      = confirmBackup;
window.doRestore          = doRestore;
window.exportExcel        = exportExcel;
window.switchPlan         = switchPlan;
window.addLog             = addLog;
window.manualCheckUpdate  = manualCheckUpdate;
window.initBuild          = initBuild;
window.checkVersion       = checkVersion;
window.showUpdBanner      = showUpdBanner;
window.updApply           = updApply;
window.initApp            = initApp;

// ── SAYFA AÇILIŞINDA OTOMATİK ────────────────────────────────────────────────
// Modules deferred olduğundan DOM hazır olduğunda çalışır
initBuild();
setTimeout(checkVersion, 3000);
setInterval(checkVersion, 5 * 60 * 1000);

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
