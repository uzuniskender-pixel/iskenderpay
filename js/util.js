// js/util.js — iskenderpay (v1.0)
// Saf yardımcı fonksiyonlar. Hiçbir dış bağımlılık yok, side-effect yok.
// index.html'deki esc, fmt, fmtA, toTRY, parseLocalDate, sCls… buraya taşındı.

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
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toLocalISO(yr, mo, day) {
  return yr + '-' + String(mo + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

export function fmtD(s) {
  return window.parseLocalDate(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
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

