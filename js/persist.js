// js/persist.js — iskenderpay (v1.0)
// Encrypt + storage (localStorage + Firestore hybrid) + schema migration.
// firestore.js'ten window._fbSave/_fbLoad'i, crypto.js'ten encryptData/decryptData'yi tuketir.
// v8.127'de db.js'ten ayristirildi.

// ── saveSecure / loadSecure ───────────────────────────────────────────────────

async function saveSecure() {
  if (window.Store.suppressSave) return;
  if (!window.Store.session.cryptoKey) return;
  if (window.Store.saveTimer) clearTimeout(window.Store.saveTimer);
  window.Store.dirty = true;  // Bekleyen degisiklik var — sync ezmesin
  window.Store.saveTimer = setTimeout(() => { _doSave(); }, 400);
}

async function _doSave() {
  window.Store.saveTimer = null;
  if (!window.Store.session.cryptoKey) return;
  // GroupId tutarlilik kontrolu: ayni groupId'de farkli isim varsa duzelt
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
  } catch(e) { console.warn('[integrity] kontrol hatasi:', e); }
  // Veri integrity kontrolu (v8.123) — v8.135'te validate.js'e tasindi
  window.validateBeforeSave && window.validateBeforeSave();
  const data = {
    pays: window.pays, creds: window.creds, hist: window.hist,
    persons: window.persons, notes: window.notes, paidItems: window.paidItems,
    rehber: window.rehber, actLog: window.actLog
  };
  const enc = await window.encryptData(data, window.Store.session.cryptoKey);
  // localStorage ÖNCE yaz — Firebase başarısız olsa bile veri güvende
  localStorage.setItem('v5-data-' + window.Store.planId, enc);
  localStorage.setItem('v5-rates-' + window.Store.planId, JSON.stringify(window.rates));
  if (window._fbSave) {
    try {
      await window._fbSave(enc);
      window.Store.lastUpdated = Date.now();
      window.Store.fbSyncNeeded = false;
    } catch(e) {
      console.warn('Firebase kayıt hatası:', e);
      window.Store.fbSyncNeeded = true;  // Bir sonraki başarılı poll'da yeniden dene
    } finally { window.Store.dirty = false; }
  }
}

async function saveSecureNow() {
  if (window.Store.saveTimer) clearTimeout(window.Store.saveTimer);
  window.Store.suppressSave = false;
  await _doSave();
}

async function loadSecure() {
  let enc = null;
  let fbHadData = false;
  if (window._fbLoad) {
    try {
      enc = await window._fbLoad();
      fbHadData = (enc !== null);
    } catch(e) { console.warn('Firebase yükleme hatasi:', e); }
  }
  if (!enc) enc = localStorage.getItem('v5-data-' + window.Store.planId) || localStorage.getItem('v5-data');
  if (!enc) return;
  try {
    const data = await window.decryptData(enc, window.Store.session.cryptoKey);
    // Toplu sessiz atama — saveSecure tetiklenmez (veri zaten kaynak)
    if (window.Store) {
      window.Store.hydrate(data);
    } else {
      window.pays      = data.pays      || [];
      window.creds     = data.creds     || [];
      window.hist      = data.hist      || [];
      window.persons   = data.persons   || [];
      window.notes     = data.notes     || [];
      window.paidItems = data.paidItems || [];
      window.rehber    = data.rehber    || [];
      window.actLog    = data.actLog    || [];
    }
    // Sadece Firebase bos ise localStorage verisini yukle (migration)
    // Firebase hatali iken localStorage ile ezme - DATA LOSS onlendi
    if (!fbHadData && window._fbSave) { try { await window._fbSave(enc); } catch(e) {} }
  } catch(e) {
    throw new Error('decrypt_failed');
  }
  window.Store.dirty = false;  // Yeni veri yüklendi — bekleyen değişiklik yok
  const r = localStorage.getItem('v5-rates-' + window.Store.planId) || localStorage.getItem('v5-rates');
  if (r) try { Object.assign(window.rates, JSON.parse(r)); } catch(e) {}
}

// ── Migrasyon ─────────────────────────────────────────────────────────────────

async function migrateToV7() {
  const migKey = 'v7-migrated-' + (window.Store.fbUid||'local') + '-' + window.Store.planId;
  if (localStorage.getItem(migKey)) return;
  window.Store.suppressSave = true;
  const _migPays = (window.pays||[]).map(p => {
    const entry = {...p};
    if (!entry.groupId) entry.groupId = String(Math.floor(Number(entry.rp || entry.id)));
    delete entry.rec; delete entry.rp; delete entry.rs; delete entry.rm;
    return entry;
  });
  if (window.Store) window.Store.replace('pays', _migPays); else window.pays = _migPays;
  if (!(window.paidItems||[]).length) {
    const allItems = [...(window.pays||[])];
    (window.creds||[]).forEach(c => (c.pays||[]).forEach(i => allItems.push({...i, name: c.name, currency: 'TRY', _cid: c.id, _ii: i.idx})));
    const _migPaid = allItems
      .filter(p => p.status === 'paid' || p.status === 'partial')
      .map(p => ({...p, paidId: 'pi_' + Date.now() + '_' + Math.random()}));
    if (window.Store) window.Store.replace('paidItems', _migPaid); else window.paidItems = _migPaid;
  }
  window.Store.suppressSave = false;
  await saveSecureNow();
  localStorage.setItem(migKey, '1');
  console.log('v7 migrasyon tamamlandı');
}

// ── Global compat ─────────────────────────────────────────────────────────────
window.saveSecure    = saveSecure;
window.saveSecureNow = saveSecureNow;
window.loadSecure    = loadSecure;
window.migrateToV7   = migrateToV7;
