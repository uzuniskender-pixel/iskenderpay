// js/ui-plan-actions.js — iskenderpay (v8.150)
// Hücre/satır CRUD + krediye dönüştürme + odendi-ay toggle.
// ui-plan.js'ten v8.150'de ayrıştırıldı. Cross-module çağrılar:
// window.getAllItems / window.buildMx (render.js), window.closeDV /
// window.openCell (detail.js).

// ── KREDİYE DÖNÜŞÜR ─────────────────────────
function convertToCredit(keyEnc) {
  const key=decodeURIComponent(keyEnc);
  const gid=key.startsWith('g_')?key.replace('g_',''):null;
  if(!gid){alert('Sadece normal odeme satirlari krediye donusturulebilir.');return;}
  // Gruptaki tum kayitlar tarihe gore sirali
  const srcPays=window.pays.filter(p=>p.groupId===gid).sort((a,b)=>a.date.localeCompare(b.date));
  if(!srcPays.length){alert('Kayit bulunamadi.');return;}
  const name=srcPays[0].name;
  const count=srcPays.length;
  const startDate=srcPays[0].date;
  const monthly=Math.round(srcPays[0].amount);
  // Odeme durumlarini sakla — saveCred sonrasi kredi taksitlerine islenecek
  window._convertSourceKey=key;
  window._convertSourcePays=srcPays.map(p=>({date:p.date,status:p.status||'pending',paid:p.paid||0,amount:p.amount}));
  // Modali doldur
  document.getElementById('CEID').value='';
  document.getElementById('CN').value=name;
  document.getElementById('CT').value='';
  document.getElementById('CI').value=count;
  document.getElementById('CM2').value=monthly;
  document.getElementById('CS').value=startDate;
  if(typeof window.updLP==='function') window.updLP();
  window.closeDV();
  setTimeout(()=>ModalManager.open('CM'),50);
}

// ── HÜCRE CRUD ──────────────────────────────
function addToMonth(keyEnc,month) {
  const amt=parseFloat(document.getElementById('ECA').value)||0;
  const cur=document.getElementById('ECC').value;
  const date=document.getElementById('ECD').value;
  if(!amt||!date){alert('Tutar ve tarih zorunlu');return;}
  const key=decodeURIComponent(keyEnc);
  const all=window.getAllItems(),mx=window.buildMx(all);
  const name=mx[key]?._name||key.replace(/^(g_|pay_)/,'');
  const groupId=key.startsWith('g_')?key.replace('g_',''):null;
  const refItem=groupId?window.findPaysByGroup(groupId)[0]:window.pays.find(p=>p.name===name);
  const newGroupId=groupId||String(Date.now());
  window.Store.push('pays', {id:Date.now()+Math.random(), groupId:newGroupId, name, amount:amt, currency:cur, date, category:refItem?refItem.category||'Diğer':'Diğer', status:'pending', paid:0});
  window.addLog('plan_add', 'Kayıt eklendi', name+' · '+window.fmtAmt(amt,cur), 0, {groupId: newGroupId, personId: refItem && refItem.personId});
  window.closeDV();
}

function markOk(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=window.getAllItems(),mx=window.buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='paid';i.paid=i.amount;}}}
    else{const orig=window.findPayById(p.id);if(orig){orig.status='paid';orig.paid=window.toTRY(orig.amount,orig.currency||'TRY');}}
    window.Store.push('paidItems', {...p, paidId:'pi_'+Date.now()+'_'+Math.random(), status:'paid', paid:window.toTRY(p.amount,p.currency||'TRY'), paidAt:new Date().toISOString()});
    try{window.addLog('paid','Ödeme yapıldı',(p.name||'')+' · ₺'+Number(window.toTRY(p.amount,p.currency||'TRY')).toLocaleString('tr-TR',{maximumFractionDigits:0}),1,{groupId:p.groupId, personId:p.personId});}catch(e){}
  });
  window.Store.touch(); window.closeDV();
}

