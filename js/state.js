// js/state.js
// iskenderpay — Merkezi Durum Yönetimi Modülü (v8.17-fixed)

export const state = {
  pays: [],
  creds: [],
  paidItems: [],
  hist: [],
  persons: [],
  notes: [],
  rehber: [],
  actLog: []
};

// Global scope uyumluluğu için window seviyesine çıkar
window.pays = state.pays;
window.creds = state.creds;
window.paidItems = state.paidItems;
window.hist = state.hist;
window.persons = state.persons;
window.notes = state.notes;
window.rehber = state.rehber;
window.actLog = state.actLog;

// window._planId tek yetkili tanımı burada — db.js'de tekrar atanmıyor
window._planId = localStorage.getItem('v6-active-plan') || 'plan1';

export function updateState(key, newData) {
  if (state[key] !== undefined) {
    state[key] = newData;
    window[key] = newData;
  }
}

export function clearState() {
  Object.keys(state).forEach(k => {
    state[k] = [];
    window[k] = [];
  });
  console.log("[State] Bellek tamamen temizlendi.");
}

window.clearState = clearState;
