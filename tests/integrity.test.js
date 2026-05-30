// tests/integrity.test.js — normalizeBeforeSave birim testleri
// integrity.js dis bagimlilik ALMAZ (import yok); window.pays/creds/persons/
// paidItems/actLog uzerinde calisir + window.normalizeBeforeSave'i baglar.
// Burada Store IMPORT EDILMEZ -> window.* duz veri property'si olarak kullanilir,
// boylece fonksiyonun KENDI mantigi (Store getter/setter semantigi olmadan) sinanir.
// Bu modul hata gecmisinin en kabarik oldugu yer: idx-sizinti (v8.179),
// groupId normalize, zombi pay onarimi (v8.176), paidItems dedupe, orphan ref.

import { describe, it, expect, beforeEach } from 'vitest';
import '../js/integrity.js'; // yan-etki: window.normalizeBeforeSave tanimlanir

// Her testte temiz kovalar (duz array — Store yok).
beforeEach(() => {
  window.pays = [];
  window.creds = [];
  window.persons = [];
  window.paidItems = [];
  window.actLog = [];
});

describe('normalizeBeforeSave — idx sizan kredi taksiti temizligi (v8.179)', () => {
  it('idx alani tasiyan pay (kredi taksiti sizintisi) silinir, normal pay kalir', () => {
    window.pays = [
      { id: 1, name: 'QNB', amount: 100, date: '2026-01-01', groupId: 'g1', idx: 0 }, // sizinti
      { id: 2, name: 'AHMET', amount: 200, date: '2026-01-01', groupId: 'g2' },        // normal
      { id: 3, name: 'QNB', amount: 100, date: '2026-02-01', groupId: 'g1', idx: 1 }, // sizinti
    ];
    window.normalizeBeforeSave();
    expect(window.pays.length).toBe(1);
    expect(window.pays[0].id).toBe(2);
  });

  it('hic idx yoksa diziye dokunulmaz', () => {
    window.pays = [
      { id: 1, name: 'A', amount: 10, date: '2026-01-01', groupId: 'g1' },
      { id: 2, name: 'B', amount: 20, date: '2026-01-01', groupId: 'g2' },
    ];
    window.normalizeBeforeSave();
    expect(window.pays.length).toBe(2);
  });
});

describe('normalizeBeforeSave — groupId isim tutarliligi (canonical = en sik isim)', () => {
  it('ayni groupId farkli isimler -> en sik isme normalize edilir', () => {
    window.pays = [
      { id: 1, name: 'QNB',    amount: 100, date: '2026-01-01', groupId: 'g1' },
      { id: 2, name: 'QNB',    amount: 100, date: '2026-02-01', groupId: 'g1' },
      { id: 3, name: 'AKBANK', amount: 100, date: '2026-03-01', groupId: 'g1' }, // azinlik
    ];
    window.normalizeBeforeSave();
    expect(window.pays.every(p => p.name === 'QNB')).toBe(true);
  });

  it('tek elemanli grup dokunulmaz (allSame guard)', () => {
    window.pays = [
      { id: 1, name: 'YALNIZ', amount: 100, date: '2026-01-01', groupId: 'solo' },
    ];
    window.normalizeBeforeSave();
    expect(window.pays[0].name).toBe('YALNIZ');
  });

  it('zaten ayni isimli grup degismez', () => {
    window.pays = [
      { id: 1, name: 'AYNI', amount: 100, date: '2026-01-01', groupId: 'g1' },
      { id: 2, name: 'AYNI', amount: 100, date: '2026-02-01', groupId: 'g1' },
    ];
    window.normalizeBeforeSave();
    expect(window.pays.map(p => p.name)).toEqual(['AYNI', 'AYNI']);
  });

  it('farkli gruplar birbirini ETKILEMEZ (grup-izole normalize)', () => {
    window.pays = [
      { id: 1, name: 'QNB', amount: 1, date: '2026-01-01', groupId: 'g1' },
      { id: 2, name: 'QNB', amount: 1, date: '2026-02-01', groupId: 'g1' },
      { id: 3, name: 'X',   amount: 1, date: '2026-01-01', groupId: 'g2' }, // tek -> dokunulmaz
    ];
    window.normalizeBeforeSave();
    expect(window.pays.find(p => p.id === 3).name).toBe('X');
  });
});

