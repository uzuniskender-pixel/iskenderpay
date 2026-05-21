// js/crypto.js — v8.17 (AES-GCM isim düzeltmesi)

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
  const pinBytes = enc.encode(pin);
  const saltBytes = hexToBytes(saltHex);

  const baseKey = await crypto.subtle.importKey(
    'raw', pinBytes, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
  );

  // DÜZELTME: 'AES-256-GCM' → 'AES-GCM' (WebCrypto standart ismi)
  _cryptoKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  _plainPin = pin;
  return _cryptoKey;
}

export async function encryptData(rawText, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(rawText)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return bytesToHex(combined);
}

export async function decryptData(encryptedHex, key) {
  const combined = hexToBytes(encryptedHex);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

export function clearCryptoSession() {
  _plainPin = null;
  _cryptoKey = null;
  _dataKeyRaw = null;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
