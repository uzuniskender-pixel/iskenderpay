// js/altin-onizleme.js — iskenderpay
// PIN ekranında (GİRİŞ YAPMADAN) güncel gram altın + güncelleme saatini gösterir.
// GÜVENLİK: yalnız PUBLIC piyasa verisi okunur/çekilir. Kullanıcıya ait şifreli veri
//   (gram miktarı, bakiye, plan içeriği) BURADA OKUNMAZ/GÖSTERİLMEZ — Store/Session/
//   loadSecure çağrılmaz, çözme yapılmaz. Kur formülü/endpoint TEK KAYNAK: rates-core.js.
import { gramGoldTRY, fxFromExchangeApi, RATE_API, rateAgeLabel } from './rates-core.js';

const EL_ID = 'GOLD_PRE';
let _lastNet = 0; // son ağ çekimi (throttle)

// localStorage'daki tüm kur önbelleklerinden (v5-rates, v5-rates-plan1/2 ...) EN TAZE
// olanı seç. Plan bağımsız: altın fiyatı public, plana göre değişmez.
function readCachedRates() {
  let best = null, bestT = -1;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf('v5-rates') !== 0) continue;
      let r; try { r = JSON.parse(localStorage.getItem(k)); } catch (e) { continue; }
      if (!r || !r.GOLD) continue;
      const t = r._fetchedAt ? new Date(r._fetchedAt).getTime() : 0;
      if (t > bestT) { best = r; bestT = t; }
    }
  } catch (e) { /* localStorage erişilemezse sessiz geç */ }
  return best;
}

function paint(gold, fetchedAtISO) {
  const el = document.getElementById(EL_ID);
  if (!el) return;
  if (gold == null) { el.innerHTML = `<span class="gp-load">Gram altın alınamadı</span>`; return; }
  const lbl = rateAgeLabel(fetchedAtISO);
  const tCls = lbl.stale ? 'gp-time stale' : 'gp-time';
  const tTxt = lbl.unknown ? '⚠ önbellek' : (lbl.stale ? '⚠ ' + lbl.text : lbl.text);
  const tTitle = lbl.unknown ? 'Güncelleme zamanı bilinmiyor (önbellek)'
                : (lbl.stale ? lbl.timeStr + ' — güncel olmayabilir' : 'Son güncelleme ' + lbl.timeStr);
  el.innerHTML =
    `<span class="gp-ico">🟡</span>` +
    `<span class="gp-lbl">Gram Altın</span>` +
    `<span class="gp-val">₺${Math.round(gold).toLocaleString('tr-TR')}</span>` +
    `<span class="${tCls}" title="${tTitle}">${tTxt}</span>` +
    `<span class="gp-rf" title="Yenile">🔄</span>`;
}

// Public API'lerden taze gram altın çek (auth/Store gerekmez), önbelleği güncelle.
async function refresh(force = false) {
  const cached = readCachedRates();
  if (cached && cached.GOLD) paint(cached.GOLD, cached._fetchedAt); // önce cache → saat etiketi tazelenir
  // Throttle: 60 sn içinde çektiysek ve elde değer varsa ağa tekrar gitme.
  if (!force && cached && cached.GOLD && (Date.now() - _lastNet) < 60000) return;
  _lastNet = Date.now();

  let usdTry = cached ? cached.USD : null;
  let xau = null;
  try {
    const r = await fetch(RATE_API.fx);
    if (r.ok) { const fx = fxFromExchangeApi(await r.json()); if (fx.USD) usdTry = fx.USD; }
  } catch (e) { /* offline/erişim hatası: cache ile devam */ }
  try {
    const r2 = await fetch(RATE_API.gold);
    if (r2.ok) { const d = await r2.json(); xau = d && d.price; }
  } catch (e) { /* offline/erişim hatası */ }

  const gold = gramGoldTRY(xau, usdTry);
  if (gold != null) {
    const nowISO = new Date().toISOString();
    paint(gold, nowISO);
    // Önbelleğe yaz: app'e girince kur barı aynı taze değeri görsün (legacy anahtar;
    // fetchRates v5-rates-<plan> || v5-rates okur). EUR varsa korunur, dokunulmaz.
    try {
      const prev = cached || {};
      const merged = Object.assign({}, prev, { USD: usdTry || prev.USD, GOLD: gold, _fetchedAt: nowISO });
      localStorage.setItem('v5-rates', JSON.stringify(merged));
    } catch (e) { /* yazılamazsa sorun değil, ekranda değer var */ }
  } else if (!cached || !cached.GOLD) {
    paint(null, null); // ne cache ne taze değer → "alınamadı"
  }
}

window.refreshGoldPreview = refresh;

// Boot: DOM hazır olunca bir kez çek+göster. #GOLD_PRE #PS içinde olduğundan PIN ekranı
// görünür olduğunda içerik zaten yerindedir. Pre-auth çalışır (auth beklemez).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => refresh(true));
} else {
  refresh(true);
}

// Pill'e tık → yenile (rf simgesi dahil tüm alan tıklanabilir).
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t && t.closest && t.closest('#' + EL_ID)) refresh(true);
});
