// js/hesap.js — iskenderpay
// Merkezi hesaplama modülü.
// Tüm istatistik hesapları buradan yapılır.
// Veri YAZMAZ — sadece okur. window.pays / window.creds değişmez.

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function _buAyItems() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  // getAllItems() pays + kredi taksitlerini birlikte verir
  return (window.getAllItems ? window.getAllItems() : window.pays || []).filter(p => {
    const d = window.parseLocalDate(p.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}

// ─── buAyOzeti ───────────────────────────────────────────────────────────────
// Bu ayın tüm kalemlerini (pays + kredi taksitleri) özetler.
// Plan ve Ayarlar sayfaları bu fonksiyonu çağırır.

function buAyOzeti() {
  const items = _buAyItems();
  let tot = 0, ok = 0, bek = 0, gec = 0;
  let okN = 0, bekN = 0, gecN = 0;
  items.forEach(p => {
    const t = window.toTRY(p.amount, p.currency || 'TRY');
    const s = p.status || 'pending';
    tot += t;
    if (s === 'paid') { ok += t; okN++; }
    else if (window.isOD(p)) { gec += t; gecN++; }
    else { bek += t; bekN++; }
  });
  return { tot, ok, bek, gec, okN, bekN, gecN, itemCount: items.length };
}

// ─── toplamOzeti ─────────────────────────────────────────────────────────────
// Tüm ödenmemiş (pays + krediler) toplamı.
// partial ödemelerde sadece kalan miktar sayılır.

function toplamOzeti() {
  // pays kalan (partial'da paid düşülür)
  const paysBekleyen = (window.pays || [])
    .filter(p => (p.status || 'pending') !== 'paid')
    .reduce((s, p) => s + Math.max(0, window.toTRY(p.amount, p.currency || 'TRY') - (p.paid || 0)), 0);

  // krediler kalan
  const krediBekleyen = (window.creds || [])
    .reduce((s, c) => s + (c.pays || [])
      .filter(p => (p.status || 'pending') !== 'paid')
      .reduce((a, p) => a + Math.max(0, p.amount - (p.paid || 0)), 0), 0);

  return { paysBekleyen, krediBekleyen, toplam: paysBekleyen + krediBekleyen };
}

// ─── trendOzeti ──────────────────────────────────────────────────────────────
// Son N ayın gerçekleşen ödeme toplamları.

function trendOzeti(aySayisi) {
  aySayisi = aySayisi || 3;
  const now = new Date();
  const result = [];
  for (let i = aySayisi - 1; i >= 0; i--) {
    const t = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const tY = t.getFullYear(), tM = t.getMonth();
    const mPays = (window.paidItems || []).filter(p => {
      const d = window.parseLocalDate(p.date);
      return d.getFullYear() === tY && d.getMonth() === tM;
    });
    const tot = mPays.reduce((s, p) => s + (p.paid || window.toTRY(p.amount, p.currency || 'TRY')), 0);
    result.push({ lbl: t.toLocaleDateString('tr-TR', { month: 'short' }), tot });
  }
  return result;
}

// ─── gecikmisSayisi ──────────────────────────────────────────────────────────
// Tüm gecikmiş ödeme sayısı (badge için).

function gecikmisSayisi() {
  return (window.getAllItems ? window.getAllItems() : window.pays || [])
    .filter(p => (p.status || 'pending') !== 'paid' && !p._cid && window.isOD(p))
    .length;
}

// ─── GLOBAL COMPAT ───────────────────────────────────────────────────────────
window.buAyOzeti      = buAyOzeti;
window.toplamOzeti    = toplamOzeti;
window.trendOzeti     = trendOzeti;
window.gecikmisSayisi = gecikmisSayisi;
