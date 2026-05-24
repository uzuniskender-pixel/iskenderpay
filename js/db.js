// js/db.js — iskenderpay (v1.1)
// Firebase bağlantısı, auth, doLogin, loadSecure, saveSecure, migrasyon.
// index.html'deki Firebase init ile çakışmayı önlemek için getApps() guard eklendi.

import { initializeApp, getApps, getApp }         from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider,
         signInWithPopup, signInWithRedirect,
         getRedirectResult, onAuthStateChanged,
         signOut }                                from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc }      from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCZOvzCp4l0y2rJS2xFS1pSwoDWGcnUY6E",
  authDomain: "iskenderpay-a23d1.firebaseapp.com",
  projectId: "iskenderpay-a23d1",
  storageBucket: "iskenderpay-a23d1.firebasestorage.app",
  messagingSenderId: "916658036032",
  appId: "1:916658036032:web:ad44e5d591e1adfc49aea5",
  measurementId: "G-SPPX7F1BDY"
};

const _app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const _auth = getAuth(_app);
const _db   = getFirestore(_app);
let   _fbUid = null;
window._fbUid = null;

// ── Firestore yardımcıları ───────────────────────────────────────────────────

function _planDoc(planId) {
  return doc(_db, 'users', _fbUid + '_' + (planId || window._planId));
}
function _metaDoc() {
  return doc(_db, 'users', _fbUid + '_meta');
}

window._fbSave = async function(encData) {
  if (!_fbUid) return;
  await setDoc(_planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
};

window._syncTimer   = null;
window._lastUpdated = 0;
window._syncCb      = null;

window._fbStartListen = function(onData) {
  if (!_fbUid || !window._planId) return;
  window._syncCb = onData;
  if (window._syncTimer) clearInterval(window._syncTimer);
  window._syncTimer = setInterval(window._fbPoll, 30000);
  setTimeout(window._fbPoll, 5000);
};

window._fbPoll = async function() {
  if (!_fbUid || !window._planId || !window._syncCb) return;
  if (typeof _saveTimer !== 'undefined' && _saveTimer !== null) return;
  try {
    const snap = await getDoc(_planDoc());
    if (!snap.exists()) { window.setSyncDot && window.setSyncDot('active'); return; }
    const d = snap.data();
    const ts = d.updatedAt || 0;
    if (ts > window._lastUpdated && window._lastUpdated > 0) {
      window._lastUpdated = ts;
      if (d.data) window._syncCb(d.data);
    } else if (window._lastUpdated === 0) {
      window._lastUpdated = ts;
    }
    window.setSyncDot && window.setSyncDot('active');
  } catch(e) {
    console.warn('Sync poll hatası:', e.message || e);
  }
};

window._fbStopListen = function() {
  if (window._syncTimer) { clearInterval(window._syncTimer); window._syncTimer = null; }
  window._syncCb = null;
};

window._fbLoad = async function() {
  if (!_fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? snap.data().data : null;
};

window._fbSaveSalt = async function(saltKey, saltVal) {
  if (!_fbUid) return;
  const update = {};
  update['salts.' + saltKey] = saltVal;
  await setDoc(_planDoc(), update, { merge: true });
};

window._fbLoadSalt = async function(saltKey) {
  if (!_fbUid) return null;
  const snap = await getDoc(_planDoc());
  if (!snap.exists()) return null;
  const salts = snap.data().salts || {};
  return salts[saltKey] || null;
};

window._fbSavePinHash = async function(hash) {
  if (!_fbUid) return;
  await setDoc(_planDoc(), { pinHash: hash }, { merge: true });
};

window._fbLoadPinHash = async function() {
  if (!_fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? (snap.data().pinHash || null) : null;
};

window._fbSaveWrappedKey = async function(wrappedB64) {
  if (!_fbUid) return;
  await setDoc(_metaDoc(), { wrappedKey: wrappedB64 }, { merge: true });
};

window._fbLoadWrappedKey = async function() {
  if (!_fbUid) return null;
  try {
    const snap = await getDoc(_metaDoc());
    return snap.exists() ? (snap.data().wrappedKey || null) : null;
  } catch(e) { return null; }
};

// ── Auth ─────────────────────────────────────────────────────────────────────

let _redirectChecked = false;

getRedirectResult(_auth).then((result) => {
  if (result && result.user) console.log('Redirect ile giriş başarılı:', result.user.email);
}).catch(e => console.warn('redirect result error:', e)).finally(() => { _redirectChecked = true; });

onAuthStateChanged(_auth, (user) => {
  const loadEl = document.getElementById('LOAD');
  if (loadEl) loadEl.style.display = 'none';

  const glsEl = document.getElementById('GLS');
  const psEl  = document.getElementById('PS');
  const appEl = document.getElementById('APP');

  if (user) {
    _fbUid = user.uid;
    window._fbUid = user.uid;
    if (glsEl) glsEl.style.display = 'none';
    const plsEl   = document.getElementById('PLS');
    const plsUser = document.getElementById('PLS_USER');
    if (plsUser) plsUser.textContent = '👤 ' + (user.displayName || user.email);
    if (plsEl) plsEl.style.display = 'flex';
    if (psEl)  { psEl.style.display = 'none'; psEl.classList.remove('active'); }
    if (typeof window.renderPlanNames === 'function') window.renderPlanNames();
  } else {
    _fbUid = null;
    window._fbUid = null;
    setTimeout(() => {
      if (!_fbUid) {
        if (glsEl) glsEl.style.display = 'flex';
        const plsEl = document.getElementById('PLS');
        if (plsEl) plsEl.style.display = 'none';
        if (psEl)  { psEl.style.display = 'none'; psEl.classList.remove('active'); }
        if (appEl) appEl.style.display = 'none';
      }
    }, 2000);
  }
});

window.doGoogleLogin = async function() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(_auth, provider);
  } catch(e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
      try { await signInWithRedirect(_auth, new GoogleAuthProvider()); } catch(e2) { alert('Giriş başarısız: ' + e2.message); }
    } else {
      alert('Giriş başarısız: ' + e.message);
    }
  }
};

