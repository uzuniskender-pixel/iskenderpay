// js/keyguard.js — iskenderpay (v1.0)
// WO-15 GUVENLIK INVARYANTI (saf, DIS BAGIMLILIK YOK -> sandbox/CI'da test edilebilir;
// conflict.js#shouldBlock ile ayni desen).
//
// 2026-05-30 VERI KAYBI KOK SEBEBI: doLogin "yeni kullanici" dali, offline VEYA Firebase
// pinHash okunamazken VEYA mevcut verisi/anahtari olan bir planda RASTGELE yeni bir data
// key uretip hem localStorage hem Firebase'deki sarili anahtari EZIYORDU -> eski veri eski
// anahtarda kalip cozulemez hale geliyordu (silinmez, KALICI KILITLENIR).
//
// Bu fonksiyon "yeni anahtar uretmek GUVENLI mi?" kararini TEK KAYNAKTA tutar. doLogin
// SADECE bu true donerse mint eder. Boylece guard inline degil; testle KILITLENIR ve bir
// refactor onu sessizce zayiflatamaz (mutasyon -> test kirilir).
//
// Yeni anahtar SADECE gercekten yeni + bos bir planda uretilebilir:
//   online + Firebase pinHash okumasi BASARILI + yerel veri YOK + sarili anahtar YOK.
// Bu kosullardan HERHANGI biri saglanmazsa mint ETME (mevcut/bilinmeyen veriyi asla ezme).
// FAIL-SAFE: online/fbReadOk kesin true degilse (undefined/null/false) -> mint ETME.
export function shouldMintNewKey({ online, fbReadOk, hasLocalData, hasWrappedKey } = {}) {
  return online === true
      && fbReadOk === true
      && !hasLocalData
      && !hasWrappedKey;
}
