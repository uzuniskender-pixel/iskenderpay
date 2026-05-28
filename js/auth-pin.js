// js/auth-pin.js — iskenderpay (v1.0)
// PIN dogrulama (doLogin) + sifre degistir (chPass) akislari.
// db.js'ten ayristirildi (v8.110) — auth concern'leri tek dosyada.
// Bagimliliklar: crypto.js, compat.js, db.js (loadSecure + Firestore PIN/wrappedKey helpers).

// ── doLogin ───────────────────────────────────────────────────────────────────

async function doLogin() {
  const val = document.getElementById('PI').value;
  if (!val) return;

  if (window._cryptoKey && window._plainPin && window._plainPin === val) {
    try { await window.loadSecure(); window.enterApp && window.enterApp(); return; } catch(e) {}
  }

  const pinSalt = await window.getSaltAsync('v5-pin-salt');

  let storedHash = null;
  if (window._fbLoadPinHash) {
    try { storedHash = await window._fbLoadPinHash(); } catch(e) {}
  }

  if (!storedHash) {
    if (val.length < 4) { window.showPinErr && window.showPinErr('En az 4 karakter girmelisiniz!'); return; }
    const hash = await window.hashPin(val, pinSalt);
    if (window._fbSavePinHash) { try { await window._fbSavePinHash(hash); } catch(e) {} }
    const dataKeyRaw = crypto.getRandomValues(new Uint8Array(32));
    const wrappedB64 = await window.wrapDataKey(dataKeyRaw, val, pinSalt);
    window._saveWrappedKeyLocal(wrappedB64);
    await window._saveWrappedKeyFirebase(wrappedB64);
    window._dataKeyRaw = dataKeyRaw;
    window._plainPin   = val;
    window._cryptoKey  = await window.importDataKey(dataKeyRaw);
    await window.loadSecure();
    window.enterApp && window.enterApp();
    return;
  }

  const hash = await window.hashPin(val, pinSalt);
  if (hash !== storedHash) {
    const inp = document.getElementById('PI');
    inp.classList.add('err');
    document.getElementById('PE').textContent = 'Hatalı şifre!';
    setTimeout(() => { inp.classList.remove('err'); document.getElementById('PE').textContent=''; inp.value=''; }, 1400);
    return;
  }

  let wrappedB64 = await window._loadWrappedKeyFirebase() || window._getWrappedKey();
  if (!wrappedB64) { window.showPinErr && window.showPinErr('Şifreleme anahtarı bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.'); return; }

  let unwrapped;
  try { unwrapped = await window.unwrapDataKey(wrappedB64, val, pinSalt); }
  catch(e) { window.showPinErr && window.showPinErr('Veri çözülemedi — şifre eşleşmiyor.'); return; }

  window._dataKeyRaw = unwrapped.rawBytes;
  window._plainPin   = val;
  window._cryptoKey  = unwrapped.cryptoKey;
  window._saveWrappedKeyLocal(wrappedB64);

  try {
    await window.loadSecure();
  } catch(e) {
    const otherPlan = window._planId === 'plan1' ? 'plan2' : 'plan1';
    const origPlan  = window._planId;
    window._planId  = otherPlan;
    try {
      await window.loadSecure();
      localStorage.setItem('v6-active-plan', otherPlan);
    } catch(e2) {
      window._planId = origPlan;
      window.showPinErr && window.showPinErr('Veri çözülemedi. Lütfen tekrar deneyin.'); return;
    }
  }
  window.enterApp && window.enterApp();
}

// ── ŞİFRE DEĞİŞTİR ────────────────────────────────────────────────────────────

async function chPass() {
  const cur = document.getElementById('CP').value;
  const nw  = document.getElementById('NP').value;
  const nw2 = document.getElementById('NP2').value;
  const msg = document.getElementById('PM');

  const pinSalt = await window.getSaltAsync('v5-pin-salt');

  let storedHash = null;
  if (window._fbLoadPinHash) {
    try { storedHash = await window._fbLoadPinHash(); } catch(e) {}
  }

  const curHash = await window.hashPin(cur, pinSalt);
  if (curHash !== storedHash) { msg.style.color='var(--danger)'; msg.textContent='❌ Mevcut şifre yanlış'; return; }
  if (!nw || nw.length < 4)  { msg.style.color='var(--danger)'; msg.textContent='❌ En az 4 karakter'; return; }
  if (nw !== nw2)             { msg.style.color='var(--danger)'; msg.textContent='❌ Şifreler eşleşmiyor'; return; }

  const newHash = await window.hashPin(nw, pinSalt);
  if (window._fbSavePinHash) {
    try { await window._fbSavePinHash(newHash); } catch(e) {}
  }

  const newWrappedB64 = await window.wrapDataKey(window._dataKeyRaw, nw, pinSalt);
  window._saveWrappedKeyLocal(newWrappedB64);
  await window._saveWrappedKeyFirebase(newWrappedB64);
  window._plainPin = nw;

  msg.style.color='var(--ok)'; msg.textContent='✅ Şifre güncellendi!';
  ['CP','NP','NP2'].forEach(id => document.getElementById(id).value='');
  setTimeout(() => msg.textContent='', 3000);
}

// ── Global compat ─────────────────────────────────────────────────────────────
window.doLogin = doLogin;
window.chPass  = chPass;
