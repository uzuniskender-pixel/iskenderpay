// js/ui-misc.js — iskenderpay
// Rehber, Aktivite Logu, Global Arama

let _logDelMode = 'range';
let _logSelected = new Set();
let _rhbPhones = [];
const RHB_LBL_OPTS = ['Cep','İş','Özel','Ev','Şirket','Diğer'];

const LOG_ICONS = {
  plan_add:   {icon:'📅', bg:'rgba(96,165,250,.15)'},
  plan_del:   {icon:'🗑️', bg:'rgba(248,113,113,.15)'},
  plan_edit:  {icon:'✏️', bg:'rgba(251,191,36,.15)'},
  paid:       {icon:'✅', bg:'rgba(74,222,128,.15)'},
  rhb_add:    {icon:'👤', bg:'rgba(167,139,250,.15)'},
  rhb_edit:   {icon:'✏️', bg:'rgba(251,191,36,.15)'},
  rhb_del:    {icon:'🗑️', bg:'rgba(248,113,113,.15)'},
  rhb_import: {icon:'📥', bg:'rgba(96,165,250,.15)'},
  hist_del:   {icon:'🗑️', bg:'rgba(248,113,113,.15)'},
  restore:    {icon:'↩️', bg:'rgba(74,222,128,.15)'},
  cred_add:   {icon:'💳', bg:'rgba(251,191,36,.15)'},
  default:    {icon:'📋', bg:'rgba(255,255,255,.07)'},
};

function normPhone(raw) {
  let d=raw.replace(/[^\d]/g,'');
  if(d.startsWith('90')&&d.length===12) d='0'+d.slice(2);
  if(d.length===10&&d.startsWith('5')) d='0'+d;
  if(d.length===11&&d.startsWith('05')) return d.slice(0,4)+' '+d.slice(4,7)+' '+d.slice(7,9)+' '+d.slice(9,11);
  return raw.trim();
}

function rhbGetName(p) { if(p.name)return p.name;return((p.firstName||'')+' '+(p.lastName||'')).trim(); }

function rhbGetInitials(p) {
  const n=rhbGetName(p);const parts=n.split(' ').filter(Boolean);
  if(parts.length>=2)return(parts[0][0]+parts[parts.length-1][0]).toUpperCase();
  return(parts[0]?.[0]||'?').toUpperCase();
}

