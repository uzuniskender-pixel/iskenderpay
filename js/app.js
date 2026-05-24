// js/app.js — iskenderpay (v1.0)
// Uygulama yaşam döngüsü, sekme yönetimi, kur, yedek/geri yükleme, versiyon.
// Tüm state window.* üzerinden okunur/yazılır.

// ── PLAN ADI ─────────────────────────────────────────────────────────────────

// ── PLAN SEÇ ─────────────────────────────────────────────────────────────────

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
    if (!c.start || !c.pays || !c.pays.length) return;
    const [_sy,_sm,_sd] = c.start.split('-').map(Number);
    const startDay=_sd, startMo=_sm-1, startYr=_sy;
    c.pays.forEach((p,i) => {
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
window.enterApp           = enterApp;
window.rhbNormalizeCompanies = rhbNormalizeCompanies;
window.rhbSave            = rhbSave;
window.openRehber         = openRehber;
window.go                 = go;
window.chSort             = chSort;
window.chAhead            = chAhead;
window.genRec             = genRec;
window.migrateCredDates   = migrateCredDates;
window.toggleEye          = toggleEye;
window.addLog             = addLog;
window.initApp            = initApp;

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

window.showPinErr        = showPinErr;
window.readRF            = readRF;

// ── VİSİBİLİTY SYNC POLL ─────────────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (window.setSyncDot) setSyncDot('connecting');
    setTimeout(() => { if (window._fbPoll) window._fbPoll(); }, 500);
  }
});