window.doGoogleSignOut = async function() {
  if (!confirm('Çıkış yapmak istiyor musunuz?')) return;
  await signOut(_auth);
};

// ── State (db.js scope — index.html'deki ile senkron) ────────────────────────
// Bu değişkenler hem index.html'de hem burada var, window üzerinden paylaşılıyor

// ── saveSecure / loadSecure ───────────────────────────────────────────────────

async function saveSecure() {
  if (window._suppressSave) return;
  if (!window._cryptoKey) return;
  if (typeof invalidateLookups === 'function') invalidateLookups();
  if (window._saveTimer) clearTimeout(window._saveTimer);
  window._saveTimer = null;
  await _doSave();
}

async function _doSave() {
  window._saveTimer = null;
  if (!window._cryptoKey) return;
  const data = {
    pays: window.pays, creds: window.creds, hist: window.hist,
    persons: window.persons, notes: window.notes, paidItems: window.paidItems,
    rehber: window.rehber, actLog: window.actLog
  };
  const enc = await encryptData(data, window._cryptoKey);
  if (window._fbSave) {
    try { await window._fbSave(enc); window._lastUpdated = Date.now(); } catch(e) { console.warn('Firebase kayıt hatası:', e); }
  }
  localStorage.setItem('v5-data-' + window._planId, enc);
  localStorage.setItem('v5-rates-' + window._planId, JSON.stringify(window.rates));
}

async function saveSecureNow() {
  if (window._saveTimer) clearTimeout(window._saveTimer);
  window._suppressSave = false;
  if (typeof invalidateLookups === 'function') invalidateLookups();
  await _doSave();
}

