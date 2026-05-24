// js/ui-pay.js — iskenderpay
// Ödeme ve kredi CRUD

function openPay() {
  document.getElementById('EID').value='';
  document.getElementById('PMT').innerHTML='Yeni Ödeme <span>Ekle</span>';
  const _nd=new Date();document.getElementById('PD').value=toLocalISO(_nd.getFullYear(),_nd.getMonth(),_nd.getDate());
  ['PN','PA'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('PC').value='TRY';
  document.getElementById('COPYMO').value=0;
  updateDatalist();
  ModalManager.open('PM2');
}

function editPay(id) {
  const p=findPayById(id);if(!p)return;
  document.getElementById('EID').value=id;
  document.getElementById('PMT').innerHTML='Ödeme <span>Düzenle</span>';
  document.getElementById('PN').value=p.name;
  document.getElementById('PA').value=p.amount;
  document.getElementById('PC').value=p.currency||'TRY';
  document.getElementById('PD').value=p.date;
  document.getElementById('PK').value=p.category||'Diğer';
  document.getElementById('COPYMO').value=0;
  ModalManager.open('PM2');
}

function savePay() {
  const name=document.getElementById('PN').value.trim();
  const amount=parseFloat(document.getElementById('PA').value);
  const currency=document.getElementById('PC').value;
  const date=document.getElementById('PD').value;
  const category=document.getElementById('PK').value;
  const copyMonths=parseInt(document.getElementById('COPYMO').value)||0;
  if(!name||!amount||!date){alert('Ad, tutar ve tarih zorunlu');return;}
  const eid=document.getElementById('EID').value;
  if(eid){
    const p=findPayById(eid);
    if(p) Object.assign(p,{name,amount,currency,date,category});
  } else {
    const groupId=String(Date.now());
    const[py,pm,pd]=date.split('-').map(Number);
    for(let i=0;i<=copyMonths;i++){
      const totalMo=(pm-1)+i;
      const yr=py+Math.floor(totalMo/12),mo=totalMo%12;
      const lastDay=new Date(yr,mo+1,0).getDate();
      window.pays.push({id:Date.now()+Math.random(),groupId,name,amount,currency,date:toLocalISO(yr,mo,Math.min(pd,lastDay)),category,status:'pending',paid:0});
    }
  }
  // Fonksiyonun başında okunan değişkenler kullanılır — DOM tekrar okunmaz
  if(eid){ addLog('plan_edit','Kayıt düzenlendi', name+' · '+fmtAmt(amount,currency), 0); }
  else   { addLog('plan_add', 'Kayıt eklendi',    name+' · '+fmtAmt(amount,currency), 0); }
  saveSecure(); closeMov('PM2'); render();
}

function openCred() {
  document.getElementById('CEID').value='';
  ['CN','CT','CI','CM2'].forEach(id=>document.getElementById(id).value='');
  const _cd=new Date();document.getElementById('CS').value=toLocalISO(_cd.getFullYear(),_cd.getMonth(),_cd.getDate());
  document.getElementById('LP').classList.remove('show');
  ModalManager.open('CM');
}

function editCred(id) {
  const c=findCredById(id);if(!c)return;
  document.getElementById('CEID').value=id;
  document.getElementById('CN').value=c.name;
  document.getElementById('CT').value=c.total;
  document.getElementById('CI').value=c.inst;
  document.getElementById('CM2').value=c.monthly;
  document.getElementById('CS').value=c.start;
  ModalManager.open('CM');
}

function saveCred() {
  const name=document.getElementById('CN').value.trim();
  const total=parseFloat(document.getElementById('CT').value)||0;
  const inst=parseInt(document.getElementById('CI').value)||0;
  let monthly=parseFloat(document.getElementById('CM2').value)||0;
  const start=document.getElementById('CS').value;
  if(!name||!inst||!start){alert('Ad, taksit sayısı ve tarih zorunlu');return;}
  if(!monthly&&total) monthly=Math.round(total/inst);
  if(!monthly){alert('Aylık taksit tutarını girin');return;}
  const[startYr,startMo0,startDay]=start.split('-').map(Number);
  const startMo=startMo0-1;
  const pArr=Array.from({length:inst},(_,i)=>{const totalMo=startMo+i;const yr=startYr+Math.floor(totalMo/12),mo=totalMo%12;const lastDay=new Date(yr,mo+1,0).getDate();return{idx:i+1,date:toLocalISO(yr,mo,Math.min(startDay,lastDay)),amount:monthly,status:'pending',paid:0};});
  const eid=document.getElementById('CEID').value;
  if(eid){const c=findCredById(eid);if(c){c.name=name;c.total=total||monthly*inst;c.monthly=monthly;c.inst=inst;c.start=start;c.pays=pArr;} addLog('plan_edit','Kredi düzenlendi',name+' · '+inst+' taksit · '+fmtAmt(monthly,'TRY'),0);}
  else{window.creds.push({id:'c'+Date.now(),name,total:total||monthly*inst,monthly,inst,start,pays:pArr}); addLog('cred_add','Kredi eklendi',name+' · '+inst+' taksit · '+fmtAmt(monthly,'TRY'),0);}
  save().then(()=>{closeMov('CM');render();});
}

function updLP() {
  const t=parseFloat(document.getElementById('CT').value)||0;
  const i=parseInt(document.getElementById('CI').value)||0;
  const m=parseFloat(document.getElementById('CM2').value)||(t&&i?Math.round(t/i):0);
  const s=document.getElementById('CS').value;
  const lp=document.getElementById('LP');
  if((t||m)&&i&&s){
    lp.classList.add('show');
    const[sy,sm0]=s.split('-').map(Number);const totalEndMo=(sm0-1)+(i-1);const endYr=sy+Math.floor(totalEndMo/12),endMo=totalEndMo%12;
    document.getElementById('LPT').textContent=fmt(t||m*i);
    document.getElementById('LPM').textContent=fmt(m);
    document.getElementById('LPC').textContent=i+' taksit';
    document.getElementById('LPE').textContent=new Date(endYr,endMo,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
  } else lp.classList.remove('show');
}


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.openPay            = openPay;
window.editPay            = editPay;
window.savePay            = savePay;
window.openCred           = openCred;
window.editCred           = editCred;
window.saveCred           = saveCred;
window.updLP              = updLP;
