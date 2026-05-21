// js/crypto.js — v8.17
// AES-256-GCM → AES-GCM düzeltmesi (WebCrypto standart ismi)

let _plainPin = null;
let _cryptoKey = null;
let _dataKeyRaw = null;

export function getPlainPin() { return _plainPin; }
export function setPlainPin(pin) { _plainPin = pin; }
export function getCryptoKey() { return _cryptoKey; }
export function setCryptoKey(key) { _cryptoKey = key; }
export function getDataKeyRaw() { return _dataKeyRaw; }
export function setDataKeyRaw(raw) { _dataKeyRaw = raw; }

export async function deriveKeyFromPin(pin, saltHex) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  const salt = new Uint8Array(saltHex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
  _cryptoKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },  // AES-256-GCM değil, AES-GCM
    false,
    ['encrypt', 'decrypt']
  );
  _plainPin = pin;
  return _cryptoKey;
}

export async function encryptData(rawText, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(rawText));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  // base64 olarak dön — index.html'deki orijinal formatla uyumlu (atob/btoa)
  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encStr, key) {
  const raw = atob(encStr);
  const iv = new Uint8Array(raw.substring(0, 12).split('').map(c => c.charCodeAt(0)));
  const data = new Uint8Array(raw.substring(12).split('').map(c => c.charCodeAt(0)));
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(dec);
}

export function clearCryptoSession() {
  _plainPin = null;
  _cryptoKey = null;
  _dataKeyRaw = null;
}
