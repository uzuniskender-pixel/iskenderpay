// js/integrity.js — iskenderpay (v1.0)
// Veri normalize (mutation) helper'lari. Save oncesi data düzeltir.
// Read-only sema validation: validate.js. v8.153'te persist.js#_doSave'den ayristirildi.
// Genisletme adayi: deduplicate, orphan reference temizligi, vb.

// Pays groupId tutarliligi: ayni groupId farkli isim tasiyorsa en sik ismi canonical
// sec, digerlerini ona normalize et. Side-effect: pay item'in name field'i mutate edilir.
function normalizeBeforeSave() {
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
}

window.normalizeBeforeSave = normalizeBeforeSave;
