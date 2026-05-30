// tests/persist-conflict.test.js — KATMAN 1: cakisma kablolamasi ENTEGRASYON testi
// MANUEL SAHA-TESTININ OTOMATIGI. persist.js#_doSave'in Firebase dalini sinar:
//   _fbSave -> {ok} / {conflict} / hata  =>  Store.lastUpdated, applyRemote, showWarnToast,
//   fbSyncNeeded ve localStorage-once-yaz guvenligi.
//
// GUVENLIK / GIZLILIK (kullanici sarti): bu test NODE surecinde kosar — ortada GERCEK
// Firebase de, uygulamanin gercek localStorage'i da YOK. _fbSave STUB'lanir, Session
// MOCK'lanir. Yani gercek iskenderpay verisine ERISIMI YAPISAL OLARAK YOKTUR; ne iz
// kalir ne veri bozulur, ne de veri disari sizar. Tum girdiler SENTETIK (TEST*).
//
// Eslesme (manuel saha-test -> bu test):
//   Manuel Test 1 (regresyon: normal kayit, sahte toast YOK)  -> ok-path testi
//   Manuel Test 2 (cakisma: sari uyari + uzak veri geri yuklenir) -> conflict-path testi
//   (Bonus) Firebase hatasi: localStorage-once guvenligi + fbSyncNeeded -> error-path testi

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Session ES import (persist.js icinde) -> mock'la: gercek crypto/key gerekmesin.
// encrypt sentetik bir "sifreli blob" dondurur; hasKey=true (oturum acik varsay).
vi.mock('../js/session.js', () => ({
  Session: {
    hasKey: () => true,
    isUnlocked: () => true,
    encrypt: async (data) => 'ENC:' + JSON.stringify(data).length, // deterministik sentetik blob
    decrypt: async () => ({}),
  },
}));

import { Store } from '../js/store.js';
import '../js/persist.js'; // yan-etki: window.saveSecure/saveSecureNow/loadSecure tanimlanir

beforeEach(() => {
  Store.clearAll();
  Store.dirty = false;
  Store.saveTimer = null;
  Store.suppressSave = false;
  Store.fbSyncNeeded = false;
  Store.lastUpdated = 1000; // bildigimiz uzak baseline (>0)

  // SENTETIK veri — gercek pays/creds DEGIL
  window.pays = [{ id: 1, name: 'TEST', amount: 100, date: '2026-01-01', groupId: 'g1' }];

  // baglanti casuslari (gercek DOM/Firebase yerine)
  window.applyRemote   = vi.fn(async () => {});
  window.showWarnToast = vi.fn();
  window.setSyncDot    = vi.fn();

  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  delete window._fbSave;
});

describe('KATMAN1 — regresyon (normal kayit): SAHTE CAKISMA OLMAMALI', () => {
  it('_fbSave {ok} -> lastUpdated guncellenir, applyRemote/showWarnToast CAGRILMAZ', async () => {
    window._fbSave = vi.fn(async () => ({ ok: true, updatedAt: 5000 }));

    await window.saveSecureNow();

    expect(window._fbSave).toHaveBeenCalledTimes(1);
    expect(Store.lastUpdated).toBe(5000);        // saat-kaymasi dayanikli baseline
    expect(Store.fbSyncNeeded).toBe(false);
    expect(window.applyRemote).not.toHaveBeenCalled();   // uzak veri GERI YUKLENMEZ
    expect(window.showWarnToast).not.toHaveBeenCalled(); // SARI UYARI CIKMAZ
    expect(Store.dirty).toBe(false);             // finally temizledi
    // localStorage'a sentetik blob yazildi (gercek veri degil)
    expect(localStorage.getItem('v5-data-' + Store.planId)).toBeTruthy();
  });
});

describe('KATMAN1 — cakisma yolu: uzak veri korunur + uyari', () => {
  it('_fbSave {conflict} -> uzeri YAZILMAZ, applyRemote(remote) + showWarnToast cagrilir', async () => {
    window._fbSave = vi.fn(async () => ({
      conflict: true, remote: 'ENC:REMOTE_BLOB', remoteTs: 9999,
    }));

    await window.saveSecureNow();

    expect(Store.lastUpdated).toBe(9999);        // baseline = uzak gercek
    expect(Store.fbSyncNeeded).toBe(false);      // bayat blob poll'da push edilmez
    expect(window.applyRemote).toHaveBeenCalledTimes(1);
    expect(window.applyRemote).toHaveBeenCalledWith('ENC:REMOTE_BLOB'); // UZAK veri yuklendi
    expect(window.showWarnToast).toHaveBeenCalledTimes(1);              // SARI UYARI
    expect(window.setSyncDot).toHaveBeenCalledWith('synced');
    expect(Store.dirty).toBe(false);
  });
});

describe('KATMAN1 — Firebase hatasi: localStorage-once guvenligi (veri kaybi YOK)', () => {
  it('_fbSave THROW -> fbSyncNeeded=true, dirty=false, AMA localStorage yazilmis kalir', async () => {
    window._fbSave = vi.fn(async () => { throw new Error('network down'); });

    await window.saveSecureNow();

    expect(Store.fbSyncNeeded).toBe(true);       // sonraki poll'da yeniden dene
    expect(Store.dirty).toBe(false);             // finally
    // KRITIK: Firebase patlasa bile veri localStorage'da -> sifir veri kaybi
    expect(localStorage.getItem('v5-data-' + Store.planId)).toBeTruthy();
    expect(window.applyRemote).not.toHaveBeenCalled();
    expect(window.showWarnToast).not.toHaveBeenCalled();
  });
});

describe('KATMAN1 — guard: oturum kilitliyse / suppress ise kayit yapilmaz', () => {
  it('suppressSave=true iken saveSecure debounce hicbir sey yapmaz', async () => {
    window._fbSave = vi.fn(async () => ({ ok: true, updatedAt: 1 }));
    Store.suppressSave = true;
    await window.saveSecure(); // debounce yolu (saveSecureNow degil)
    // saveSecure suppressSave'de erken doner: timer kurulmaz, _fbSave hic cagrilmaz
    expect(window._fbSave).not.toHaveBeenCalled();
    expect(Store.saveTimer).toBeFalsy();
  });
});
