// js/integrity.js — iskenderpay (v1.0)
// Veri normalize (mutation) helper'lari. Save oncesi data düzeltir.
// Read-only sema validation: validate.js. v8.153'te persist.js#_doSave'den ayristirildi.
// Genisletme adayi: deduplicate, orphan reference temizligi, vb.

// Pays groupId tutarliligi: ayni groupId farkli isim tasiyorsa en sik ismi canonical
// sec, digerlerini ona normalize et. Side-effect: pay item'in name field'i mutate edilir.
function normalizeBeforeSave() {
  // v8.179: window.pays'e sizan kredi taksitlerini temizle. idx alani SADECE
  // kredi taksitinde bulunur, normal pay'de asla. idx'li pay = duplike sizinti
  // (gercek taksit creds'te). v8.176 backfill'inden ONCE calismali ki backfill
  // bunlara fix_ groupId vermesin. Silent setter: invalidate+dirty, autoSave yok.
  try {
    const _arr = window.pays || [];
    const _kept = _arr.filter(p => p.idx === undefined);
    if (_kept.length !== _arr.length) {
      window.pays = _kept;
      console.log('[integrity] ' + (_arr.length - _kept.length) + ' sizan kredi taksiti (idx) pays temizlendi');
    }
  } catch(e) { console.warn('[integrity] idx-leak temizlik hatasi:', e); }

  try {
    const byGroup = {};
    (window.pays||[]).forEach(p => {
      if (!p.groupId) return;
      if (!byGroup[p.groupId]) byGroup[p.groupId] = [];
      byGroup[p.groupId].push(p);
    });
    Object.values(byGroup).forEach(entries => {
      if (entries.length <= 1) return;
      const names = entries.map(e => e.name);
      const freq = {};
      names.forEach(n => { freq[n] = (freq[n]||0)+1; });
      const canonical = Object.keys(freq).sort((a,b) => freq[b]-freq[a])[0];
      const allSame = names.every(n => n === canonical);
      if (!allSame) {
        entries.forEach(e => { e.name = canonical; });
        console.log('[integrity] GroupId', entries[0].groupId, '→ ad duzeltildi:', canonical);
      }
    });
  } catch(e) { console.warn('[integrity] normalize hatasi:', e); }

  // (A) paidItems dedupe: ayni paidId'ye sahip mukerrer kayitlari tekille (ilkini tut).
  // paidId yoksa atla (silme). Idempotent: ikinci cagrida mukerrer kalmadigi icin no-op.
  try {
    const items = window.paidItems;
    if (Array.isArray(items)) {
      const seen = new Set();
      let removed = 0;
      const deduped = items.filter(it => {
        if (!it || !it.paidId) return true; // paidId yoksa dokunma
        if (seen.has(it.paidId)) { removed++; return false; }
        seen.add(it.paidId);
        return true;
      });
      if (removed > 0) {
        window.paidItems = deduped;
        console.log('[integrity]', removed, 'mukerrer paidItem temizlendi');
      }
    }
  } catch(e) { console.warn('[integrity] paidItems dedupe hatasi:', e); }

  // (B) orphan reference temizligi: actLog entry'lerindeki personId/credId silinmis bir
  // kayda isaret ediyorsa o ALANI sil (entry'yi degil). Idempotent: kirik referans
  // kaldigi surece silinir, sonraki cagrida alan yoksa no-op.
  try {
    const log = window.actLog;
    if (Array.isArray(log)) {
      const personIds = new Set((window.persons||[]).map(p => p && p.id).filter(Boolean));
      const credIds = new Set((window.creds||[]).map(c => c && c.id).filter(Boolean));
      let fixed = 0;
      log.forEach(e => {
        if (!e) return;
        if (e.personId && !personIds.has(e.personId)) { delete e.personId; fixed++; }
        if (e.credId && !credIds.has(e.credId)) { delete e.credId; fixed++; }
      });
      if (fixed > 0) console.log('[integrity]', fixed, 'kirik actLog referansi temizlendi');
    }
  } catch(e) { console.warn('[integrity] orphan temizlik hatasi:', e); }

  // v8.176: id/groupId'siz (zombi) pay kayitlarini onar. id yoksa pay silinemez,
  // eslesmez ve rawKey 'pay_NaN'de birlesir (coklu zombi tek hayalet satira cokerdi).
  // Floor cakismasini onlemek icin id'ye seq offset eklenir. Idempotent.
  try {
    let _bf = 0, _seq = 0;
    (window.pays || []).forEach(p => {
      let t = false;
      if (p.id == null)  { p.id = Date.now() + (_seq++) + Math.random(); t = true; }
      if (!p.groupId)    { p.groupId = 'fix_' + Date.now() + '_' + (_seq++) + '_' + Math.random().toString(36).slice(2,6); t = true; }
      if (t) _bf++;
    });
    if (_bf) console.log('[integrity] ' + _bf + ' eksik pay id/groupId backfill edildi');
  } catch(e) { console.warn('[integrity] pay backfill hatasi:', e); }
}

window.normalizeBeforeSave = normalizeBeforeSave;
