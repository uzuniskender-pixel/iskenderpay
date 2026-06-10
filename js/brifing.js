// js/brifing.js — iskenderpay
// "Bugün" sekmesi: Firestore meta/brifing'i (Action gunluk yazar) login sonrasi okur,
// render eder ve Kopyala ile panoya duz metin kopyalar. Dis metin window.esc ile escape'lenir.

let _brif = null; // son okunan brifing (kopyala icin)

function esc(s) { return (window.esc ? window.esc(String(s == null ? '' : s)) : String(s == null ? '' : s)); }

function durumRozet(durum) {
  const d = String(durum || '').toLowerCase();
  if (d === 'resmi')     return `<span class="brif-badge ok">RESMÎ</span>`;
  if (d === 'guvenilir') return `<span class="brif-badge mid">GÜVENİLİR</span>`;
  return `<span class="brif-badge">${esc(durum)}</span>`;
}

function bolum(baslik, icHTML) {
  return `<div class="brif-sec"><div class="brif-h">${esc(baslik)}</div>${icHTML}</div>`;
}

function render(b) {
  const body = document.getElementById('BRIF_BODY');
  if (!body) return;
  if (!b) {
    body.innerHTML = `<div class="brif-load">Henüz brifing yok. Her sabah 05:00'te otomatik üretilir.</div>`;
    return;
  }
  let h = '';

  // GS Transfer
  const t = b.gs_transfer || {};
  let tHTML = `<div class="brif-p">${esc(t.ozet || '—')}</div>`;
  if (Array.isArray(t.maddeler) && t.maddeler.length) {
    tHTML += '<ul class="brif-ul">' + t.maddeler.map(m =>
      `<li>${durumRozet(m.durum)} ${esc(m.baslik)}` +
      (m.kaynak ? ` <span class="brif-src">— ${esc(m.kaynak)}${m.kaynak_sayisi ? ' ('+esc(m.kaynak_sayisi)+')' : ''}</span>` : '') +
      `</li>`).join('') + '</ul>';
  }
  if (t.soylenti_notu) tHTML += `<div class="brif-note">${esc(t.soylenti_notu)}</div>`;
  h += bolum('⚽ Galatasaray Transfer', tHTML);

  // Fikstür
  const f = b.fikstur || {};
  let fHTML;
  if (f.var && Array.isArray(f.maclar) && f.maclar.length) {
    fHTML = '<ul class="brif-ul">' + f.maclar.map(m =>
      `<li>${esc(m.rakip)} <span class="brif-src">— ${esc(m.tarih)}${m.yer ? ' · '+esc(m.yer) : ''}${m.kupa ? ' · '+esc(m.kupa) : ''}</span></li>`
    ).join('') + '</ul>';
  } else {
    fHTML = `<div class="brif-p">${esc(f.not || 'Sıradaki maç henüz belli değil.')}</div>`;
  }
  h += bolum('📅 Sıradaki Maçlar', fHTML);

  // Motivasyon
  if (b.motivasyon) h += bolum('💪 Motivasyon', `<div class="brif-p">${esc(b.motivasyon)}</div>`);

  // Genel kültür
  const g = b.genel_kultur || {};
  if (g.metin) h += bolum('🧠 Genel Kültür' + (g.alan ? ' · ' + esc(g.alan) : ''),
    `<div class="brif-p">${esc(g.metin)}</div>` + (g.kaynak ? `<div class="brif-src">${esc(g.kaynak)}</div>` : ''));

  // Öğren
  const o = b.ogren || {};
  if (o.metin) h += bolum('📚 Bugün Öğren' + (o.konu ? ' · ' + esc(o.konu) : ''), `<div class="brif-p">${esc(o.metin)}</div>`);

  // Öneriler
  if (Array.isArray(b.oneriler) && b.oneriler.length) {
    h += bolum('💡 Öneriler', '<ul class="brif-ul">' + b.oneriler.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>');
  }

  body.innerHTML = h || `<div class="brif-load">Brifing boş.</div>`;

  const meta = document.getElementById('BRIF_META');
  if (meta) {
    let mt = b.tarih ? b.tarih : '';
    if (b.uretim) { try { mt += ' · ' + new Date(b.uretim).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}); } catch(e){} }
    meta.textContent = mt || 'Günlük brifing';
  }
}

// Düz metin (pano için)
function metinKur(b) {
  if (!b) return '';
  const L = [];
  L.push('📰 Bugün — ' + (b.tarih || ''));
  const t = b.gs_transfer || {};
  L.push('', '⚽ Galatasaray Transfer', t.ozet || '—');
  (t.maddeler || []).forEach(m => L.push(`- [${m.durum||''}] ${m.baslik||''}${m.kaynak ? ' ('+m.kaynak+')' : ''}`));
  if (t.soylenti_notu) L.push('· ' + t.soylenti_notu);
  const f = b.fikstur || {};
  L.push('', '📅 Sıradaki Maçlar');
  if (f.var && (f.maclar||[]).length) (f.maclar||[]).forEach(m => L.push(`- ${m.rakip||''} ${m.tarih||''}${m.yer ? ' · '+m.yer : ''}`));
  else L.push(f.not || 'Belli değil.');
  if (b.motivasyon) L.push('', '💪 Motivasyon', b.motivasyon);
  const g = b.genel_kultur || {};
  if (g.metin) L.push('', '🧠 Genel Kültür' + (g.alan ? ' ('+g.alan+')' : ''), g.metin);
  const o = b.ogren || {};
  if (o.metin) L.push('', '📚 Bugün Öğren' + (o.konu ? ' ('+o.konu+')' : ''), o.metin);
  if ((b.oneriler||[]).length) { L.push('', '💡 Öneriler'); b.oneriler.forEach(x => L.push('- ' + x)); }
  return L.join('\n');
}

async function renderBrifing() {
  const body = document.getElementById('BRIF_BODY');
  if (body && !_brif) body.innerHTML = `<div class="brif-load">Brifing yükleniyor…</div>`;
  try {
    _brif = (window._fbGetBrifing) ? await window._fbGetBrifing() : null;
  } catch (e) {
    if (body) body.innerHTML = `<div class="brif-load">Brifing okunamadı: ${esc(e.message)}</div>`;
    return;
  }
  render(_brif);
}

async function copyBrifing() {
  const txt = metinKur(_brif);
  if (!txt) { alert('Kopyalanacak brifing yok.'); return; }
  const btn = document.getElementById('BRIF_COPY');
  const ok = () => { if (btn) { const o = btn.textContent; btn.textContent = '✓ Kopyalandı'; setTimeout(() => btn.textContent = o, 1500); } };
  try {
    await navigator.clipboard.writeText(txt); ok();
  } catch (e) {
    // Fallback: gizli textarea + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); ok();
    } catch (e2) { alert('Kopyalanamadı.'); }
  }
}

window.renderBrifing = renderBrifing;
window.copyBrifing   = copyBrifing;
