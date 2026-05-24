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
