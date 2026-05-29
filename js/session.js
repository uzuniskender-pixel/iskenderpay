// js/session.js — iskenderpay (v1.0)
// Oturum sirlari icin MODUL-PRIVATE CLOSURE. (Store.session hardening — v8.187)
//
// AMAC: cryptoKey / plainPin gibi sirlari hicbir global obje grafiginde
// (window.Store.session vb.) erisilebilir BIRAKMAMAK. Sirlar yalniz bu modulun
// closure scope'unda yasar; disari sadece FIIL (verb) metotlari acilir —
// encrypt/decrypt/verifyPin/decryptBackup — ISIM (key/pin) ASLA donmez.
//
// GUVENLIK MODELI (durust sinir):
//   - Bu refactor KEY/PIN HIRSIZLIGINI engeller: konsoldan veya kaza eseri
//     log/JSON.stringify(window) ile sir DISARI CIKARILAMAZ; oturum bitince /
//     baska makinede / offline yeniden kullanilamaz.
//   - Oturum ACIKKEN sayfa origin'inde arbitrary JS calistirabilen saldirgan
//     (XSS) uygulama fonksiyonlarini kotuye kullanabilir; bu closure XSS'e karsi
//     TAM koruma DEGILDIR. Asil kazanim: sir bir daha asla dis kaynaga sizmaz.
//
// EPHEMERAL KEY WRAP: dataKeyRaw artik RESIDENT TUTULMAZ. chPass re-wrap'i ham
// anahtari mevcut PIN'le wrapped-blob'tan ANLIK unwrap edip kullanir, sonra
// GC'ye birakir (auth-pin.js#chPass). Resident cryptoKey her iki login yolunda
// da NON-EXTRACTABLE'dir (auth-pin.js importDataKey ile re-import eder).

import { encryptData, decryptData } from './crypto.js';

// ── CLOSURE-PRIVATE STATE ───────────────────────────────────────────────────
// Bu degiskenlere modul disindan HICBIR referans yoktur.
let _cryptoKey = null;   // CryptoKey (AES-GCM, non-extractable) — encrypt/decrypt icin
let _plainPin  = '';     // string — yedek xDec + hizli-yol PIN dogrulama icin

export const Session = {
  // ── UNLOCK / SET (auth-pin.js#doLogin cagirir) ──────────────────────────
  // cryptoKey ve/veya plainPin'i closure'a yerlestirir. Sadece set; getter yok.
  set({ cryptoKey, plainPin } = {}) {
    if (cryptoKey !== undefined) _cryptoKey = cryptoKey;
    if (plainPin  !== undefined) _plainPin  = plainPin;
  },
  // Sadece PIN guncelle (chPass — sifre degisiminde data key ayni kalir).
  setPin(pin) { _plainPin = pin == null ? '' : pin; },

  // ── DURUM SORGUSU (sir donmez) ──────────────────────────────────────────
  hasKey()     { return _cryptoKey !== null; },
  isUnlocked() { return _cryptoKey !== null; },

  // ── KRIPTO FIILLERI (key disari donmez) ─────────────────────────────────
  async encrypt(data) {
    if (!_cryptoKey) throw new Error('session_locked');
    return encryptData(data, _cryptoKey);
  },
  async decrypt(b64) {
    if (!_cryptoKey) throw new Error('session_locked');
    return decryptData(b64, _cryptoKey);
  },

  // ── PIN FIILLERI (pin disari donmez) ────────────────────────────────────
  // Hizli-yol login: girilen PIN aktif oturum PIN'i ile esit mi?
  verifyPin(candidate) {
    return _plainPin.length > 0 && _plainPin === candidate;
  },
  // Yedek geri yukleme: aktif oturum PIN'i ile xDec (app.js#readRF).
  // Closure-ici PIN kullanir; cleartext PIN disari hic cikmaz.
  decryptBackup(b64data) {
    if (!_plainPin) return null;
    try { return window.xDec(b64data, _plainPin); } catch(e) { return null; }
  },

  // ── TEMIZLE (logout / lock) ─────────────────────────────────────────────
  clear() { _cryptoKey = null; _plainPin = ''; },

  // ── INTROSPECTION (deger sizdirmadan — app.js#debugState) ───────────────
  debugInfo() {
    return { hasKey: _cryptoKey !== null, hasPin: _plainPin.length > 0, pinLen: _plainPin.length };
  }
};

// NOT: Session BILEREK window'a baglanmaz. Tuketiciler ES named import kullanir:
//   import { Session } from './session.js';
// Boylece sirlara giden tek yol closure-ici fiil metotlaridir; window'da yol yoktur.
