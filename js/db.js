// js/db.js
// iskenderpay — Firebase ve Şifreli Veri Senkronizasyonu (v8.21)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { updateState } from './state.js';

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

function _planDoc() {
  return doc(db, 'users', window._fbUid + '_' + window._planId);
}

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

export async function loadSecure() {
  if (!window._fbUid) return false;
  try {
    const snap = await getDoc(_planDoc());
    let rawEncryptedData = null;

    if (snap.exists()) {
      const d = snap.data();
      if (d.data) {
        rawEncryptedData = d.data;
        localStorage.setItem(`v5-data-${window._planId}`, rawEncryptedData);
      }
    } else {
      rawEncryptedData = localStorage.getItem(`v5-data-${window._planId}`);
    }

    if (rawEncryptedData) {
      try {
        let parsed = JSON.parse(rawEncryptedData);
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach(key => {
            if (Array.isArray(parsed[key])) updateState(key, parsed[key]);
          });
          return true;
        }
      } catch (e) {
        if (window._cryptoKey && window.decryptData) {
          try {
            let decryptedStr = await window.decryptData(rawEncryptedData, window._cryptoKey);
            let parsed = JSON.parse(decryptedStr);
            Object.keys(parsed).forEach(key => updateState(key, parsed[key]));
            return true;
          } catch (decryptErr) {
            console.error("[DB] Şifre çözme başarısız (Hatalı PIN).");
          }
        } else {
          console.warn("[DB] Veri kriptolu. Kilit açma ekranı (PIN) zorla tetikleniyor...");
          
          // Ekranda kilit ekranını kilitle, uygulamayı gizle
          const psEl = document.getElementById('PS');
          const appEl = document.getElementById('APP');
          if (psEl) {
            psEl.style.setProperty('display', 'flex', 'important');
            psEl.classList.add('active');
          }
          if (appEl) appEl.style.setProperty('display', 'none', 'important');
        }
      }
    }
  } catch (e) {
    console.error("[DB] loadSecure hatası:", e);
  }
  return false;
}

export async function saveSecure(encData) {
  if (!window._fbUid) return;
  await setDoc(_planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
}
