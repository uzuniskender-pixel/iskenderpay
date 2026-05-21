// js/crypto.js — v8.18-fixed
// Düzeltme: btoa/atob spread stack overflow → TextDecoder/Uint8Array ile güvenli dönüşüm

let _plainPin = null;
let _cryptoKey = null;
let _dataKeyRaw = null;

export function getPlainPin()       { return _plainPin; }
export function setPlainPin(pin)    { _plainPin = pin; }
export function getCryptoKey()      { return _cryptoKey; }
export function setCryptoKey(key)   { _cryptoKey = key; }
export function getDataKeyRaw()     { return _dataKeyRaw; }
export function setDataKeyRaw(raw)  { _dataKeyRaw = raw; }

export async function deriveKeyFromPin(pin, saltHex) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  const salt = new Uint8Array(saltHex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
  _cryptoKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  _plainPin = pin;
  return _cryptoKey;
}

// base64 yardımcıları — spread kullanmaz, büyük veriyle güvenli çalışır
function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptData(rawText, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(rawText));
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), 12);
  return uint8ToBase64(combined);
}

export async function decryptData(encStr, key) {
  const combined = base64ToUint8(encStr);
  const iv   = combined.slice(0, 12);
  const data = combined.slice(12);
  const dec  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(dec);
}

export function clearCryptoSession() {
  _plainPin    = null;
  _cryptoKey   = null;
  _dataKeyRaw  = null;
}
