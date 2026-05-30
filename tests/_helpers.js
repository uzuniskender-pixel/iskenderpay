// tests/_helpers.js — iskenderpay test altyapisi yardimcilari
// hesap.js, calisma aninda window.toTRY / window.parseLocalDate / window.isOD /
// window.todayMidnight'a baglidir (compat.js bunlari uretimde baglar). Burada
// AYNI gercek util.js fonksiyonlarini window'a baglariz -> testler stub davranisi
// degil, GERCEK uretim davranisini sinar (asil regresyon kalkani amaci budur).

import { toTRY, parseLocalDate, isOD, todayMidnight } from '../js/util.js';

// Testlerde deterministik FX. Yuvarlak degerler kasitli (zihinden dogrulanabilir).
export const TEST_RATES = { EUR: 50, GOLD: 6000, USD: 35 };

// compat.js ile bire bir paritede window kopruleme.
// hesap.js, util fonksiyonlarini window uzerinden cagirdigi icin sart.
export function wireGlobals() {
  window.rates = { ...TEST_RATES };
  window.toTRY = (a, c) => toTRY(a, c, window.rates);
  window.parseLocalDate = parseLocalDate;
  window.isOD = isOD;
  window.todayMidnight = todayMidnight;
  // hesap.js'in okudugu veri kovalarini temiz baslat.
  window.pays = [];
  window.creds = [];
  window.paidItems = [];
  // krediler() _mx() -> window.buildMx; tanimsizsa _mx()={} ve dispName
  // _baseOf(cr.name)'e duser. Bu yolu kasitli koruyoruz (buildMx baglamiyoruz).
  delete window.buildMx;
  delete window.getAllItems;
}
