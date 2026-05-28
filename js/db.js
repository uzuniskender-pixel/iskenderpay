// js/db.js — iskenderpay (v1.1)
// Firebase bağlantısı, auth, doLogin, loadSecure, saveSecure, migrasyon.
// index.html'deki Firebase init ile çakışmayı önlemek için getApps() guard eklendi.

// firebase-app: firebase.js'te init edildi
import { getAuth, GoogleAuthProvider,
         signInWithPopup, signInWithRedirect,
         getRedirectResult, onAuthStateChanged,
         signOut }                                from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Firebase nesneleri firebase.js'te init edildi — window üzerinden al
// _auth ve _db: firebase.js'teki _auth/_db ile aynı instance (getApps guard ile)
const _auth = window._firebaseAuth;
const _db   = window._firebaseDb;

let   _fbUid = null;
window._fbUid = null;

// ── Firestore yardımcıları ───────────────────────────────────────────────────

const _planDoc = window._planDoc;
const _metaDoc = window._metaDoc;


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

let _pollRunning = false;
window._fbPoll = async function() {
  if (!_fbUid || !window._planId || !window._syncCb) return;
  if (window._saveTimer !== null && window._saveTimer !== undefined) return;
  if (window._dirty) return;  // Bekleyen degisiklik var — sync atla
  if (_pollRunning) return;   // Concurrent poll önle
  _pollRunning = true;
  try {
    const snap = await getDoc(_planDoc());
    if (!snap.exists()) { window.setSyncDot && window.setSyncDot('active'); return; }
    const d = snap.data();
    const ts = d.updatedAt || 0;
    // Firebase'e yazılamamış veri varsa önce onu yükle
    if (window._fbSyncNeeded && !window._dirty) {
      const enc = localStorage.getItem('v5-data-' + window._planId);
      if (enc) {
        try { await window._fbSave(enc); window._lastUpdated = Date.now(); window._fbSyncNeeded = false; } catch(e) {}
      }
      return;
    }
    if (ts > window._lastUpdated && window._lastUpdated > 0) {
      window._lastUpdated = ts;
      if (d.data) window._syncCb(d.data);
    } else if (window._lastUpdated === 0) {
      window._lastUpdated = ts;
    }
    window.setSyncDot && window.setSyncDot('active');
  } catch(e) {
    console.warn('Sync poll hatası:', e.message || e);
  } finally {
    _pollRunning = false;
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
  if (typeof invalidateLookups === 'function') window.invalidateLookups();
  if (window._saveTimer) clearTimeout(window._saveTimer);
  window._dirty = true;  // Bekleyen degisiklik var — sync ezmesin
  window._saveTimer = setTimeout(() => { _doSave(); }, 400);
}

async function _doSave() {
  window._saveTimer = null;
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
      window._lastUpdated = Date.now();
      window._fbSyncNeeded = false;
    } catch(e) {
      console.warn('Firebase kayıt hatası:', e);
      window._fbSyncNeeded = true;  // Bir sonraki başarılı poll'da yeniden dene
    } finally { window._dirty = false; }
  }
}

async function saveSecureNow() {
  if (window._saveTimer) clearTimeout(window._saveTimer);
  window._suppressSave = false;
  if (typeof invalidateLookups === 'function') window.invalidateLookups();
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
  window._dirty = false;  // Yeni veri yüklendi — bekleyen değişiklik yok
  const r = localStorage.getItem('v5-rates-' + window._planId) || localStorage.getItem('v5-rates');
  if (r) try { Object.assign(window.rates, JSON.parse(r)); } catch(e) {}
}

// ── Migrasyon ─────────────────────────────────────────────────────────────────

let _migrationRunning = false;

async function migrateToV7() {
  const migKey = 'v7-migrated-' + (window._fbUid||'local') + '-' + window._planId;
  if (localStorage.getItem(migKey)) return;
  window._suppressSave = true;
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
  window._suppressSave = false;
  await saveSecureNow();
  localStorage.setItem(migKey, '1');
  console.log('v7 migrasyon tamamlandı');
}

async function migrateToV7b() { return; // v8.73: devre disi - fix_groupids.js kullan
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

  const pinSalt = await window.getSaltAsync('v5-pin-salt');

  let storedHash = null;
  if (window._fbLoadPinHash) {
    try { storedHash = await window._fbLoadPinHash(); } catch(e) {}
  }

  if (!storedHash) {
    if (val.length < 4) { window.showPinErr && window.showPinErr('En az 4 karakter girmelisiniz!'); return; }
    const hash = await window.hashPin(val, pinSalt);
    if (window._fbSavePinHash) { try { await window._fbSavePinHash(hash); } catch(e) {} }
    const dataKeyRaw = crypto.getRandomValues(new Uint8Array(32));
    const wrappedB64 = await window.wrapDataKey(dataKeyRaw, val, pinSalt);
    window._saveWrappedKeyLocal(wrappedB64);
    await window._saveWrappedKeyFirebase(wrappedB64);
    window._dataKeyRaw = dataKeyRaw;
    window._plainPin   = val;
    window._cryptoKey  = await window.importDataKey(dataKeyRaw);
    await loadSecure();
    window.enterApp && window.enterApp();
    return;
  }

  const hash = await window.hashPin(val, pinSalt);
  if (hash !== storedHash) {
    const inp = document.getElementById('PI');
    inp.classList.add('err');
    document.getElementById('PE').textContent = 'Hatalı şifre!';
    setTimeout(() => { inp.classList.remove('err'); document.getElementById('PE').textContent=''; inp.value=''; }, 1400);
    return;
  }

  let wrappedB64 = await window._loadWrappedKeyFirebase() || window._getWrappedKey();
  if (!wrappedB64) { window.showPinErr && window.showPinErr('Şifreleme anahtarı bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.'); return; }

  let unwrapped;
  try { unwrapped = await window.unwrapDataKey(wrappedB64, val, pinSalt); }
  catch(e) { window.showPinErr && window.showPinErr('Veri çözülemedi — şifre eşleşmiyor.'); return; }

  window._dataKeyRaw = unwrapped.rawBytes;
  window._plainPin   = val;
  window._cryptoKey  = unwrapped.cryptoKey;
  window._saveWrappedKeyLocal(wrappedB64);

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

  const pinSalt = await window.getSaltAsync('v5-pin-salt');

  let storedHash = null;
  if (window._fbLoadPinHash) {
    try { storedHash = await window._fbLoadPinHash(); } catch(e) {}
  }

  const curHash = await window.hashPin(cur, pinSalt);
  if (curHash !== storedHash) { msg.style.color='var(--danger)'; msg.textContent='❌ Mevcut şifre yanlış'; return; }
  if (!nw || nw.length < 4)  { msg.style.color='var(--danger)'; msg.textContent='❌ En az 4 karakter'; return; }
  if (nw !== nw2)             { msg.style.color='var(--danger)'; msg.textContent='❌ Şifreler eşleşmiyor'; return; }

  const newHash = await window.hashPin(nw, pinSalt);
  if (window._fbSavePinHash) {
    try { await window._fbSavePinHash(newHash); } catch(e) {}
  }

  const newWrappedB64 = await window.wrapDataKey(window._dataKeyRaw, nw, pinSalt);
  window._saveWrappedKeyLocal(newWrappedB64);
  await window._saveWrappedKeyFirebase(newWrappedB64);
  window._plainPin = nw;

  msg.style.color='var(--ok)'; msg.textContent='✅ Şifre güncellendi!';
  ['CP','NP','NP2'].forEach(id => document.getElementById(id).value='');
  setTimeout(() => msg.textContent='', 3000);
}

window.chPass = chPass;
