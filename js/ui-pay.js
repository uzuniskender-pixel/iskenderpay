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

function _resolvePersonId(name) {
  const base = window.Hesap ? window.Hesap._baseOf(name) : name;
  const person = (window.persons || []).find(p => p.name === base);
  if (!person) return null;
  // v8.111: legacy person (v8.109 öncesi eklenmiş) id'siz olabilir — lazy üret
  if (!person.id && window.Store) {
    window.Store.mutateItem(person, {
      id: 'per_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)
    });
  }
  return person.id || null;
}

function savePay() {
  const name=document.getElementById('PN').value.trim();
  const amount=parseFloat(document.getElementById('PA').value);
  const currency=document.getElementById('PC').value;
  const date=document.getElementById('PD').value;
  const category=document.getElementById('PK').value;
  const copyMonths=parseInt(document.getElementById('COPYMO').value)||0;
  if(!name||!amount||!date){alert('Ad, tutar ve tarih zorunlu');return;}
  const personId=_resolvePersonId(name);
  const eid=document.getElementById('EID').value;
  // Uyarı: persons'ta eşleşme yok ve (yeni kayıt veya isim değişti) → engelleme, sadece bildir
  if (!personId && name) {
    const nameChanged = !eid || (window.findPayById(eid)?.name !== name);
    if (nameChanged) {
      console.warn('[savePay] "'+name+'" kişi listesinde yok — kayıt yapıldı ama kişiye bağlanmadı');
      setTimeout(() => window.showWarnToast && window.showWarnToast('"'+name+'" kişi listesinde yok'), 200);
    }
  }
  let savedGroupId=null;
  if(eid){
    const p=window.findPayById(eid);
    if(p){
      savedGroupId=p.groupId;
      const oldName=p.name, oldCat=p.category;
      const patch={name,amount,currency,date,category};
      if(personId) patch.personId=personId;
      window.Store.mutateItem(p, patch);
      // İsim veya kategori değiştiyse aynı gruptaki tüm kayıtları güncelle
      if(oldName!==name || oldCat!==category){
        const groupPatch={name,category};
        if(personId) groupPatch.personId=personId;
        window.pays.filter(x=>x.groupId===p.groupId && String(x.id)!==String(p.id))
          .forEach(x=>window.Store.mutateItem(x, groupPatch));
      }
    }
  } else {
    const groupId=String(Date.now());
    savedGroupId=groupId;
    const[py,pm,pd]=date.split('-').map(Number);
    for(let i=0;i<=copyMonths;i++){
      const totalMo=(pm-1)+i;
      const yr=py+Math.floor(totalMo/12),mo=totalMo%12;
      const lastDay=new Date(yr,mo+1,0).getDate();
      const rec={id:Date.now()+Math.random(),groupId,name,amount,currency,date:window.toLocalISO(yr,mo,Math.min(pd,lastDay)),category,status:'pending',paid:0};
      if(personId) rec.personId=personId;
      window.Store.push('pays', rec);
    }
  }
  // Fonksiyonun başında okunan değişkenler kullanılır — DOM tekrar okunmaz
  const logCtx={personId, groupId: savedGroupId};
  if(eid){ window.addLog('plan_edit','Kayıt düzenlendi', name+' · '+window.fmtAmt(amount,currency), 0, logCtx); }
  else   { window.addLog('plan_add', 'Kayıt eklendi',    name+' · '+window.fmtAmt(amount,currency), 0, logCtx); }
  window.closeMov('PM2');
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
  const personId=_resolvePersonId(name);
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
    window.addLog('plan_edit','Kredi düzenlendi',name+' · '+inst+' taksit · '+window.fmtAmt(monthly,'TRY'),0,{personId,credId:eid});
  }
  else{
    const newCred={id:'c'+Date.now(),name,total:total||monthly*inst,monthly,inst,start,pays:pArr};
    window.Store.push('creds', newCred);
    window.addLog('cred_add','Kredi eklendi',name+' · '+inst+' taksit · '+window.fmtAmt(monthly,'TRY'),0,{personId,credId:newCred.id});
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
      if(srcKey.startsWith('g_')){const gid=srcKey.replace('g_','');window.Store.removeWhere('pays', p => p.groupId===gid);}
      else if(srcKey.startsWith('pay_')){const pid=srcKey.replace('pay_','');window.Store.removeWhere('pays', p => String(Math.floor(Number(p.id)))===pid);}
      window._convertSourceKey=null;
      window._convertSourcePays=null;
    }
  }
  window.Store.touch(); window.closeMov('CM');
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
  // Tum hesap + display name Hesap.krediler'a delege (plan matrisiyle tutarli)
  const list = window.Hesap.krediler();
  const cards = list.map(({dispName, remaining, bekleyen, pct, nextPay, nextDays, overdueCount, lastDate, done}) => {
    const pctColor = pct>=80?'var(--ok)':pct>=50?'var(--blue)':'var(--ora)';
    const nextStr  = nextPay?window.fmtD(nextPay.date):'✓';
    // Sayac badge: done > overdue > yaklasan(<=7) > uzak (v8.158)
    let badge = '';
    if (done) {
      badge = '<span style="color:var(--ok);font-weight:600">✓ Tamamlandı</span>';
    } else if (overdueCount > 0) {
      badge = '<span style="color:var(--danger);font-weight:600">⚠ '+overdueCount+' gecikti</span>';
    } else if (nextDays !== null && nextDays >= 0 && nextDays <= 7) {
      badge = '<span style="color:#fcd34d;font-weight:600">⚡ '+(nextDays===0?'Bugün':nextDays===1?'Yarın':nextDays+' gün')+'</span>';
    } else if (nextDays !== null && nextDays > 7) {
      badge = '<span style="color:var(--muted)">'+nextDays+' gün sonra</span>';
    }
    // Kredi bitis: son taksitin "Ay YYYY" formatinda (Ara 27 gibi)
    let lastStr = '';
    if (lastDate) {
      const d = window.parseLocalDate(lastDate);
      lastStr = d.toLocaleDateString('tr-TR',{month:'short'}) + ' ' + String(d.getFullYear()).slice(-2);
    }
    return `<div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:5px;min-width:0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
        <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window.esc(dispName)}</div>
        <div style="font-size:10px;color:var(--muted);font-family:'IBM Plex Mono',monospace;flex-shrink:0">${done?'✓':remaining+' kaldı'}</div>
      </div>
      <div style="height:3px;background:var(--surf);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:2px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:${done?'var(--ok)':'var(--danger)'}">${done?'✓':window.fmt(bekleyen)}</div>
        <div style="font-size:10px;color:var(--muted)">${nextStr}</div>
      </div>
      ${(lastStr||badge)?`<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;gap:6px;min-width:0">
        <div style="color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lastStr?(done?'Bitti: '+lastStr:'Bitiş: '+lastStr):''}</div>
        <div style="flex-shrink:0">${badge}</div>
      </div>`:''}
    </div>`;
  }).join('');
  el.style.display = '';
  el.innerHTML = `<div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.8px;margin-bottom:8px">KREDİLER</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">${cards}</div>`;
}
window.renderCredSummary = renderCredSummary;

// ── STORE EVENT LISTENER (v9.0) ─────────────────────────────────────────────
// Plan sekmesi aktifken pays/creds degisirse kredi panelini yenile
window.addEventListener('store:change', e => {
  if (window.curTab !== 0) return;
  if (window.Store && window.Store._affects(e.detail, ['pays','creds'])) renderCredSummary();
});
