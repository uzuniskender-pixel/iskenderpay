// js/sync.js — iskenderpay
// Realtime sync, sync dot, toast

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

async function startRealtimeSync() {
  if (!window._fbStartListen) return;
  setSyncDot('connecting');
  window._lastUpdated = 0;
  window._fbStartListen(async encData => {
    if (!window._cryptoKey) return;
    try {
      const d = await window.decryptData(encData, window._cryptoKey);
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


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.setSyncDot         = setSyncDot;
window.showSyncToast      = showSyncToast;
window.startRealtimeSync = startRealtimeSync;
