// tests/conflict.test.js — shouldBlock (cakisma karari) birim testleri
// conflict.js SAF + DIS BAGIMLILIK YOK -> dogrudan import edilir (firestore.js'in
// gstatic SDK import sorunu burada yok). Bu, sync'in EN KRITIK dalinin (compare-
// and-swap) ilk test-korumasi. v8.199'da "Firestore mock gerekir, atlandi" denmisti.

import { describe, it, expect } from 'vitest';
import { shouldBlock } from '../js/conflict.js';

describe('shouldBlock — baseline yok / ilk yazim (base <= 0): asla bloklamaz', () => {
  it('base 0 -> uzak ne olursa olsun yaz (false)', () => {
    expect(shouldBlock(0, 0)).toBe(false);
    expect(shouldBlock(100, 0)).toBe(false);
    expect(shouldBlock(999999, 0)).toBe(false);
  });

  it('base negatif (bozuk/olmamasi gereken) -> yine bloklamaz', () => {
    expect(shouldBlock(100, -5)).toBe(false);
  });
});

describe('shouldBlock — baseline var (base > 0)', () => {
  it('uzak ILERIDE (baska cihaz bizden sonra yazmis) -> BLOKLA (true)', () => {
    expect(shouldBlock(200, 100)).toBe(true);
    expect(shouldBlock(101, 100)).toBe(true); // 1ms bile ileri
  });

  it('uzak ESIT (senkronuz / kendi son yazimimiz) -> bloklamA (false)', () => {
    expect(shouldBlock(100, 100)).toBe(false);
  });

  it('uzak GERIDE (uzak eski) -> bloklamA (false)', () => {
    expect(shouldBlock(50, 100)).toBe(false);
  });

  it('uzak updatedAt yok / 0 (remote bos) -> bloklamA (false)', () => {
    expect(shouldBlock(0, 100)).toBe(false);
  });
});

describe('shouldBlock — gercekci timestamp senaryosu', () => {
  it('iki ms-epoch: uzak baseline\'dan 5sn sonra -> BLOKLA', () => {
    const base = 1748600000000;        // bizim bildigimiz uzak
    const remote = base + 5000;        // baska cihaz 5sn sonra yazmis
    expect(shouldBlock(remote, base)).toBe(true);
  });

  it('ayni yazim (remote == base) tekrar gelirse cakisma sayilmaz', () => {
    const base = 1748600000000;
    expect(shouldBlock(base, base)).toBe(false);
  });
});
