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
  // Kişiler zorunluluğu — düzenleme modunda (eid dolu) kontrol yapma
  const _eid=document.getElementById('EID').value;
  if(!_eid && window.persons && window.persons.length > 0) {
    // Kişiler listesi dolu ama girilen isim listede yok
    const knownNames = window.persons.map(p => p.name.trim().toLocaleLowerCase('tr'));
    // "Denizbank 1", "Denizbank 2" gibi numaralı varyantlar da kabul — base isim eşleşmesine bak
    const inputLower = name.trim().toLocaleLowerCase('tr');
    const matched = knownNames.some(kn => inputLower === kn || inputLower.startsWith(kn+' ') || kn.startsWith(inputLower+' '));
    if (!matched) {
      alert('"' + name + '" kişiler listesinde yok.\nÖnce Kişiler sayfasından ekleyin.');
      return;
    }
  }
  const eid=document.getElementById('EID').value;
  if(eid){
    const p=window.findPayById(eid);
    if(p) Object.assign(p,{name,amount,currency,date,category});
  } else {
    const groupId=String(Date.now());
    // personId: kişiler listesinden eşleşen kişinin id'si (varsa)
    const _matchedPerson=(window.persons||[]).find(p=>p.name.trim().toLocaleLowerCase('tr')===name.trim().toLocaleLowerCase('tr'));
    const personId=_matchedPerson?.id||null;
    const[py,pm,pd]=date.split('-').map(Number);
    for(let i=0;i<=copyMonths;i++){
      const totalMo=(pm-1)+i;
      const yr=py+Math.floor(totalMo/12),mo=totalMo%12;
      const lastDay=new Date(yr,mo+1,0).getDate();
      window.pays.push({id:Date.now()+Math.random(),groupId,name,amount,currency,date:window.toLocalISO(yr,mo,Math.min(pd,lastDay)),category,status:'pending',paid:0,...(personId?{personId}:{})});
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
  if(eid){const c=window.findCredById(eid);if(c){c.name=name;c.total=total||monthly*inst;c.monthly=monthly;c.inst=inst;c.start=start;c.pays=pArr;} window.addLog('plan_edit','Kredi düzenlendi',name+' · '+inst+' taksit · '+window.fmtAmt(monthly,'TRY'),0);}
  else{window.creds.push({id:'c'+Date.now(),name,total:total||monthly*inst,monthly,inst,start,pays:pArr}); window.addLog('cred_add','Kredi eklendi',name+' · '+inst+' taksit · '+window.fmtAmt(monthly,'TRY'),0);}
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
  const now = new Date();
  const rows = (window.creds || []).map(c => {
    const paid   = (c.pays||[]).filter(p => (p.status||'pending')==='paid').length;
    const total  = (c.pays||[]).length;
    const kalan  = total - paid;
    const odenen = (c.pays||[]).filter(p=>(p.status||'pending')==='paid')
                   .reduce((s,p)=>s+p.amount,0);
    const bekleyen = (c.pays||[]).filter(p=>(p.status||'pending')!=='paid')
                   .reduce((s,p)=>s+p.amount,0);
    const pct = total > 0 ? Math.round((paid/total)*100) : 0;
    const pctColor = pct>=80?'var(--ok)':pct>=50?'var(--blue)':'var(--ora)';
    const nextPay = (c.pays||[]).find(p=>(p.status||'pending')!=='paid');
    const nextStr = nextPay ? window.fmtD(nextPay.date) : '✓ Tamamlandı';
    return `<div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:10px;padding:11px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
        <div style="font-size:13px;font-weight:700">${window.esc(c.name)}</div>
        <div style="font-size:11px;color:var(--muted);font-family:'IBM Plex Mono',monospace">${paid}/${total} taksit</div>
      </div>
      <div style="height:4px;background:var(--surf);border-radius:2px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:2px;transition:width .4s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)">
        <span>Ödenen: <span style="color:var(--ok);font-weight:600">${window.fmt(odenen)}</span></span>
        <span>Kalan: <span style="color:${kalan>0?'var(--danger)':'var(--ok)'};font-weight:600">${kalan>0?window.fmt(bekleyen):'✓'}</span></span>
        <span>Sıradaki: <span style="color:var(--txt)">${nextStr}</span></span>
      </div>
    </div>`;
  }).join('');

  el.style.display = '';
  el.innerHTML = `<div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.8px;margin-bottom:8px">KREDİLER</div>${rows}`;
}

window.renderCredSummary = renderCredSummary;
