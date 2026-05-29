// js/crypto.js — iskenderpay (v1.1)
// AES-256-GCM + AES-KW + PBKDF2.
// Session state (cryptoKey/plainPin) v8.187'de js/session.js MODUL-PRIVATE
// CLOSURE'ina tasindi — bu modul yalniz saf kripto primitifleri saglar (key tutmaz).

export async function importDataKey(rawBytes) {
  return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function wrapDataKey(dataKeyRaw, pin, pinSalt) {
  const enc = new TextEncoder();
  const kwMat = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  const kwKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: pinSalt, iterations: 100000, hash: 'SHA-256' },
    kwMat, { name: 'AES-KW', length: 256 }, false, ['wrapKey']
  );
  const keyToWrap = await crypto.subtle.importKey('raw', dataKeyRaw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  const wrapped = await crypto.subtle.wrapKey('raw', keyToWrap, kwKey, 'AES-KW');
  return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
}

export async function unwrapDataKey(wrappedB64, pin, pinSalt) {
  const enc = new TextEncoder();
  const wrapped = Uint8Array.from(atob(wrappedB64), c => c.charCodeAt(0));
  const kwMat = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  const kwKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: pinSalt, iterations: 100000, hash: 'SHA-256' },
    kwMat, { name: 'AES-KW', length: 256 }, false, ['unwrapKey']
  );
  const unwrapped = await crypto.subtle.unwrapKey(
    'raw', wrapped, kwKey, 'AES-KW',
    { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']
  );
  const exportedRaw = await crypto.subtle.exportKey('raw', unwrapped);
  return { cryptoKey: unwrapped, rawBytes: new Uint8Array(exportedRaw) };
}

export async function encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  const buf = new Uint8Array(iv.byteLength + cipher.byteLength);
  buf.set(iv, 0); buf.set(new Uint8Array(cipher), iv.byteLength);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function decryptData(b64, key) {
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = buf.slice(0, 12), cipher = buf.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function hashPin(pin, salt) {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMat, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function getSaltAsync(key) {
  const uid = window.Store.fbUid || '';
  if (uid) {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(uid + key), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode('iskenderpay-v6'), iterations: 10000, hash: 'SHA-256' },
      keyMat, 128
    );
    return new Uint8Array(bits);
  }
  return getSalt(key);
}

export function getSalt(key) {
  let s = localStorage.getItem(key);
  if (!s) {
    const arr = crypto.getRandomValues(new Uint8Array(16));
    s = btoa(String.fromCharCode(...arr));
    localStorage.setItem(key, s);
  }
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export function _getWrappedKey() {
  return localStorage.getItem('v8-wrapped-key');
}
export function _saveWrappedKeyLocal(wrappedB64) {
  localStorage.setItem('v8-wrapped-key', wrappedB64);
}
export async function _saveWrappedKeyFirebase(wrappedB64) {
  if (window._fbSaveWrappedKey) {
    try { await window._fbSaveWrappedKey(wrappedB64); } catch(e) { console.warn('wrappedKey Firebase kayıt hatası:', e); }
  }
}
export async function _loadWrappedKeyFirebase() {
  if (window._fbLoadWrappedKey) {
    return await window._fbLoadWrappedKey();
  }
  return null;
}

// ── Global compat ────────────────────────────────────────────────────────────
window.importDataKey         = importDataKey;
window.wrapDataKey           = wrapDataKey;
window.unwrapDataKey         = unwrapDataKey;
window.encryptData           = encryptData;
window.decryptData           = decryptData;
window.hashPin               = hashPin;
window.getSaltAsync          = getSaltAsync;
window.getSalt               = getSalt;
window._getWrappedKey        = _getWrappedKey;
window._saveWrappedKeyLocal  = _saveWrappedKeyLocal;
window._saveWrappedKeyFirebase = _saveWrappedKeyFirebase;
window._loadWrappedKeyFirebase = _loadWrappedKeyFirebase;
