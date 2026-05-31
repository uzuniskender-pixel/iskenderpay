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

export function todayMidnight() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

// ── Ödeme durum yardımcıları ─────────────────────────────────────────────────
export function isOD(p) {
  return (p.status || 'pending') !== 'paid' && window.parseLocalDate(p.date) < window.todayMidnight();
}

export function sCls(s, over) {
  return s === 'paid' ? 'cp' : s === 'partial' ? 'ck' : over ? 'cg' : 'cb';
}

export function sLbl(s, over) {
  return s === 'paid' ? 'Ödendi' : s === 'partial' ? 'Kısmi' : over ? 'Gecikmiş' : 'Bekliyor';
}

