// @ozler/shared — date.js
// TR tarih ayristirma + formatlama. TEK ortak yuzey (Faz C / Yol B).
// Saf ESM, sifir dis bagimlilik, side-effect yok -> hem uys (Vite/TS, build-time)
// hem iskenderpay (tarayici, build'siz, import-map) ayni dosyayi kullanir.
//
// Birlestirdigi kaynaklar:
//   - iskenderpay js/util.js#parseLocalDate (TZ-guvenli yerel ayristirma) + #fmtD
//   - uys src/lib/utils.ts#fmtDate (cok-formatli) — TZ off-by-one bug'i BURADA duzeldi.
//
// TZ NOTU: 'YYYY-MM-DD' (tarih-only) string'i `new Date(s)` ile ayristirmak onu UTC
// gece yarisi sayar; negatif-offset TZ'de (Amerika) yerel tarih BIR GUN GERI kayar.
// Cozum: tarih-only string'i YEREL gece yarisi olarak kurariz (new Date(y, m-1, d)).
// Tam zaman damgalari (ISO datetime, epoch ms) eskisi gibi `new Date()`'e dusurulur.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * TR/yerel-guvenli tarih ayristirma.
 * - 'YYYY-MM-DD' (tarih-only)  -> YEREL gece yarisi (TZ kaymasi YOK).
 * - ISO datetime / epoch / Date -> yerel-anlamli `new Date(input)`.
 * - null/undefined/''           -> Invalid Date (new Date(NaN)).
 * @param {string|number|Date|null|undefined} input
 * @returns {Date} Gecersizse Invalid Date (isNaN(d.getTime())).
 */
export function parseLocalDateTR(input) {
  if (input instanceof Date) return new Date(input.getTime());
  if (input == null || input === '') return new Date(NaN);
  if (typeof input === 'string' && DATE_ONLY.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    const dt = new Date(y, m - 1, d); // yerel gece yarisi
    // ROLLOVER REDDI: '2026-13-40' / '2026-02-30' gibi yapisal-ama-aralik-disi
    // string'leri JS sessizce kaydirir; bunlari Invalid Date sayariz (fail-safe;
    // formatDateTR string'i aynen geri doner — eski uys davranisi).
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
      return new Date(NaN);
    }
    return dt;
  }
  return new Date(input);
}

/** @typedef {'long'|'short'|'month'|'monthday'|'daymonth'} DateFormatTR */

// Intl secenekleri (tr-TR). Ciktilar (Node22/tarayici ICU):
//   long     '12 May 2026'   short    '12.05.2026'   month    'Mayis 2026'
//   monthday '12 May'        daymonth '12 Mayis' / '1 Ocak'  (iskenderpay fmtD karsiligi)
const FMT_OPTS = {
  long:     { day: '2-digit', month: 'short', year: 'numeric' },
  short:    { day: '2-digit', month: '2-digit', year: 'numeric' },
  month:    { month: 'long', year: 'numeric' },
  monthday: { day: '2-digit', month: 'short' },
  daymonth: { day: 'numeric', month: 'long' },
};

/**
 * TR tarih formatlama. Bos -> '—'. Gecersiz string -> string aynen geri (uys davranisi).
 * @param {string|number|Date|null|undefined} input
 * @param {DateFormatTR} [format='long']
 * @returns {string}
 */
export function formatDateTR(input, format = 'long') {
  if (input == null || input === '') return '—';
  const d = parseLocalDateTR(input);
  if (isNaN(d.getTime())) return typeof input === 'string' ? input : '—';
  const opts = FMT_OPTS[format] || FMT_OPTS.long;
  return d.toLocaleDateString('tr-TR', opts);
}
