// js/firestore.js — iskenderpay (v1.0)
// Firestore I/O katmani — saf data ops (auth/encrypt/schema bilmez).
// Auth ownership: firebase.js. PIN ownership: auth-pin.js.
// Encrypt + storage + migration ownership: persist.js.
// v8.127'de db.js'ten ayristirildi.

import { getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { shouldBlock } from './conflict.js';

// _planDoc / _metaDoc firebase.js'de tanımlı. WO-10: modül-üstü deger yakalama
// (import sirasina bagimli, undefined yakalanip sessiz cokme riski) yerine LAZY:
// cagri aninda window'dan okunur -> firebase.js once/sonra yuklensin, calisir.
const _planDoc = (...a) => window._planDoc(...a);
const _metaDoc = (...a) => window._metaDoc(...a);


// v8.199: cakisma bekcisi (optimistic concurrency / compare-and-swap).
// Yazmadan ONCE uzak updatedAt'i oku. Store.lastUpdated baseline'imiz (en son
// bildigimiz uzak deger) > 0 ise ve uzak ondan ILERIDE ise -> baska cihaz bizden
// sonra yazmis demektir: uzeri YAZMA, cakismayi bildir (cagiran uzak veriyi
// yukler + uyarir). Baseline = uzak doc'un updatedAt'i (saat kaymasi-dayanikli:
// iki makine saatini degil, ayni alanin degerini karsilastirir).
// Donus: {ok, updatedAt} | {conflict, remote, remoteTs} | {skipped}.
// NOT: read-then-write arasi mikro-yaris tek-kullanici/iki-makine icin ihmal
// edilir (tam atomiklik runTransaction gerektirir; "hafif" kapsamda kapsam disi).
window._fbSave = async function(encData) {
  if (!window.Store.fbUid) return { skipped: true };
  const base = window.Store.lastUpdated || 0;
  if (base > 0) {
    try {
      const snap = await getDoc(_planDoc());
      if (snap.exists()) {
        const remoteTs = snap.data().updatedAt || 0;
        if (shouldBlock(remoteTs, base)) {
          return { conflict: true, remote: snap.data().data || null, remoteTs };
        }
      }
    } catch (e) {
      // Okuma basarisiz -> eski davranisa don: yine de yazmayi dene (veri kaybetme).
      console.warn('Cakisma kontrolu okunamadi, yazmaya devam:', e.message || e);
    }
  }
  const updatedAt = Date.now();
  await setDoc(_planDoc(), { data: encData, updatedAt }, { merge: true });
  return { ok: true, updatedAt };
};

// _syncTimer / _lastUpdated / _syncCb v8.108'de Store internal'a tasindi (Store.syncTimer vb.)

window._fbStartListen = function(onData) {
  if (!window.Store.fbUid || !window.Store.planId) return;
  window.Store.syncCb = onData;
  if (window.Store.syncTimer) clearInterval(window.Store.syncTimer);
  window.Store.syncTimer = setInterval(window._fbPoll, 30000);
  setTimeout(window._fbPoll, 5000);
};

let _pollRunning = false;
window._fbPoll = async function() {
  if (!window.Store.fbUid || !window.Store.planId || !window.Store.syncCb) return;
  if (window.Store.saveTimer !== null && window.Store.saveTimer !== undefined) return;
  if (window.Store.dirty) return;  // Bekleyen degisiklik var — sync atla
  if (_pollRunning) return;   // Concurrent poll önle
  _pollRunning = true;
  try {
    const snap = await getDoc(_planDoc());
    if (!snap.exists()) { window.setSyncDot && window.setSyncDot('active'); return; }
    const d = snap.data();
    const ts = d.updatedAt || 0;
    // Firebase'e yazılamamış veri varsa önce onu yükle
    if (window.Store.fbSyncNeeded && !window.Store.dirty) {
      const enc = localStorage.getItem('v5-data-' + window.Store.planId);
      if (enc) {
        try {
          const res = await window._fbSave(enc);
          if (res && res.conflict) {
            // v8.199: cevrimdisiyken baska cihaz yazmis -> uzeri yazma, uzak veriyi al + uyar
            window.Store.lastUpdated = res.remoteTs;
            window.Store.fbSyncNeeded = false;
            if (res.remote && window.applyRemote) await window.applyRemote(res.remote);
            window.showWarnToast && window.showWarnToast('Cevrimdisi degisiklik gonderilemedi: baska cihazda guncelleme var, en guncel veri yuklendi.');
          } else if (res && res.ok) {
            window.Store.lastUpdated = res.updatedAt;
            window.Store.fbSyncNeeded = false;
          }
        } catch(e) {}
      }
      return;
    }
    if (ts > window.Store.lastUpdated && window.Store.lastUpdated > 0) {
      window.Store.lastUpdated = ts;
      if (d.data) window.Store.syncCb(d.data);
    } else if (window.Store.lastUpdated === 0) {
      window.Store.lastUpdated = ts;
    }
    window.setSyncDot && window.setSyncDot('active');
  } catch(e) {
    console.warn('Sync poll hatası:', e.message || e);
  } finally {
    _pollRunning = false;
  }
};

window._fbStopListen = function() {
  if (window.Store.syncTimer) { clearInterval(window.Store.syncTimer); window.Store.syncTimer = null; }
  window.Store.syncCb = null;
};

window._fbLoad = async function() {
  if (!window.Store.fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? snap.data().data : null;
};

window._fbSavePinHash = async function(hash) {
  if (!window.Store.fbUid) return;
  await setDoc(_planDoc(), { pinHash: hash }, { merge: true });
};

window._fbLoadPinHash = async function() {
  if (!window.Store.fbUid) return null;
  const snap = await getDoc(_planDoc());
  return snap.exists() ? (snap.data().pinHash || null) : null;
};

window._fbSaveWrappedKey = async function(wrappedB64) {
  if (!window.Store.fbUid) return;
  await setDoc(_metaDoc(), { wrappedKey: wrappedB64 }, { merge: true });
};

window._fbLoadWrappedKey = async function() {
  if (!window.Store.fbUid) return null;
  try {
    const snap = await getDoc(_metaDoc());
    return snap.exists() ? (snap.data().wrappedKey || null) : null;
  } catch(e) { return null; }
};
