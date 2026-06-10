// js/rates-core.js — iskenderpay
// Kur/altın hesabının TEK KAYNAĞI (DRY, uys_claude_kurallar #10).
// Saf fonksiyonlar — DOM/window/localStorage bağımsız → birim testi mümkün.
// Tüketiciler: js/kur.js (app içi kur barı) + js/altin-onizleme.js (PIN ekranı pre-auth).
// Bir yerdeki düzeltme her ikisine birden yansır; formül kopyalanmaz.

// 1 troy ons = 31.1035 gram.
export const TROY_OUNCE_GRAM = 31.1035;

// Kur/fiyat API uçları — tek yerde tanımlı (kopya endpoint yok).
export const RATE_API = {
  fx:   'https://api.exchangerate-api.com/v4/latest/USD', // USD bazlı; d.rates.TRY = USD/TRY
  gold: 'https://api.gold-api.com/price/XAU',             // d.price = ons altın (USD)
};

// Ons altın (USD) + USD/TRY → gram altın (TRY).
// Eksik/0 girdi → null (hesap yapılamaz).
export function gramGoldTRY(xauUsdPerOz, usdTry) {
  if (!xauUsdPerOz || !usdTry) return null;
  return (xauUsdPerOz / TROY_OUNCE_GRAM) * usdTry;
}

// USD/TRY + EUR çapraz (exchangerate-api yanıtından). Mevcut kur.js davranışıyla bire bir:
// EUR/TRY = (USD/TRY) / (USD/EUR).  Eksikse ilgili alan null döner.
export function fxFromExchangeApi(d) {
  const usd = d && d.rates ? d.rates.TRY : null;
  const eur = (usd && d.rates && d.rates.EUR) ? usd / d.rates.EUR : null;
  return { USD: usd || null, EUR: eur || null };
}

// _fetchedAt ISO → saf etiket bilgisi (HTML DEĞİL; biçimleme çağırana ait).
// { text, timeStr, ageMin, stale, unknown }
//  - unknown: zaman bilinmiyor (önbellek, _fetchedAt yok)
//  - stale:   60 dk'dan eski (uyarı)
export function rateAgeLabel(fetchedAtISO, now = Date.now()) {
  if (!fetchedAtISO) return { text: 'önbellek', timeStr: '', ageMin: null, stale: true, unknown: true };
  const d = new Date(fetchedAtISO);
  const ageMin = Math.round((now - d.getTime()) / 60000);
  const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (ageMin > 60) {
    const ageH = Math.floor(ageMin / 60);
    return { text: ageH + 's önce', timeStr, ageMin, stale: true, unknown: false };
  }
  return { text: timeStr, timeStr, ageMin, stale: false, unknown: false };
}
