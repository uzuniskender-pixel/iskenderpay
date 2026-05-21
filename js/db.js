// js/db.js
// iskenderpay — Veritabanı ve Senkronizasyon Modülü (v8.16)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { state, updateState } from './state.js';
import { encryptData, decryptData, getCryptoKey } from './crypto.js';

// ⚠️ NOT: index.html dosyanızın en tepesinde yer alan 
// kendi Firebase config nesnenizi bu alana birebir yapıştırın.
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

// Firebase Servislerini Başlat
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

/**
 * Bellekteki (state) tüm verileri AES-256-GCM ile şifreler, 
 * hem Firestore bulutuna hem de yerel localStorage yedeğine yazar.
 */
export async function saveSecure() {
  const key = getCryptoKey();
  if (!key || !window._fbUid) {
    console.warn("[DB] Şifreleme anahtarı veya UID eksik. Kayıt iptal edildi.");
    return;
  }

  try {
    const payload = {
      pays: await encryptData(JSON.stringify(state.pays), key),
      creds: await encryptData(JSON.stringify(state.creds), key),
      paidItems: await encryptData(JSON.stringify(state.paidItems), key),
      hist: await encryptData(JSON.stringify(state.hist), key),
      persons: await encryptData(JSON.stringify(state.persons), key),
      notes: await encryptData(JSON.stringify(state.notes), key),
      rehber: await encryptData(JSON.stringify(state.rehber), key),
      actLog: await encryptData(JSON.stringify(state.actLog), key)
    };

    // 1. Bulut Senkronizasyonu (Firestore)
    const docRef = doc(db, `users/${window._fbUid}/plans/${window._planId}`);
    await setDoc(docRef, payload);

    // 2. Lokal Şifreli Yedekleme (Fallback / Off-line için)
    localStorage.setItem(`v5-data-${window._planId}`, JSON.stringify(payload));
    
    // UI üzerinde küçük bildirim tetiklemesi
    showSyncToast();
  } catch (err) {
    console.error("[DB] Güvenli kayıt esnasında hata oluştu:", err);
    throw err;
  }
}

/**
 * Firestore'dan (veya internet yoksa localStorage'dan) şifreli verileri çeker,
 * AES-256-GCM ile çözer ve merkezi state nesnesini günceller.
 * @returns {Promise<boolean>} İşlem başarısı
 */
export async function loadSecure() {
  const key = getCryptoKey();
  if (!key || !window._fbUid) return false;

  try {
    // Önce Firestore'dan çekmeyi dene
    const docRef = doc(db, `users/${window._fbUid}/plans/${window._planId}`);
    const docSnap = await getDoc(docRef);
    let encryptedPayload = null;

    if (docSnap.exists()) {
      encryptedPayload = docSnap.data();
    } else {
      // Bulutta bulunamadıysa lokal şifreli yedeği dene
      const localData = localStorage.getItem(`v5-data-${window._planId}`);
      if (localData) encryptedPayload = JSON.parse(localData);
    }

    if (encryptedPayload) {
      // Her bir veri katmanını sırayla çöz ve state'e işle
      if (encryptedPayload.pays) updateState('pays', JSON.parse(await decryptData(encryptedPayload.pays, key)));
      if (encryptedPayload.creds) updateState('creds', JSON.parse(await decryptData(encryptedPayload.creds, key)));
      if (encryptedPayload.paidItems) updateState('paidItems', JSON.parse(await decryptData(encryptedPayload.paidItems, key)));
      if (encryptedPayload.hist) updateState('hist', JSON.parse(await decryptData(encryptedPayload.hist, key)));
      if (encryptedPayload.persons) updateState('persons', JSON.parse(await decryptData(encryptedPayload.persons, key)));
      if (encryptedPayload.notes) updateState('notes', JSON.parse(await decryptData(encryptedPayload.notes, key)));
      if (encryptedPayload.rehber) updateState('rehber', JSON.parse(await decryptData(encryptedPayload.rehber, key)));
      if (encryptedPayload.actLog) updateState('actLog', JSON.parse(await decryptData(encryptedPayload.actLog, key)));
      
      console.log(`[DB] ${window._planId} verileri başarıyla çözüldü ve yüklendi.`);
      return true;
    }
    
    console.log("[DB] Çözülecek şifreli veri bulunamadı, temiz profil açılıyor.");
    return false;
  } catch (err) {
    console.error("[DB] Veri yükleme ve şifre çözme hatası:", err);
    return false;
  }
}

/**
 * Google ile Pop-up Giriş Penceresini Açar
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    window._fbUid = result.user.uid;
    return result.user;
  } catch (err) {
    console.error("[DB] Giriş hatası:", err);
    throw err;
  }
}

/**
 * Oturum Kapatma Süreci
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    window._fbUid = null;
  } catch (err) {
    console.error("[DB] Çıkış hatası:", err);
  }
}

// Arayüzdeki "Senkronize Edildi" Toast Mesajı
function showSyncToast() {
  const t = document.getElementById('sync-toast');
  if (t) {
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }
}