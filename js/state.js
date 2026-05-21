// js/state.js
// iskenderpay — Merkezi Durum Yönetimi Modülü (v8.16)

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

// Global scope uyumluluğu için window seviyesine de çıkarıyoruz
window.pays = state.pays;
window.creds = state.creds;
window.paidItems = state.paidItems;
window.hist = state.hist;
window.persons = state.persons;
window.notes = state.notes;
window.rehber = state.rehber;
window.actLog = state.actLog;

window._planId = localStorage.getItem('v6-active-plan') || 'plan1';

export function updateState(key, newData) {
  if (state[key] !== undefined && Array.isArray(newData)) {
    state[key] = newData;
    window[key] = newData; // Global senkronizasyon
  }
}

export function clearState() {
  Object.keys(state).forEach(k => {
    state[k] = [];
    window[k] = [];
  });
  console.log("[State] Bellek tamamen temizlendi.");
}

// Global butonlar ve fonksiyonların kırılmaması için window'a bağlıyoruz
window.clearState = clearState;
