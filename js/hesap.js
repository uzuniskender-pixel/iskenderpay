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

// Disambiguated display name map: ayni "base name" birden fazla ise suffix ekler.
// keys verilirse sadece bu rowKey'leri dikkate alir (plan matrisi filtreliyse).
function _displayNames(mx, keys) {
  const allKeys = (keys && keys.length)
    ? keys
    : Object.keys(mx).filter(k => mx[k]._name !== undefined);
  // ad bazli sayim
  const countMap = {};
  allKeys.forEach(k => {
    const b = _baseOf(mx[k]._name);
    countMap[b] = (countMap[b] || 0) + 1;
  });
  // suffix atamasi: ad alfabetik sirayla ilerle ("DENİZBANK", "DENİZBANK 1", ...)
  const sortedKeys = [...allKeys].sort((a, b) =>
    (mx[a]._name||'').localeCompare(mx[b]._name||'', 'tr'));
  const idxMap = {}, dnMap = {};
  sortedKeys.forEach(k => {
    const b = _baseOf(mx[k]._name);
    if (countMap[b] > 1) {
      const idx = idxMap[b] = (idxMap[b] || 0) + 1;
      dnMap[k] = idx === 1 ? b : b + ' ' + (idx - 1);
    } else {
      dnMap[k] = b;
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
