// js/compat.js — legacy global bridge
// Modüler yapıya geçiş sırasında eski inline kodların kırılmaması için.

import {
  esc,
  fmt,
  fmtA,
  fmtAmt,
  fmtD,
  fmtDS,
  fmtLogTime,
  dd,
  todayMidnight,
  isOD,
  sCls,
  sLbl,
  toLocalISO,
  toTRY,
  parseLocalDate,
  parseLocalDate2
} from './util.js';

window.esc         = esc;
window.fmt         = fmt;
window.fmtA        = fmtA;
window.fmtAmt      = fmtAmt;
window.fmtD        = fmtD;
window.fmtDS       = fmtDS;
window.fmtLogTime  = fmtLogTime;
window.dd          = dd;
window.todayMidnight = todayMidnight;
window.isOD        = isOD;
window.sCls        = sCls;
window.sLbl        = sLbl;
window.toLocalISO  = toLocalISO;
window.toTRY       = (a, c) => toTRY(a, c, window.rates);
window.parseLocalDate  = parseLocalDate;
window.parseLocalDate2 = parseLocalDate2;
