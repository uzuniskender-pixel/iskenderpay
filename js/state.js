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
  window.Store.clearAll();
  console.log('[State] Bellek tamamen temizlendi.');
}
window.clearState = clearState;
