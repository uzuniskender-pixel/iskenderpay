// js/state.js — iskenderpay (v2.0)
// UI durumu ve _planId. Veri dizileri (pays/creds/hist/persons/notes/paidItems/
// rehber/actLog/rates) artik js/store.js'de — Store onlari sahiplenir, window.<key>
// getter/setter'lari oraya bagli.

// ── UI durumu ────────────────────────────────────────────────────────────────
window.partialCtx = null;
window.curTab     = 0;
window.sortMode   = 'date'; // 'date' | 'name'

// ── Save kontrol bayraklari (db.js okur/yazar) ───────────────────────────────
window._suppressSave = false;
window._saveTimer    = null;

// ── Aktif plan ID ────────────────────────────────────────────────────────────
window._planId = localStorage.getItem('v6-active-plan') || 'plan1';

// ── clearState ───────────────────────────────────────────────────────────────
// Bellegi tamamen temizler — Store veri dizilerini sifirlar.
export function clearState() {
  if (window.Store) {
    window.Store.clearAll();
  } else {
    // Fallback (Store yuklenmediyse)
    window.pays = []; window.creds = []; window.hist = []; window.persons = [];
    window.notes = []; window.paidItems = []; window.rehber = []; window.actLog = [];
    window.rates = { EUR: null, USD: null, GOLD: null };
  }
  console.log('[State] Bellek tamamen temizlendi.');
}
window.clearState = clearState;