function undoCell(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=window.getAllItems(),mx=window.buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='pending';i.paid=0;}}}
    else{const orig=window.findPayById(p.id);if(orig){orig.status='pending';orig.paid=0;}}
    const pidx=window.paidItems.findIndex(x=>String(x.id)===String(p.id)&&x.date===p.date);
    if(pidx>=0) window.Store.spliceAt('paidItems', pidx, 1);
    try{window.addLog('plan_undo','Ödeme geri alındı',(p.name||'')+' · ₺'+Number(window.toTRY(p.amount,p.currency||'TRY')).toLocaleString('tr-TR',{maximumFractionDigits:0}),1,{groupId:p.groupId, personId:p.personId});}catch(e){}
  });
  window.Store.touch(); window.closeDV();
}

function doPartial() {
  const amt=parseFloat(document.getElementById('KA').value)||0;
  if(!amt){alert('Tutar girin');return;}
  const key=decodeURIComponent(window.partialCtx.keyEnc), month=window.partialCtx.month;
  const all=window.getAllItems(),mx=window.buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.paid=(i.paid||0)+amt;i.status=i.paid>=i.amount?'paid':'partial';}}}
    else{const orig=window.findPayById(p.id);if(orig){orig.paid=(orig.paid||0)+amt;orig.status=orig.paid>=window.toTRY(orig.amount,orig.currency||'TRY')?'paid':'partial';}}
    const existing=window.paidItems.find(x=>String(x.id)===String(p.id)&&x.date===p.date);
    if(existing){existing.paid=(existing.paid||0)+amt;existing.status=existing.paid>=window.toTRY(p.amount,p.currency||'TRY')?'paid':'partial';}
    else{window.Store.push('paidItems', {...p, paidId:'pi_'+Date.now()+'_'+Math.random(), status:'partial', paid:amt, paidAt:new Date().toISOString()});}
  });
  window.Store.touch(); window.closeMov('KM');
}

function saveCellAmt(keyEnc,month) {
  const v=parseFloat(document.getElementById('CEA').value)||0;
  if(!v){alert('Geçerli tutar girin');return;}
  const key=decodeURIComponent(keyEnc);
  const all=window.getAllItems(),mx=window.buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i)i.amount=v;}}
    else{const orig=window.findPayById(p.id);if(orig)orig.amount=v;}
  });
  window.Store.touch(); window.openCell(keyEnc, month);
}

function resetPartial(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=window.getAllItems(),mx=window.buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='pending';i.paid=0;}}}
    else{const orig=window.findPayById(p.id);if(orig){orig.status='pending';orig.paid=0;}}
    const pidx=window.paidItems.findIndex(x=>String(x.id)===String(p.id)&&x.date===p.date);
    if(pidx>=0) window.Store.spliceAt('paidItems', pidx, 1);
  });
  window.Store.touch(); window.closeDV();
}

// ── SATIR / AY CRUD ─────────────────────────
function editByKey(keyEnc) {
  const key=decodeURIComponent(keyEnc);
  window.closeDV();
  if(key.startsWith('cred_')){
    const credId=key.replace('cred_','');
    const c=window.findCredById(credId);
    if(c) setTimeout(()=>window.editCred(c.id),50);
    else alert('Düzenlenecek kayıt bulunamadı.');
  } else if(key.startsWith('g_')){
    const gid=key.replace('g_','');
    const p=window.findPaysByGroup(gid)[0];
    if(p) setTimeout(()=>window.editPay(p.id),50);
    else alert('Düzenlenecek kayıt bulunamadı.');
  } else {
    const pid=key.replace('pay_','');
    const p=window.pays.find(x=>String(Math.floor(Number(x.id)))===pid);
    if(p) setTimeout(()=>window.editPay(p.id),50);
    else alert('Düzenlenecek kayıt bulunamadı.');
  }
}

