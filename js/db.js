// js/db.js
// iskenderpay — Kilitlenme Karşıtı ve Esnek Veri Dağıtım Motoru (v8.45)

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

// PIN Kontrol ve Esnek Çözümleme Eylemi
window.submitPin = async function() {
  const pinInp = document.getElementById('PIN_INP') || document.getElementById('PIN_INPUT');
  const pinErr = document.getElementById('PIN_ERR');
  if (!pinInp) return;
  
  const pin = pinInp.value.trim();
  if (!pin) return;

  try {
    const snap = await getDoc(_planDoc());
    
    // 1. Durum: Veritabanında hiç veri yoksa sıfırdan oluştur
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

    const d = snap.data();
    const saltHex = (d.salts && d.salts.main) || "a1b2c3d4e5f67890a1b2c3d4e5f67890";
    
    // Anahtarı türet ve ham veriyi çözmeye çalış
    const key = await deriveKeyFromPin(pin, saltHex);
    let decryptedStr = "";
    
    try {
      decryptedStr = await decryptData(d.data, key);
    } catch (decryptFail) {
      // Eğer şifre çözme doğrudan başarısız oluyorsa PIN kesinlikle yanlıştır
      throw new Error("Şifre Çözme Hatası");
    }
    
    window._cryptoKey = key;
    setCryptoKey(key);
    
    // Veriyi işle ve state'e aktar
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
          
          // Ekrana yansıtmak üzere state'i güncelle
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

function completeUnlock(paysList) {
  const psEl = document.getElementById('PS');
  const appEl = document.getElementById('APP');
  
  if (psEl) {
    psEl.style.display = 'none';
    psEl.classList.remove('active');
  }
  if (appEl) {
    appEl.style.display = 'block';
  }

  // Eğer veritabanından gelen liste boşsa veya tanımsızsa, render motorunun çökmesini önlemek için doğrudan global atama yapıyoruz
  if (!window.pays || window.pays.length === 0) {
    window.pays = paysList || [];
    updateState('pays', window.pays);
  }

  // UI render döngüsünü zorla tetikle
  setTimeout(() => {
    render();
  }, 50);
}

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
          // Başarısızlık durumunda PIN ekranına düşür
        }
      }
      
      const psEl = document.getElementById('PS');
      const appEl = document.getElementById('APP');
      if (psEl) {
        psEl.style.setProperty('display', 'flex', 'important');
        psEl.classList.add('active');
      }
      if (appEl) appEl.style.setProperty('display', 'none', 'important');
      return false;
    } else {
      completeUnlock([]);
      return true;
    }
  } catch (e) {
    console.error("[DB] loadSecure hatası:", e);
  }
  return false;
}

onAuthStateChanged(auth, (user) => {
  const glsEl = document.getElementById('GLS');
  const plsEl = document.getElementById('PLS');
  if (user) {
    window._fbUid = user.uid;
    if (glsEl) glsEl.style.display = 'none';
    if (plsEl) plsEl.style.display = 'flex';
    loadSecure();
  } else {
    window._fbUid = null;
    window._cryptoKey = null;
    if (glsEl) glsEl.style.display = 'flex';
    if (plsEl) plsEl.style.display = 'none';
  }
});
