// js/store.js — iskenderpay (v1.0)
// Merkezi Store. 8 veri dizisi + rates icin tek otorite.
// window.pays / window.creds vb. property'leri Store'a baglar (getter/setter).
//
// Tasarim:
//   - Store, 8 dizi + rates icin canonical referansi tutar.
//   - Object.defineProperty ile window.<key> getter -> Store.get(key),
//     setter -> Store._setSilent(key, val). (Geriye uyum: eski "window.pays = X" calismaya devam eder.)
//   - Setter "silent" davranir: yalniz referansi gunceller, lookup invalidate + dirty=true set eder.
//     saveSecure cagrisini cagiran kod yapar (mevcut davranis korunur).
//   - Yeni call site'lar Store.push / Store.removeWhere / Store.spliceAt / Store.mutateItem kullanir;
//     bu API'ler lookup invalidate + dirty=true + saveSecure() debounce'unu otomatik tetikler.
//   - Store.hydrate({pays, creds, ...}) — loadSecure / sync / restore icin: toplu sessiz atama,
//     saveSecure tetiklemez (kayit cagiran tarafa birakilmistir).
//   - Lookup haritalari (_mapPaysById vb.) Store icinde tutulur; find* metotlari Store API'sinde.

const DATA_KEYS = ['pays','creds','hist','persons','notes','paidItems','rehber','actLog'];
const ALL_KEYS  = [...DATA_KEYS, 'rates'];

const _state = {
  pays:      [],
  creds:     [],
  hist:      [],
  persons:   [],
  notes:     [],
  paidItems: [],
  rehber:    [],
  actLog:    [],
  rates:     { EUR: null, USD: null, GOLD: null }
};

// Eger store.js yuklenmeden once index.html veya state.js window.* atadiysa, oradan al
ALL_KEYS.forEach(k => {
  if (window[k] !== undefined && window[k] !== null) {
    _state[k] = window[k];
  }
});

function _markDirty() { window._dirty = true; }

// ── EVENT DISPATCH (microtask-coalesced) ───────────────────────────────────
// Her mutation sonrasi 'store:change' CustomEvent fire eder.
// Birden fazla mutation ayni tick'te ise Set'te birikir, tek event olur.
// detail.keys: Set<string> veya '*' (her sey degisti)
let _pendingKeys = new Set();
let _dispatchScheduled = false;

function _dispatchChange(keys) {
  if (keys === '*') _pendingKeys = '*';
  else if (_pendingKeys !== '*') {
    (Array.isArray(keys) ? keys : [keys]).forEach(k => _pendingKeys.add(k));
  }
  if (_dispatchScheduled) return;
  _dispatchScheduled = true;
  queueMicrotask(() => {
    const out = _pendingKeys;
    _pendingKeys = new Set();
    _dispatchScheduled = false;
    if (out === '*' || out.size > 0) {
      window.dispatchEvent(new CustomEvent('store:change', { detail: { keys: out } }));
    }
  });
}

// ── LOOKUP MAPS (data.js'ten taşındı) ──────────────────────────────────────
// O(1) erişim için pays/creds haritaları — veri değişince invalidate edilir
let _lookupDirty = true;
const _mapPaysById    = new Map();
const _mapPaysByGroup = new Map();
const _mapCredsById   = new Map();

function _invalidate() { _lookupDirty = true; }

function _rebuildLookups() {
  if (!_lookupDirty) return;
  _mapPaysById.clear();
  _mapPaysByGroup.clear();
  _mapCredsById.clear();
  (_state.pays || []).forEach(p => {
    _mapPaysById.set(String(p.id), p);
    const gid = p.groupId || String(Math.floor(Number(p.id)));
    if (!_mapPaysByGroup.has(gid)) _mapPaysByGroup.set(gid, []);
    _mapPaysByGroup.get(gid).push(p);
  });
  (_state.creds || []).forEach(c => _mapCredsById.set(String(c.id), c));
  _lookupDirty = false;
}

// saveSecure suppress flag — Store.tx ve hydrate sirasinda otomatik kaydi durdurur
let _suppressAutoSave = 0;

function _autoSave() {
  if (_suppressAutoSave > 0) return;
  if (window._suppressSave) return;
  if (typeof window.saveSecure === 'function') window.saveSecure();
}

