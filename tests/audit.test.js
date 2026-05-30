// tests/audit.test.js — KATMAN 3 yakalayici write-audit birim testleri
// audit.js dis bagimlilik ALMAZ; window.recordWrite/getAudit/auditReset/auditLog baglar
// + son 50'yi localStorage'da (LOCAL-ONLY metadata) saklar.

import { describe, it, expect, beforeEach } from 'vitest';
import { recordWrite, getAudit, auditReset } from '../js/audit.js';

beforeEach(() => {
  auditReset(); // hem in-memory hem localStorage temizle
});

describe('audit — kayit semasi + GIZLILIK (yalniz metadata)', () => {
  it('recordWrite metadata alanlarini saklar (deger DEGIL)', () => {
    recordWrite({ source: 'persist:_doSave', target: 'localStorage+firebase', result: 'ok', size: 1234,
                  counts: { pays: 80, creds: 5 } });
    const log = getAudit();
    expect(log.length).toBe(1);
    const e = log[0];
    expect(e.source).toBe('persist:_doSave');
    expect(e.target).toBe('localStorage+firebase');
    expect(e.result).toBe('ok');
    expect(e.size).toBe(1234);
    expect(e.counts).toEqual({ pays: 80, creds: 5 });
    expect(typeof e.ts).toBe('number');
    expect(typeof e.iso).toBe('string');
  });

  it('GIZLILIK: kayitta gercek deger / sifreli blob ALANI yok (sadece size + counts)', () => {
    recordWrite({ source: 's', target: 't', result: 'ok', size: 999, counts: { pays: 3 } });
    const e = getAudit()[0];
    // izinli alanlar disinda hicbir sey olmamali (data/enc/values vb. sizmamali)
    expect(Object.keys(e).sort()).toEqual(['counts', 'iso', 'result', 'size', 'source', 'target', 'ts']);
  });
});

describe('audit — halka-tampon (ring buffer, son 50)', () => {
  it('50\'yi asinca en eskiler dusulur, en yeniler kalir', () => {
    for (let i = 0; i < 60; i++) recordWrite({ source: 's', result: 'ok', size: i });
    const log = getAudit();
    expect(log.length).toBe(50);
    expect(log[0].size).toBe(10);   // ilk 10 dusuruldu (0..9), 10..59 kaldi
    expect(log[49].size).toBe(59);  // en yeni
  });
});

describe('audit — getAudit kopya dondurur (disari mutasyon korunur)', () => {
  it('getAudit() dizisini disaridan degistirmek ic log\'u bozmaz', () => {
    recordWrite({ source: 's', result: 'ok', size: 1 });
    const copy = getAudit();
    copy.push({ source: 'HACK' });
    expect(getAudit().length).toBe(1); // ic log etkilenmedi
  });
});

describe('audit — auditReset', () => {
  it('reset in-memory + localStorage temizler', () => {
    recordWrite({ source: 's', result: 'ok', size: 1 });
    expect(getAudit().length).toBe(1);
    auditReset();
    expect(getAudit().length).toBe(0);
    expect(localStorage.getItem('ip-audit')).toBeNull();
  });
});
