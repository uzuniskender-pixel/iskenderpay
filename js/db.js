// js/db.js
// iskenderpay — Kilitlenme Karşıtı ve Esnek Veri Dağıtım Motoru (v8.46 - fixed)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { updateState } from './state.js';
import { render } from './ui.js';
import { deriveKeyFromPin, encryptData, decryptData, setCryptoKey } from './crypto.js';

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

window._planId = localStorage.getItem('v6-active-plan') || 'plan1';

export function _planDoc() {
  return doc(db, 'users', window._fbUid + '_' + window._planId);
}

export function _metaDoc() {
  return doc(db, 'users', window._fbUid + '_meta');
}

window._fbSave = async function(encData) {
  if (!window._fbUid) return;
  await setDoc(_planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
};

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

window.doGoogleLogin = loginWithGoogle;
window.doGoogleSignOut = logoutUser;

// ─── PIN EKRANINI GÖSTER ──────────────────────────────────────────────────────
function showPinScreen(desc) {
  const psEl = document.getElementById('PS');
  const appEl = document.getElementById('APP');
  if (psEl) {
    if (desc) {
      const descEl = document.getElementById('PS_DESC');
      if (descEl) descEl.textContent = desc;
    }
    psEl.style.display = 'flex';
    psEl.classList.add('active');
  }
  if (appEl) appEl.style.display = 'none';
  console.log('[DB] PIN ekranı gösterildi.');
}

// ─── PIN SUBMIT — TEK MERKEZİ NOKTADAN YÖNETİLİR ────────────────────────────
window.submitPin = async function() {
  const pinInp = document.getElementById('PIN_INPUT');
  const pinErr = document.getElementById('PIN_ERR');
  if (!pinInp) return;

  const pin = pinInp.value.trim();
  if (!pin) return;

  try {
    const snap = await getDoc(_planDoc());

    // 1. Durum: Veritabanında hiç veri yok → yeni şifreli veri oluştur
    if (!snap.exists() || !snap.data().data) {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const key = await deriveKeyFromPin(pin, saltHex);
      window._cryptoKey = key;
      setCryptoKey(key);

      const initialData = JSON.stringify({ pays: [] });
      const enc = await encryptData(initialData, key);
      await setDoc(_planDoc(), { data: enc, salts: { main: saltHex }, updatedAt: Date.now() }, { merge: true });

      completeUnlock([]);
      return;
    }

    // 2. Durum: Veri var → salt'ı Firestore'dan al, anahtar türet, çöz
    const d = snap.data();
    const saltHex = (d.salts && d.salts.main) || "a1b2c3d4e5f67890a1b2c3d4e5f67890";

    const key = await deriveKeyFromPin(pin, saltHex);
    let decryptedStr = "";

    try {
      decryptedStr = await decryptData(d.data, key);
    } catch (decryptFail) {
      throw new Error("Şifre Çözme Hatası");
    }

    window._cryptoKey = key;
    setCryptoKey(key);

    let parsedData = [];
    if (decryptedStr) {
      try {
        const parsed = JSON.parse(decryptedStr);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.pays)) {
            parsedData = parsed.pays;
          } else if (Array.isArray(parsed)) {
            parsedData = parsed;
          }
          Object.keys(parsed).forEach(k => updateState(k, parsed[k]));
        }
      } catch (jsonErr) {
        console.warn("[DB] Veri çözüldü fakat JSON parse edilemedi, boş liste ile açılıyor.");
      }
    }

    completeUnlock(parsedData);

  } catch (err) {
    console.error("PIN doğrulama hatası:", err);
    if (pinErr) pinErr.textContent = "Hatalı PIN kodu veya çözülemeyen veri yapısı!";
    if (pinInp) {
      pinInp.classList.add('err');
      setTimeout(() => pinInp.classList.remove('err'), 400);
    }
  }
};

// ─── KİLİT AÇMA TAMAMLANDI ───────────────────────────────────────────────────
function completeUnlock(paysList) {
  const psEl = document.getElementById('PS');
  const appEl = document.getElementById('APP');

  if (psEl) {
    psEl.style.display = 'none';
    psEl.classList.remove('active');
  }
  if (appEl) {
    appEl.style.display = 'flex';  // flex: app-container flex kullanıyor
  }

  if (!window.pays || window.pays.length === 0) {
    window.pays = paysList || [];
    updateState('pays', window.pays);
  }

  setTimeout(() => render(), 50);
}

// ─── GÜVENLİ VERİ YÜKLE ──────────────────────────────────────────────────────
export async function loadSecure() {
  if (!window._fbUid) return false;
  try {
    const snap = await getDoc(_planDoc());
    if (snap.exists() && snap.data().data) {
      const d = snap.data();
      if (window._cryptoKey) {
        try {
          const decryptedStr = await decryptData(d.data, window._cryptoKey);
          const parsed = JSON.parse(decryptedStr);
          Object.keys(parsed).forEach(k => updateState(k, parsed[k]));
          return true;
        } catch(e) {
          console.warn("[DB] Mevcut anahtar ile çözülemedi, PIN isteniyor.");
        }
      }
      // Anahtar yok ya da çözülemedi → PIN iste
      showPinScreen("Verilerinize erişmek için güvenlik PIN kodunuzu girin.");
      return false;
    } else {
      // Hiç veri yok → boş başlat
      completeUnlock([]);
      return true;
    }
  } catch (e) {
    console.error("[DB] loadSecure hatası:", e);
  }
  return false;
}

// ─── AUTH DURUM TAKİBİ ────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  const glsEl = document.getElementById('GLS');
  const plsEl = document.getElementById('PLS');
  const plsUser = document.getElementById('PLS_USER');
  if (user) {
    window._fbUid = user.uid;
    if (glsEl) glsEl.style.display = 'none';
    if (plsUser) plsUser.textContent = '👤 ' + (user.displayName || user.email);
    if (plsEl) plsEl.style.display = 'flex';
    loadSecure();
  } else {
    window._fbUid = null;
    window._cryptoKey = null;
    if (glsEl) glsEl.style.display = 'flex';
    if (plsEl) plsEl.style.display = 'none';
    // Kullanıcı yoksa login ekranı görünsün, APP gizlensin
    const appEl = document.getElementById('APP');
    const psEl = document.getElementById('PS');
    if (appEl) appEl.style.display = 'none';
    if (psEl) { psEl.style.display = 'none'; psEl.classList.remove('active'); }
  }
});
