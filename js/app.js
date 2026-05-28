// js/app.js — iskenderpay (v1.0)
// Uygulama yaşam döngüsü, sekme yönetimi, kur, yedek/geri yükleme, versiyon.
// Tüm state window.* üzerinden okunur/yazılır.

// ── PLAN ADI ─────────────────────────────────────────────────────────────────

// ── PLAN SEÇ ─────────────────────────────────────────────────────────────────

// ── APP GİRİŞİ ───────────────────────────────────────────────────────────────
let _migrationRunning = false;  // v8.117: window._migrationRunning yerine modül-local

function _backfillPersonIds() {
  if (!window.Store) return;
  let np = 0, npy = 0;
  // Pass 1: persons'a id ata (v8.111)
  (window.persons || []).forEach(p => {
    if (!p.id) {
      window.Store.mutateItem(p, {
        id: 'per_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)
      });
      np++;
    }
  });
  // Pass 2: pays'a personId ata — isim eşleşmesi (v8.112)
  const baseOf = window.Hesap ? window.Hesap._baseOf : (n => n);
  (window.pays || []).forEach(p => {
    if (p.personId) return;
    const base = baseOf(p.name);
    const person = (window.persons || []).find(q => q.name === base);
    if (person && person.id) {
      window.Store.mutateItem(p, { personId: person.id });
      npy++;
    }
  });
  // Pass 3: actLog'a personId ata — entry.detail'in ilk segmentinden isim eşleşmesi (v8.148)
  const personByName = new Map();
  (window.persons || []).forEach(q => { if (q.id) personByName.set(q.name, q.id); });
  let nal = 0;
  (window.actLog || []).forEach(e => {
    if (e.personId) return;
    // rhb_* tipleri rehber (contact) hakkında, plan participant değil — skip
    if (e.type && e.type.startsWith('rhb_')) return;
    // cred-iliskili tipleri skip (false positive azaltir): cred_add ve detail'i 'taksit' iceren plan_edit/plan_del
    if (e.type === 'cred_add') return;
    const detail = e.detail || '';
    if (detail.includes(' taksit')) return;
    const firstSep = detail.indexOf(' · ');
    const namePart = (firstSep > 0 ? detail.substring(0, firstSep) : detail).trim();
    if (!namePart) return;
    const base = baseOf(namePart);
    const pid = personByName.get(base);
    if (pid) { window.Store.mutateItem(e, { personId: pid }); nal++; }
  });
  if (np > 0)  console.log('[backfill] ' + np + ' persons id atandı');
  if (npy > 0) console.log('[backfill] ' + npy + ' pays personId atandı');
  if (nal > 0) console.log('[backfill] ' + nal + ' actLog personId atandı');
}

