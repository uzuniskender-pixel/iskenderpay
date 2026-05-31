// js/sync.js — iskenderpay
// Realtime sync, sync dot, toast
// v8.187: Store.session -> Session closure.

import { Session } from './session.js';

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

// v8.199: uzak veriyi uygula (decrypt + hydrate + render). Dirty guard YOK —
// cagiran taraf (poll callback dirty'yi onceden eler; cakisma cozumu kendi
// akisini yonetir). Tek render-set kaynagi: hem realtime sync hem cakisma
// cozumu (persist.js/firestore.js) bunu kullanir -> render listesi tek yerde.
async function applyRemote(encData) {
  if (!Session.hasKey()) return false;
  const d = await Session.decrypt(encData);
  window.Store.hydrate(d);   // toplu sessiz atama, saveSecure tetiklenmez
  if (window.render)        window.render();
  if (window.renderPersons) window.renderPersons();
  if (window.renderNotes)   window.renderNotes();
  if (window.renderRhb)     window.renderRhb();
  window.renderActLog && window.renderActLog();
  return true;
}

let _focusHooksAttached = false;
function _attachFocusHooks() {
  if (_focusHooksAttached) return;
  _focusHooksAttached = true;
  // v8.206 (WO-06): okuma artik GERCEK-ZAMANLI onSnapshot ile gelir (SDK otomatik
  // reconnect eder) -> focus/online'da poll'a gerek yok; yalniz bekleyen OFFLINE
  // yazimi gonder (_fbFlush). "Bayat cihaz" penceresi onSnapshot ile zaten kapali.
  const pull = () => {
    if (window.setSyncDot) window.setSyncDot('connecting');
    if (window._fbFlush) window._fbFlush();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pull();
  });
  window.addEventListener('focus', pull);
  window.addEventListener('online', pull);
}

async function startRealtimeSync() {
  if (!window._fbStartListen) return;
  _attachFocusHooks();
  setSyncDot('connecting');
  window.Store.lastUpdated = 0;
  window._fbStartListen(async encData => {
    if (!Session.hasKey()) return;
    if (window.Store.dirty) return;  // Bekleyen degisiklik var — sync ezmesin
    try {
      await applyRemote(encData);
      setSyncDot('synced');
      showSyncToast();
    } catch(e) { console.warn('Sync decrypt hatasi:', e); }
  });
}


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.setSyncDot         = setSyncDot;
window.showSyncToast      = showSyncToast;
window.startRealtimeSync = startRealtimeSync;
window.applyRemote        = applyRemote;
