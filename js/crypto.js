// js/crypto.js
// iskenderpay — Güvenlik ve Kriptografi Modülü (v8.16)

// Modül içi gizli değişkenler (Dışarıdan erişilemez, kapsüllenmiştir)
let _plainPin = null;
let _cryptoKey = null;
let _dataKeyRaw = null;

// Sadece uygulama içi güvenli get/set arabirimleri
export function getPlainPin() { return _plainPin; }
export function setPlainPin(pin) { _plainPin = pin; }
export function getCryptoKey() { return _cryptoKey; }
export function setCryptoKey(key) { _cryptoKey = key; }
export function getDataKeyRaw() { return _dataKeyRaw; }
export function setDataKeyRaw(raw) { _dataKeyRaw = raw; }

/**
 * Kullanıcının PIN kodundan ve tuz (salt) verisinden AES anahtarı türetir.
 * @param {string} pin - Kullanıcının girdi değerleri
 * @param {string} saltHex - Benzersiz hex tabanlı tuzlama verisi
 * @returns {Promise<CryptoKey>} Türetilen AES-256-GCM anahtarı
 */
export async function deriveKeyFromPin(pin, saltHex) {
  const enc = new TextEncoder();
  const pinBytes = enc.encode(pin);
  const saltBytes = hexToBytes(saltHex);

  // Ham PIN verisini PBKDF2 için taban anahtara dönüştür
  const baseKey = await crypto.subtle.importKey(
    'raw', 
    pinBytes, 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveBits', 'deriveKey']
  );

  // Standartlara uygun 100.000 iterasyonla AES-256 anahtarı türet
  _cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-256-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  _plainPin = pin;
  return _cryptoKey;
}

/**
 * Ham metni AES-256-GCM kullanarak şifreler
 * @param {string} rawText - Şifrelenecek JSON string veya metin
 * @param {CryptoKey} key - Türetilmiş kripto anahtarı
 * @returns {Promise<string>} Hex formatında şifreli veri (IV + Ciphertext)
 */
export async function encryptData(rawText, key) {
  const enc = new TextEncoder();
  // Her şifrelemede benzersiz 12 byte Initialization Vector (IV) üretilir
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-256-GCM', iv: iv },
    key,
    enc.encode(rawText)
  );

  // IV ve şifreli veriyi tek bir array'de birleştir
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return bytesToHex(combined);
}

/**
 * Şifreli hex verisini çözer
 * @param {string} encryptedHex - Şifreli birleşik hex string
 * @param {CryptoKey} key - Kripto anahtarı
 * @returns {Promise<string>} Çözülmüş ham metin
 */
export async function decryptData(encryptedHex, key) {
  const combined = hexToBytes(encryptedHex);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-256-GCM', iv: iv },
    key,
    data
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Oturum kapatıldığında bellek güvenliği için anahtarları sıfırlar
 */
export function clearCryptoSession() {
  _plainPin = null;
  _cryptoKey = null;
  _dataKeyRaw = null;
  console.log("[Crypto] Oturum anahtarları bellekten güvenli şekilde silindi.");
}

// ── YARDIMCI DÖNÜŞTÜRÜCÜLER ──────────────────────────────────────────────────
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}