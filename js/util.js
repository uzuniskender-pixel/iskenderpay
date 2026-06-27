// js/util.js — iskenderpay
// Saf yardimci fonksiyonlar; side-effect yok. Tek dis bagimlilik: @ozler/shared
// (TR tarih cekirdegi, Faz C / Yol B). parseLocalDate + fmtD shared'e koprulendi;
// tarayicida @ozler/shared, index.html import-map ile ./shared/date.js'e cozulur.

import { parseLocalDateTR, formatDateTR } from '@ozler/shared';

// ── HTML kaçış ───────────────────────────────────────────────────────────────
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

// ── Para formatları ──────────────────────────────────────────────────────────
export function fmt(n) {
  return '₺' + Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtA(a, c) {
  if (c === 'EUR')  return '€' + Number(a).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c === 'GOLD') return Number(a).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'gr';
  return window.fmt(a);
}

export function fmtAmt(a, c) {
  return (c && c !== 'TRY' ? c + ' ' : '₺') + Number(a).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

// rates dışarıdan geçirilir — util.js bağımlılık almaz
export function toTRY(a, c, rates) {
  if (c === 'EUR'  && rates?.EUR)  return a * rates.EUR;
  if (c === 'GOLD' && rates?.GOLD) return a * rates.GOLD;
  return Number(a);
}

// ── Tarih yardımcıları ───────────────────────────────────────────────────────
export function parseLocalDate(s) {
  return parseLocalDateTR(s); // @ozler/shared — yerel gece yarisi, TZ-guvenli
}

export function toLocalISO(yr, mo, day) {
  return yr + '-' + String(mo + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

export function fmtD(s) {
  return formatDateTR(s, 'daymonth'); // @ozler/shared — "12 Mayis" / "1 Ocak"
}

export function fmtLogTime(iso) {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now - d;
  if (diff < 60000)    return 'Az önce';
  if (diff < 3600000)  return Math.floor(diff / 60000)   + ' dk önce';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' sa önce';
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mn = d.getMinutes().toString().padStart(2, '0');
  return dd + '.' + mm + ' ' + hh + ':' + mn;
}

// ── Turkce-duyarli arama normalizasyonu ──────────────────────────────────────
// UYS ile ayni kanonik eslem (utils.ts#araNormalize). Arama/filtrede
// I/I/i/i, s/s, c/c, g/g, u/u, o/o, a ayrimini ASCII'ye katlar -> aksana
// DUYARSIZ eslesme. Iki tarafa da uygulanmali: araNormalize(metin).includes(araNormalize(sorgu)).
// JS .toLocaleLowerCase('tr') tek-tarafli kullanimi "cay"->"Cay" eslesmesini KACIRIYORDU.
// "DIKME"/"DIKME"/"Dikme"/"dikme" -> "dikme"; "Capraz" -> "capraz".
const _TR_KATLA = {
  'İ':'i','I':'i','ı':'i','Ş':'s','ş':'s','Ç':'c','ç':'c',
  'Ğ':'g','ğ':'g','Ü':'u','ü':'u','Ö':'o','ö':'o',
  'Â':'a','â':'a','Î':'i','î':'i','Û':'u','û':'u',
};
export function araNormalize(s) {
  return String(s ?? '').replace(/[İIıŞşÇçĞğÜüÖöÂâÎîÛû]/g, c => _TR_KATLA[c] || c).toLowerCase().trim();
}

export function todayMidnight() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

// 'Tumu' ay filtresi: mevcut aydan EN UZAK odemeye kadarki ileri ay sayisi
// (mevcut ay dahil). Ornek: en uzak odeme bugunden 17 ay sonra -> 18 doner
// (render dongusu i=0..17 -> 18 ay gosterir, son taksit dahil). Bos/gecmis-only
// veri -> 1 (mevcut ay). parseLocalDate ile TZ-guvenli ay farki.
export function maxAheadMonths(all, now) {
  const ref  = now || new Date();
  const nowY = ref.getFullYear(), nowM = ref.getMonth();
  let maxDiff = 0;
  (all || []).forEach(p => {
    if (!p || !p.date) return;
    const d = parseLocalDate(p.date);
    const diff = (d.getFullYear() - nowY) * 12 + (d.getMonth() - nowM);
    if (diff > maxDiff) maxDiff = diff;
  });
  return maxDiff + 1;
}

// ── Ödeme durum yardımcıları ─────────────────────────────────────────────────
export function isOD(p) {
  return (p.status || 'pending') !== 'paid' && parseLocalDate(p.date) < todayMidnight();
}

export function sCls(s, over) {
  return s === 'paid' ? 'cp' : s === 'partial' ? 'ck' : over ? 'cg' : 'cb';
}

export function sLbl(s, over) {
  return s === 'paid' ? 'Ödendi' : s === 'partial' ? 'Kısmi' : over ? 'Gecikmiş' : 'Bekliyor';
}

