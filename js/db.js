// js/db.js — v8.50 (tek onAuthStateChanged, merkezi PIN yönetimi)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { updateState } from './state.js';
import { render } from './ui.js';
import { deriveKeyFromPin, encryptData, decryptData, setCryptoKey, clearCryptoSession } from './crypto.js';

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

// ─── YARDIMCI ────────────────────────────────────────────────────────────────
function planDoc() {
  return doc(db, 'users', window._fbUid + '_' + window._planId);
}

function showLogin() {
  document.getElementById('GLS').style.display = 'flex';
  document.getElementById('PLS').style.display = 'none';
  document.getElementById('PS').style.display  = 'none';
  document.getElementById('APP').style.display = 'none';
}

function showPin(desc) {
  const psEl = document.getElementById('PS');
  if (desc) {
    const d = document.getElementById('PS_DESC');
    if (d) d.textContent = desc;
  }
  psEl.style.display = 'flex';
  psEl.classList.add('active');
  document.getElementById('APP').style.display = 'none';
}

function showApp() {
  document.getElementById('PS').style.display  = 'none';
  document.getElementById('PS').classList.remove('active');
  document.getElementById('APP').style.display = 'flex';
  document.getElementById('GLS').style.display = 'none';
}

// ─── VERİ YÜKLE ──────────────────────────────────────────────────────────────
export async function loadSecure() {
  if (!window._fbUid) return false;

  try {
    const snap = await getDoc(planDoc());

    if (!snap.exists() || !snap.data().data) {
      // Hiç veri yok → boş aç
      _unlock([]);
      return true;
    }

    const d = snap.data();

    if (window._cryptoKey) {
      // Anahtar bellekte var → direkt çöz
      try {
        const str = await decryptData(d.data, window._cryptoKey);
        _applyData(str);
        showApp();
        render();
        return true;
      } catch(e) {
        console.warn('[DB] Mevcut anahtar işe yaramadı, PIN isteniyor.');
      }
    }

    // Anahtar yok → PIN iste
    showPin('Verilerinize erişmek için PIN kodunuzu girin.');
    return false;

  } catch(e) {
    console.error('[DB] loadSecure hatası:', e);
    return false;
  }
}

function _applyData(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') {
      Object.keys(parsed).forEach(k => updateState(k, parsed[k]));
    }
  } catch(e) {
    console.warn('[DB] JSON parse hatası, boş veri ile açılıyor.');
  }
}

function _unlock(paysList) {
  updateState('pays', paysList || []);
  window.pays = paysList || [];
  showApp();
  setTimeout(() => render(), 50);
}

// ─── PIN SUBMIT ───────────────────────────────────────────────────────────────
window.submitPin = async function() {
  const pinInp = document.getElementById('PIN_INPUT');
  const pinErr = document.getElementById('PIN_ERR');
  if (!pinInp) return;

  const pin = pinInp.value.trim();
  if (!pin) return;

  try {
    const snap = await getDoc(planDoc());

    if (!snap.exists() || !snap.data().data) {
      // İlk kullanım: yeni salt + şifreli boş veri oluştur
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const key = await deriveKeyFromPin(pin, saltHex);
      window._cryptoKey = key;
      setCryptoKey(key);
      const enc = await encryptData(JSON.stringify({ pays: [] }), key);
      await setDoc(planDoc(), { data: enc, salts: { main: saltHex }, updatedAt: Date.now() }, { merge: true });
      _unlock([]);
      return;
    }

    const d = snap.data();
    // Salt MUTLAKA Firestore'dan alınır — index.html'deki staticSalt artık kullanılmıyor
    const saltHex = (d.salts && d.salts.main) || 'a1b2c3d4e5f67890a1b2c3d4e5f67890';
    const key = await deriveKeyFromPin(pin, saltHex);

    let decStr;
    try {
      decStr = await decryptData(d.data, key);
    } catch(e) {
      throw new Error('WRONG_PIN');
    }

    window._cryptoKey = key;
    setCryptoKey(key);
    _applyData(decStr);

    const parsedForList = (() => { try { const p = JSON.parse(decStr); return Array.isArray(p.pays) ? p.pays : []; } catch(e) { return []; } })();
    _unlock(parsedForList);

  } catch(err) {
    const msg = err.message === 'WRONG_PIN'
      ? 'Hatalı PIN kodu!'
      : 'Veri çözülemedi veya bağlantı hatası.';
    if (pinErr) pinErr.textContent = msg;
    if (pinInp) { pinInp.classList.add('err'); setTimeout(() => pinInp.classList.remove('err'), 400); }
  }
};

// ─── KAYDET ──────────────────────────────────────────────────────────────────
window._fbSave = async function(encData) {
  if (!window._fbUid) return;
  await setDoc(planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
};

// ─── GİRİŞ / ÇIKIŞ ───────────────────────────────────────────────────────────
export async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
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

window.doGoogleLogin    = loginWithGoogle;
window.doGoogleSignOut  = async function() {
  if (confirm('Çıkış yapmak istiyor musunuz? Bellek temizlenecektir.')) {
    await logoutUser();
    clearCryptoSession();
    window._cryptoKey = null;
    window._fbUid = null;
    window.location.reload();
  }
};

// ─── TEK AUTH LISTENER (app.js'deki kaldırıldı) ──────────────────────────────
auth.onAuthStateChanged(async (user) => {
  const plsUser = document.getElementById('PLS_USER');

  if (user) {
    window._fbUid = user.uid;
    if (plsUser) plsUser.textContent = '👤 ' + (user.displayName || user.email);

    // Aktif planı başlat
    window._planId = localStorage.getItem('v6-active-plan') || 'plan1';
    await loadSecure();

  } else {
    window._fbUid    = null;
    window._cryptoKey = null;
    clearCryptoSession();
    showLogin();
  }
});
