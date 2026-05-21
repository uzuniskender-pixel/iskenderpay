// js/db.js
// iskenderpay — Kökten Çözüm Veritabanı ve Kripto Motoru (v8.25)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { updateState } from './state.js';
import { render } from './ui.js';

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

// Global Erişimler ve Orijinal Yapının Korunması
window._fbSave = async function(encData) {
  if (!window._fbUid) return;
  await setDoc(_planDoc(), { data: encData, updatedAt: Date.now() }, { merge: true });
};

// Kripto Yardımcı Fonksiyonları (Web Crypto API Standartları)
async function deriveKey(pin, saltB64) {
  const enc = new TextEncoder();
  const pinKey = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    pinKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

window.decryptData = async function(cipherB64, key) {
  const raw = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
  return new TextDecoder().decode(dec);
};

window.encryptData = async function(plainText, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(plainText));
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined));
};

// PIN Kontrol ve Onaylama Eylemi
window.submitPin = async function() {
  const pinInp = document.getElementById('PIN_INP');
  const pinErr = document.getElementById('PIN_ERR');
  if (!pinInp) return;
  
  const pin = pinInp.value.trim();
  if (!pin) return;

  try {
    const snap = await getDoc(_planDoc());
    if (!snap.exists() || !snap.data().data) {
      // Eğer veritabanında henüz hiç veri yoksa yeni anahtar üret
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const saltB64 = btoa(String.fromCharCode(...saltBytes));
      window._cryptoKey = await deriveKey(pin, saltB64);
      
      // İlk boş yapıyı şifrele ve kaydet
      const initialData = JSON.stringify({ pays: [] });
      const enc = await window.encryptData(initialData, window._cryptoKey);
      await setDoc(_planDoc(), { data: enc, salts: { main: saltB64 }, updatedAt: Date.now() }, { merge: true });
      
      completeUnlock();
      return;
    }

    const d = snap.data();
    const saltB64 = (d.salts && d.salts.main) || btoa("iskenderpaySalt123"); // Geriye dönük uyumluluk salt'ı
    
    const key = await deriveKey(pin, saltB64);
    const decryptedStr = await window.decryptData(d.data, key);
    
    // Şifre doğru çözüldüyse durumu güncelle
    window._cryptoKey = key;
    const parsed = JSON.parse(decryptedStr);
    if (parsed && typeof parsed === 'object') {
      Object.keys(parsed).forEach(k => updateState(k, parsed[k]));
    }
    
    completeUnlock();
  } catch (err) {
    console.error("PIN doğrulama hatası:", err);
    if (pinErr) pinErr.textContent = "Hatalı PIN kodu! Lütfen tekrar deneyin.";
    if (pinInp) {
      pinInp.classList.add('err');
      setTimeout(() => pinInp.classList.remove('err'), 400);
    }
  }
};

function completeUnlock() {
  const psEl = document.getElementById('PS');
  const appEl = document.getElementById('APP');
  if (psEl) {
    psEl.style.display = 'none';
    psEl.classList.remove('active');
  }
  if (appEl) {
    appEl.style.display = 'block';
  }
  render();
}

// Yükleme Stratejisi
export async function loadSecure() {
  if (!window._fbUid) return false;
  try {
    const snap = await getDoc(_planDoc());
    if (snap.exists() && snap.data().data) {
      const d = snap.data();
      // Eğer elimizde zaten bir anahtar varsa (örn: plan değiştirirken) doğrudan çöz
      if (window._cryptoKey) {
        try {
          const decryptedStr = await window.decryptData(d.data, window._cryptoKey);
          const parsed = JSON.parse(decryptedStr);
          Object.keys(parsed).forEach(k => updateState(k, parsed[k]));
          return true;
        } catch(e) {
          // Anahtar uyuşmadıysa PIN ekranını tetikle
        }
      }
      
      // PIN Ekranını Kesin Olarak Güvenli Aç
      const psEl = document.getElementById('PS');
      const appEl = document.getElementById('APP');
      if (psEl) {
        psEl.style.setProperty('display', 'flex', 'important');
        psEl.classList.add('active');
      }
      if (appEl) appEl.style.setProperty('display', 'none', 'important');
      return false;
    } else {
      // Veri yoksa uygulamayı aç, boş render et
      completeUnlock();
      return true;
    }
  } catch (e) {
    console.error("[DB] loadSecure hatası:", e);
  }
  return false;
}

// Auth Dinleyicisi
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
// app.js veya harici scriptlerin eski isimlerle çağrı yapabilmesi için alias (takma ad) exportları:
export const loginWithGoogle = window.doGoogleLogin;
export const logoutWithGoogle = window.doGoogleSignOut;

// Eğer app.js içeride başka fonksiyonlar da bekliyorsa garantiye alalım:
export { _planDoc, _metaDoc };
