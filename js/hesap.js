// js/hesap.js — iskenderpay (v1.0)
// Merkezi hesap modulu. Plan matrisi, ayarlar paneli ve kredi kart paneli
// ayni hesaplari (bu ay ozeti, toplam bekleyen, kredi listesi, trend)
// burada ortak yapar — tutarsizlik kalmaz.
//
// API:
//   Hesap.buAyOzeti({all?, refDate?}) -> { tot, ok, bek, gec, okN, bekN, gecN, itemCount }
//   Hesap.toplamOzeti()               -> { paysBekleyen, krediBekleyen, toplam }
//   Hesap.krediler()                  -> [{ cred, dispName, paid, total, bekleyen, pct, nextPay, done }]
//   Hesap.trend(n)                    -> [{ lbl, tot, monthKey, count }]
//
// Display name yardimcilari (paylasilan):
//   Hesap._baseOf(name)               -> sondaki sayiyi soyer ("QNB 1" -> "QNB")
//   Hesap._displayNames(mx, keys?)    -> { rawKey: displayName } haritasi

function _all() {
  if (typeof window.getAllItems === 'function') return window.getAllItems();
  const credPays = [];
  (window.creds||[]).forEach(c => (c.pays||[]).forEach(p =>
    credPays.push({...p, name:c.name, currency:'TRY', _cid:c.id, _ii:p.idx})));
  return [...(window.pays||[]), ...credPays];
}

function _mx() {
  if (typeof window.buildMx === 'function') return window.buildMx(_all());
  return {};
}

function _baseOf(name) {
  const n = name || '';
  return n.replace(/ \d+$/, '').trim() || n;
}

// Disambiguated display name map.
// personId varsa: ayni personId'nin birden fazla rowKey'i → "name (desc|category)"
// personId yoksa (legacy): mevcut isim-suffix mantigi ("AHMET" / "AHMET 1")
// cred rowKey'leri (cred_*): mevcut suffix'in sonuna "(Kredi)" eklenir (v8.125)
// keys verilirse sadece bu rowKey'leri dikkate alir (plan matrisi filtreliyse).
function _displayNames(mx, keys) {
  const allKeys = (keys && keys.length)
    ? keys
    : Object.keys(mx).filter(k => mx[k]._name !== undefined);

  // Her rowKey icin meta: personId + ayirt edici tag (desc varsa veya category)
  const meta = {};
  allKeys.forEach(k => {
    const monthKeys = Object.keys(mx[k]).filter(x => !x.startsWith('_'));
    const item = monthKeys.length ? mx[k][monthKeys[0]].items[0] : null;
    meta[k] = {
      pid: item && item.personId ? item.personId : null,
      tag: item ? (item.desc || item.category || null) : null
    };
  });

  // personId'li keyleri grupla, geri kalan legacy yol
  const byPid = {};
  const noPid = [];
  allKeys.forEach(k => {
    const pid = meta[k].pid;
    if (pid) (byPid[pid] = byPid[pid] || []).push(k);
    else noPid.push(k);
  });

  const dnMap = {};

  // personId gruplari: tek satirsa ham name; coksa "name (tag)"
  Object.keys(byPid).forEach(pid => {
    const ks = byPid[pid];
    if (ks.length === 1) {
      dnMap[ks[0]] = _baseOf(mx[ks[0]]._name);
    } else {
      ks.forEach(k => {
        dnMap[k] = _baseOf(mx[k]._name) + ' (' + (meta[k].tag || '?') + ')';
      });
    }
  });

  // personId'siz keyler: legacy isim-suffix mantigi (geriye uyum)
  const countMap = {};
  noPid.forEach(k => { const b = _baseOf(mx[k]._name); countMap[b] = (countMap[b] || 0) + 1; });
  const sortedNoPid = [...noPid].sort((a, b) =>
    (mx[a]._name||'').localeCompare(mx[b]._name||'', 'tr'));
  const idxMap = {};
  sortedNoPid.forEach(k => {
    const b = _baseOf(mx[k]._name);
    if (countMap[b] > 1) {
      const idx = idxMap[b] = (idxMap[b] || 0) + 1;
      dnMap[k] = idx === 1 ? b : b + ' ' + (idx - 1);
    } else {
      dnMap[k] = b;
    }
  });

  // Cred rowKey'leri her zaman "(Kredi)" suffix tasir (v8.125) — append, mevcut suffix korunur
  allKeys.forEach(k => {
    if (k.startsWith('cred_')) {
      dnMap[k] = (dnMap[k] || _baseOf(mx[k]._name)) + ' (Kredi)';
    }
  });

  return dnMap;
}