async function loadSecure() {
  let enc = null;
  if (window._fbLoad) {
    try { enc = await window._fbLoad(); } catch(e) { console.warn('Firebase yükleme hatası:', e); }
  }
  if (!enc) enc = localStorage.getItem('v5-data-' + window._planId) || localStorage.getItem('v5-data');
  if (!enc) return;
  try {
    const data = await decryptData(enc, window._cryptoKey);
    window.pays      = data.pays      || [];
    window.creds     = data.creds     || [];
    window.hist      = data.hist      || [];
    window.persons   = data.persons   || [];
    window.notes     = data.notes     || [];
    window.paidItems = data.paidItems || [];
    window.rehber    = data.rehber    || [];
    window.actLog    = data.actLog    || [];
    if (window._fbSave) { try { await window._fbSave(enc); } catch(e) {} }
  } catch(e) {
    throw new Error('decrypt_failed');
  }
  const r = localStorage.getItem('v5-rates-' + window._planId) || localStorage.getItem('v5-rates');
  if (r) try { Object.assign(window.rates, JSON.parse(r)); } catch(e) {}
}

// ── Migrasyon ─────────────────────────────────────────────────────────────────

let _migrationRunning = false;

async function migrateToV7() {
  const migKey = 'v7-migrated-' + (window._fbUid||'local') + '-' + window._planId;
  if (localStorage.getItem(migKey)) return;
  window._suppressSave = true;
  window.pays = (window.pays||[]).map(p => {
    const entry = {...p};
    if (!entry.groupId) entry.groupId = String(Math.floor(Number(entry.rp || entry.id)));
    delete entry.rec; delete entry.rp; delete entry.rs; delete entry.rm;
    return entry;
  });
  if (!(window.paidItems||[]).length) {
    const allItems = [...(window.pays||[])];
    (window.creds||[]).forEach(c => (c.pays||[]).forEach(i => allItems.push({...i, name: c.name, currency: 'TRY', _cid: c.id, _ii: i.idx})));
    window.paidItems = allItems
      .filter(p => p.status === 'paid' || p.status === 'partial')
      .map(p => ({...p, paidId: 'pi_' + Date.now() + '_' + Math.random()}));
  }
  window._suppressSave = false;
  await saveSecureNow();
  localStorage.setItem(migKey, '1');
  console.log('v7 migrasyon tamamlandı');
}

