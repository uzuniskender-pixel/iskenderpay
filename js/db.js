// js/db.js — iskenderpay (v1.3)
// Firestore data ops, loadSecure, saveSecure, migrasyon.
// Auth concern'leri (init, listener, getRedirectResult, doGoogleLogin/SignOut)
// firebase.js'in sahipliğinde. PIN akışları (doLogin, chPass) auth-pin.js'in
// sahipliğinde — v8.110'da ayrıştırıldı.

import { getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Firestore yardımcıları ───────────────────────────────────────────────────
// _planDoc / _metaDoc firebase.js'de tanımlı, _db'yi closure'la, Store.fbUid'i runtime'da okur

const _planDoc = window._planDoc;
const _metaDoc = window._metaDoc;


window._fbSave = async function(encData) {
  if (!window.Store.fbUid) return;
  await setDoc(_planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
};

// _syncTimer / _lastUpdated / _syncCb v8.108'de Store internal'a tasindi (Store.syncTimer vb.)

window._fbStartListen = function(onData) {
  if (!window.Store.fbUid || !window._planId) return;
  window.Store.syncCb = onData;
  if (window.Store.syncTimer) clearInterval(window.Store.syncTimer);
  window.Store.syncTimer = setInterval(window._fbPoll, 30000);
  setTimeout(window._fbPoll, 5000);
};

let _pollRunning = false;
window._fbPoll = async function() {
  if (!window.Store.fbUid || !window._planId || !window.Store.syncCb) return;
  if (window.Store.saveTimer !== null && window.Store.saveTimer !== undefined) return;
  if (window.Store.dirty) return;  // Bekleyen degisiklik var — sync atla
  if (_pollRunning) return;   // Concurrent poll önle
  _pollRunning = true;
  try {
    const snap = await getDoc(_planDoc());
    if (!snap.exists()) { window.setSyncDot && window.setSyncDot('active'); return; }
    const d = snap.data();
    const ts = d.updatedAt || 0;
    // Firebase'e yazılamamış veri varsa önce onu yükle
    if (window.Store.fbSyncNeeded && !window.Store.dirty) {
      const enc = localStorage.getItem('v5-data-' + window._planId);
      if (enc) {
        try { await window._fbSave(enc); window.Store.lastUpdated = Date.now(); window.Store.fbSyncNeeded = false; } catch(e) {}
      }
      return;
    }
    if (ts > window.Store.lastUpdated && window.Store.lastUpdated > 0) {
      window.Store.lastUpdated = ts;
      if (d.data) window.Store.syncCb(d.data);
    } else if (window.Store.lastUpdated === 0) {
      window.Store.lastUpdated = ts;
    }
    window.setSyncDot && window.setSyncDot('active');
  } catch(e) {
    console.warn('Sync poll hatası:', e.message || e);
  } finally {
    _pollRunning = false;
  }
};

window._fbStopListen = function() {
  if (window.Store.syncTimer) { clearInterval(window.Store.syncTimer); window.Store.syncTimer = null; }
  window.Store.syncCb = null;
};

window._fbLoad = async function() {
  if (!window.Store.fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? snap.data().data : null;
};

window._fbSaveSalt = async function(saltKey, saltVal) {
  if (!window.Store.fbUid) return;
  const update = {};
  update['salts.' + saltKey] = saltVal;
  await setDoc(_planDoc(), update, { merge: true });
};

window._fbLoadSalt = async function(saltKey) {
  if (!window.Store.fbUid) return null;
  const snap = await getDoc(_planDoc());
  if (!snap.exists()) return null;
  const salts = snap.data().salts || {};
  return salts[saltKey] || null;
};

window._fbSavePinHash = async function(hash) {
  if (!window.Store.fbUid) return;
  await setDoc(_planDoc(), { pinHash: hash }, { merge: true });
};

window._fbLoadPinHash = async function() {
  if (!window.Store.fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? (snap.data().pinHash || null) : null;
};

window._fbSaveWrappedKey = async function(wrappedB64) {
  if (!window.Store.fbUid) return;
  await setDoc(_metaDoc(), { wrappedKey: wrappedB64 }, { merge: true });
};

window._fbLoadWrappedKey = async function() {
  if (!window.Store.fbUid) return null;
  try {
    const snap = await getDoc(_metaDoc());
    return snap.exists() ? (snap.data().wrappedKey || null) : null;
  } catch(e) { return null; }
};

// Auth (init + listener + doGoogleLogin/SignOut) firebase.js'in sahipliğinde.

// ── saveSecure / loadSecure ───────────────────────────────────────────────────

async function saveSecure() {
  if (window.Store.suppressSave) return;
  if (!window._cryptoKey) return;
  if (window.Store.saveTimer) clearTimeout(window.Store.saveTimer);
  window.Store.dirty = true;  // Bekleyen degisiklik var — sync ezmesin
  window.Store.saveTimer = setTimeout(() => { _doSave(); }, 400);
}

async function _doSave() {
  window.Store.saveTimer = null;
  if (!window._cryptoKey) return;
  // GroupId tutarlilik kontrolu: ayni groupId'de farkli isim varsa duzelt
  try {
    const byGroup = {};
    (window.pays||[]).forEach(p => {
      if (!p.groupId) return;
      if (!byGroup[p.groupId]) byGroup[p.groupId] = [];
      byGroup[p.groupId].push(p);
    });
    Object.values(byGroup).forEach(entries => {
      if (entries.length <= 1) return;
      const names = entries.map(e => e.name);
      const freq = {};
      names.forEach(n => { freq[n] = (freq[n]||0)+1; });
      const canonical = Object.keys(freq).sort((a,b) => freq[b]-freq[a])[0];
      const allSame = names.every(n => n === canonical);
      if (!allSame) {
        entries.forEach(e => { e.name = canonical; });
        console.log('[integrity] GroupId', entries[0].groupId, '→ ad duzeltildi:', canonical);
      }
    });
  } catch(e) { console.warn('[integrity] kontrol hatasi:', e); }
  const data = {
    pays: window.pays, creds: window.creds, hist: window.hist,
    persons: window.persons, notes: window.notes, paidItems: window.paidItems,
    rehber: window.rehber, actLog: window.actLog
  };
  const enc = await window.encryptData(data, window._cryptoKey);
  // localStorage ÖNCE yaz — Firebase başarısız olsa bile veri güvende
  localStorage.setItem('v5-data-' + window._planId, enc);
  localStorage.setItem('v5-rates-' + window._planId, JSON.stringify(window.rates));
  if (window._fbSave) {
    try {
      await window._fbSave(enc);
      window.Store.lastUpdated = Date.now();
      window.Store.fbSyncNeeded = false;
    } catch(e) {
      console.warn('Firebase kayıt hatası:', e);
      window.Store.fbSyncNeeded = true;  // Bir sonraki başarılı poll'da yeniden dene
    } finally { window.Store.dirty = false; }
  }
}

async function saveSecureNow() {
  if (window.Store.saveTimer) clearTimeout(window.Store.saveTimer);
  window.Store.suppressSave = false;
  await _doSave();
}

async function loadSecure() {
  let enc = null;
  let fbHadData = false;
  if (window._fbLoad) {
    try {
      enc = await window._fbLoad();
      fbHadData = (enc !== null);
    } catch(e) { console.warn('Firebase yükleme hatasi:', e); }
  }
  if (!enc) enc = localStorage.getItem('v5-data-' + window._planId) || localStorage.getItem('v5-data');
  if (!enc) return;
  try {
    const data = await window.decryptData(enc, window._cryptoKey);
    // Toplu sessiz atama — saveSecure tetiklenmez (veri zaten kaynak)
    if (window.Store) {
      window.Store.hydrate(data);
    } else {
      window.pays      = data.pays      || [];
      window.creds     = data.creds     || [];
      window.hist      = data.hist      || [];
      window.persons   = data.persons   || [];
      window.notes     = data.notes     || [];
      window.paidItems = data.paidItems || [];
      window.rehber    = data.rehber    || [];
      window.actLog    = data.actLog    || [];
    }
    // Sadece Firebase bos ise localStorage verisini yukle (migration)
    // Firebase hatali iken localStorage ile ezme - DATA LOSS onlendi
    if (!fbHadData && window._fbSave) { try { await window._fbSave(enc); } catch(e) {} }
  } catch(e) {
    throw new Error('decrypt_failed');
  }
  window.Store.dirty = false;  // Yeni veri yüklendi — bekleyen değişiklik yok
  const r = localStorage.getItem('v5-rates-' + window._planId) || localStorage.getItem('v5-rates');
  if (r) try { Object.assign(window.rates, JSON.parse(r)); } catch(e) {}
}

// ── Migrasyon ─────────────────────────────────────────────────────────────────

let _migrationRunning = false;

async function migrateToV7() {
  const migKey = 'v7-migrated-' + (window.Store.fbUid||'local') + '-' + window._planId;
  if (localStorage.getItem(migKey)) return;
  window.Store.suppressSave = true;
  const _migPays = (window.pays||[]).map(p => {
    const entry = {...p};
    if (!entry.groupId) entry.groupId = String(Math.floor(Number(entry.rp || entry.id)));
    delete entry.rec; delete entry.rp; delete entry.rs; delete entry.rm;
    return entry;
  });
  if (window.Store) window.Store.replace('pays', _migPays); else window.pays = _migPays;
  if (!(window.paidItems||[]).length) {
    const allItems = [...(window.pays||[])];
    (window.creds||[]).forEach(c => (c.pays||[]).forEach(i => allItems.push({...i, name: c.name, currency: 'TRY', _cid: c.id, _ii: i.idx})));
    const _migPaid = allItems
      .filter(p => p.status === 'paid' || p.status === 'partial')
      .map(p => ({...p, paidId: 'pi_' + Date.now() + '_' + Math.random()}));
    if (window.Store) window.Store.replace('paidItems', _migPaid); else window.paidItems = _migPaid;
  }
  window.Store.suppressSave = false;
  await saveSecureNow();
  localStorage.setItem(migKey, '1');
  console.log('v7 migrasyon tamamlandı');
}

// doLogin / chPass auth-pin.js'in sahipliğinde (v8.110'da ayrıştırıldı).

// ── Global compat ─────────────────────────────────────────────────────────────
window.saveSecure    = saveSecure;
window.saveSecureNow = saveSecureNow;
window.loadSecure    = loadSecure;
window.migrateToV7   = migrateToV7;
window.save          = () => saveSecure();
window.savePersons   = () => saveSecure();
window.saveNotes     = () => saveSecure();
window.loadNotes     = () => {};