function delByKey(keyEnc) {
  const key=decodeURIComponent(keyEnc);
  const all=window.getAllItems(),mx=window.buildMx(all);
  const dispName=mx[key]?._displayName||mx[key]?._name||key;
  if(!confirm(dispName+' — tüm aylar silinecek. Emin misin?'))return;
  if(key.startsWith('cred_')){
    const credId=key.replace('cred_','');
    const c=window.findCredById(credId);
    if(c){c.pays.forEach(p=>window.Store.unshift('hist',{...p,name:c.name,currency:'TRY',delAt:new Date().toISOString()}));try{window.addLog('plan_del','Kredi silindi',c.name+' · '+c.pays.length+' taksit',0);}catch(e){}}
    window.Store.removeWhere('creds', x => String(x.id)===credId);
  } else if(key.startsWith('g_')){
    const gid=key.replace('g_','');
    const toDelete=window.pays.filter(p=>p.groupId===gid);
    toDelete.forEach(p=>window.Store.unshift('hist',{...p,delAt:new Date().toISOString()}));
    try{window.addLog('plan_del','Kayıt silindi',dispName+' · '+toDelete.length+' ödeme',0,{groupId:gid, personId:toDelete[0]&&toDelete[0].personId});}catch(e){}
    window.Store.removeWhere('pays', p => p.groupId===gid);
  } else {
    const pid=key.replace('pay_','');
    const toDelete=window.pays.filter(p=>String(Math.floor(Number(p.id)))===pid);
    toDelete.forEach(p=>window.Store.unshift('hist',{...p,delAt:new Date().toISOString()}));
    try{if(toDelete.length)window.addLog('plan_del','Kayıt silindi',toDelete[0].name+' · '+window.fmtAmt(toDelete[0].amount,toDelete[0].currency||'TRY'),0,{groupId:toDelete[0].groupId, personId:toDelete[0].personId});}catch(e){}
    window.Store.removeWhere('pays', p => String(Math.floor(Number(p.id)))===pid);
  }
  window.closeDV();
}

function delMonthEntry(idEnc) {
  const id=decodeURIComponent(idEnc);
  if(!confirm('Bu aya ait kayıt silinecek. Diğer aylar etkilenmez. Emin misin?'))return;
  const p=window.findPayById(id);
  if(p){try{window.addLog('plan_del','Kayıt silindi',p.name+' · '+window.fmtAmt(p.amount,p.currency||'TRY'),0,{groupId:p.groupId, personId:p.personId});}catch(e){};window.Store.unshift('hist',{...p,delAt:new Date().toISOString()});window.Store.removeWhere('pays', x => String(x.id)===id);}
  window.closeDV();
}

function delCellItems(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  if(!confirm('Bu aydaki kayıtlar silinecek. Emin misin?'))return;
  const all=window.getAllItems(),mx=window.buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid) return;
    window.Store.unshift('hist',{...p,delAt:new Date().toISOString()});
    window.Store.removeWhere('pays', x => String(x.id)===String(p.id));
  });
  window.closeDV();
}

// ── ÖDENDİ AY TOGGLE ─────────────────────────
function togglePaidMonths() {
  const current = localStorage.getItem('v8-show-paid') === '1';
  localStorage.setItem('v8-show-paid', current ? '0' : '1');
  window.render();
}

// ── GLOBAL COMPAT ──────────────────────────
window.convertToCredit  = convertToCredit;
window.addToMonth       = addToMonth;
window.markOk           = markOk;
window.undoCell         = undoCell;
window.doPartial        = doPartial;
window.saveCellAmt      = saveCellAmt;
window.resetPartial     = resetPartial;
window.editByKey        = editByKey;
window.delByKey         = delByKey;
window.delMonthEntry    = delMonthEntry;
window.delCellItems     = delCellItems;
window.togglePaidMonths = togglePaidMonths;
