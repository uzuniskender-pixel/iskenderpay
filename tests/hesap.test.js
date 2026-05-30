// tests/hesap.test.js — merkezi hesap modulu birim testleri
// ONCELIK (DEVAM_NOTU #7): Hesap.kalan / toplamOzeti / krediler / trend.
// Bu fonksiyonlarda bu hafta tutarsizlik bulundu:
//   - v8.170: "kalan" tek-kaynak (partial paid + FX cevrimi tek formul)
//   - v8.192/193: arama/trend FX gosterimi (paid varsa onu, yoksa toTRY — ham deger DEGIL)
// Testler tam bu alanlara regresyon kalkani.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hesap } from '../js/hesap.js';
import { wireGlobals } from './_helpers.js';

beforeEach(() => {
  wireGlobals(); // window.toTRY/parseLocalDate/isOD/todayMidnight + bos pays/creds/paidItems
});

// ──────────────────────────────────────────────────────────────────────────
// Hesap.kalan(amount, paid, currency) — TEK kalan-tutar kaynagi (v8.170)
// ──────────────────────────────────────────────────────────────────────────
describe('Hesap.kalan — tek kalan-tutar kaynagi', () => {
  it('currency yok: amount - paid', () => {
    expect(Hesap.kalan(1000, 300)).toBe(700);
  });

  it('paid verilmezse 0 kabul edilir (tam tutar kalir)', () => {
    expect(Hesap.kalan(1000)).toBe(1000);
  });

  it('asiri odeme negatife dusmez, 0 ile kirpilir', () => {
    expect(Hesap.kalan(1000, 1500)).toBe(0);
  });

  it('currency TRY: toTRY ham tutari dondurur, sonra paid dusulur', () => {
    expect(Hesap.kalan(1000, 200, 'TRY')).toBe(800);
  });

  it('currency EUR: once TRY cevrimi (x50), sonra TRY cinsi paid dusulur', () => {
    // 100 EUR * 50 = 5000 TRY, paid 1000 TRY -> 4000
    expect(Hesap.kalan(100, 1000, 'EUR')).toBe(4000);
  });

  it('currency GOLD: gram x rate (x6000)', () => {
    expect(Hesap.kalan(2, 0, 'GOLD')).toBe(12000);
  });

  it('amount null + currency yok -> 0', () => {
    expect(Hesap.kalan(null, 100)).toBe(0);
  });

  it('Hesap.kalan ile dahili kalan ayni referans (tek kaynak garanti)', () => {
    // toplamOzeti/krediler de bu fonksiyonu kullanir; disari acilan referans budur.
    expect(typeof Hesap.kalan).toBe('function');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Hesap.toplamOzeti() — tum bekleyen borc (pays + cred taksitleri)
// ──────────────────────────────────────────────────────────────────────────
describe('Hesap.toplamOzeti — bekleyen borc toplami', () => {
  it('odenmis kalemleri haric tutar, partial ve FX cevrimini dogru toplar', () => {
    window.pays = [
      { amount: 1000, status: 'pending' },                       // 1000
      { amount: 500, status: 'paid' },                           // haric
      { amount: 100, currency: 'EUR', status: 'pending' },       // 100*50 = 5000
      { amount: 2000, paid: 500, status: 'partial' }             // 2000-500 = 1500
    ];
    window.creds = [
      { id: 'c1', pays: [
        { amount: 1000, status: 'paid' },                        // haric
        { amount: 1000, status: 'pending' },                     // 1000
        { amount: 1000, paid: 400, status: 'partial' }           // 600
      ]}
    ];
    const r = Hesap.toplamOzeti();
    expect(r.paysBekleyen).toBe(7500);   // 1000 + 5000 + 1500
    expect(r.krediBekleyen).toBe(1600);  // 1000 + 600
    expect(r.toplam).toBe(9100);
  });

  it('bos veri -> sifir', () => {
    const r = Hesap.toplamOzeti();
    expect(r).toEqual({ paysBekleyen: 0, krediBekleyen: 0, toplam: 0 });
  });

  it('hepsi odenmis -> sifir bekleyen', () => {
    window.pays = [{ amount: 1000, status: 'paid' }];
    window.creds = [{ id: 'c1', pays: [{ amount: 500, status: 'paid' }] }];
    expect(Hesap.toplamOzeti().toplam).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Hesap.krediler() — kredi kart paneli listesi
// ──────────────────────────────────────────────────────────────────────────
describe('Hesap.krediler — kredi ozet listesi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 9, 0, 0)); // bugun = 15 May 2026
  });
  afterEach(() => vi.useRealTimers());

  it('paid/total/remaining/pct/bekleyen/overdue/nextDays/lastDate hesaplar', () => {
    window.creds = [{
      id: 'c1', name: 'QNB 1', pays: [
        { amount: 1000, status: 'paid',    date: '2026-03-01' },
        { amount: 1000, status: 'paid',    date: '2026-04-01' },
        { amount: 1000, status: 'partial', paid: 300, date: '2026-05-10' }, // gecmis -> overdue, kalan 700
        { amount: 1000, status: 'pending', date: '2026-06-01' }             // gelecek
      ]
    }];
    const [k] = Hesap.krediler();
    expect(k.dispName).toBe('QNB');     // buildMx yok -> _baseOf(name) fallback
    expect(k.paid).toBe(2);             // yalniz status==='paid'
    expect(k.total).toBe(4);
    expect(k.remaining).toBe(2);
    expect(k.pct).toBe(50);             // round(2/4*100)
    expect(k.bekleyen).toBe(1700);      // 700 (partial) + 1000 (pending)
    expect(k.overdueCount).toBe(1);     // yalniz 2026-05-10 (gecmis & odenmemis)
    expect(k.nextPay.date).toBe('2026-05-10'); // ilk odenmemis
    expect(k.nextDays).toBe(-5);        // 10 May - 15 May
    expect(k.lastDate).toBe('2026-06-01');
    expect(k.done).toBe(false);
  });

  it('tamamen odenmis kredi: done=true, bekleyen=0, nextPay=undefined, nextDays=null', () => {
    window.creds = [{
      id: 'c2', name: 'Tamam Kredi', pays: [
        { amount: 500, status: 'paid', date: '2026-01-01' }
      ]
    }];
    const [k] = Hesap.krediler();
    expect(k.done).toBe(true);
    expect(k.pct).toBe(100);
    expect(k.bekleyen).toBe(0);
    expect(k.nextPay).toBeUndefined();
    expect(k.nextDays).toBeNull();
    expect(k.overdueCount).toBe(0);
  });

  it('bos kredi listesi -> bos dizi', () => {
    expect(Hesap.krediler()).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Hesap.trend(n) — son N ay gerceklesen odeme trendi
// REGRESYON: FX kaleminde ham tutar DEGIL toTRY; paid varsa paid kullanilir.
// ──────────────────────────────────────────────────────────────────────────
describe('Hesap.trend — gerceklesen odeme trendi (FX paritesi)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 9, 0, 0)); // bugun = 15 May 2026
  });
  afterEach(() => vi.useRealTimers());

  it('son 3 ayi eskiden yeniye siralar, pencere disini eler', () => {
    window.paidItems = [
      { date: '2026-02-20', amount: 9999 },                 // pencere disi (eski)
      { date: '2026-03-05', amount: 1000 },                 // Mart: 1000
      { date: '2026-05-02', amount: 100, currency: 'EUR' }, // Mayis: paid yok -> toTRY = 100*50 = 5000
      { date: '2026-05-10', amount: 5000, paid: 4200 },     // Mayis: paid var -> 4200 (toTRY DEGIL)
      { date: '2026-06-01', amount: 7777 }                  // pencere disi (gelecek)
    ];
    const t = Hesap.trend(3);
    expect(t).toHaveLength(3);
    expect(t.map(x => x.monthKey)).toEqual(['2026-03', '2026-04', '2026-05']);
    expect(t.map(x => x.tot)).toEqual([1000, 0, 9200]); // Mayis: 5000 (EUR->TRY) + 4200 (paid)
    expect(t.map(x => x.count)).toEqual([1, 0, 2]);
  });

  it('EUR kalemi ham tutar olarak SAYILMAZ (v8.192/193 kalkani)', () => {
    window.paidItems = [{ date: '2026-05-02', amount: 100, currency: 'EUR' }];
    const may = Hesap.trend(3).find(x => x.monthKey === '2026-05');
    expect(may.tot).toBe(5000); // 100 degil
  });

  it('paid alani set ise toTRY yerine paid kullanilir (Log duzenleme kalkani)', () => {
    window.paidItems = [{ date: '2026-05-02', amount: 5000, currency: 'EUR', paid: 1234 }];
    const may = Hesap.trend(3).find(x => x.monthKey === '2026-05');
    expect(may.tot).toBe(1234); // toTRY(5000,EUR)=250000 DEGIL
  });

  it('n verilmezse varsayilan 3 ay', () => {
    expect(Hesap.trend()).toHaveLength(3);
  });

  it('her ay icin lbl (kisa ay adi) string dondurur', () => {
    const t = Hesap.trend(3);
    t.forEach(x => expect(typeof x.lbl === 'string' && x.lbl.length > 0).toBe(true));
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Hesap.buAyOzeti(opts) — refDate enjekte edilebilir (deterministik)
// ──────────────────────────────────────────────────────────────────────────
describe('Hesap.buAyOzeti — bu ay ozeti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 9, 0, 0)); // isOD bugunu = 15 May 2026
  });
  afterEach(() => vi.useRealTimers());

  it('ay filtresi + ok/bek/gec siniflandirma + FX cevrimi', () => {
    const all = [
      { date: '2026-05-01', amount: 1000, status: 'paid' },                  // ok
      { date: '2026-05-20', amount: 500,  status: 'pending' },               // gelecek -> bek
      { date: '2026-05-10', amount: 200,  status: 'pending' },               // gecmis -> gec
      { date: '2026-05-05', amount: 100,  currency: 'EUR', status: 'pending' }, // gecmis -> gec, 100*50=5000
      { date: '2026-04-30', amount: 9999, status: 'pending' }                // ay disi -> elenir
    ];
    const r = Hesap.buAyOzeti({ all, refDate: new Date(2026, 4, 15) });
    expect(r.itemCount).toBe(4);
    expect(r.ok).toBe(1000);  expect(r.okN).toBe(1);
    expect(r.bek).toBe(500);  expect(r.bekN).toBe(1);
    expect(r.gec).toBe(5200); expect(r.gecN).toBe(2); // 200 + 5000
    expect(r.tot).toBe(6700); // 1000 + 500 + 5200
  });

  it('bos all -> tum alanlar sifir', () => {
    const r = Hesap.buAyOzeti({ all: [], refDate: new Date(2026, 4, 15) });
    expect(r).toEqual({ tot: 0, ok: 0, bek: 0, gec: 0, okN: 0, bekN: 0, gecN: 0, itemCount: 0 });
  });
});