describe('normalizeBeforeSave — paidItems dedupe (paidId bazli, ilk tutulur)', () => {
  it('ayni paidId mukerrer kayitlar tekillesir (ilk korunur)', () => {
    window.paidItems = [
      { paidId: 'a', amount: 100 },
      { paidId: 'a', amount: 999 }, // mukerrer -> elenir
      { paidId: 'b', amount: 200 },
    ];
    window.normalizeBeforeSave();
    expect(window.paidItems.length).toBe(2);
    // ilk 'a' tutulur (amount 100), 999 elenir
    expect(window.paidItems.find(it => it.paidId === 'a').amount).toBe(100);
  });

  it('paidId tasimayan kayitlara dokunulmaz', () => {
    window.paidItems = [
      { amount: 50 },          // paidId yok
      { amount: 50 },          // paidId yok (mukerrer gibi gorunse de korunur)
      { paidId: 'x', amount: 1 },
    ];
    window.normalizeBeforeSave();
    expect(window.paidItems.length).toBe(3);
  });
});

describe('normalizeBeforeSave — actLog orphan referans temizligi (ALAN silinir, entry kalir)', () => {
  it('silinmis person/cred isaret eden personId/credId alani silinir, entry korunur', () => {
    window.persons = [{ id: 'p1', name: 'P' }];
    window.creds   = [{ id: 'c1', name: 'C', monthly: 10 }];
    window.actLog  = [
      { type: 'paid', personId: 'p1' },          // gecerli -> kalir
      { type: 'paid', personId: 'pX' },          // orphan -> personId silinir
      { type: 'cred_add', credId: 'cX' },        // orphan -> credId silinir
      { type: 'cred_add', credId: 'c1' },        // gecerli -> kalir
    ];
    window.normalizeBeforeSave();
    expect(window.actLog.length).toBe(4); // entry'ler korunur
    expect(window.actLog[0].personId).toBe('p1');
    expect('personId' in window.actLog[1]).toBe(false); // alan silindi
    expect('credId' in window.actLog[2]).toBe(false);   // alan silindi
    expect(window.actLog[3].credId).toBe('c1');
  });
});

describe('normalizeBeforeSave — zombi pay onarimi (id/groupId backfill, v8.176)', () => {
  it('id ve groupId eksik pay onarilir (id sayi, groupId fix_ onekli)', () => {
    window.pays = [{ name: 'ZOMBI', amount: 10, date: '2026-01-01' }]; // id yok, groupId yok
    window.normalizeBeforeSave();
    const p = window.pays[0];
    expect(typeof p.id).toBe('number');
    expect(typeof p.groupId).toBe('string');
    expect(p.groupId.startsWith('fix_')).toBe(true);
  });

  it('id ve groupId zaten varsa dokunulmaz', () => {
    window.pays = [{ id: 7, name: 'TAM', amount: 10, date: '2026-01-01', groupId: 'g1' }];
    window.normalizeBeforeSave();
    expect(window.pays[0].id).toBe(7);
    expect(window.pays[0].groupId).toBe('g1');
  });

  it('coklu zombi -> her birine BENZERSIZ id atanir (pay_NaN cokmesi onlenir)', () => {
    window.pays = [
      { name: 'Z1', amount: 1, date: '2026-01-01' },
      { name: 'Z2', amount: 2, date: '2026-01-01' },
      { name: 'Z3', amount: 3, date: '2026-01-01' },
    ];
    window.normalizeBeforeSave();
    const ids = window.pays.map(p => p.id);
    expect(new Set(ids).size).toBe(3); // hepsi farkli
    const gids = window.pays.map(p => p.groupId);
    expect(new Set(gids).size).toBe(3);
  });
});

describe('normalizeBeforeSave — idempotency (ikinci cagri no-op)', () => {
  it('ayni veri uzerinde iki kez calisinca ikinci cagri degisiklik yapmaz', () => {
    window.pays = [
      { id: 1, name: 'QNB',    amount: 1, date: '2026-01-01', groupId: 'g1' },
      { id: 2, name: 'AKBANK', amount: 1, date: '2026-02-01', groupId: 'g1' }, // normalize edilecek
      { name: 'ZOMBI',         amount: 1, date: '2026-03-01' },               // backfill edilecek
    ];
    window.paidItems = [{ paidId: 'a' }, { paidId: 'a' }];
    window.persons   = [{ id: 'p1', name: 'P' }];
    window.actLog    = [{ personId: 'pX' }];

    window.normalizeBeforeSave(); // 1. gecis: duzeltir
    const snapshot = JSON.stringify({
      pays: window.pays, paidItems: window.paidItems, actLog: window.actLog,
    });

    window.normalizeBeforeSave(); // 2. gecis: no-op olmali
    const after = JSON.stringify({
      pays: window.pays, paidItems: window.paidItems, actLog: window.actLog,
    });

    expect(after).toBe(snapshot);
    expect(window.paidItems.length).toBe(1); // dedupe kalici
    expect(window.pays.every(p => p.name === 'QNB' || p.name === 'ZOMBI')).toBe(true);
  });
});
