// js/crypto.js — v8.19-fixed
// Eski index.html v8 mimarisiyle birebir uyumlu:
// AES-KW ile wrap edilmiş dataKey + PBKDF2 pinSalt (UID'den türetilir)

let _plainPin    = null;
let _cryptoKey   = null;
let _dataKeyRaw  = null;

export function getPlainPin()      { return _plainPin; }
export function setPlainPin(pin)   { _plainPin = pin; }
export function getCryptoKey()     { return _cryptoKey; }
export function setCryptoKey(key)  { _cryptoKey = key; }
export function getDataKeyRaw()    { return _dataKeyRaw; }
export function setDataKeyRaw(raw) { _dataKeyRaw = raw; }

// UID + key'den deterministik salt üret (eski getSaltAsync ile aynı)
export async function getSaltFromUid(uid, saltKey) {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey(
    'raw', enc.encode(uid + saltKey), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode('iskenderpay-v6'), iterations: 10000, hash: 'SHA-256' },
    keyMat, 128
  );
  return new Uint8Array(bits);
}

// dataKey import et
export async function importDataKey(rawBytes) {
  return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// dataKey'i PIN ile wrap et (AES-KW)
export async function wrapDataKey(dataKeyRaw, pin, pinSalt) {
  const enc = new TextEncoder();
  const kwMat = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  const kwKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: pinSalt, iterations: 100000, hash: 'SHA-256' },
    kwMat, { name: 'AES-KW', length: 256 }, false, ['wrapKey']
  );
  const keyToWrap = await crypto.subtle.importKey('raw', dataKeyRaw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  const wrapped = await crypto.subtle.wrapKey('raw', keyToWrap, kwKey, 'AES-KW');
  let binary = '';
  const buf = new Uint8Array(wrapped);
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

// wrap'lı dataKey'i PIN ile unwrap et
export async function unwrapDataKey(wrappedB64, pin, pinSalt) {
  const enc = new TextEncoder();
  const binary = atob(wrappedB64);
  const wrapped = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) wrapped[i] = binary.charCodeAt(i);
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

// v5 fallback: direkt PBKDF2 → AES-GCM (migrateToV8 için)
export async function deriveKeyLegacy(password, salt) {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

// PIN hash (doğrulama için)
export async function hashPin(pin, salt) {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMat, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

// Şifreleme — chunk'lı btoa (stack overflow önlemi)
export async function encryptData(rawData, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const buf = new Uint8Array(iv.byteLength + cipher.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(cipher), iv.byteLength);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Şifre çözme
export async function decryptData(encStr, key) {
  const binary = atob(encStr);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const iv   = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const dec  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(dec);
}

export function clearCryptoSession() {
  _plainPin   = null;
  _cryptoKey  = null;
  _dataKeyRaw = null;
}