function renderRhb() {
  const q=(document.getElementById('RHB_SRCH')?.value||'').toLocaleLowerCase('tr');
  let list=[...window.rehber];
  if(q)list=list.filter(p=>rhbGetName(p).toLocaleLowerCase('tr').includes(q)||(p.company||'').toLocaleLowerCase('tr').includes(q)||(p.phones||[]).some(ph=>ph.num.includes(q)));
  const sort=document.getElementById('RHB_SORT')?.value||'name';
  list.sort((a,b)=>{
    if(sort==='lastname'){const la=rhbGetName(a).trim().split(' ').pop()||'';const lb=rhbGetName(b).trim().split(' ').pop()||'';return la.localeCompare(lb,'tr')||rhbGetName(a).localeCompare(rhbGetName(b),'tr');}
    if(sort==='company'){const ca=(a.company||'\uffff').toLocaleLowerCase('tr');const cb=(b.company||'\uffff').toLocaleLowerCase('tr');return ca.localeCompare(cb,'tr')||rhbGetName(a).localeCompare(rhbGetName(b),'tr');}
    return rhbGetName(a).localeCompare(rhbGetName(b),'tr');
  });
  const coSet=[...new Set(window.rehber.map(p=>p.company).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
  const dlEl=document.getElementById('RHB_CO_LIST');
  if(dlEl)dlEl.innerHTML=coSet.map(c=>`<option value="${esc(c)}">`).join('');
  const el=document.getElementById('RHB_LIST');if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty"><div class="ico">📒</div><p>Kişi bulunamadı.<br>+ Ekle ile başlayın.</p></div>';return;}
  el.innerHTML=list.map(p=>{
    const initials=rhbGetInitials(p);
    const firstPhone=p.phones?.[0]?.num||'';
    const subParts=[];
    if(p.company)subParts.push(`<span>${esc(p.company)}</span>`);
    if(firstPhone)subParts.push(`<span style="font-family:'IBM Plex Mono',monospace">${esc(firstPhone)}</span>`);
    const sub=subParts.join('<span style="color:var(--bdr);margin:0 4px">·</span>');
    return `<div class="rhb-card" onclick="openRhbDetail('${p.id}')">
      <div class="rhb-avatar">${initials}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(rhbGetName(p))}</div>
        ${sub?`<div style="font-size:11px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>`:''}
      </div>
      <div style="color:var(--muted);font-size:16px;font-weight:300">›</div>
    </div>`;
  }).join('');
}

function openRhbDetail(id) {
  const p=window.rehber.find(x=>String(x.id)===String(id));if(!p)return;
  const initials=rhbGetInitials(p);
  let h=`<div style="text-align:center;margin-bottom:18px">
    <div class="rhb-avatar" style="width:56px;height:56px;font-size:20px;margin:0 auto 10px">${initials}</div>
    <div style="font-size:18px;font-weight:700">${esc(rhbGetName(p))}</div>
    ${p.company?`<div style="font-size:12px;color:var(--muted);margin-top:3px">🏢 ${esc(p.company)}</div>`:''}
  </div>`;
  if(p.phones?.length){p.phones.filter(ph=>ph.num).forEach(ph=>{h+=`<div class="rhb-field"><div style="min-width:0;flex:1">${ph.lbl?`<div class="rhb-field-lbl">${esc(ph.lbl)}</div>`:'<div class="rhb-field-lbl">Telefon</div>'}<div class="rhb-field-val mono">${esc(ph.num)}</div></div><div style="display:flex;gap:6px;flex-shrink:0;margin-left:10px"><a href="tel:${encodeURIComponent(ph.num)}" class="rhb-call-btn">📞</a><button class="rhb-copy-btn" onclick="rhbCopy('${ph.num.replace(/'/g,"\\'")}',this)">📋</button></div></div>`;});}
  if(p.email){h+=`<div class="rhb-field"><div style="min-width:0;flex:1"><div class="rhb-field-lbl">E-posta</div><div class="rhb-field-val" style="word-break:break-all">${esc(p.email)}</div></div><div style="display:flex;gap:6px;flex-shrink:0;margin-left:10px"><a href="mailto:${encodeURIComponent(p.email)}" class="rhb-call-btn">✉️</a><button class="rhb-copy-btn" onclick="rhbCopy('${p.email.replace(/'/g,"\\'")}',this)">📋</button></div></div>`;}
  if(p.note){h+=`<div style="background:var(--surf2);border-radius:9px;padding:10px 12px;margin-bottom:10px;border:1px solid var(--bdr)"><div class="rhb-field-lbl" style="margin-bottom:5px">Not</div><div style="font-size:13px;line-height:1.7;white-space:pre-wrap">${esc(p.note)}</div></div>`;}
  h+=`<div class="dacts"><button class="dact da-edit" onclick="openRhbEdit('${p.id}')">Düzenle</button><button class="dact da-del" onclick="rhbDel('${p.id}')">Sil</button><button class="dact da-close" onclick="closeRDET()">Kapat</button></div>`;
  document.getElementById('RDET_C').innerHTML=h;
  ModalManager.open('RDET');
}

function rhbExport() {
  const data=JSON.stringify(rehber,null,2);const blob=new Blob([data],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rehber_'+new Date().toISOString().slice(0,10)+'.json';a.click();
}

function rhbImport() {
  const inp=document.createElement('input');inp.type='file';inp.accept='.json,.csv,text/csv';
  inp.onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      const text=await file.text();let data=[];
      if(file.name.toLowerCase().endsWith('.csv')||file.type.includes('csv')){data=rhbParseCsv(text);}
      else{
        data=JSON.parse(text);if(!Array.isArray(data)){alert('Geçersiz JSON formatı');return;}
        data=data.map(p=>{if(!p.name&&(p.firstName||p.lastName))p.name=((p.firstName||'')+' '+(p.lastName||'')).trim();return p;});
      }
      if(!data.length){alert('Aktarılacak kayıt bulunamadı.');return;}
      data.forEach(p=>{p.name=(p.name||'').toLocaleUpperCase('tr');p.company=(p.company||'').toLocaleUpperCase('tr');if(p.phones)p.phones=p.phones.map(ph=>({...ph,num:normPhone(ph.num)}));});
      const existKey=new Set(window.rehber.map(p=>rhbGetName(p)+'|'+(p.phones?.[0]?.num||'')));
      let added=0,skipped=0;
      data.forEach(p=>{const key=rhbGetName(p)+'|'+(p.phones?.[0]?.num||'');if(existKey.has(key)){skipped++;return;}p.id=p.id||Date.now()+added;window.rehber.push(p);added++;existKey.add(key);});
      rhbSave();renderRhb();
      if(added>0)addLog('rhb_import','Rehber içe aktarıldı',added+' kişi eklendi'+(skipped>0?', '+skipped+' atlandı':''),6);
      alert(added+' kişi eklendi'+(skipped>0?', '+skipped+' zaten mevcut':'')+'.');
    }catch(err){alert('Dosya okunamadı: '+err.message);}
  };inp.click();
}

function rhbParseCsv(text) {
  const lines=text.split(/\r?\n/).filter(l=>l.trim());if(lines.length<2)return[];
  const headers=rhbCsvRow(lines[0]).map(h=>h.trim().toLowerCase());
  const idx=k=>headers.findIndex(h=>h.includes(k));
  const iFirst=idx('first name'),iMiddle=idx('middle name'),iLast=idx('last name'),iOrg=idx('organization');
  const iEmail=idx('e-mail')>=0?idx('e-mail'):idx('email'),iNote=idx('note');
  const phoneValCols=headers.map((h,i)=>h.includes('value')&&h.includes('phone')?i:-1).filter(i=>i>=0);
  const phoneLblCols=headers.map((h,i)=>h.includes('label')&&h.includes('phone')?i:-1).filter(i=>i>=0);
  const contacts=[];
  for(let r=1;r<lines.length;r++){
    const cols=rhbCsvRow(lines[r]);if(!cols.length)continue;
    const firstName=(cols[iFirst]||'').trim(),middleName=iMiddle>=0?(cols[iMiddle]||'').trim():'',lastName=iLast>=0?(cols[iLast]||'').trim():'';
    let name='';
    if(middleName&&lastName){name=(middleName+' '+lastName).trim();}
    else if(firstName&&lastName){name=(firstName+' '+lastName).trim();}
    else{const parts=firstName.split(' ').filter(Boolean);name=parts.length>1?parts.slice(1).join(' '):firstName;}
    if(!name)continue;
    const orgVal=iOrg>=0?(cols[iOrg]||'').trim():'';
    let company=orgVal||'';
    const phones=[];const lblMap={'work':'İş','home':'Ev','mobile':'Cep','cell':'Cep','other':'Diğer','main':'İş'};
    phoneValCols.forEach((vi,n)=>{
      const rawNums=(cols[vi]||'').split(':::').map(s=>s.trim()).filter(Boolean);
      const lblRaw=phoneLblCols[n]>=0?(cols[phoneLblCols[n]]||'').toLowerCase():'';
      const lbl=Object.entries(lblMap).find(([k])=>lblRaw.includes(k))?.[1]||'Cep';
      const seen=new Set();
      rawNums.forEach(num=>{const n2=normPhone(num.split(':::')[0].trim());if(!seen.has(n2)){phones.push({lbl,num:n2});seen.add(n2);}});
    });
    contacts.push({id:Date.now()+r,name,company,phones,email:iEmail>=0?(cols[iEmail]||'').trim():'',note:iNote>=0?(cols[iNote]||'').trim():''});
  }
  return contacts;
}

function rhbCsvRow(line) {
  const res=[];let cur='';let inQ=false;
  for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){inQ=!inQ;continue;}if(c===','&&!inQ){res.push(cur);cur='';continue;}cur+=c;}
  res.push(cur);return res;
}

