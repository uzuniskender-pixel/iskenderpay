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

// ── PERSISTENCE / SYNC STATE (v8.108) ──────────────────────────────────────
// persist.js, firestore.js, sync.js, app.js orchestration flag'leri. Eskiden window.* idi —
// Store internal'a tasindi. Tek kaynak: Store.dirty/saveTimer/syncTimer vb.
const _persistState = {
  dirty:         false,   // bekleyen kaydedilmemis degisiklik var mi
  saveTimer:     null,    // saveSecure debounce timer handle
  syncTimer:     null,    // _fbPoll interval handle
  fbSyncNeeded:  false,   // firebase push basarisiz, sonraki poll'da yeniden dene
  lastUpdated:   0,       // son sync timestamp
  syncCb:        null,    // sync callback (firestore.js#_fbStartListen kayit ettigi)
  suppressSave:  false,   // bulk ops / migrasyon sirasinda auto-save'i bastir
  logSaveTimer:  null,    // app.js#addLog debounce timer handle
  fbUid:         null,    // firebase auth UID (v8.113'te firebase.js'in lokal _fbUid'inden tasindi)
  planId:        localStorage.getItem('v6-active-plan') || 'plan1',  // aktif plan (v8.116)
};

// ── SESSION STATE — v8.187'de js/session.js'e TASINDI ──────────────────────
// Eskiden burada _sessionState (cryptoKey/dataKeyRaw/plainPin) vardi ve
// Store.session getter'i ile window uzerinden erisilebiliyordu (konsol sizinti).
// v8.187: sirlar js/session.js'in MODUL-PRIVATE CLOSURE'ina tasindi; Store artik
// oturum sirlarina sahip DEGIL. Tuketiciler: import { Session } from './session.js'.

function _markDirty() { _persistState.dirty = true; }

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
  if (_persistState.suppressSave) return;
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
    _state[key] = _state[key].filter((x, i) => !predicate(x, i));
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

  // ── PERSISTENCE / SYNC STATE getter/setter (v8.108) ──────────────────────
  get dirty()         { return _persistState.dirty; },
  set dirty(v)        { _persistState.dirty = v; },
  get saveTimer()     { return _persistState.saveTimer; },
  set saveTimer(v)    { _persistState.saveTimer = v; },
  get syncTimer()     { return _persistState.syncTimer; },
  set syncTimer(v)    { _persistState.syncTimer = v; },
  get fbSyncNeeded()  { return _persistState.fbSyncNeeded; },
  set fbSyncNeeded(v) { _persistState.fbSyncNeeded = v; },
  get lastUpdated()   { return _persistState.lastUpdated; },
  set lastUpdated(v)  { _persistState.lastUpdated = v; },
  get syncCb()        { return _persistState.syncCb; },
  set syncCb(v)       { _persistState.syncCb = v; },
  get suppressSave()  { return _persistState.suppressSave; },
  set suppressSave(v) { _persistState.suppressSave = v; },
  get logSaveTimer()  { return _persistState.logSaveTimer; },
  set logSaveTimer(v) { _persistState.logSaveTimer = v; },
  get fbUid()         { return _persistState.fbUid; },
  set fbUid(v)        { _persistState.fbUid = v; },
  get planId()        { return _persistState.planId; },
  set planId(v)       {
    _persistState.planId = v;
    try { localStorage.setItem('v6-active-plan', v); } catch(e) {}
  },

  // ── SESSION API — v8.187'de js/session.js'e TASINDI ──────────────────────
  // Store.session / clearSession kaldirildi. Oturum sirlari artik module-private
  // closure'da (js/session.js). Bkz: import { Session } from './session.js'.

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
// WO-02: window.<key> getter artik bir PROXY dondurur (diziler icin). Diziyi DOGRUDAN
// mutate eden eski kod (push/unshift/splice/pop/shift/sort/reverse/fill/copyWithin,
// index/length atamasi, delete) Proxy tarafindan yakalanip Store akisina yonlendirilir
// -> her zaman invalidate + dirty + autoSave + (coalesced, key-filtreli) store:change.
// Boylece bypass YAPISAL OLARAK imkansiz; eski "window.pays.push(...)" cagrilari da
// KIRILMADAN, DOGRU calisir. Okumalar (forEach/map/filter/[i]/length/Array.isArray/
// spread) gercek diziye gecer. Eleman-alani mutasyonu (window.pays[0].x=) array kapsami
// disidir -> UI bunu Store.mutateItem ile yapar.
// NOT: reassignment (window.pays = X) AYRI yoldan gider: window SETTER -> _setSilent.
const _MUTATORS = new Set(['push','unshift','splice','pop','shift','sort','reverse','fill','copyWithin']);
const _proxyCache = new Map();   // key -> { target, proxy }

function _afterDirectMutation(key) {
  _invalidate();
  _persistState.dirty = true;
  _autoSave();
  _dispatchChange([key]);
}

function _arrayProxy(key) {
  const target = _state[key];
  const cached = _proxyCache.get(key);
  if (cached && cached.target === target) return cached.proxy;   // ayni dizi -> ayni proxy (kimlik korunur)
  const proxy = new Proxy(target, {
    get(t, prop, recv) {
      if (typeof prop === 'string' && _MUTATORS.has(prop)) {
        return function(...args) {
          const r = Array.prototype[prop].apply(t, args);   // gercek diziye uygula (proxy'ye degil -> recursion yok)
          _afterDirectMutation(key);
          return r;
        };
      }
      return Reflect.get(t, prop, recv);
    },
    set(t, prop, value, recv) {                               // window.pays[i] = x / .length = n
      const r = Reflect.set(t, prop, value, recv);
      _afterDirectMutation(key);
      return r;
    },
    deleteProperty(t, prop) {
      const r = Reflect.deleteProperty(t, prop);
      _afterDirectMutation(key);
      return r;
    }
  });
  _proxyCache.set(key, { target, proxy });
  return proxy;
}

// Diziler icin proxy, diger tipler (rates obj) icin ham deger.
function _readView(key) {
  const v = _state[key];
  return Array.isArray(v) ? _arrayProxy(key) : v;
}

// WO-02: getter mutasyona kapali bir gorunum dondurur (yukaridaki Proxy).
ALL_KEYS.forEach(key => {
  try {
    Object.defineProperty(window, key, {
      configurable: true,
      enumerable: true,
      get() { return _readView(key); },
      set(v) { Store._setSilent(key, v); }
    });
  } catch(e) {
    console.warn('[Store] window.' + key + ' defineProperty hatasi:', e);
  }
});

window.Store = Store;
console.log('[Store] hazir.');
