// js/firebase.js — iskenderpay
// Firebase init, auth, Firestore yardımcıları.
// ── FİREBASE MODULAR v10 ─────────────────────────────────────────────────────
import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
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

const _app    = initializeApp(firebaseConfig);
const _auth   = getAuth(_app);
const _db     = getFirestore(_app);
let   _fbUid  = null;
window._fbUid = null;

// Aktif plan (plan1 veya plan2)
// [state.js'e taşındı]
window._planId = localStorage.getItem('v6-active-plan') || 'plan1';

// ── FIRESTORE YARDIMCI ────────────────────────────────────────────────────────
function _planDoc(planId) {
  return doc(_db, 'users', _fbUid + '_' + (planId || window._planId));
}
function _metaDoc() {
  return doc(_db, 'users', _fbUid + '_meta');
}

// Firebase'e veri kaydet
window._fbSave = async function(encData) {
  if (!_fbUid) return;
  await setDoc(_planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
};

// Polling tabanlı sync (onSnapshot yerine — mobilde daha güvenilir)
window._syncTimer   = null;
window._lastUpdated = 0;
window._syncCb      = null;

window._fbStartListen = function(onData) {
  if (!_fbUid || !window._planId) return;
  window._syncCb = onData;
  if (window._syncTimer) clearInterval(window._syncTimer);
  window._syncTimer = setInterval(window._fbPoll, 30000); // 30 sn
  setTimeout(window._fbPoll, 5000);
};

window._fbPoll = async function() {
  if (!_fbUid || !window._planId || !window._syncCb) return;
  // Yerel kayıt bekliyorsa (debounce aktif) poll'dan gelen eski veriyi uygulama —
  // aksi hâlde kullanıcının henüz kaydedilmemiş değişiklikleri ezilir.
  if (typeof _saveTimer !== 'undefined' && _saveTimer !== null) return;
  try {
    const snap = await getDoc(_planDoc());
    if (!snap.exists()) { setSyncDot('active'); return; }
    const d = snap.data();
    const ts = d.updatedAt || 0;
    if (ts > window._lastUpdated && window._lastUpdated > 0) {
      window._lastUpdated = ts;
      if (d.data) window._syncCb(d.data);
    } else if (window._lastUpdated === 0) {
      window._lastUpdated = ts;
    }
    setSyncDot('active');
  } catch(e) {
    console.warn('Sync poll hatası:', e.message || e);
  }
};

window._fbStopListen = function() {
  if (window._syncTimer) { clearInterval(window._syncTimer); window._syncTimer = null; }
  window._syncCb = null;
};

// Firebase'den veri yükle
window._fbLoad = async function() {
  if (!_fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? snap.data().data : null;
};

// Firebase'e salt kaydet
window._fbSaveSalt = async function(saltKey, saltVal) {
  if (!_fbUid) return;
  const update = {};
  update['salts.' + saltKey] = saltVal;
  await setDoc(_planDoc(), update, { merge: true });
};

// Firebase'den salt yükle
window._fbLoadSalt = async function(saltKey) {
  if (!_fbUid) return null;
  const snap = await getDoc(_planDoc());
  if (!snap.exists()) return null;
  const salts = snap.data().salts || {};
  return salts[saltKey] || null;
};

// Firebase'e PIN hash kaydet
window._fbSavePinHash = async function(hash) {
  if (!_fbUid) return;
  await setDoc(_planDoc(), { pinHash: hash }, { merge: true });
};

// Firebase'den PIN hash yükle
window._fbLoadPinHash = async function() {
  if (!_fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? (snap.data().pinHash || null) : null;
};

// v8 wrapped key — Firebase _meta document
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

// ── AUTH ──────────────────────────────────────────────────────────────────────
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
    renderPlanNames();
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

// Google ile giriş — popup kullan
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

// Çıkış
window.doGoogleSignOut = async function() {
  if (!confirm('Çıkış yapmak istiyor musunuz?')) return;
  await signOut(_auth);
};