function enterApp() {
  document.getElementById('PS').classList.remove('active');
  document.getElementById('PS').style.display = 'none';
  document.getElementById('APP').style.display = '';
  rhbNormalizeCompanies();
  if (!_migrationRunning) {
    _migrationRunning = true;
    window.migrateToV7()
      .then(() => _backfillPersonIds())
      .catch(e => console.warn('Migrasyon hatası:', e))
      .finally(() => { _migrationRunning = false; });
  }
  initApp();
  window.startRealtimeSync();
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

// ── SEKME YÖNETİMİ ───────────────────────────────────────────────────────────
function go(n) {
  window.curTab = n;
  [0,1,2,3,4,5,6,7].forEach(i => {
    const t = document.getElementById('T'+i); if (t) t.style.display = i===n ? '' : 'none';
    const m = document.getElementById('m'+i); if (m) m.classList.toggle('on', i===n);
    const s = document.getElementById('s'+i); if (s) s.classList.toggle('on', i===n);
  });
  if (n===0) { window.render(); if (window.renderCredSummary) window.renderCredSummary(); }
  if (n===1) window.renderPaid();
  if (n===2) window.renderPersons();
  if (n===3) window.renderNotes();
  if (n===4) window.renderHist();
  if (n===5) window.renderAI();
  if (n===6) window.renderRhb();
  if (n===7) window.renderActLog();
}

function chSort(v) { window.sortMode = v; render(); }
async function chAhead(v) { localStorage.setItem('v5-ahead', v); render(); }

// ── MİGRASYON (kredi tarihleri) ──────────────────────────────────────────────
async function migrateCredDates() {
  (window.creds || []).forEach(c => {
    if (!c.start || !c.pays || !c.pays.length) return;
    const [_sy,_sm,_sd] = c.start.split('-').map(Number);
    const startDay=_sd, startMo=_sm-1, startYr=_sy;
    c.pays.forEach((p,i) => {
      const totalMo = startMo + i;
      const yr = startYr + Math.floor(totalMo/12), mo = totalMo%12;
      const lastDay = new Date(yr, mo+1, 0).getDate();
      const correct = window.toLocalISO(yr, mo, Math.min(startDay, lastDay));
      if (p.date !== correct) p.date = correct;
    });
  });
}

// ── SYNC UI ──────────────────────────────────────────────────────────────────


function toggleEye(id) {
  const i = document.getElementById(id);
  if (!i) return;
  i.type = i.type === 'password' ? 'text' : 'password';
}

// ── KUR ──────────────────────────────────────────────────────────────────────

// ── AYARLAR SEKMESİ ──────────────────────────────────────────────────────────

// ── YEDEK / GERİ YÜKLE ───────────────────────────────────────────────────────

// ── CSV EXPORT ───────────────────────────────────────────────────────────────


// ── AKTİVİTE LOGU ────────────────────────────────────────────────────────────
// ctx (v8.136 + v8.155): opsiyonel {personId, groupId, credId} — sadece truthy alanlar entry'e set edilir
function addLog(type, title, detail, navTab, ctx) {
  try {
    const entry = {
      id: Date.now() + Math.random(),
      type, title: String(title||''), detail: String(detail||''),
      navTab: (navTab !== undefined && navTab !== null) ? navTab : -1,
      at: new Date().toISOString()
    };
    if (ctx) {
      if (ctx.personId) entry.personId = ctx.personId;
      if (ctx.groupId)  entry.groupId  = ctx.groupId;
      if (ctx.credId)   entry.credId   = ctx.credId;
    }
    (window.actLog || []).unshift(entry);
    clearTimeout(window.Store.logSaveTimer);
    window.Store.logSaveTimer = setTimeout(() => { try { window.saveSecure(); } catch(e) {} }, 800);
  } catch(e) { console.warn('addLog hata:', e); }
}

// ── INIT ─────────────────────────────────────────────────────────────────────
function initApp() {
  const ah = localStorage.getItem('v5-ahead') || '6';
  document.getElementById('AH').value = ah;
  const sortEl = document.getElementById('SORT');
  if (sortEl) sortEl.value = window.sortMode;
  const planName = window.getPlanName(window.Store.planId);
  const planBtn = document.getElementById('PLANBTN');
  if (planBtn) planBtn.textContent = '🔄 ' + planName + ' › Değiştir';
  migrateCredDates();
  go(0);
  window.fetchRates();
}

// ── GÜNCELLEME ───────────────────────────────────────────────────────────────

// ── DEBUG ─────────────────────────────────────────────────────────────────────
// Konsoldan window.debugState() — Store flag'leri, session, veri sayilari,
// kur cache, SW durumu.
function debugState() {
  const s = window.Store;
  const sess = s && s.session;
  console.log('%c🔍 debugState — ' + (window.APP_VERSION||'') + ' / ' + (window.APP_BUILD||''),
    'font-weight:700;color:#e8c07d');

  console.log('Store flags');
  console.table({
    dirty:        s.dirty,
    saveTimer:    s.saveTimer,
    syncTimer:    s.syncTimer,
    fbSyncNeeded: s.fbSyncNeeded,
    lastUpdated:  s.lastUpdated ? new Date(s.lastUpdated).toISOString() : 0,
    planId:       s.planId,
    fbUid:        s.fbUid,
  });

  console.log('Session');
  console.table({
    cryptoKey:   !!(sess && sess.cryptoKey),
    dataKeyRaw:  !!(sess && sess.dataKeyRaw),
    plainPinLen: (sess && sess.plainPin || '').length,
  });

  console.log('Veri sayilari');
  console.table({
    pays:      (window.pays      || []).length,
    creds:     (window.creds     || []).length,
    hist:      (window.hist      || []).length,
    persons:   (window.persons   || []).length,
    notes:     (window.notes     || []).length,
    paidItems: (window.paidItems || []).length,
    rehber:    (window.rehber    || []).length,
    actLog:    (window.actLog    || []).length,
  });

  console.log('Kur cache');
  const r = window.rates || {};
  console.table({
    EUR:        r.EUR,
    USD:        r.USD,
    GOLD:       r.GOLD,
    _fetchedAt: r._fetchedAt || null,
  });

  console.log('Service Worker');
  console.table({
    swController: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
  });
}

// ── GLOBAL COMPAT ─────────────────────────────────────────────────────────────
window.enterApp           = enterApp;
window.rhbNormalizeCompanies = rhbNormalizeCompanies;
window.rhbSave            = rhbSave;
window.go                 = go;
window.chSort             = chSort;
window.chAhead            = chAhead;
window.migrateCredDates   = migrateCredDates;
window.toggleEye          = toggleEye;
window.addLog             = addLog;
window.initApp            = initApp;
window.debugState         = debugState;

// ── SAYFA AÇILIŞINDA OTOMATİK ────────────────────────────────────────────────
// Modules deferred olduğundan DOM hazır olduğunda çalışır

// ── SYNC UI (db.js tarafından çağrılır) ───────────────────────────────────────

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
      const pin = window.Store.session.plainPin;
      let data;
      if (raw.enc && raw.data) {
        const dec = window.xDec(raw.data, pin);
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

window.showPinErr        = showPinErr;
window.readRF            = readRF;

// ── VİSİBİLİTY SYNC POLL ─────────────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (window.setSyncDot) window.setSyncDot('connecting');
    setTimeout(() => { if (window._fbPoll) window._fbPoll(); }, 500);
  }
});
