// js/firestore.js — iskenderpay (v1.0)
// Firestore I/O katmani — saf data ops (auth/encrypt/schema bilmez).
// Auth ownership: firebase.js. PIN ownership: auth-pin.js.
// Encrypt + storage + migration ownership: persist.js.
// v8.127'de db.js'ten ayristirildi.

import { getDoc, setDoc, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { shouldBlock } from './conflict.js';
import { classifySnapshot } from './snapshot.js';

// _planDoc / _metaDoc firebase.js'de tanımlı. WO-10: modül-üstü deger yakalama
// (import sirasina bagimli, undefined yakalanip sessiz cokme riski) yerine LAZY:
// cagri aninda window'dan okunur -> firebase.js once/sonra yuklensin, calisir.
const _planDoc = (...a) => window._planDoc(...a);
const _metaDoc = (...a) => window._metaDoc(...a);


// v8.206 (WO-06): ATOMIK compare-and-swap. runTransaction icinde oku-karsilastir-yaz
// -> eski getDoc+setDoc arasi mikro-yaris BITER (read ile write arasinda baska cihaz
// yazsa eskiden gozden kacardi; transaction contention'da otomatik retry eder).
// shouldBlock (v8.199) karari AYNEN korunur. Donus kontrati AYNEN:
//   {ok, updatedAt} | {conflict, remote, remoteTs} | {skipped}.
// Offline/txn-fail -> THROW (persist.js fbSyncNeeded'e ceker; localStorage zaten
// yazili = veri guvende; reconnect'te _fbFlush yeniden dener). Eski "okuma basarisiz
// olsa da yine yaz" yerine bu daha dogru: kismi-hatada uzak degisikligi EZMEZ.
// Echo guard: basarili yazimin updatedAt'i Store._lastOwnTs'e -> onSnapshot kendi
// yazimimizi yeniden uygulamaz (bkz. classifySnapshot).
window._fbSave = async function(encData) {
  if (!window.Store.fbUid) return { skipped: true };
  const ref = _planDoc();
  const base = window.Store.lastUpdated || 0;
  const result = await runTransaction(ref.firestore, async (txn) => {
    if (base > 0) {
      const snap = await txn.get(ref);
      if (snap.exists()) {
        const remoteTs = snap.data().updatedAt || 0;
        if (shouldBlock(remoteTs, base)) {
          return { conflict: true, remote: snap.data().data || null, remoteTs };
        }
      }
    }
    const updatedAt = Date.now();
    txn.set(ref, { data: encData, updatedAt }, { merge: true });
    return { ok: true, updatedAt };
  });
  if (result && result.ok) window.Store._lastOwnTs = result.updatedAt;  // echo guard
  return result;
};

// v8.206 (WO-06): 30sn polling (eski _fbPoll/setInterval) -> GERCEK-ZAMANLI onSnapshot
// (tek dinleyici). Uzak degisiklik ANINDA gelir (poll beklemez); SDK reconnect'i otomatik.
// unsubscribe -> Store.syncUnsub. APPLY/BASELINE/SKIP karari saf classifySnapshot()'ta
// (CI-test'li); SDK kismi saha-test. Echo guard: hasPendingWrites (in-flight) + _lastOwnTs.
window._fbStartListen = function(onData) {
  if (!window.Store.fbUid || !window.Store.planId) return;
  window.Store.syncCb = onData;
  if (window.Store.syncUnsub) { try { window.Store.syncUnsub(); } catch(e){} window.Store.syncUnsub = null; }
  window.Store.syncUnsub = onSnapshot(_planDoc(),
    (snap) => {
      // Bekleyen offline yazim varsa: ONCE onu gonder (CAS ile uzlasir) -> bu snapshot'i isleme.
      if (window.Store.fbSyncNeeded && !window.Store.dirty && (window.Store.saveTimer == null)) {
        window._fbFlush && window._fbFlush();
        return;
      }
      const d = snap.exists() ? snap.data() : null;
      const ts = (d && d.updatedAt) || 0;
      const action = classifySnapshot({
        exists: snap.exists(),
        ts,
        base: window.Store.lastUpdated || 0,
        lastOwnTs: window.Store._lastOwnTs || 0,
        hasPendingWrites: !!(snap.metadata && snap.metadata.hasPendingWrites),
        dirty: !!window.Store.dirty,
        saving: (window.Store.saveTimer != null)
      });
      if (action === 'apply') {
        window.Store.lastUpdated = ts;
        if (d && d.data && window.Store.syncCb) window.Store.syncCb(d.data);  // sync.js cb: applyRemote + dot('synced') + toast
      } else if (action === 'baseline') {
        window.Store.lastUpdated = ts;
        window.setSyncDot && window.setSyncDot('active');
      } else {
        window.setSyncDot && window.setSyncDot('active');
      }
    },
    (err) => { console.warn('onSnapshot hatasi:', err && (err.message || err)); }
  );
};

// v8.206 (WO-06): bekleyen offline yazimi gonder (eski _fbPoll'un flush gorevi).
// Tetik: sync.js focus/online/visibilitychange + onSnapshot fbSyncNeeded gorunce.
window._fbFlush = async function() {
  if (!window.Store.fbUid || !window.Store.planId) return;
  if (window.Store.dirty || window.Store.saveTimer != null) return;
  if (!window.Store.fbSyncNeeded) return;
  const enc = localStorage.getItem('v5-data-' + window.Store.planId);
  if (!enc) return;
  try {
    const res = await window._fbSave(enc);
    if (res && res.conflict) {
      window.Store.lastUpdated = res.remoteTs;
      window.Store.fbSyncNeeded = false;
      if (res.remote && window.applyRemote) await window.applyRemote(res.remote);
      window.showWarnToast && window.showWarnToast('Cevrimdisi degisiklik gonderilemedi: baska cihazda guncelleme var, en guncel veri yuklendi.');
    } else if (res && res.ok) {
      window.Store.lastUpdated = res.updatedAt;
      window.Store.fbSyncNeeded = false;
    }
  } catch(e) { /* hala offline -> fbSyncNeeded kalir, sonraki tetikte yeniden dene */ }
};

window._fbStopListen = function() {
  if (window.Store.syncUnsub) { try { window.Store.syncUnsub(); } catch(e){} window.Store.syncUnsub = null; }
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