async function migrateToV7b() {
  const migKey = 'v7b-migrated-' + (window._fbUid||'local') + '-' + window._planId;
  if (localStorage.getItem(migKey)) return;
  window._suppressSave = true;
  const byName = {};
  (window.pays||[]).forEach(p => { if (!byName[p.name]) byName[p.name] = []; byName[p.name].push(p); });
  Object.keys(byName).forEach(name => {
    const entries = byName[name];
    if (entries.length <= 1) {
      if (!entries[0].groupId) entries[0].groupId = String(Math.floor(Number(entries[0].id)));
      return;
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const groups = [];
    entries.forEach(entry => {
      const em = entry.date.substring(0, 7);
      let placed = false;
      for (const g of groups) {
        if (!g.some(e => e.date.substring(0, 7) === em)) { g.push(entry); placed = true; break; }
      }
      if (!placed) groups.push([entry]);
    });
    groups.forEach(group => {
      const gid = String(Math.floor(Number(group[0].id)));
      group.forEach(e => { e.groupId = gid; });
    });
  });
  window._suppressSave = false;
  await saveSecureNow();
  localStorage.setItem(migKey, '1');
  console.log('v7b migrasyon tamamlandı');
}

// ── doLogin ───────────────────────────────────────────────────────────────────

async function doLogin() {
  const val = document.getElementById('PI').value;
  if (!val) return;

  if (window._cryptoKey && window._plainPin && window._plainPin === val) {
    try { await loadSecure(); window.enterApp && window.enterApp(); return; } catch(e) {}
  }

  const pinSalt = await getSaltAsync('v5-pin-salt');

  let storedHash = null;
  if (window._fbLoadPinHash) {
    try { storedHash = await window._fbLoadPinHash(); } catch(e) {}
  }

  if (!storedHash) {
    if (val.length < 4) { window.showPinErr && window.showPinErr('En az 4 karakter girmelisiniz!'); return; }
    const hash = await hashPin(val, pinSalt);
    if (window._fbSavePinHash) { try { await window._fbSavePinHash(hash); } catch(e) {} }
    const dataKeyRaw = crypto.getRandomValues(new Uint8Array(32));
    const wrappedB64 = await wrapDataKey(dataKeyRaw, val, pinSalt);
    _saveWrappedKeyLocal(wrappedB64);
    await _saveWrappedKeyFirebase(wrappedB64);
    window._dataKeyRaw = dataKeyRaw;
    window._plainPin   = val;
    window._cryptoKey  = await importDataKey(dataKeyRaw);
    await loadSecure();
    window.enterApp && window.enterApp();
    return;
  }

  const hash = await hashPin(val, pinSalt);
  if (hash !== storedHash) {
    const inp = document.getElementById('PI');
    inp.classList.add('err');
    document.getElementById('PE').textContent = 'Hatalı şifre!';
    setTimeout(() => { inp.classList.remove('err'); document.getElementById('PE').textContent=''; inp.value=''; }, 1400);
    return;
  }

  let wrappedB64 = await _loadWrappedKeyFirebase() || _getWrappedKey();
  if (!wrappedB64) { window.showPinErr && window.showPinErr('Şifreleme anahtarı bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.'); return; }

  let unwrapped;
  try { unwrapped = await unwrapDataKey(wrappedB64, val, pinSalt); }
  catch(e) { window.showPinErr && window.showPinErr('Veri çözülemedi — şifre eşleşmiyor.'); return; }

  window._dataKeyRaw = unwrapped.rawBytes;
  window._plainPin   = val;
  window._cryptoKey  = unwrapped.cryptoKey;
  _saveWrappedKeyLocal(wrappedB64);

  try {
    await loadSecure();
  } catch(e) {
    const otherPlan = window._planId === 'plan1' ? 'plan2' : 'plan1';
    const origPlan  = window._planId;
    window._planId  = otherPlan;
    try {
      await loadSecure();
      localStorage.setItem('v6-active-plan', otherPlan);
    } catch(e2) {
      window._planId = origPlan;
      window.showPinErr && window.showPinErr('Veri çözülemedi. Lütfen tekrar deneyin.'); return;
    }
  }
  window.enterApp && window.enterApp();
}

// ── Global compat ─────────────────────────────────────────────────────────────
window.saveSecure    = saveSecure;
window.saveSecureNow = saveSecureNow;
window.loadSecure    = loadSecure;
window.doLogin       = doLogin;
window.migrateToV7   = migrateToV7;
window.migrateToV7b  = migrateToV7b;
window.save          = () => saveSecure();
window.savePersons   = () => saveSecure();
window.saveNotes     = () => saveSecure();
window.loadNotes     = () => {};

// ── ŞİFRE DEĞİŞTİR ──────────────────────────────────────────────────────────
async function chPass() {
  const cur = document.getElementById('CP').value;
  const nw  = document.getElementById('NP').value;
  const nw2 = document.getElementById('NP2').value;
  const msg = document.getElementById('PM');

  const pinSalt = await getSaltAsync('v5-pin-salt');

  let storedHash = null;
  if (window._fbLoadPinHash) {
    try { storedHash = await window._fbLoadPinHash(); } catch(e) {}
  }

  const curHash = await hashPin(cur, pinSalt);
  if (curHash !== storedHash) { msg.style.color='var(--danger)'; msg.textContent='❌ Mevcut şifre yanlış'; return; }
  if (!nw || nw.length < 4)  { msg.style.color='var(--danger)'; msg.textContent='❌ En az 4 karakter'; return; }
  if (nw !== nw2)             { msg.style.color='var(--danger)'; msg.textContent='❌ Şifreler eşleşmiyor'; return; }

  const newHash = await hashPin(nw, pinSalt);
  if (window._fbSavePinHash) {
    try { await window._fbSavePinHash(newHash); } catch(e) {}
  }

  const newWrappedB64 = await wrapDataKey(window._dataKeyRaw, nw, pinSalt);
  _saveWrappedKeyLocal(newWrappedB64);
  await _saveWrappedKeyFirebase(newWrappedB64);
  window._plainPin = nw;

  msg.style.color='var(--ok)'; msg.textContent='✅ Şifre güncellendi!';
  ['CP','NP','NP2'].forEach(id => document.getElementById(id).value='');
  setTimeout(() => msg.textContent='', 3000);
}

window.chPass = chPass;
