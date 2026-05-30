// js/validate.js — iskenderpay (v2.0 — WO-01 karantina)
// pays/creds/persons SEMA dogrulamasi + KARANTINA. Onceki surum (v1.0) sadece
// console.error/warn uretip kaydi yine de yazardi -> sema-bozuk tek kayit sifrelenip
// localStorage + Firestore'a yazilir ve TUM cihazlara sync'lenirdi (KRITIK veri kirliligi).
// v2.0: gecersiz kayit yazma kumesinden CIKARILIR (kaydedilmez), gecerliler KORUNUR.
// Atilan kayitlar loglanir; KARANTINAYA alinan kayit SAYISI dondurulur (0 = temiz).
//
// _doSave'de normalizeBeforeSave (onarim/backfill) SONRASI, encrypt ONCESI cagrilir;
// boylece once onarilabilenleri onar, kalan onarilamaz/gecersizleri karantinaya al.
//
// NOT: karantina, window[key] = kept ile yapilir. Uygulamada bu store.js'in SESSIZ
// setter'ina (_setSilent: ref + invalidate + dirty, save TETIKLEMEZ) duser -> _doSave
// icinde save dongusu olusmaz. Store.replace() KULLANILMAZ (o _autoSave tetikler).
// validate.js Store'a bagimli DEGILDIR (testte duz window.* ile de calisir).

function _isValidPay(p) {
  return !!p
    && p.id !== undefined && p.id !== null
    && typeof p.name === 'string'
    && typeof p.amount === 'number' && !isNaN(p.amount)
    && typeof p.date === 'string'
    && !!p.groupId;
}
function _isValidCred(c) {
  return !!c
    && c.id !== undefined && c.id !== null
    && typeof c.name === 'string'
    && typeof c.monthly === 'number' && !isNaN(c.monthly);
}
function _isValidPerson(pr) {
  return !!pr && !!pr.id && typeof pr.name === 'string';
}

function validateBeforeSave() {
  let quarantined = 0;
  try {
    const checks = [
      ['pays',    _isValidPay],
      ['creds',   _isValidCred],
      ['persons', _isValidPerson],
    ];
    for (const [key, isValid] of checks) {
      const arr = window[key];
      if (!Array.isArray(arr)) continue;
      const kept = [];
      for (let i = 0; i < arr.length; i++) {
        if (isValid(arr[i])) {
          kept.push(arr[i]);
        } else {
          quarantined++;
          console.error('[validate] KARANTINA ' + key + '[' + i + '] sema-bozuk -> kaydedilmedi', arr[i]);
        }
      }
      // Sadece degisiklik varsa yaz (gereksiz invalidate/dirty olmasin).
      if (kept.length !== arr.length) {
        window[key] = kept;   // store.js sessiz setter (_setSilent); test ortaminda duz atama
      }
    }
    if (quarantined > 0) {
      console.warn('[validate] toplam ' + quarantined + ' kayit KARANTINAYA alindi (yazilmadi)');
    }
  } catch (e) {
    console.warn('[validate] karantina hatasi:', e);
  }
  return quarantined;
}

window.validateBeforeSave = validateBeforeSave;
