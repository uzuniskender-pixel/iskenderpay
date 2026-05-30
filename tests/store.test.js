// tests/store.test.js — merkezi Store birim testleri
// store.js ES modulu olarak Store export eder + window.<key> getter/setter koprusu kurar.
// Dis bagimlilik: _autoSave yalniz `window.saveSecure` FONKSIYONSA cagirir (guard'li) ->
// testte vi.fn() ile stub'lanir, hem no-op guvenligi hem cagri dogrulamasi icin.
//
// EN KRITIK TEST: removeWhere index-predicate (v8.175). O bug'da predicate tek-arg
// cagriliyordu -> index-tabanli predicate ((_, i) => set.has(i)) i=undefined goruyor,
// HICBIR kayit silinmiyordu (Log sec-sil sessizce calismiyordu).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store } from '../js/store.js';

beforeEach(() => {
  window.saveSecure = vi.fn();  // _autoSave bunu cagirir (clearMocks: her testte sifir)
  Store.clearAll();             // _state'i temizle (modul state testler arasi kalici)
  Store.lastUpdated = 0;
  Store.dirty = false;
});

describe('Store — temel mutation API', () => {
  it('push diziye ekler + window kopru yansitir', () => {
    Store.push('pays', { id: 1, name: 'A' });
    expect(Store.get('pays').length).toBe(1);
    expect(window.pays[0].id).toBe(1); // getter koprusu
  });

  it('unshift basa ekler', () => {
    Store.push('pays', { id: 1 });
    Store.unshift('pays', { id: 0 });
    expect(Store.get('pays').map(p => p.id)).toEqual([0, 1]);
  });

  it('spliceAt siler/ekler ve cikarilani dondurur', () => {
    Store.hydrate({ pays: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    const removed = Store.spliceAt('pays', 1, 1, { id: 99 });
    expect(removed[0].id).toBe(2);
    expect(Store.get('pays').map(p => p.id)).toEqual([1, 99, 3]);
  });

  it('mutateItem nesne alanini gunceller', () => {
    const item = { id: 1, name: 'eski' };
    Store.push('pays', item);
    Store.mutateItem(item, { name: 'yeni' });
    expect(Store.get('pays')[0].name).toBe('yeni');
  });

  it('replace tum diziyi degistirir', () => {
    Store.push('pays', { id: 1 });
    Store.replace('pays', [{ id: 5 }, { id: 6 }]);
    expect(Store.get('pays').map(p => p.id)).toEqual([5, 6]);
  });
});

describe('Store — removeWhere predicate (element VE index)', () => {
  it('element-tabanli predicate ile dogru kaydi siler', () => {
    Store.hydrate({ pays: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    Store.removeWhere('pays', x => x.id === 2);
    expect(Store.get('pays').map(p => p.id)).toEqual([1, 3]);
  });

  it('REGRESYON v8.175: index-tabanli predicate calismali (predicate (x,i) ile cagrilir)', () => {
    Store.hydrate({ pays: [{ id: 10 }, { id: 20 }, { id: 30 }] });
    // Eski bug: predicate tek-arg cagriliyordu -> i=undefined -> hicbir sey silinmezdi.
    const selected = new Set([1]); // sadece index 1 (ortadaki) silinsin
    Store.removeWhere('pays', (_, i) => selected.has(i));
    expect(Store.get('pays').map(p => p.id)).toEqual([10, 30]); // ortadaki gitti
  });

  it('index predicate ile coklu secim siler', () => {
    Store.hydrate({ pays: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });
    const selected = new Set([0, 2]);
    Store.removeWhere('pays', (_, i) => selected.has(i));
    expect(Store.get('pays').map(p => p.id)).toEqual([2, 4]);
  });
});

describe('Store — hydrate / clearAll (silent: saveSecure tetiklemez)', () => {
  it('hydrate veriyi yukler ama autoSave cagirMAZ', () => {
    Store.hydrate({ pays: [{ id: 1 }], creds: [{ id: 9 }] });
    expect(Store.get('pays').length).toBe(1);
    expect(Store.get('creds')[0].id).toBe(9);
    expect(window.saveSecure).not.toHaveBeenCalled(); // hydrate sessiz
  });

  it('push autoSave cagirir (mutation API)', () => {
    Store.push('pays', { id: 1 });
    expect(window.saveSecure).toHaveBeenCalledTimes(1);
  });

  it('clearAll tum kovalari bosaltir', () => {
    Store.hydrate({ pays: [{ id: 1 }], notes: [{ id: 2 }] });
    Store.clearAll();
    expect(Store.get('pays')).toEqual([]);
    expect(Store.get('notes')).toEqual([]);
  });
});

describe('Store — lookup API + invalidation', () => {
  it('findPayById string-key ile bulur', () => {
    Store.hydrate({ pays: [{ id: 42, groupId: 'g1', name: 'A' }] });
    expect(Store.findPayById(42).name).toBe('A');
    expect(Store.findPayById('42').name).toBe('A'); // String() normalize
    expect(Store.findPayById(999)).toBe(null);
  });

  it('findPaysByGroup groupId ile gruplar', () => {
    Store.hydrate({ pays: [
      { id: 1, groupId: 'g1' }, { id: 2, groupId: 'g1' }, { id: 3, groupId: 'g2' },
    ] });
    expect(Store.findPaysByGroup('g1').map(p => p.id)).toEqual([1, 2]);
    expect(Store.findPaysByGroup('yok')).toEqual([]);
  });

  it('groupId yoksa floor(id) string\'ine duser (lookup fallback)', () => {
    Store.hydrate({ pays: [{ id: 42, name: 'X' }] }); // groupId yok
    // _rebuildLookups: gid = String(Math.floor(Number(42))) = '42'
    expect(Store.findPaysByGroup('42').map(p => p.id)).toEqual([42]);
  });

  it('findCredById bulur', () => {
    Store.hydrate({ creds: [{ id: 7, name: 'KREDI' }] });
    expect(Store.findCredById(7).name).toBe('KREDI');
    expect(Store.findCredById(1)).toBe(null);
  });

  it('mutation sonrasi lookup invalidate olur (eski harita kalmaz)', () => {
    Store.hydrate({ pays: [{ id: 1, groupId: 'g1' }] });
    expect(Store.findPayById(1)).not.toBe(null); // ilk build
    Store.push('pays', { id: 2, groupId: 'g2' });
    expect(Store.findPayById(2)).not.toBe(null); // yeni kayit goruluyor -> invalidate calisti
    Store.removeWhere('pays', p => p.id === 1);
    expect(Store.findPayById(1)).toBe(null);     // silinen artik yok
  });
});

describe('Store — tx (batch suppress + tek autoSave)', () => {
  it('tx icindeki coklu mutation TEK saveSecure ile sonuclanir', () => {
    Store.tx(() => {
      Store.push('pays', { id: 1 });
      Store.push('pays', { id: 2 });
      Store.push('pays', { id: 3 });
    });
    expect(Store.get('pays').length).toBe(3);
    expect(window.saveSecure).toHaveBeenCalledTimes(1); // 3 push -> 1 save (finally)
  });
});

describe('Store — window setter koprusu (silent: dirty=true, autoSave YOK)', () => {
  it('window.pays = X _setSilent yoluna gider: veri set + dirty, ama saveSecure cagrilMAZ', () => {
    window.pays = [{ id: 9 }];
    expect(Store.get('pays')[0].id).toBe(9);
    expect(Store.dirty).toBe(true);
    expect(window.saveSecure).not.toHaveBeenCalled(); // setter silent
  });
});