function rhbCopy(text,btn){if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>rhbCopyFeedback(btn)).catch(()=>rhbCopyFallback(text,btn));}else{rhbCopyFallback(text,btn);}}

function rhbCopyFallback(text,btn){const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0;top:0;left:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(ta);rhbCopyFeedback(btn);}

function rhbCopyFeedback(btn){const orig=btn.innerHTML;btn.innerHTML='✓';btn.style.color='var(--ok)';setTimeout(()=>{btn.innerHTML=orig;btn.style.color='';},1600);}

function openRhbAdd() {
  document.getElementById('RMOD_ID').value='';
  document.getElementById('RMOD_T').innerHTML='Kişi <span>Ekle</span>';
  ['RMOD_NAME','RMOD_COMPANY','RMOD_EMAIL','RMOD_NOTE'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  _rhbPhones=[{lbl:'Cep',num:''}];renderRhbPhones();
  ModalManager.open('RMOD');
}

function openRhbEdit(id) {
  const p=window.rehber.find(x=>String(x.id)===String(id));if(!p)return;
  closeRDET();
  document.getElementById('RMOD_ID').value=id;
  document.getElementById('RMOD_T').innerHTML='Kişi <span>Düzenle</span>';
  const nameEl=document.getElementById('RMOD_NAME');if(nameEl)nameEl.value=p.name||((p.firstName||'')+' '+(p.lastName||'')).trim();
  const coEl=document.getElementById('RMOD_COMPANY');if(coEl)coEl.value=p.company||'';
  document.getElementById('RMOD_EMAIL').value=p.email||'';
  document.getElementById('RMOD_NOTE').value=p.note||'';
  _rhbPhones=(p.phones?.length?p.phones.map(x=>({...x})):[{lbl:'',num:''}]);
  renderRhbPhones();
  setTimeout(()=>ModalManager.open('RMOD'),100);
}

function renderRhbPhones() {
  document.getElementById('RMOD_PHONES').innerHTML=_rhbPhones.map((ph,i)=>{
    const cur=ph.lbl||'Cep';
    const opts=RHB_LBL_OPTS.map(o=>`<option${o===cur?' selected':''}>${o}</option>`).join('');
    return `<div class="rhb-phone-row">
      <select class="fi" onchange="_rhbPhones[${i}].lbl=this.value" style="flex:0.65;padding:9px 8px;font-size:13px">${opts}</select>
      <input class="fi mono-inp" type="tel" placeholder="05XX XXX XX XX" value="${esc(ph.num)}" oninput="_rhbPhones[${i}].num=this.value" style="flex:1">
      ${_rhbPhones.length>1?`<button onclick="_rhbPhones.splice(${i},1);renderRhbPhones()" style="background:rgba(248,113,113,.15);color:var(--danger);border:1px solid rgba(248,113,113,.2);border-radius:7px;padding:7px 9px;font-size:12px;cursor:pointer;flex-shrink:0">✕</button>`:''}
    </div>`;
  }).join('');
}

function rhbAddPhone() { _rhbPhones.push({lbl:'Cep',num:''}); renderRhbPhones(); }

function rhbSavePerson() {
  const name=(document.getElementById('RMOD_NAME')?.value.trim()||'').toLocaleUpperCase('tr');
  const company=(document.getElementById('RMOD_COMPANY')?.value.trim()||'').toLocaleUpperCase('tr');
  if(!name){alert('İsim Soyisim girin');return;}
  const phones=_rhbPhones.filter(ph=>ph.num.trim()).map(ph=>({...ph,num:normPhone(ph.num)}));
  const email=document.getElementById('RMOD_EMAIL').value.trim();
  const note=document.getElementById('RMOD_NOTE').value.trim();
  const eid=document.getElementById('RMOD_ID').value;
  if(eid){const p=window.rehber.find(x=>String(x.id)===String(eid));if(p)Object.assign(p,{name,company,phones,email,note});addLog('rhb_edit','Kişi düzenlendi',name+(company?' · '+company:''),6);}
  else{window.rehber.push({id:Date.now(),name,company,phones,email,note});addLog('rhb_add','Kişi eklendi',name+(company?' · '+company:'')+(phones[0]?' · '+phones[0].num:''),6);}
  rhbSave();closeMov('RMOD');renderRhb();
}

function rhbDel(id) {
  const p=window.rehber.find(x=>String(x.id)===String(id));
  if(!confirm(rhbGetName(p)+' silinecek. Emin misin?'))return;
  addLog('rhb_del','Kişi silindi',rhbGetName(p||{})+(p?.company?' · '+p.company:''),6);
  window.rehber=window.rehber.filter(x=>String(x.id)!==String(id));
  rhbSave();closeRDET();renderRhb();
}

function renderActLog() {
  const el=document.getElementById('ACT_LOG_LIST');if(!el)return;
  const cntEl=document.getElementById('LOG_CNT');if(cntEl)cntEl.textContent=window.actLog.length+' hareket';
  if(!window.actLog.length){el.innerHTML='<div class="empty"><div class="ico">📋</div><p>Henüz kayıt yok.</p></div>';return;}
  const selMode=_logDelMode==='select';
  try {
    el.innerHTML=window.actLog.map((e,i)=>{
      try {
        const cfg=(LOG_ICONS&&LOG_ICONS[e.type])||{icon:'📋',bg:'rgba(255,255,255,.07)'};
        const time=e.at?fmtLogTime(e.at):'';
        const nav=(typeof e.navTab==='number'&&e.navTab>=0)?e.navTab:-1;
        const title=e.title?String(e.title):'(başlık yok)';
        const detail=e.detail?String(e.detail):'';
        const isSel=_logSelected.has(i);
        const rowBg=isSel?'rgba(96,165,250,.08)':'transparent';
        const cbHtml=selMode?'<input type="checkbox" id="LOG_CB_'+i+'" '+(isSel?'checked':'')+' onchange="toggleLogItem('+i+')" onclick="event.stopPropagation()" style="width:16px;height:16px;cursor:pointer;flex-shrink:0;margin-top:8px">':'';
        const rowClick=selMode?'toggleLogItem('+i+')':'logNav('+nav+')';
        return '<div onclick="'+rowClick+'" style="display:flex;gap:11px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer;align-items:flex-start;background:'+rowBg+';border-radius:6px;margin:0 -4px;padding-left:4px;padding-right:4px">'
          +cbHtml
          +'<div style="width:32px;height:32px;border-radius:50%;background:'+cfg.bg+';display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">'+cfg.icon+'</div>'
          +'<div style="flex:1;min-width:0;padding-right:8px">'
          +'<div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:2px">'+title+'</div>'
          +(detail?'<div style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+detail+'</div>':'')
          +'</div>'
          +'<div style="font-size:10px;color:#64748b;flex-shrink:0;margin-top:3px;white-space:nowrap">'+time+'</div>'
          +'</div>';
      } catch(itemErr){return '<div style="padding:8px;color:orange;font-size:11px">Hata '+i+': '+String(itemErr)+'</div>';}
    }).join('');
    if(selMode) _updateLogSelCount();
  } catch(renderErr){el.innerHTML='<div style="padding:12px;color:red">Render hatası: '+String(renderErr)+'</div>';}
}

function logNav(tab) { if(tab>=0) go(tab); }

function setLogDelMode(mode) {
  _logDelMode=mode;
  document.getElementById('LOG_RANGE_PANEL').style.display=mode==='range'?'':'none';
  document.getElementById('LOG_SEL_PANEL').style.display=mode==='select'?'':'none';
  document.getElementById('LOG_MODE_RANGE').style.background=mode==='range'?'rgba(96,165,250,.15)':'';
  document.getElementById('LOG_MODE_RANGE').style.color=mode==='range'?'var(--blue)':'';
  document.getElementById('LOG_MODE_RANGE').style.borderColor=mode==='range'?'rgba(96,165,250,.3)':'';
  document.getElementById('LOG_MODE_SEL').style.background=mode==='select'?'rgba(96,165,250,.15)':'';
  document.getElementById('LOG_MODE_SEL').style.color=mode==='select'?'var(--blue)':'';
  document.getElementById('LOG_MODE_SEL').style.borderColor=mode==='select'?'rgba(96,165,250,.3)':'';
  if(mode==='select'){_logSelected.clear();renderActLog();}else{renderActLog();}
}

function toggleSelectAllLogs(checked) {
  if(checked){window.actLog.forEach((_,i)=>_logSelected.add(i));}else{_logSelected.clear();}
  renderActLog();_updateLogSelCount();
}

function toggleLogItem(idx) {
  if(_logSelected.has(idx))_logSelected.delete(idx);else _logSelected.add(idx);
  _updateLogSelCount();
  const cb=document.getElementById('LOG_CB_'+idx);if(cb)cb.checked=_logSelected.has(idx);
  const allCb=document.getElementById('LOG_SEL_ALL');if(allCb)allCb.checked=_logSelected.size===window.actLog.length;
}

function _updateLogSelCount() {
  const el=document.getElementById('LOG_SEL_CNT');if(el)el.textContent=_logSelected.size+' seçili';
}

function openLogDel() {
  const bar=document.getElementById('LOG_DEL_BAR');if(!bar)return;
  const wasHidden=bar.style.display==='none';
  bar.style.display=wasHidden?'':'none';
  if(!wasHidden){closeLogDel();return;}
  _logDelMode='range';setLogDelMode('range');
  const now=new Date();const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0'),d=String(now.getDate()).padStart(2,'0');
  document.getElementById('LOG_D1').value=y+'-'+m+'-01T00:00';
  document.getElementById('LOG_D2').value=y+'-'+m+'-'+d+'T23:59';
}

function closeLogDel() {
  const bar=document.getElementById('LOG_DEL_BAR');if(bar)bar.style.display='none';
  _logSelected.clear();_logDelMode='range';renderActLog();
}

function doLogDel() {
  const d1=document.getElementById('LOG_D1').value;const d2=document.getElementById('LOG_D2').value;
  if(!d1||!d2){alert('Tarih aralığı seçin');return;}
  const from=new Date(d1).getTime(),to=new Date(d2).getTime();
  if(isNaN(from)||isNaN(to)){alert('Geçersiz tarih');return;}
  const before=window.actLog.length;
  window.actLog=window.actLog.filter(e=>{const t=new Date(e.at).getTime();return t<from||t>to;});
  const deleted=before-window.actLog.length;
  saveSecure();renderActLog();closeLogDel();
  if(deleted>0)alert(deleted+' kayıt silindi.');else alert('Bu aralıkta kayıt bulunamadı.');
}

function doLogDelSelected() {
  if(!_logSelected.size){alert('Önce silinecek kayıtları seçin.');return;}
  if(!confirm(_logSelected.size+' kayıt silinecek. Emin misin?'))return;
  window.actLog=window.actLog.filter((_,i)=>!_logSelected.has(i));
  _logSelected.clear();saveSecure();renderActLog();closeLogDel();
}

function doLogDelAll() {
  if(!confirm('Tüm log silinecek. Emin misin?'))return;
  window.actLog=[];saveSecure();renderActLog();closeLogDel();
}

function execGlobalSearch() {
  const query = document.getElementById('SRCHINP').value.trim().toLocaleLowerCase('tr');
  const resDiv = document.getElementById('SRCHRES');
  if (!query) { resDiv.innerHTML = '<div style="text-align:center;color:var(--tc);opacity:.5;padding:20px 0">Yazmaya başlayın...</div>'; return; }
  let html = '', count = 0;
  (window.pays||[]).forEach(p => {
    if (!((p.name||'').toLocaleLowerCase('tr').includes(query)||(String(p.amount||'')).includes(query))) return;
    count++;
    const a = Number(p.amount||0).toLocaleString('tr-TR',{maximumFractionDigits:0});
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ffd200">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(p.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>📅 Plan Ödemesi (${p.date||''})</span><span class="mono" style="color:#ffd200">₺${a}</span>
      </div></div>`;
  });
  (window.paidItems||[]).forEach(pi => {
    if (!((pi.name||'').toLocaleLowerCase('tr').includes(query)||(String(pi.amount||'')).includes(query))) return;
    count++;
    const a = Number(pi.amount||0).toLocaleString('tr-TR',{maximumFractionDigits:0});
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #00ebc7">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(pi.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>✅ Gerçekleşen Ödeme (${pi.date||''})</span><span class="mono" style="color:#00ebc7">₺${a}</span>
      </div></div>`;
  });
  (window.creds||[]).forEach(c => {
    if (!((c.name||'').toLocaleLowerCase('tr').includes(query))) return;
    count++;
    const total = (c.pays||[]).reduce((s,p)=>s+p.amount,0);
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ff5e62">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(c.name)}</div>
      <div style="font-size:.8rem;opacity:.7;display:flex;justify-content:space-between;margin-top:4px">
        <span>💳 ${(c.pays||[]).length} taksit</span><span class="mono" style="color:#ff5e62">₺${Number(total).toLocaleString('tr-TR',{maximumFractionDigits:0})}</span>
      </div></div>`;
  });
  (window.notes||[]).forEach(n => {
    if (!((n.title||'').toLocaleLowerCase('tr').includes(query)||(n.content||n.text||'').toLocaleLowerCase('tr').includes(query))) return;
    count++;
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #ff8e3c">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(n.title||'Başlıksız Not')}</div>
      <div style="font-size:.8rem;opacity:.6;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📝 ${esc(n.content||n.text||'')}</div>
    </div>`;
  });
  (window.rehber||[]).forEach(r => {
    const name = (r.name||'').toLocaleLowerCase('tr');
    const phone = (r.phones||[]).map(p=>p.num).join(' ');
    if (!(name.includes(query)||phone.includes(query)||(r.company||'').toLocaleLowerCase('tr').includes(query))) return;
    count++;
    html += `<div style="background:rgba(255,255,255,.02);padding:10px;border-radius:var(--rs);border-left:3px solid #38ef7d">
      <div style="font-weight:500;font-size:.9rem;color:var(--tc)">${esc(r.name||'')}</div>
      <div style="font-size:.8rem;opacity:.7;margin-top:4px;font-family:monospace">${phone?'📞 '+phone:''} ${r.company?'🏢 '+r.company:''}</div>
    </div>`;
  });
  resDiv.innerHTML = count ? html : '<div style="text-align:center;color:var(--tc);opacity:.5;padding:20px 0">Eşleşen sonuç bulunamadı.</div>';
}


// ── GLOBAL COMPAT ─────────────────────────────────────────────────────────────
window.renderActLog       = renderActLog;
window.logNav             = logNav;
window.setLogDelMode      = setLogDelMode;
window.toggleSelectAllLogs= toggleSelectAllLogs;
window.toggleLogItem      = toggleLogItem;
window._updateLogSelCount = _updateLogSelCount;
window.openLogDel         = openLogDel;
window.closeLogDel        = closeLogDel;
window.doLogDel           = doLogDel;
window.doLogDelSelected   = doLogDelSelected;
window.doLogDelAll        = doLogDelAll;
window.normPhone          = normPhone;
window.rhbGetName         = rhbGetName;
window.rhbGetInitials     = rhbGetInitials;
window.renderRhb          = renderRhb;
window.openRhbDetail      = openRhbDetail;
window.rhbExport          = rhbExport;
window.rhbImport          = rhbImport;
window.rhbParseCsv        = rhbParseCsv;
window.rhbCsvRow          = rhbCsvRow;
window.rhbCopy            = rhbCopy;
window.rhbCopyFallback    = rhbCopyFallback;
window.rhbCopyFeedback    = rhbCopyFeedback;
window.openRhbAdd         = openRhbAdd;
window.openRhbEdit        = openRhbEdit;
window.renderRhbPhones    = renderRhbPhones;
window.rhbAddPhone        = rhbAddPhone;
window.rhbSavePerson      = rhbSavePerson;
window.rhbDel             = rhbDel;
window.execGlobalSearch = execGlobalSearch;
window._rhbPhones = _rhbPhones;
