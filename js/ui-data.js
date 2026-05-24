// js/ui-data.js — iskenderpay
// Ödeme/Kredi/Kişi/Not/Geçmiş/Yapılan CRUD

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
      pays.push({id:Date.now()+Math.random(),groupId,name,amount,currency,date:toLocalISO(yr,mo,Math.min(pd,lastDay)),category,status:'pending',paid:0});
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
  if(eid){const c=findCredById(eid);if(c){c.name=name;c.total=total||monthly*inst;c.monthly=monthly;c.inst=inst;c.start=start;c.pays=pArr;}}
  else{creds.push({id:'c'+Date.now(),name,total:total||monthly*inst,monthly,inst,start,pays:pArr});}
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

function renderPersons() {
  const pl = document.getElementById('PRL');
  updateDatalist();
  if (!persons.length) {
    pl.innerHTML='<div class="empty"><div class="ico">👥</div><p>Henüz kişi yok.<br>+ Kişi Ekle ile başlayın.</p></div>';
    return;
  }
  const sortedPersons = [...persons].sort((a,b) => a.name.localeCompare(b.name,'tr'));
  pl.innerHTML = `<div style="max-width:480px">` + sortedPersons.map(p => {
    const origIdx = persons.indexOf(p);
    return `<div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rs);padding:9px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="min-width:0;flex:1">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
        ${p.desc?`<div style="font-size:11px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.desc)}</div>`:''}
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0">
        <button onclick="editPerson(${origIdx})" style="background:rgba(192,132,252,.15);color:var(--acc2);border:1px solid rgba(192,132,252,.2);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;cursor:pointer">Düzenle</button>
        <button onclick="delPerson(${origIdx})" style="background:rgba(248,113,113,.12);color:var(--danger);border:1px solid rgba(248,113,113,.2);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;cursor:pointer">Sil</button>
      </div>
    </div>`;
  }).join('') + `</div>`;
}

function updateDatalist() {
  const dl = document.getElementById('PNLIST');
  if (!dl) return;
  const usedNames = pays.filter(p => !p._cid).map(p => p.name);
  const options = persons.map(p => {
    if (!usedNames.includes(p.name)) return p.name;
    let i=2; while(usedNames.includes(p.name+' '+i)) i++;
    return p.name+' '+i;
  }).sort();
  dl.innerHTML = options.map(n => `<option value="${n}">`).join('');
}

function openAddPerson() {
  document.getElementById('PREID').value = '';
  document.getElementById('PRMT').innerHTML = 'Kişi <span>Ekle</span>';
  document.getElementById('PRNAME').value = '';
  document.getElementById('PRDESC').value = '';
  ModalManager.open('PRM');
}

function editPerson(i) {
  const p = persons[i];
  document.getElementById('PREID').value = i;
  document.getElementById('PRMT').innerHTML = 'Kişi <span>Düzenle</span>';
  document.getElementById('PRNAME').value = p.name;
  document.getElementById('PRDESC').value = p.desc||'';
  ModalManager.open('PRM');
}

function savePerson() {
  const name = document.getElementById('PRNAME').value.trim();
  const desc = document.getElementById('PRDESC').value.trim();
  if (!name) { alert('İsim zorunlu'); return; }
  const eid = document.getElementById('PREID').value;
  if (eid !== '') {
    const oldName = persons[parseInt(eid)].name;
    if (oldName !== name) { pays.forEach(p => { if(p.name===oldName) p.name=name; }); }
    persons[parseInt(eid)] = {name, desc};
  } else {
    let finalName = name;
    const existing = persons.map(p => p.name);
    if (existing.includes(name)) { let i=2; while(existing.includes(name+' '+i)) i++; finalName=name+' '+i; }
    persons.push({name:finalName, desc});
  }
  savePersons(); closeMov('PRM'); renderPersons();
}

function delPerson(i) {
  if (!confirm('Bu kişiyi silmek istiyor musunuz?')) return;
  persons.splice(i, 1);
  savePersons(); renderPersons();
}

function renderHist() {
  document.getElementById('HD').textContent=new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
  const hl=document.getElementById('HL');
  if(!hist.length){hl.innerHTML='<div class="empty"><div class="ico">🗃️</div><p>Silinmiş ödeme yok</p></div>';return;}
  hl.innerHTML=hist.map((p,i)=>`
    <div class="hi">
      <div class="hi-inf"><div class="hi-name">${esc(p.name)}</div><div class="hi-date">Silindi: ${new Date(p.delAt).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})} · ${fmtD(p.date)}</div></div>
      <div class="hi-amt">${fmtA(p.amount,p.currency||'TRY')}</div>
      <button onclick="editHistItem(${i})" style="background:rgba(192,132,252,.15);color:var(--acc2);border:1px solid rgba(192,132,252,.2);border-radius:6px;padding:4px 7px;font-size:10px;font-weight:600;cursor:pointer;flex-shrink:0">Düzenle</button>
      <button onclick="restoreFromHist(${i})" style="background:rgba(74,222,128,.15);color:var(--ok);border:1px solid rgba(74,222,128,.2);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0">↩ Geri Al</button>
      <button class="hi-del" onclick="delHist(${i})">Sil</button>
    </div>`).join('');
}

function editHistItem(idx) {
  const p=hist[idx];if(!p)return;
  document.getElementById('HIIDX').value=idx;
  document.getElementById('HINAM').value=p.name||'';
  document.getElementById('HIAMT').value=p.amount||'';
  document.getElementById('HIDAT').value=p.date||'';
  ModalManager.open('HIMOD');
}

function saveHistItem() {
  const idx=parseInt(document.getElementById('HIIDX').value);
  const p=hist[idx];if(!p)return;
  const newName=document.getElementById('HINAM').value.trim();
  const newAmt=parseFloat(document.getElementById('HIAMT').value);
  const newDate=document.getElementById('HIDAT').value;
  if(newName) p.name=newName;
  if(!isNaN(newAmt)&&newAmt>0) p.amount=newAmt;
  if(newDate.match(/^\d{4}-\d{2}-\d{2}$/)) p.date=newDate;
  saveSecure(); ModalManager.close('HIMOD'); renderHist();
}

function restoreFromHist(i) {
  const p=hist[i];if(!p)return;
  const restored={...p};delete restored.delAt;restored.status='pending';restored.paid=0;
  pays.push(restored);hist.splice(i,1);
  save().then(()=>{renderHist();render();});
}

function delHist(i) { hist.splice(i,1); save().then(()=>renderHist()); }

function clrHist()  { if(!confirm('Tüm geçmişi sil?'))return; window.hist=[]; save().then(()=>renderHist()); }

function renderNotes() {
  const nl=document.getElementById('NL');
  if(!notes.length){nl.innerHTML='<div class="empty"><div class="ico">📝</div><p>Henüz not yok.<br>+ Not Ekle ile başlayın.</p></div>';return;}
  notes.forEach((n,i)=>{if(!n.nid)n.nid='n'+(Date.now()+i)+'_'+Math.random().toString(36).slice(2,7);});
  const catColors={'Banka / IBAN':'var(--blue)','Şifre / Hesap':'var(--danger)','Telefon / İletişim':'var(--ok)','Genel Not':'var(--muted)'};
  nl.innerHTML=notes.map(n=>`
    <div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);padding:14px;margin-bottom:9px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-size:14px;font-weight:700">${esc(n.title)}</div>
          <div style="font-size:10px;color:${catColors[n.cat]||'var(--muted)'};font-weight:600;margin-top:2px;text-transform:uppercase;letter-spacing:.8px">${esc(n.cat||'')}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="editNote('${n.nid}')" style="background:rgba(192,132,252,.15);color:var(--acc2);border:1px solid rgba(192,132,252,.2);border-radius:6px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer">Düzenle</button>
          <button onclick="delNote('${n.nid}')" style="background:rgba(248,113,113,.12);color:var(--danger);border:1px solid rgba(248,113,113,.2);border-radius:6px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer">Sil</button>
        </div>
      </div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--txt);white-space:pre-wrap;background:var(--surf2);border-radius:7px;padding:10px;line-height:1.7;border:1px solid var(--bdr)">${esc(n.content)}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:6px">${new Date(n.at).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})}</div>
    </div>`).join('');
}

function openNoteModal() {
  document.getElementById('NEID').value='';
  document.getElementById('NMT').innerHTML='Yeni <span>Not</span>';
  document.getElementById('NTIT').value='';
  document.getElementById('NCONT').value='';
  document.getElementById('NCAT').value='Banka / IBAN';
  ModalManager.open('NM');
}

function editNote(nid) {
  const n=notes.find(x=>x.nid===nid);if(!n){console.error('editNote: not bulunamadı',nid);return;}
  document.getElementById('NEID').value=nid;
  document.getElementById('NMT').innerHTML='Not <span>Düzenle</span>';
  document.getElementById('NTIT').value=n.title||'';
  document.getElementById('NCONT').value=n.content||'';
  document.getElementById('NCAT').value=n.cat||'Genel Not';
  ModalManager.open('NM');
}

function saveNote() {
  const title=document.getElementById('NTIT').value.trim();
  const content=document.getElementById('NCONT').value.trim();
  const cat=document.getElementById('NCAT').value;
  if(!title||!content){alert('Başlık ve içerik zorunlu');return;}
  const eid=document.getElementById('NEID').value;
  if(eid!==''){const idx=notes.findIndex(x=>x.nid===eid);if(idx!==-1){notes[idx]={...notes[idx],title,content,cat,upd:new Date().toISOString()};}}
  else{const nid='n'+Date.now()+'_'+Math.random().toString(36).slice(2,7);notes.unshift({nid,title,content,cat,at:new Date().toISOString()});}
  saveNotes(); closeMov('NM'); renderNotes();
}

function delNote(nid) {
  if(!confirm('Bu notu silmek istiyor musun?'))return;
  const idx=notes.findIndex(x=>x.nid===nid);if(idx!==-1)notes.splice(idx,1);
  saveNotes(); renderNotes();
}

function renderPaid() {
  document.getElementById('OPD').textContent=new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
  const monthSet=new Set(paidItems.map(p=>{const d=parseLocalDate(p.date);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}));
  const months=Array.from(monthSet).sort().reverse();
  const sel=document.getElementById('PFLT2');
  const curVal=sel.value;
  sel.innerHTML='<option value="all">Tüm aylar</option>'+months.map(m=>{const[y,mo]=m.split('-');const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});return`<option value="${m}"${curVal===m?' selected':''}>${lbl}</option>`;}).join('');
  const flt=(document.getElementById('PFLT')?.value||'').trim().toLowerCase();
  const mflt=sel.value;
  let filtered=[...paidItems];
  if(flt) filtered=filtered.filter(p=>p.name.toLowerCase().includes(flt));
  if(mflt!=='all') filtered=filtered.filter(p=>{const d=parseLocalDate(p.date);const mk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return mk===mflt;});
  filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const pl=document.getElementById('PL');
  if(!filtered.length){pl.innerHTML='<div class="empty"><div class="ico">✅</div><p>Henüz ödeme yok</p></div>';return;}
  const grouped={};
  filtered.forEach(p=>{const d=parseLocalDate(p.date);const mk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(!grouped[mk])grouped[mk]=[];grouped[mk].push(p);});
  let html='';
  Object.keys(grouped).sort().reverse().forEach(mk=>{
    const[y,mo]=mk.split('-');
    const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
    const mTotal=grouped[mk].reduce((s,p)=>s+(p.status==='paid'?toTRY(p.amount,p.currency||'TRY'):(p.paid||0)),0);
    html+=`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);padding:10px 0 6px;border-top:1px solid var(--bdr);display:flex;justify-content:space-between"><span>${lbl}</span><span style="color:var(--ok);font-family:'IBM Plex Mono',monospace">${fmt(mTotal)}</span></div>`;
    grouped[mk].forEach(p=>{
      const tryAmt=toTRY(p.amount,p.currency||'TRY');
      const paidAmt=p.status==='paid'?tryAmt:(p.paid||0);
      const isPartial=p.status==='partial';
      html+=`<div style="background:var(--surf);border:1px solid var(--bdr);border-radius:10px;padding:10px 13px;margin-bottom:7px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="min-width:0;flex:1">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${fmtD(p.date)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:${isPartial?'var(--ora)':'var(--ok)'}">${fmt(paidAmt)}</div>
          ${isPartial?`<div style="font-size:10px;color:var(--muted)">${fmt(tryAmt-paidAmt)} kaldı</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button onclick="openPaidEdit('${p.paidId}')" style="background:rgba(192,132,252,.15);color:var(--acc2);border:1px solid rgba(192,132,252,.2);border-radius:6px;padding:4px 7px;font-size:10px;font-weight:600;cursor:pointer">Düzenle</button>
          <button onclick="delPaidItem('${p.paidId}')" style="background:rgba(248,113,113,.12);color:var(--danger);border:1px solid rgba(248,113,113,.2);border-radius:6px;padding:4px 7px;font-size:10px;font-weight:600;cursor:pointer">Sil</button>
        </div>
      </div>`;
    });
  });
  pl.innerHTML=html;
}

function openPaidEdit(paidId) {
  const p=paidItems.find(x=>x.paidId===paidId);if(!p)return;
  document.getElementById('PIEID').value=paidId;
  document.getElementById('PINAM').value=p.name||'';
  document.getElementById('PIAMT').value=p.paid!=null?p.paid:(p.amount||'');
  document.getElementById('PIDAT').value=p.date||'';
  ModalManager.open('PIMOD');
}

function savePaidItem() {
  const paidId=document.getElementById('PIEID').value;
  const p=paidItems.find(x=>x.paidId===paidId);if(!p)return;
  const name=document.getElementById('PINAM').value.trim();
  const amt=parseFloat(document.getElementById('PIAMT').value);
  const date=document.getElementById('PIDAT').value;
  if(!name){alert('Ödeme adı boş olamaz');return;}
  if(isNaN(amt)||amt<0){alert('Geçerli bir tutar girin');return;}
  if(!date.match(/^\d{4}-\d{2}-\d{2}$/)){alert('Tarih YYYY-AA-GG formatında olmalı');return;}
  p.name=name;p.paid=amt;p.date=date;
  saveSecure();closeMov('PIMOD');renderPaid();
}

function delPaidItem(paidId) {
  const p=paidItems.find(x=>x.paidId===paidId);if(!p)return;
  if(!confirm(p.name+' yapılan ödemelerden silinecek. Plan etkilenmez. Emin misin?'))return;
  const idx=paidItems.indexOf(p);if(idx!==-1)paidItems.splice(idx,1);
  saveSecure();renderPaid();
}


// ── GLOBAL COMPAT ─────────────────────────────────────────────────────────────
window.renderPersons      = renderPersons;
window.updateDatalist     = updateDatalist;
window.openAddPerson      = openAddPerson;
window.editPerson         = editPerson;
window.savePerson         = savePerson;
window.delPerson          = delPerson;
window.openPay            = openPay;
window.editPay            = editPay;
window.savePay            = savePay;
window.openCred           = openCred;
window.editCred           = editCred;
window.saveCred           = saveCred;
window.updLP              = updLP;
window.renderHist         = renderHist;
window.editHistItem       = editHistItem;
window.saveHistItem       = saveHistItem;
window.restoreFromHist    = restoreFromHist;
window.delHist            = delHist;
window.clrHist            = clrHist;
window.renderNotes        = renderNotes;
window.openNoteModal      = openNoteModal;
window.editNote           = editNote;
window.saveNote           = saveNote;
window.delNote            = delNote;
window.renderPaid         = renderPaid;
window.openPaidEdit       = openPaidEdit;
window.savePaidItem       = savePaidItem;
window.delPaidItem        = delPaidItem;