export const Store = {
  // ── READ ─────────────────────────────────────────────────────────────────
  get(key) { return _state[key]; },

  // ── HYDRATE (silent, saveSecure cagrilmaz) ───────────────────────────────
  // loadSecure, sync, plan switch, clearState, restore icin
  hydrate(obj) {
    const changedKeys = [];
    DATA_KEYS.forEach(k => {
      if (obj && k in obj) { _state[k] = obj[k] || []; changedKeys.push(k); }
    });
    if (obj && 'rates' in obj) {
      _state.rates = obj.rates || { EUR:null, USD:null, GOLD:null };
      changedKeys.push('rates');
    }
    _invalidate();
    if (changedKeys.length) _dispatchChange(changedKeys);
  },

  // Tum verileri sifirla (silent saveSecure, ama event fire eder)
  clearAll() {
    DATA_KEYS.forEach(k => { _state[k] = []; });
    _state.rates = { EUR: null, USD: null, GOLD: null };
    _invalidate();
    _dispatchChange('*');
  },

  // ── REPLACE (autoSave tetikler — diger mutation API'leri ile tutarli) ────
  // Yeni call site'lar icin Store API. Window setter (window.pays = X) silent
  // kalmaya devam eder (_setSilent), ama Store.replace explicit cagri olduğundan
  // diger mutation'lar gibi autoSave tetikler.
  replace(key, value) {
    _state[key] = value;
    _invalidate();
    _autoSave();
    _dispatchChange([key]);
  },

  // ── MUTATION API (autoSave tetikler + event dispatch) ────────────────────
  push(key, item) {
    if (!Array.isArray(_state[key])) _state[key] = [];
    _state[key].push(item);
    _invalidate();
    _autoSave();
    _dispatchChange([key]);
  },

  unshift(key, item) {
    if (!Array.isArray(_state[key])) _state[key] = [];
    _state[key].unshift(item);
    _invalidate();
    _autoSave();
    _dispatchChange([key]);
  },

  removeWhere(key, predicate) {
    if (!Array.isArray(_state[key])) return;
    _state[key] = _state[key].filter(x => !predicate(x));
    _invalidate();
    _autoSave();
    _dispatchChange([key]);
  },

  spliceAt(key, idx, deleteCount, ...inserts) {
    if (!Array.isArray(_state[key])) return;
    const result = _state[key].splice(idx, deleteCount, ...inserts);
    _invalidate();
    _autoSave();
    _dispatchChange([key]);
    return result;
  },

  // Bir item'da (object) field guncellemesi yap + autoSave
  // Item hangi diziye ait bilinmedigi icin '*' dispatch
  mutateItem(item, partial) {
    if (item && partial && typeof item === 'object') Object.assign(item, partial);
    _invalidate();
    _autoSave();
    _dispatchChange('*');
  },

  // Item'da manuel degisiklik yapildi, Store'a haber ver (autoSave tetikle)
  touch() {
    _invalidate();
    _autoSave();
    _dispatchChange('*');
  },

  // ── LOOKUP API ───────────────────────────────────────────────────────────
  invalidateLookups() { _lookupDirty = true; },
  findPayById(id)      { _rebuildLookups(); return _mapPaysById.get(String(id))    || null; },
  findPaysByGroup(gid) { _rebuildLookups(); return _mapPaysByGroup.get(gid)        || [];   },
  findCredById(id)     { _rebuildLookups(); return _mapCredsById.get(String(id))   || null; },

  // ── BATCH ────────────────────────────────────────────────────────────────
  // tx icinde birden fazla mutation -> tek saveSecure (debounce zaten yapiyor
  // ama acik bati niyet icin).
  tx(fn) {
    _suppressAutoSave++;
    try { fn(); }
    finally {
      _suppressAutoSave--;
      _autoSave();
    }
  },

  // ── EVENT HELPER ─────────────────────────────────────────────────────────
  // Listener'lar icin: detail.keys icinde watched key'lerden biri var mi?
  _affects(detail, watched) {
    if (!detail || !detail.keys) return false;
    if (detail.keys === '*') return true;
    return watched.some(k => detail.keys.has(k));
  },

  // ── INTERNAL (setter koprusu icin) ───────────────────────────────────────
  _setSilent(key, value) {
    _state[key] = value;
    _invalidate();
    _markDirty();
    _dispatchChange([key]);
  },

  // Debug / introspection
  _snapshot() {
    const out = {};
    ALL_KEYS.forEach(k => { out[k] = _state[k]; });
    return out;
  }
};

// ── window.<key> getter/setter koprusu ─────────────────────────────────────
// Eski kodlar: window.pays / window.pays.push(...) / window.pays = [...] calismaya devam eder.
ALL_KEYS.forEach(key => {
  try {
    Object.defineProperty(window, key, {
      configurable: true,
      enumerable: true,
      get() { return _state[key]; },
      set(v) { Store._setSilent(key, v); }
    });
  } catch(e) {
    console.warn('[Store] window.' + key + ' defineProperty hatasi:', e);
  }
});

window.Store = Store;
console.log('[Store] hazir.');
