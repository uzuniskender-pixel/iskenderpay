// js/db.js
// iskenderpay — Firebase Modüler Katmanı (v8.16)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Orijinal index.html içerisindeki canlı Firebase konfigürasyonunuz
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

function _metaDoc() {
  return doc(db, 'users', window._fbUid + '_meta');
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

// ── VERİ GÜVENLİĞİ VE YÜKLEME ────────────────────────────────────────────────
export async function loadSecure() {
  if (!window._fbUid) return false;
  try {
    const snap = await getDoc(_planDoc());
    if (snap.exists()) {
      const d = snap.data();
      if (d.data) {
        // Şifreli veriyi localStorage'a eşitle ve belleğe almayı tetikle
        localStorage.setItem(`v5-data-${window._planId}`, d.data);
        return true;
      }
    }
  } catch (e) {
    console.error("[DB] Veri yükleme hatası:", e);
  }
  return false;
}

export async function saveSecure(encData) {
  if (!window._fbUid) return;
  await setDoc(_planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
}

// ── METADATA / SALT VE PIN YÖNETİMİ ──────────────────────────────────────────
export async function loadWrappedKey() {
  if (!window._fbUid) return null;
  try {
    const snap = await getDoc(_metaDoc());
    return snap.exists() ? (snap.data().wrappedKey || null) : null;
  } catch { return null; }
}

export async function saveWrappedKey(wrappedB64) {
  if (!window._fbUid) return;
  await setDoc(_metaDoc(), { wrappedKey: wrappedB64 }, { merge: true });
}
