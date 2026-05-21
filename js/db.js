// js/db.js — v8.47-fixed
// Eski index.html v8 doLogin() akışıyla birebir uyumlu

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { updateState } from './state.js';
import { render } from './ui.js';
import {
  getSaltFromUid, importDataKey, wrapDataKey, unwrapDataKey,
  deriveKeyLegacy, hashPin, encryptData, decryptData,
  setCryptoKey, getCryptoKey, setPlainPin, getPlainPin,
  setDataKeyRaw, getDataKeyRaw, clearCryptoSession
} from './crypto.js';

const firebaseConfig = {
  apiKey: "AIzaSyCZOvzCp4l0y2rJS2xFS1pSwoDWGcnUY6E",
  authDomain: "iskenderpay-a23d1.firebaseapp.com",
  projectId: "iskenderpay-a23d1",
  storageBucket: "iskenderpay-a23d1.firebasestorage.app",
  messagingSenderId: "916658036032",
  appId: "1:916658036032:web:ad44e5d591e1adfc49aea5",
  measurementId: "G-SPPX7F1BDY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// _planId tek yetkili tanımı state.js'de — burada yok

export function _planDoc() {
  return doc(db, 'users', window._fbUid + '_' + window._planId);
}
export function _metaDoc() {
  return doc(db, 'users', window._fbUid + '_meta');
}

// ── Firebase yardımcıları ──────────────────────────────────────────────────

async function fbLoad() {
  if (!window._fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? snap.data().data : null;
}

async function fbLoadPinHash() {
  if (!window._fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? (snap.data().pinHash || null) : null;
}

async function fbSavePinHash(hash) {
  if (!window._fbUid) return;
  await setDoc(_planDoc(), { pinHash: hash }, { merge: true });
}

async function fbLoadWrappedKey() {
  if (!window._fbUid) return null;
  try {
    const snap = await getDoc(_metaDoc());
    return snap.exists() ? (snap.data().wrappedKey || null) : null;
  } catch(e) { return null; }
}

async function fbSaveWrappedKey(wrappedB64) {
  if (!window._fbUid) return;
  await setDoc(_metaDoc(), { wrappedKey: wrappedB64 }, { merge: true });
}

window._fbSave = async function(encData) {
  if (!window._fbUid) return;
  await setDoc(_planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
};

function getWrappedKeyLocal() {
  return localStorage.getItem('v8-wrapped-key');
}
function saveWrappedKeyLocal(wrappedB64) {
  localStorage.setItem('v8-wrapped-key', wrappedB64);
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch(e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } else {
      alert('Giriş başarısız: ' + e.message);
    }
  }
}

export async function logoutUser() {
  await signOut(auth);
}

// ── v8 migrasyon ───────────────────────────────────────────────────────────

async function migrateToV8(pin, pinSalt) {
  const migKey = 'v8-migrated-' + (window._fbUid || 'local');
  if (localStorage.getItem(migKey)) return;

  const dataKeyRaw   = crypto.getRandomValues(new Uint8Array(32));
  const newCryptoKey = await importDataKey(dataKeyRaw);

  for (const planId of ['plan1', 'plan2']) {
    let encOld = null;
    if (window._planId === planId) {
      try { encOld = await fbLoad(); } catch(e) {}
    }
    if (!encOld) encOld = localStorage.getItem('v5-data-' + planId);
    if (!encOld) continue;
    try {
      const dataStr = await decryptData(encOld, getCryptoKey());
      const encNew  = await encryptData(dataStr, newCryptoKey);
      localStorage.setItem('v5-data-' + planId, encNew);
      const origPlan = window._planId;
      window._planId = planId;
      try { await window._fbSave(encNew); } catch(e) {}
      window._planId = origPlan;
    } catch(e) {}
  }

  const wrappedB64 = await wrapDataKey(dataKeyRaw, pin, pinSalt);
  saveWrappedKeyLocal(wrappedB64);
  await fbSaveWrappedKey(wrappedB64);

  setDataKeyRaw(dataKeyRaw);
  setCryptoKey(newCryptoKey);
  window._cryptoKey = newCryptoKey;

  localStorage.setItem(migKey, '1');
  console.log('[DB] v8 migrasyon tamamlandı');
}

// ── Ana PIN handler — eski doLogin() ile birebir aynı mantık ──────────────

window.submitPin = async function() {
  const pinInp = document.getElementById('PIN_INPUT');
  const pinErr = document.getElementById('PIN_ERR');
  if (!pinInp) return;
  const pin = pinInp.value.trim();
  if (!pin) return;

  const showErr = (msg) => {
    if (pinErr) pinErr.textContent = msg;
    if (pinInp) {
      pinInp.classList.add('err');
      setTimeout(() => { pinInp.classList.remove('err'); }, 1400);
    }
  };

  try {
    // Zaten key var ve pin aynıysa direkt yükle
    const currentKey = getCryptoKey();
    const currentPin = getPlainPin();
    if (currentKey && currentPin && currentPin === pin) {
      try {
        await loadSecure();
        completeUnlock();
        return;
      } catch(e) {}
    }

    const pinSalt = await getSaltFromUid(window._fbUid, 'v5-pin-salt');

    // PIN hash kontrol
    let storedHash = null;
    try { storedHash = await fbLoadPinHash(); } catch(e) {}

    if (!storedHash) {
      // İlk kullanım
      if (pin.length < 4) { showErr('En az 4 karakter girmelisiniz!'); return; }
      const hash = await hashPin(pin, pinSalt);
      try { await fbSavePinHash(hash); } catch(e) {}

      const dataKeyRaw = crypto.getRandomValues(new Uint8Array(32));
      const wrappedB64 = await wrapDataKey(dataKeyRaw, pin, pinSalt);
      saveWrappedKeyLocal(wrappedB64);
      await fbSaveWrappedKey(wrappedB64);

      setDataKeyRaw(dataKeyRaw);
      setPlainPin(pin);
      const key = await importDataKey(dataKeyRaw);
      setCryptoKey(key);
      window._cryptoKey = key;

      await loadSecure();
      completeUnlock();
      return;
    }

    // PIN hash doğrula
    const hash = await hashPin(pin, pinSalt);
    if (hash !== storedHash) {
      showErr('Hatalı PIN kodu!');
      setTimeout(() => { if (pinInp) pinInp.value = ''; }, 1400);
      return;
    }

    // wrapped key al
    let wrappedB64 = await fbLoadWrappedKey() || getWrappedKeyLocal();

    if (!wrappedB64) {
      // v5'ten gelen kullanıcı — eski deriveKey ile yükle, sonra v8'e migrate et
      const dataSalt = await getSaltFromUid(window._fbUid, 'v5-data-salt');
      const legacyKey = await deriveKeyLegacy(pin, dataSalt);
      setCryptoKey(legacyKey);
      window._cryptoKey = legacyKey;
      setPlainPin(pin);
      try {
        await loadSecure();
        await migrateToV8(pin, pinSalt);
      } catch(e) {
        showErr('Veri çözülemedi — şifre eşleşmiyor.');
        return;
      }
      completeUnlock();
      return;
    }

    // wrapped key unwrap et
    let unwrapped;
    try {
      unwrapped = await unwrapDataKey(wrappedB64, pin, pinSalt);
    } catch(e) {
      showErr('Veri çözülemedi — şifre eşleşmiyor.');
      return;
    }

    setDataKeyRaw(unwrapped.rawBytes);
    setPlainPin(pin);
    setCryptoKey(unwrapped.cryptoKey);
    window._cryptoKey = unwrapped.cryptoKey;
    saveWrappedKeyLocal(wrappedB64);

    try {
      await loadSecure();
    } catch(e) {
      // Diğer planı dene
      const otherPlan = window._planId === 'plan1' ? 'plan2' : 'plan1';
      const origPlan  = window._planId;
      window._planId  = otherPlan;
      try {
        await loadSecure();
        localStorage.setItem('v6-active-plan', otherPlan);
      } catch(e2) {
        window._planId = origPlan;
        showErr('Veri çözülemedi. Lütfen tekrar deneyin.');
        return;
      }
    }

    completeUnlock();

  } catch(err) {
    console.error('[DB] PIN doğrulama hatası:', err);
    showErr('Beklenmeyen hata: ' + err.message);
  }
};

// ── loadSecure ─────────────────────────────────────────────────────────────

export async function loadSecure() {
  if (!window._fbUid) return false;
  try {
    const enc = await fbLoad();
    if (!enc) {
      // Veri yok — boş state ile aç
      updateState('pays', []);
      window.pays = [];
      return true;
    }
    const key = getCryptoKey();
    if (!key) throw new Error('crypto key yok');
    const dataStr = await decryptData(enc, key);
    const parsed  = JSON.parse(dataStr);
    if (parsed && typeof parsed === 'object') {
      Object.keys(parsed).forEach(k => updateState(k, parsed[k]));
    }
    return true;
  } catch(e) {
    console.error('[DB] loadSecure hatası:', e);
    throw e;
  }
}

// ── completeUnlock ─────────────────────────────────────────────────────────

function completeUnlock() {
  const psEl  = document.getElementById('PS');
  const appEl = document.getElementById('APP');
  if (psEl)  { psEl.style.display = 'none'; psEl.classList.remove('active'); }
  if (appEl) { appEl.style.display = 'flex'; }
  setTimeout(() => { render(); }, 50);
}
