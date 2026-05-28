// js/compat.js — legacy global bridge
// Modüler yapıya geçiş sırasında eski inline kodların kırılmaması için.

import {
  esc,
  fmt,
  fmtA,
  fmtAmt,
  fmtD,
  fmtLogTime,
  todayMidnight,
  isOD,
  sCls,
  sLbl,
  toLocalISO,
  toTRY,
  parseLocalDate
} from './util.js';

window.esc         = esc;
window.fmt         = fmt;
window.fmtA        = fmtA;
window.fmtAmt      = fmtAmt;
window.fmtD        = fmtD;
window.fmtLogTime  = fmtLogTime;
window.todayMidnight = todayMidnight;
window.isOD        = isOD;
window.sCls        = sCls;
window.sLbl        = sLbl;
window.toLocalISO  = toLocalISO;
window.toTRY       = (a, c) => toTRY(a, c, window.rates);
window.parseLocalDate  = parseLocalDate;
