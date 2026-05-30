// js/state.js — iskenderpay (v2.1)
// UI durumu. Veri dizileri ve persist/sync flag'leri Store'da (v8.108);
// _planId v8.116'da Store.planId'ye taşındı.

// ── UI durumu ────────────────────────────────────────────────────────────────
window.partialCtx = null;
window.curTab     = 0;
window.sortMode   = 'date'; // 'date' | 'name'

// ── clearState ───────────────────────────────────────────────────────────────
// Bellegi tamamen temizler — Store veri dizilerini sifirlar.
export function clearState() {
  window.Store.clearAll();
  console.log('[State] Bellek tamamen temizlendi.');
}
window.clearState = clearState;
