// js/state.js — iskenderpay (v1.0)
// Merkezi durum yönetimi. Hiçbir dış bağımlılık yok.
// index.html'deki tüm global let/const değişkenlerinin tek yetkili tanımı burada.

// ── Veri dizileri ────────────────────────────────────────────────────────────
export let pays      = [];
export let creds     = [];
export let hist      = [];
export let persons   = [];
export let notes     = [];
export let paidItems = [];
export let rehber    = [];
export let actLog    = [];
export let rates     = { EUR: null, USD: null, GOLD: null };

// ── UI durumu ────────────────────────────────────────────────────────────────
export let partialCtx = null;
export let curTab     = 0;
export let sortMode   = 'date'; // 'date' | 'name'

// ── Save durumu ──────────────────────────────────────────────────────────────
export let _suppressSave    = false;
export let _saveTimer       = null;
export const SAVE_DEBOUNCE_MS = 400;

// ── Lookup maps ──────────────────────────────────────────────────────────────
export let _lookupDirty   = true;
export let _mapPaysById   = new Map();
export let _mapPaysByGroup = new Map();
export let _mapCredsById  = new Map();

// ── Plan ─────────────────────────────────────────────────────────────────────
// Tek yetkili tanım — başka hiçbir dosyada window._planId atanmaz
export let _planId = localStorage.getItem('v6-active-plan') || 'plan1';

// ── Setter'lar ───────────────────────────────────────────────────────────────
// Dizi referanslarını güncellemek için — window[key] senkronizasyonu dahil
export function setState(key, value) {
  stateMap[key] = value;
  window[key]   = value;
}

// Birden fazla key aynı anda güncellenecekse
export function setStateMany(obj) {
  Object.keys(obj).forEach(k => setState(k, obj[k]));
}

export function setPlanId(id) {
  _planId        = id;
  window._planId = id;
  localStorage.setItem('v6-active-plan', id);
}

export function setSortMode(v) { sortMode = v; }
export function setCurTab(n)   { curTab = n; }
export function setPartialCtx(ctx) { partialCtx = ctx; }
export function setSuppressSave(v) { _suppressSave = v; }
export function setSaveTimer(t)    { _saveTimer = t; }
export function setLookupDirty(v)  { _lookupDirty = v; }
export function setRates(r)        { rates = r; window.rates = r; }

// stateMap — setState için referans tablosu
const stateMap = { pays, creds, hist, persons, notes, paidItems, rehber, actLog, rates };

// ── clearState ───────────────────────────────────────────────────────────────
export function clearState() {
  pays      = []; window.pays      = [];
  creds     = []; window.creds     = [];
  hist      = []; window.hist      = [];
  persons   = []; window.persons   = [];
  notes     = []; window.notes     = [];
  paidItems = []; window.paidItems = [];
  rehber    = []; window.rehber    = [];
  actLog    = []; window.actLog    = [];
  rates     = { EUR: null, USD: null, GOLD: null };
  _lookupDirty = true;
  console.log('[State] Bellek tamamen temizlendi.');
}
window.clearState = clearState;

// ── window senkronizasyonu (eski inline kodlarla uyumluluk) ──────────────────
// index.html'deki render/CRUD fonksiyonları window.pays gibi global değişkenleri
// doğrudan kullandığından, state.js'in export'ları ile senkron olmalı.
window._planId   = _planId;
window.pays      = pays;
window.creds     = creds;
window.hist      = hist;
window.persons   = persons;
window.notes     = notes;
window.paidItems = paidItems;
window.rehber    = rehber;
window.actLog    = actLog;
window.rates     = rates;
