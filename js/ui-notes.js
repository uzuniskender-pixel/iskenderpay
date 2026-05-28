// js/ui-notes.js — iskenderpay
// Notlar ve yapılan ödemeler

function renderNotes() {
  const nl=document.getElementById('NL');
  if(!window.notes.length){nl.innerHTML='<div class="empty"><div class="ico">📝</div><p>Henüz not yok.<br>+ Not Ekle ile başlayın.</p></div>';return;}
  window.notes.forEach((n,i)=>{if(!n.nid)n.nid='n'+(Date.now()+i)+'_'+Math.random().toString(36).slice(2,7);});
  const catColors={'Banka / IBAN':'var(--blue)','Şifre / Hesap':'var(--danger)','Telefon / İletişim':'var(--ok)','Genel Not':'var(--muted)'};
  nl.innerHTML=window.notes.map(n=>`
    <div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--r);padding:14px;margin-bottom:9px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-size:14px;font-weight:700">${window.esc(n.title)}</div>
          <div style="font-size:10px;color:${catColors[n.cat]||'var(--muted)'};font-weight:600;margin-top:2px;text-transform:uppercase;letter-spacing:.8px">${window.esc(n.cat||'')}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="editNote('${n.nid}')" style="background:rgba(192,132,252,.15);color:var(--acc2);border:1px solid rgba(192,132,252,.2);border-radius:6px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer">Düzenle</button>
          <button onclick="delNote('${n.nid}')" style="background:rgba(248,113,113,.12);color:var(--danger);border:1px solid rgba(248,113,113,.2);border-radius:6px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer">Sil</button>
        </div>
      </div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--txt);white-space:pre-wrap;background:var(--surf2);border-radius:7px;padding:10px;line-height:1.7;border:1px solid var(--bdr)">${window.esc(n.content)}</div>
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
  const n=window.notes.find(x=>x.nid===nid);if(!n){console.error('editNote: not bulunamadı',nid);return;}
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
  if(eid!==''){const idx=window.notes.findIndex(x=>x.nid===eid);if(idx!==-1){window.Store.mutateItem(window.notes[idx],{title,content,cat,upd:new Date().toISOString()});}}
  else{const nid='n'+Date.now()+'_'+Math.random().toString(36).slice(2,7);window.Store.unshift('notes',{nid,title,content,cat,at:new Date().toISOString()});}
  window.saveNotes(); window.closeMov('NM'); renderNotes();
}

function delNote(nid) {
  if(!confirm('Bu notu silmek istiyor musun?'))return;
  const idx=window.notes.findIndex(x=>x.nid===nid);if(idx!==-1)window.Store.spliceAt('notes', idx, 1);
  window.saveNotes(); renderNotes();
}

function renderPaid() {
  document.getElementById('OPD').textContent=new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
  const monthSet=new Set(window.paidItems.map(p=>{const d=window.parseLocalDate(p.date);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}));
  const months=Array.from(monthSet).sort().reverse();
  const sel=document.getElementById('PFLT2');
  const curVal=sel.value;
  sel.innerHTML='<option value="all">Tüm aylar</option>'+months.map(m=>{const[y,mo]=m.split('-');const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});return`<option value="${m}"${curVal===m?' selected':''}>${lbl}</option>`;}).join('');
  const flt=(document.getElementById('PFLT')?.value||'').trim().toLowerCase();
  const mflt=sel.value;
  let filtered=[...window.paidItems];
  if(flt) filtered=filtered.filter(p=>p.name.toLowerCase().includes(flt));
  if(mflt!=='all') filtered=filtered.filter(p=>{const d=window.parseLocalDate(p.date);const mk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return mk===mflt;});
  filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const pl=document.getElementById('PL');
  if(!filtered.length){pl.innerHTML='<div class="empty"><div class="ico">✅</div><p>Henüz ödeme yok</p></div>';return;}
  const grouped={};
  filtered.forEach(p=>{const d=window.parseLocalDate(p.date);const mk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(!grouped[mk])grouped[mk]=[];grouped[mk].push(p);});
  let html='';
  Object.keys(grouped).sort().reverse().forEach(mk=>{
    const[y,mo]=mk.split('-');
    const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
    const mTotal=grouped[mk].reduce((s,p)=>s+(p.status==='paid'?window.toTRY(p.amount,p.currency||'TRY'):(p.paid||0)),0);
    html+=`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);padding:10px 0 6px;border-top:1px solid var(--bdr);display:flex;justify-content:space-between"><span>${lbl}</span><span style="color:var(--ok);font-family:'IBM Plex Mono',monospace">${window.fmt(mTotal)}</span></div>`;
    grouped[mk].forEach(p=>{
      const tryAmt=window.toTRY(p.amount,p.currency||'TRY');
      const paidAmt=p.status==='paid'?tryAmt:(p.paid||0);
      const isPartial=p.status==='partial';
      html+=`<div style="background:var(--surf);border:1px solid var(--bdr);border-radius:10px;padding:10px 13px;margin-bottom:7px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="min-width:0;flex:1">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window.esc(p.name)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${window.fmtD(p.date)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:${isPartial?'var(--ora)':'var(--ok)'}">${window.fmt(paidAmt)}</div>
          ${isPartial?`<div style="font-size:10px;color:var(--muted)">${window.fmt(tryAmt-paidAmt)} kaldı</div>`:''}
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
  const p=window.paidItems.find(x=>x.paidId===paidId);if(!p)return;
  document.getElementById('PIEID').value=paidId;
  document.getElementById('PINAM').value=p.name||'';
  document.getElementById('PIAMT').value=p.paid!=null?p.paid:(p.amount||'');
  document.getElementById('PIDAT').value=p.date||'';
  ModalManager.open('PIMOD');
}

function savePaidItem() {
  const paidId=document.getElementById('PIEID').value;
  const p=window.paidItems.find(x=>x.paidId===paidId);if(!p)return;
  const name=document.getElementById('PINAM').value.trim();
  const amt=parseFloat(document.getElementById('PIAMT').value);
  const date=document.getElementById('PIDAT').value;
  if(!name){alert('Ödeme adı boş olamaz');return;}
  if(isNaN(amt)||amt<0){alert('Geçerli bir tutar girin');return;}
  if(!date.match(/^\d{4}-\d{2}-\d{2}$/)){alert('Tarih YYYY-AA-GG formatında olmalı');return;}
  window.Store.mutateItem(p, {name, paid:amt, date});
  window.saveSecure();window.closeMov('PIMOD');renderPaid();
}

function delPaidItem(paidId) {
  const p=window.paidItems.find(x=>x.paidId===paidId);if(!p)return;
  if(!confirm(p.name+' yapılan ödemelerden silinecek. Plan etkilenmez. Emin misin?'))return;
  const idx=window.paidItems.indexOf(p);if(idx!==-1)window.Store.spliceAt('paidItems', idx, 1);
  window.saveSecure();renderPaid();
}


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.renderNotes        = renderNotes;
window.openNoteModal      = openNoteModal;
window.editNote           = editNote;
window.saveNote           = saveNote;
window.delNote            = delNote;
window.renderPaid         = renderPaid;
window.openPaidEdit       = openPaidEdit;
window.savePaidItem       = savePaidItem;
window.delPaidItem        = delPaidItem;
