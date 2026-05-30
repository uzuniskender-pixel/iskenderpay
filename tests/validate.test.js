// tests/validate.test.js — validateBeforeSave birim testleri
// validate.js dis bagimlilik ALMAZ; window.pays/creds/persons okur, MUTATE ETMEZ,
// tespit edilen hata sayisini (errN) dondurur. Store IMPORT EDILMEZ (duz window.*).
// Save iptal edilmez — bu fonksiyon yalniz forensic sayim/loglama yapar.

import { describe, it, expect, beforeEach } from 'vitest';
import '../js/validate.js'; // yan-etki: window.validateBeforeSave tanimlanir

beforeEach(() => {
  window.pays = [];
  window.creds = [];
  window.persons = [];
});

describe('validateBeforeSave — temiz veri 0 hata', () => {
  it('gecerli pays/creds/persons -> 0', () => {
    window.pays    = [{ id: 1, name: 'A', amount: 100, date: '2026-01-01', groupId: 'g1' }];
    window.creds   = [{ id: 1, name: 'C', monthly: 50 }];
    window.persons = [{ id: 'p1', name: 'P' }];
    expect(window.validateBeforeSave()).toBe(0);
  });

  it('hepsi bos dizi -> 0', () => {
    expect(window.validateBeforeSave()).toBe(0);
  });
});

describe('validateBeforeSave — pays alan kontrolleri', () => {
  it('tamamen bos pay nesnesi 5 hata sayar (id/name/amount/date/groupId)', () => {
    window.pays = [{}];
    expect(window.validateBeforeSave()).toBe(5);
  });

  it('id null tek basina 1 hata', () => {
    window.pays = [{ id: null, name: 'A', amount: 1, date: '2026-01-01', groupId: 'g' }];
    expect(window.validateBeforeSave()).toBe(1);
  });

  it('amount string (NaN degil ama number degil) 1 hata', () => {
    window.pays = [{ id: 1, name: 'A', amount: '100', date: '2026-01-01', groupId: 'g' }];
    expect(window.validateBeforeSave()).toBe(1);
  });

  it('amount NaN 1 hata', () => {
    window.pays = [{ id: 1, name: 'A', amount: NaN, date: '2026-01-01', groupId: 'g' }];
    expect(window.validateBeforeSave()).toBe(1);
  });

  it('groupId bos string falsy -> 1 hata', () => {
    window.pays = [{ id: 1, name: 'A', amount: 1, date: '2026-01-01', groupId: '' }];
    expect(window.validateBeforeSave()).toBe(1);
  });

  it('id=0 gecerli sayilir (undefined/null degil) -> hata yok', () => {
    window.pays = [{ id: 0, name: 'A', amount: 1, date: '2026-01-01', groupId: 'g' }];
    expect(window.validateBeforeSave()).toBe(0);
  });
});

describe('validateBeforeSave — creds alan kontrolleri', () => {
  it('bos cred 3 hata (id/name/monthly)', () => {
    window.creds = [{}];
    expect(window.validateBeforeSave()).toBe(3);
  });

  it('monthly NaN 1 hata', () => {
    window.creds = [{ id: 1, name: 'C', monthly: NaN }];
    expect(window.validateBeforeSave()).toBe(1);
  });
});

describe('validateBeforeSave — persons alan kontrolleri', () => {
  it('bos person 2 hata (id/name)', () => {
    window.persons = [{}];
    expect(window.validateBeforeSave()).toBe(2);
  });

  it('id falsy (bos string) -> 1 hata', () => {
    window.persons = [{ id: '', name: 'P' }];
    expect(window.validateBeforeSave()).toBe(1);
  });
});

describe('validateBeforeSave — koleksiyonlar arasi toplam', () => {
  it('uc koleksiyondaki hatalar toplanir', () => {
    window.pays    = [{}];        // 5
    window.creds   = [{}];        // 3
    window.persons = [{}];        // 2
    expect(window.validateBeforeSave()).toBe(10);
  });
});
