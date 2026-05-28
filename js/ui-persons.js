// js/ui-persons.js — iskenderpay
// Kişiler ve geçmiş

function renderPersons() {
  const pl = document.getElementById('PRL');
  updateDatalist();
  if (!window.persons.length) {
    pl.innerHTML='<div class="empty"><div class="ico">👥</div><p>Henüz kişi yok.<br>+ Kişi Ekle ile başlayın.</p></div>';
    return;
  }
  const sortedPersons = [...(window.persons||[])].sort((a,b) => a.name.localeCompare(b.name,'tr'));
  pl.innerHTML = `<div style="max-width:480px">` + sortedPersons.map(p => {
    const origIdx = (window.persons||[]).indexOf(p);
    return `<div style="background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rs);padding:9px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="min-width:0;flex:1">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window.esc(p.name)}</div>
        ${p.desc?`<div style="font-size:11px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window.esc(p.desc)}</div>`:''}
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
  const usedNames = window.pays.filter(p => !p._cid).map(p => p.name);
  const options = window.persons.map(p => {
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
    const idx = parseInt(eid);
    const oldName = window.persons[idx].name;
    if (oldName !== name) { window.pays.forEach(p => { if(p.name===oldName) window.Store.mutateItem(p, {name}); }); }
    window.Store.spliceAt('persons', idx, 1, {name, desc});
  } else {
    let finalName = name;
    const existing = window.persons.map(p => p.name);
    if (existing.includes(name)) { let i=2; while(existing.includes(name+' '+i)) i++; finalName=name+' '+i; }
    window.Store.push('persons', {name:finalName, desc});
  }
  window.closeMov('PRM'); renderPersons();
}

function delPerson(i) {
  if (!confirm('Bu kişiyi silmek istiyor musunuz?')) return;
  window.Store.spliceAt('persons', i, 1);
  renderPersons();
}

function renderHist() {
  document.getElementById('HD').textContent=new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
  const hl=document.getElementById('HL');
  if(!window.hist.length){hl.innerHTML='<div class="empty"><div class="ico">🗃️</div><p>Silinmiş ödeme yok</p></div>';return;}
  hl.innerHTML=window.hist.map((p,i)=>`
    <div class="hi">
      <div class="hi-inf"><div class="hi-name">${window.esc(p.name)}</div><div class="hi-date">Silindi: ${new Date(p.delAt).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})} · ${window.fmtD(p.date)}</div></div>
      <div class="hi-amt">${window.fmtA(p.amount,p.currency||'TRY')}</div>
      <button onclick="editHistItem(${i})" style="background:rgba(192,132,252,.15);color:var(--acc2);border:1px solid rgba(192,132,252,.2);border-radius:6px;padding:4px 7px;font-size:10px;font-weight:600;cursor:pointer;flex-shrink:0">Düzenle</button>
      <button onclick="restoreFromHist(${i})" style="background:rgba(74,222,128,.15);color:var(--ok);border:1px solid rgba(74,222,128,.2);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;cursor:pointer;flex-shrink:0">↩ Geri Al</button>
      <button class="hi-del" onclick="delHist(${i})">Sil</button>
    </div>`).join('');
}

function editHistItem(idx) {
  const p=window.hist[idx];if(!p)return;
  document.getElementById('HIIDX').value=idx;
  document.getElementById('HINAM').value=p.name||'';
  document.getElementById('HIAMT').value=p.amount||'';
  document.getElementById('HIDAT').value=p.date||'';
  ModalManager.open('HIMOD');
}

function saveHistItem() {
  const idx=parseInt(document.getElementById('HIIDX').value);
  const p=window.hist[idx];if(!p)return;
  const newName=document.getElementById('HINAM').value.trim();
  const newAmt=parseFloat(document.getElementById('HIAMT').value);
  const newDate=document.getElementById('HIDAT').value;
  const _patch={};
  if(newName) _patch.name=newName;
  if(!isNaN(newAmt)&&newAmt>0) _patch.amount=newAmt;
  if(newDate.match(/^\d{4}-\d{2}-\d{2}$/)) _patch.date=newDate;
  if(Object.keys(_patch).length) window.Store.mutateItem(p, _patch);
  ModalManager.close('HIMOD'); renderHist();
}

function restoreFromHist(i) {
  const p=window.hist[i];if(!p)return;
  const restored={...p};delete restored.delAt;restored.status='pending';restored.paid=0;
  window.Store.push('pays', restored);window.Store.spliceAt('hist', i, 1);
  renderHist(); window.render();
}

function delHist(i) { window.Store.spliceAt('hist', i, 1); renderHist(); }

function clrHist()  { if(!confirm('Tüm geçmişi sil?'))return; window.Store.replace('hist', []); renderHist(); }


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.renderPersons      = renderPersons;
window.updateDatalist     = updateDatalist;
window.openAddPerson      = openAddPerson;
window.editPerson         = editPerson;
window.savePerson         = savePerson;
window.delPerson          = delPerson;
window.renderHist         = renderHist;
window.editHistItem       = editHistItem;
window.saveHistItem       = saveHistItem;
window.restoreFromHist    = restoreFromHist;
window.delHist            = delHist;
window.clrHist            = clrHist;
