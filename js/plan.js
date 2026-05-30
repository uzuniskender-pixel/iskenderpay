// js/plan.js — iskenderpay
// Plan adı, plan seçimi, plan geçişi

function getPlanName(planId) {
  return localStorage.getItem('v6-name-' + planId) || (planId === 'plan1' ? 'Plan 1' : 'Plan 2');
}

function editPlanName(planId) {
  const elId = planId === 'plan1' ? 'PLS_NAME1' : 'PLS_NAME2';
  const el = document.getElementById(elId);
  if (!el || el.querySelector('input')) return;
  const current = el.textContent;
  el.innerHTML = '';
  const inp = document.createElement('input');
  inp.value = current;
  inp.style.cssText = 'background:rgba(255,255,255,.1);border:1px solid var(--acc);border-radius:6px;color:var(--txt);font-size:14px;font-weight:600;padding:2px 8px;width:140px;outline:none';
  el.appendChild(inp);
  inp.focus(); inp.select();
  function save() {
    const val = inp.value.trim();
    if (val) localStorage.setItem('v6-name-' + planId, val);
    renderPlanNames();
  }
  inp.addEventListener('blur', save);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { inp.blur(); }
    if (e.key === 'Escape') { inp.value = current; inp.blur(); }
  });
}

function renderPlanNames() {
  const n1 = getPlanName('plan1');
  const n2 = getPlanName('plan2');
  const el1 = document.getElementById('PLS_NAME1');
  const el2 = document.getElementById('PLS_NAME2');
  if (el1) el1.textContent = n1;
  if (el2) el2.textContent = n2;
}

function selectPlan(planId) {
  window.Store.planId = planId;
  // Veri dizilerini sıfırla — oturum anahtarı (Session) KORUNUR; Store.clearAll
  // yalnız veri dizilerini sıfırlar, oturum sırları js/session.js closure'ındadır.
  if (window.Store) {
    window.Store.clearAll();
  } else {
    window.pays=[]; window.creds=[]; window.hist=[]; window.persons=[];
    window.notes=[]; window.paidItems=[]; window.rehber=[]; window.actLog=[];
  }
  document.getElementById('PLS').style.display = 'none';
  const psEl = document.getElementById('PS');
  psEl.style.display = '';
  psEl.classList.add('active');
  const planName = getPlanName(planId);
  const subEl = document.querySelector('.pin-sub');
  if (subEl) subEl.textContent = planName + ' şifresini girin';
  const pi = document.getElementById('PI');
  if (pi) pi.value = '';
}

function switchPlan() {
  if (!confirm('Plan değiştirilecek. Mevcut plan kaydedildi.')) return;
  document.getElementById('APP').style.display = 'none';
  document.getElementById('PLS').style.display = 'flex';
}


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.getPlanName        = getPlanName;
window.editPlanName       = editPlanName;
window.renderPlanNames    = renderPlanNames;
window.selectPlan         = selectPlan;
window.switchPlan         = switchPlan;
