// js/backup.js — iskenderpay
// Yedek al/geri yükle, CSV export

function doBackup() {
  document.getElementById('BPP').value = '';
  document.getElementById('BPERR').textContent = '';
  ModalManager.open('BPM');
}

async function confirmBackup() {
  const entered = document.getElementById('BPP').value;
  const pinSalt = await window.getSaltAsync('v5-pin-salt');
  let storedHash = null;
  if (window._fbLoadPinHash) { try { storedHash = await window._fbLoadPinHash(); } catch(e) {} }
  const enteredHash = await window.hashPin(entered, pinSalt);
  if (enteredHash !== storedHash) {
    document.getElementById('BPERR').textContent = 'Hatalı şifre!';
    document.getElementById('BPP').value = '';
    return;
  }
  window.closeMov('BPM');
  const data = {pays:window.pays||[], creds:window.creds||[], hist:window.hist||[], persons:window.persons||[], notes:window.notes||[], paidItems:window.paidItems||[], rehber:window.rehber||[], actLog:window.actLog||[], at:new Date().toISOString(), v:'7.0'};
  const enc = window.xEnc(JSON.stringify(data), entered);
  const payload = JSON.stringify({enc:true, data:enc, v:'7.0', hint:'odeme-takvimi-backup'});
  const blob = new Blob([payload], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const planName = window.getPlanName(window._planId).replace(/\s+/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'yedek-'+planName+'-'+new Date().toISOString().split('T')[0]+'.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert('Yedek alındı!\nDosya şifrenizle şifrelendi.');
}

function doRestore() {
  const st = document.getElementById('RS');
  if (!st.dataset.d) { st.textContent = 'Önce dosya sec'; return; }
  if (!confirm('Mevcut veriler silinecek. Emin misin?\n\nGeri yukleme oncesi snapshot alinacak.')) return;

  // Snapshot
  const snapshot = {
    pays: window.pays||[], creds: window.creds||[], hist: window.hist||[],
    persons: window.persons||[], notes: window.notes||[], paidItems: window.paidItems||[],
    rehber: window.rehber||[], actLog: window.actLog||[], at: new Date().toISOString()
  };
  localStorage.setItem('v8-restore-snapshot', JSON.stringify(snapshot));

  const d = JSON.parse(st.dataset.d);
  if (window.Store) {
    window.Store.hydrate(d);
  } else {
    window.pays=d.pays||[]; window.creds=d.creds||[]; window.hist=d.hist||[];
    window.persons=d.persons||[]; window.notes=d.notes||[]; window.paidItems=d.paidItems||[];
    window.rehber=d.rehber||[]; window.actLog=d.actLog||[];
    window.invalidateLookups();
  }
  window.saveSecureNow().then(() => {
    window.migrateCredDates();
    window.closeMov('RM');
    window.render();
    const bar = document.getElementById('RESTORE_UNDO');
    if (bar) {
      bar.innerHTML = '<span style="flex:1">Geri yukleme tamamlandi. Yanlis yuklediysen:</span>'
        + '<button onclick="window.undoRestore()" style="background:rgba(248,113,113,.15);color:var(--danger);border:1px solid rgba(248,113,113,.3);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer">Geri Al</button>';
      bar.style.display = 'flex';
    }
  });
}

function undoRestore() {
  const raw = localStorage.getItem('v8-restore-snapshot');
  if (!raw) { alert('Snapshot bulunamadi.'); return; }
  if (!confirm('Geri yukleme oncesindeki veriye donmek istiyor musun?')) return;
  const d = JSON.parse(raw);
  if (window.Store) {
    window.Store.hydrate(d);
  } else {
    window.pays=d.pays||[]; window.creds=d.creds||[]; window.hist=d.hist||[];
    window.persons=d.persons||[]; window.notes=d.notes||[]; window.paidItems=d.paidItems||[];
    window.rehber=d.rehber||[]; window.actLog=d.actLog||[];
    window.invalidateLookups();
  }
  window.saveSecureNow().then(() => {
    window.migrateCredDates(); window.render();
    localStorage.removeItem('v8-restore-snapshot');
    const bar = document.getElementById('RESTORE_UNDO');
    if (bar) bar.style.display = 'none';
    alert('Onceki veriye geri donuldu.');
  });
}

function exportExcel() {
  const all = window.getAllItems();
  const mx = window.buildMx(all);
  let rowKeys = Object.keys(mx).filter(k => mx[k]._name !== undefined);
  rowKeys.sort((a,b) => {
    const dayOf = k => {
      const mks = Object.keys(mx[k]).filter(x => !x.startsWith('_')).sort();
      if (!mks.length) return 99;
      const items = mx[k][mks[0]]?.items||[];
      return items[0] ? window.parseLocalDate(items[0].date).getDate() : 99;
    };
    const da=dayOf(a), db=dayOf(b);
    if (da !== db) return da-db;
    return (mx[a]._name||'').localeCompare(mx[b]._name||'','tr');
  });
  const monthSet = new Set();
  all.forEach(p => {
    const d = window.parseLocalDate(p.date);
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
    const _dayNum = _firstMk && mx[k][_firstMk]?.items?.[0]?.date ? window.parseLocalDate(mx[k][_firstMk].items[0].date).getDate() : '';
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


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.doBackup           = doBackup;
window.confirmBackup      = confirmBackup;
window.doRestore          = doRestore;
window.undoRestore        = undoRestore;
window.exportExcel        = exportExcel;
