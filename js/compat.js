// js/compat.js — legacy global bridge
// Modüler yapıya geçiş sırasında eski inline kodların kırılmaması için.

import {
  esc,
  fmt,
  fmtA,
  fmtAmt,
  fmtD,
  fmtLogTime,
  isOD,
  parseLocalDate,
  araNormalize
} from './util.js';

window.esc         = esc;
window.fmt         = fmt;
window.fmtA        = fmtA;
window.fmtAmt      = fmtAmt;
window.fmtD        = fmtD;
window.fmtLogTime  = fmtLogTime;
window.isOD        = isOD;
window.parseLocalDate  = parseLocalDate;
window.araNormalize    = araNormalize;