export const Hesap = {
  // ── Bu ay ozeti ──────────────────────────────────────────────────────────
  // opts.all  — caller'in zaten hesapladigi all items (perf)
  // opts.refDate — varsayilan: new Date() (bugun)
  buAyOzeti(opts) {
    opts = opts || {};
    const all = opts.all || _all();
    const ref = opts.refDate || new Date();
    const rY = ref.getFullYear(), rM = ref.getMonth();
    const buAy = all.filter(p => {
      const d = window.parseLocalDate(p.date);
      return d.getFullYear() === rY && d.getMonth() === rM;
    });
    let tot = 0, ok = 0, bek = 0, gec = 0, okN = 0, bekN = 0, gecN = 0;
    buAy.forEach(p => {
      const t = window.toTRY(p.amount, p.currency || 'TRY');
      tot += t;
      const s = p.status || 'pending';
      if (s === 'paid')        { ok += t; okN++; }
      else if (window.isOD(p)) { gec += t; gecN++; }
      else                     { bek += t; bekN++; }
    });
    return { tot, ok, bek, gec, okN, bekN, gecN, itemCount: buAy.length };
  },

  // ── Tum bekleyen borc ────────────────────────────────────────────────────
  // pays.paid TRY cinsinden (markOk -> toTRY yapiyor); cred.pays.amount zaten TRY.
  toplamOzeti() {
    const paysBekleyen = (window.pays || [])
      .filter(p => (p.status || 'pending') !== 'paid')
      .reduce((s, p) =>
        s + Math.max(0, window.toTRY(p.amount, p.currency || 'TRY') - (p.paid || 0)), 0);
    const krediBekleyen = (window.creds || [])
      .reduce((s, c) => s + (c.pays || [])
        .filter(p => (p.status || 'pending') !== 'paid')
        .reduce((a, p) => a + Math.max(0, p.amount - (p.paid || 0)), 0), 0);
    return {
      paysBekleyen,
      krediBekleyen,
      toplam: paysBekleyen + krediBekleyen
    };
  },

  // ── Kredi kart paneli icin hazir liste ───────────────────────────────────
  // Display name plan matrisiyle ayni (suffix mantigi paylasilan).
  krediler() {
    const mx = _mx();
    const dnMap = _displayNames(mx);
    return (window.creds || []).map(cr => {
      const credKey = 'cred_' + cr.id;
      const dispName = dnMap[credKey] || _baseOf(cr.name);
      const items = cr.pays || [];
      const paid = items.filter(p => (p.status || 'pending') === 'paid').length;
      const total = items.length;
      const bekleyen = items
        .filter(p => (p.status || 'pending') !== 'paid')
        .reduce((s, p) => s + p.amount, 0);
      const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
      const nextPay = items.find(p => (p.status || 'pending') !== 'paid');
      const done = paid === total;
      return { cred: cr, dispName, paid, total, bekleyen, pct, nextPay, done };
    });
  },

  // ── Son N ay gerceklesen odeme trendi ────────────────────────────────────
  // Bugunden geriye dogru n ay (bugun dahil): trend(3) = [iki ay onceki, gecen ay, bu ay]
  trend(n) {
    n = n || 3;
    const now = new Date();
    const nowY = now.getFullYear(), nowM = now.getMonth();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const tM = new Date(nowY, nowM - i, 1);
      const tY = tM.getFullYear(), tMo = tM.getMonth();
      const mk = tY + '-' + String(tMo + 1).padStart(2, '0');
      const mPays = (window.paidItems || []).filter(p => {
        const d = window.parseLocalDate(p.date);
        return d.getFullYear() === tY && d.getMonth() === tMo;
      });
      const tot = mPays.reduce((s, p) =>
        s + (p.paid || window.toTRY(p.amount, p.currency || 'TRY')), 0);
      out.push({
        lbl: tM.toLocaleDateString('tr-TR', { month: 'short' }),
        tot,
        monthKey: mk,
        count: mPays.length
      });
    }
    return out;
  },

  // ── Paylasilan display name yardimcilari ──────────────────────────────────
  _baseOf,
  _displayNames
};

window.Hesap = Hesap;
console.log('[Hesap] hazir.');
