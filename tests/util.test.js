// tests/util.test.js — saf yardimci fonksiyon birim testleri
// util.js dis bagimlilik almaz; toTRY rates'i parametre alir, isOD window.* okur.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toTRY, parseLocalDate, todayMidnight, isOD } from '../js/util.js';

describe('toTRY — doviz cevrimi (rates parametreli)', () => {
  const rates = { EUR: 50, GOLD: 6000, USD: 35 };

  it('TRY ham tutari aynen dondurur', () => {
    expect(toTRY(1000, 'TRY', rates)).toBe(1000);
  });

  it('currency yoksa Number(a) dondurur', () => {
    expect(toTRY(1000, undefined, rates)).toBe(1000);
    expect(toTRY('250', null, rates)).toBe(250);
  });

  it('EUR tutarini rate ile carpar', () => {
    expect(toTRY(100, 'EUR', rates)).toBe(5000); // 100 * 50
  });

  it('GOLD (gram) tutarini rate ile carpar', () => {
    expect(toTRY(2, 'GOLD', rates)).toBe(12000); // 2 * 6000
  });

  it('rate eksikse ham tutara duser (yanlis ₺ basmaz — guvenli geri-cekilme)', () => {
    expect(toTRY(100, 'EUR', { EUR: null, GOLD: null })).toBe(100);
    expect(toTRY(100, 'EUR', undefined)).toBe(100);
    expect(toTRY(100, 'EUR', {})).toBe(100);
  });

  it('USD desteklenmez (uygulama EUR/GOLD/TRY) -> ham tutar', () => {
    expect(toTRY(100, 'USD', rates)).toBe(100);
  });
});

describe('parseLocalDate — yerel tarih (UTC kaymasi yok)', () => {
  it('YYYY-MM-DD stringini yerel gun/ay/yil olarak ayristirir', () => {
    const d = parseLocalDate('2026-05-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // 0-indeksli: Mayis = 4
    expect(d.getDate()).toBe(15);
  });

  it('ay basini saat 00:00 yerel olarak verir (timezone-safe)', () => {
    const d = parseLocalDate('2026-01-01');
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(1); // UTC parse olsaydi bazi TZ'lerde 31 Aralik olurdu
  });
});

describe('todayMidnight — bugun 00:00:00.000', () => {
  it('saat/dakika/saniye/ms sifirlanmis bugunu verir', () => {
    const t = todayMidnight();
    const now = new Date();
    expect(t.getFullYear()).toBe(now.getFullYear());
    expect(t.getMonth()).toBe(now.getMonth());
    expect(t.getDate()).toBe(now.getDate());
    expect(t.getHours()).toBe(0);
    expect(t.getMinutes()).toBe(0);
    expect(t.getSeconds()).toBe(0);
    expect(t.getMilliseconds()).toBe(0);
  });
});

describe('isOD — gecikmis kalem tespiti', () => {
  beforeEach(() => {
    // isOD window.parseLocalDate + window.todayMidnight okur -> baglamali
    window.parseLocalDate = parseLocalDate;
    window.todayMidnight = todayMidnight;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 10, 0, 0)); // 15 May 2026, sabah
  });
  afterEach(() => vi.useRealTimers());

  it('odenmis kalem hicbir zaman gecikmis degildir (gecmis tarihte bile)', () => {
    expect(isOD({ status: 'paid', date: '2026-01-01' })).toBe(false);
  });

  it('bekleyen + gecmis tarih -> gecikmis', () => {
    expect(isOD({ status: 'pending', date: '2026-05-14' })).toBe(true);
  });

  it('bekleyen + gelecek tarih -> gecikmis degil', () => {
    expect(isOD({ status: 'pending', date: '2026-05-16' })).toBe(false);
  });

  it('bekleyen + bugun -> gecikmis degil (kesin kucuk karsilastirmasi)', () => {
    expect(isOD({ status: 'pending', date: '2026-05-15' })).toBe(false);
  });

  it('status yoksa pending kabul edilir', () => {
    expect(isOD({ date: '2026-05-14' })).toBe(true);
  });

  it('partial (kismi odenmis) gecmis tarih -> hala gecikmis', () => {
    expect(isOD({ status: 'partial', date: '2026-05-14' })).toBe(true);
  });
});
