// js/ui-pay.js — iskenderpay
// Ödeme ve kredi CRUD

function openPay() {
  document.getElementById('EID').value='';
  document.getElementById('PMT').innerHTML='Yeni Ödeme <span>Ekle</span>';
  const _nd=new Date();document.getElementById('PD').value=window.toLocalISO(_nd.getFullYear(),_nd.getMonth(),_nd.getDate());
  ['PN','PA'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('PC').value='TRY';
  document.getElementById('COPYMO').value=0;
  window.updateDatalist();
  ModalManager.open('PM2');
}

function editPay(id) {
  const p=window.findPayById(id);if(!p)return;
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
    const p=window.findPayById(eid);
    if(p){
      const oldName=p.name, oldCat=p.category;
      Object.assign(p,{name,amount,currency,date,category});
      // İsim veya kategori değiştiyse aynı gruptaki tüm kayıtları güncelle
      if(oldName!==name || oldCat!==category){
        window.pays.filter(x=>x.groupId===p.groupId && String(x.id)!==String(p.id))
          .forEach(x=>{x.name=name;x.category=category;});
      }
    }
  } else {
    const groupId=String(Date.now());
    const[py,pm,pd]=date.split('-').map(Number);
    for(let i=0;i<=copyMonths;i++){
      const totalMo=(pm-1)+i;
      const yr=py+Math.floor(totalMo/12),mo=totalMo%12;
      const lastDay=new Date(yr,mo+1,0).getDate();
      window.pays.push({id:Date.now()+Math.random(),groupId,name,amount,currency,date:window.toLocalISO(yr,mo,Math.min(pd,lastDay)),category,status:'pending',paid:0});
    }
  }
  // Fonksiyonun başında okunan değişkenler kullanılır — DOM tekrar okunmaz
  if(eid){ window.addLog('plan_edit','Kayıt düzenlendi', name+' · '+window.fmtAmt(amount,currency), 0); }
  else   { window.addLog('plan_add', 'Kayıt eklendi',    name+' · '+window.fmtAmt(amount,currency), 0); }
  window.saveSecure(); window.closeMov('PM2'); window.render();
}

function openCred() {
  document.getElementById('CEID').value='';
  ['CN','CT','CI','CM2'].forEach(id=>document.getElementById(id).value='');
  const _cd=new Date();document.getElementById('CS').value=window.toLocalISO(_cd.getFullYear(),_cd.getMonth(),_cd.getDate());
  document.getElementById('LP').classList.remove('show');
  ModalManager.open('CM');
}

function editCred(id) {
  const c=window.findCredById(id);if(!c)return;
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
  const pArr=Array.from({length:inst},(_,i)=>{const totalMo=startMo+i;const yr=startYr+Math.floor(totalMo/12),mo=totalMo%12;const lastDay=new Date(yr,mo+1,0).getDate();return{idx:i+1,date:window.toLocalISO(yr,mo,Math.min(startDay,lastDay)),amount:monthly,status:'pending',paid:0};});
  const eid=document.getElementById('CEID').value;
  if(eid){
    const cr=window.findCredById(eid);
    if(cr){
      const nameChanged=cr.name!==name;
      const structureChanged=cr.inst!==inst||cr.start!==start;
      cr.name=name; cr.total=total||monthly*inst; cr.monthly=monthly; cr.inst=inst; cr.start=start;
      if(structureChanged){
        // Taksit sayısı veya tarih değişti — yeniden oluştur, mevcut paid durumları koru
        pArr.forEach((newP,i)=>{
          const old=cr.pays[i];
          if(old){newP.status=old.status;newP.paid=old.paid||0;}
        });
        cr.pays=pArr;
      } else {
        // Sadece ad/tutar değişti — status/paid koru, tutarı güncelle
        cr.pays.forEach(p=>{p.amount=monthly;});
      }
      // paidItems'daki eski adı güncelle
      if(nameChanged){(window.paidItems||[]).forEach(pi=>{if(pi._cid===cr.id)pi.name=name;});}
    }
    window.addLog('plan_edit','Kredi düzenlendi',name+' · '+inst+' taksit · '+window.fmtAmt(monthly,'TRY'),0);
  }
  else{
    window.creds.push({id:'c'+Date.now(),name,total:total||monthly*inst,monthly,inst,start,pays:pArr});
    window.addLog('cred_add','Kredi eklendi',name+' · '+inst+' taksit · '+window.fmtAmt(monthly,'TRY'),0);
    const srcKey=window._convertSourceKey;
    if(srcKey){
      // Odeme durumlarini yeni kredi taksitlerine isle
      const srcPays=window._convertSourcePays||[];
      const newCred=window.creds[window.creds.length-1];
      if(newCred&&srcPays.length){
        srcPays.forEach((sp,i)=>{
          const taksit=newCred.pays[i];
          if(!taksit)return;
          if(sp.status==='paid'){taksit.status='paid';taksit.paid=taksit.amount;}
          else if(sp.status==='partial'&&sp.paid>0){taksit.status='partial';taksit.paid=sp.paid;}
        });
      }
      // Eski pays grubunu sil
      if(srcKey.startsWith('g_')){const gid=srcKey.replace('g_','');window.pays=window.pays.filter(p=>p.groupId!==gid);}
      else if(srcKey.startsWith('pay_')){const pid=srcKey.replace('pay_','');window.pays=window.pays.filter(p=>String(Math.floor(Number(p.id)))!==pid);}
      window._convertSourceKey=null;
      window._convertSourcePays=null;
      if(window.invalidateLookups)window.invalidateLookups();
    }
  }
  window.save().then(()=>{window.closeMov('CM');window.render();});
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
    document.getElementById('LPT').textContent=window.fmt(t||m*i);
    document.getElementById('LPM').textContent=window.fmt(m);
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

// ── KREDİ ÖZET PANELİ ────────────────────────────────────────────────────────
function renderCredSummary() {
  const el = document.getElementById('CRED_SUM');
  if (!el || !window.creds || !window.creds.length) {
    if (el) el.style.display = 'none';
    return;
  }
  const cards = (window.creds || []).map(c => {
    const paid     = (c.pays||[]).filter(p=>(p.status||'pending')==='paid').length;
    const total    = (c.pays||[]).length;
    const bekleyen = (c.pays||[]).filter(p=>(p.status||'pending')!=='paid').reduce((s,p)=>s+p.amount,0);
    const pct      = total>0?Math.round((paid/total)*100):0;
    const pctColor = pct>=80?'var(--ok)':pct>=50?'var(--blue)':'var(--ora)';
    const nextPay  = (c.pays||[]).find(p=>(p.status||'pending')!=='paid');
    const nextStr  = nextPay?window.fmtD(nextPay.date):'✓';
    const done     = paid===total;
    return `<div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:5px;min-width:0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
        <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window.esc(c.name)}</div>
        <div style="font-size:10px;color:var(--muted);font-family:'IBM Plex Mono',monospace;flex-shrink:0">${paid}/${total}</div>
      </div>
      <div style="height:3px;background:var(--surf);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:2px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:${done?'var(--ok)':'var(--danger)'}">${done?'✓':window.fmt(bekleyen)}</div>
        <div style="font-size:10px;color:var(--muted)">${nextStr}</div>
      </div>
    </div>`;
  }).join('');
  el.style.display = '';
  el.innerHTML = `<div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.8px;margin-bottom:8px">KREDİLER</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">${cards}</div>`;
}
window.renderCredSummary = renderCredSummary;
