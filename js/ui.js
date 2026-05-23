// js/ui.js — iskenderpay (v1.0)
// Render fonksiyonları ve UI aksiyonları.
// State window.* üzerinden okunur. Reassignment'lar window.xxx = ile yapılır.

// ── MODÜL-LEVEL DEĞİŞKENLER ──────────────────────────────────────────────────
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

let _logDelMode = 'range';
let _logSelected = new Set();
let _rhbPhones = [];
const RHB_LBL_OPTS = ['Cep','İş','Özel','Ev','Şirket','Diğer'];

// ── KİŞİLER ──────────────────────────────────────────────────────────────────
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

// ── PLAN MATRİSİ ─────────────────────────────────────────────────────────────
function getAllItems() {
  const credPays = [];
  creds.forEach(c => c.pays.forEach((p,ii) => credPays.push({...p, name:c.name, currency:'TRY', _cid:c.id, _ii:p.idx})));
  return [...pays, ...credPays];
}

function buildMx(all) {
  const mx = {};
  all.forEach(p => {
    const d = parseLocalDate(p.date);
    const mk = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const rawKey = p._cid ? 'cred_'+p._cid : (p.groupId ? 'g_'+p.groupId : 'pay_'+String(Math.floor(Number(p.id))));
    if (!mx[rawKey]) mx[rawKey] = {_name:p.name};
    if (!mx[rawKey][mk]) mx[rawKey][mk] = {items:[], status:'pending', try:0};
    mx[rawKey][mk].items.push(p);
    mx[rawKey][mk].try += toTRY(p.amount, p.currency||'TRY');
    // Durum: tümü paid → paid, herhangi partial → partial, herhangi overdue → overdue
    const statuses = mx[rawKey][mk].items.map(x => x.status||'pending');
    if (statuses.every(s => s==='paid')) mx[rawKey][mk].status = 'paid';
    else if (statuses.some(s => s==='partial')) mx[rawKey][mk].status = 'partial';
    else if (statuses.some(s => s!=='paid' && isOD(x => x.date === (x=p,x.date) ? p : x) || isOD(p))) mx[rawKey][mk].status = 'overdue';
    else mx[rawKey][mk].status = 'pending';
  });
  // Durum hesabı düzeltme (item bazlı)
  Object.keys(mx).forEach(rk => {
    Object.keys(mx[rk]).filter(k=>!k.startsWith('_')).forEach(mk => {
      const cell = mx[rk][mk];
      const items = cell.items;
      if (items.every(p => (p.status||'pending')==='paid')) cell.status='paid';
      else if (items.some(p => (p.status||'pending')==='partial')) cell.status='partial';
      else if (items.some(p => (p.status||'pending')!=='paid' && isOD(p))) cell.status='overdue';
      else cell.status='pending';
    });
  });
  return mx;
}

function render() {
  invalidateLookups();
  const all = getAllItems();
  const now = new Date();
  const curMK = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const buAy = all.filter(p => {
    const d = parseLocalDate(p.date);
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
  });
  let tot=0, ok=0, bek=0, gec=0, okN=0, bekN=0, gecN=0;
  buAy.forEach(p => {
    const t = toTRY(p.amount, p.currency||'TRY'); tot+=t;
    const s = p.status||'pending';
    if(s==='paid'){ok+=t;okN++;}else if(isOD(p)){gec+=t;gecN++;}else{bek+=t;bekN++;}
  });
  document.getElementById('OC').innerHTML=`
    <div class="ocard t"><div class="lbl">Bu Ay Toplam</div><div class="val mono">${fmt(tot)}</div><div class="sub">${buAy.length} ödeme</div></div>
    <div class="ocard p"><div class="lbl">Ödendi</div><div class="val">${fmt(ok)}</div><div class="sub">${okN} ödeme</div></div>
    <div class="ocard b"><div class="lbl">Bekliyor</div><div class="val">${fmt(bek)}</div><div class="sub">${bekN} ödeme</div></div>
    <div class="ocard g"><div class="lbl">Gecikmiş</div><div class="val">${fmt(gec)}</div><div class="sub">${gecN} ödeme</div></div>`;
  const pct = tot>0 ? Math.round((ok/tot)*100) : 0;
  document.getElementById('OHS').textContent = `Bu ay ${pct}% ödendi · ${fmt(tot)} toplam`;
  document.getElementById('OD').textContent = now.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
  const mx = buildMx(all);
  const aheadVal = parseInt(localStorage.getItem('v5-ahead')||'6');
  const monthSet = new Set();
  const nowY=now.getFullYear(), nowM=now.getMonth();
  for(let i=0;i<aheadVal;i++){const d=new Date(nowY,nowM+i,1);monthSet.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
  all.forEach(p=>{const d=parseLocalDate(p.date);const mk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const pY=d.getFullYear(),pM=d.getMonth();if(pY<nowY||(pY===nowY&&pM<nowM))monthSet.add(mk);});
  const fltEl = document.getElementById('FLT');
  const fltVal = fltEl ? fltEl.value.trim().toLocaleLowerCase('tr') : '';
  let rowKeys = Object.keys(mx).filter(k=>mx[k]._name!==undefined);
  if(window.sortMode==='name'){
    rowKeys.sort((a,b)=>(mx[a]._name||'').localeCompare(mx[b]._name||'','tr'));
  } else {
    rowKeys.sort((a,b)=>{
      const dayOf=k=>{const mks=Object.keys(mx[k]).filter(x=>!x.startsWith('_')).sort();if(!mks.length)return 99;const items=mx[k][mks[0]]?.items||[];return items[0]?parseLocalDate(items[0].date).getDate():99;};
      const da=dayOf(a),db=dayOf(b);
      if(da!==db)return da-db;
      return (mx[a]._name||'').localeCompare(mx[b]._name||'','tr');
    });
  }
  if(fltVal) rowKeys=rowKeys.filter(k=>(mx[k]._name||'').toLocaleLowerCase('tr').includes(fltVal));
  const nameCountMap={};
  rowKeys.forEach(k=>{const n=mx[k]._name||'';nameCountMap[n]=(nameCountMap[n]||0)+1;});
  const nameIdxMap={};
  rowKeys.forEach(k=>{const n=mx[k]._name||'';if(nameCountMap[n]>1){nameIdxMap[n]=(nameIdxMap[n]||0)+1;mx[k]._displayName=n+' '+nameIdxMap[n];}else{mx[k]._displayName=n;}});
  const allMonths=Array.from(monthSet).sort();
  const months=allMonths.filter(m=>rowKeys.some(k=>{const c=mx[k]?.[m];return c&&c.status!=='paid';}));
  const mLbls=months.map(m=>{const[y,mo]=m.split('-');return new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'short',year:'2-digit'});});
  const colTot=months.map(m=>rowKeys.reduce((s,k)=>{const c=mx[k]&&mx[k][m];if(!c)return s;if(c.status==='paid')return s;if(c.status==='partial')return s+(c.try-c.items.reduce((a,p)=>a+(p.paid||0),0));return s+c.try;},0));
  let html='<table class="mtbl"><thead><tr><th class="rh">Ödeme</th><th style="min-width:32px;max-width:36px;width:32px">Gün</th>';
  months.forEach((m,i)=>html+=`<th${m===curMK?' style="color:var(--acc);font-weight:700"':''}>${mLbls[i]}</th>`);
  html+='<th>Toplam</th></tr></thead><tbody>';
  rowKeys.forEach(k=>{
    const dispName=mx[k]._displayName||mx[k]._name||k;
    const _firstMk=Object.keys(mx[k]).filter(x=>!x.startsWith('_')).sort()[0];
    const _dayNum=_firstMk&&mx[k][_firstMk]?.items?.[0]?.date?parseLocalDate(mx[k][_firstMk].items[0].date).getDate():'';
    html+=`<tr><td class="rh" onclick="openRow('${encodeURIComponent(k)}')" title="${esc(dispName)}">${esc(dispName)}</td><td style="text-align:center;font-size:10px;color:var(--muted);font-family:'IBM Plex Mono',monospace;min-width:32px;max-width:36px;width:32px">${_dayNum}</td>`;
    months.forEach(m=>{
      const c=mx[k]?.[m];
      if(!c||!c.items){html+=`<td class="ce" onclick="openEmptyCell('${encodeURIComponent(k)}','${m}')" style="cursor:pointer;opacity:.35" title="Bu aya ekle">+</td>`;return;}
      const cls=c.status==='paid'?'cp':c.status==='partial'?'ck':c.status==='overdue'?'cg':'cb';
      const orig=c.items.find(x=>x.currency&&x.currency!=='TRY');
      const totalPaid=c.items.reduce((a,p)=>a+(p.paid||0),0);
      const kalan=c.try-totalPaid;
      let cellContent;
      if(c.status==='paid'){cellContent=`<span style="font-size:14px">✓</span>`;}
      else if(c.status==='partial'){const ob2=orig?`<span class="orig-small">${fmtA(orig.amount,orig.currency)}</span>`:'';cellContent=`${fmt(kalan)}${ob2}`;}
      else{const ob2=orig?`<span class="orig-small">${fmtA(orig.amount,orig.currency)}</span>`:'';cellContent=`${fmt(c.try)}${ob2}`;}
      html+=`<td class="${cls}" onclick="openCell('${encodeURIComponent(k)}','${m}')">${cellContent}</td>`;
    });
    const rKalan=months.reduce((acc,m)=>{const c=mx[k]?.[m];if(!c)return acc;if(c.status==='paid')return acc;if(c.status==='partial')return acc+(c.try-c.items.reduce((a,p)=>a+(p.paid||0),0));return acc+c.try;},0);
    html+=`<td style="font-weight:600;color:${rKalan===0?'var(--ok)':'var(--txt)'}">${rKalan===0?'✓':fmt(rKalan)}</td></tr>`;
  });
  html+=`<tr class="tot"><td class="rh">TOPLAM</td><td></td>`;
  colTot.forEach(t=>html+=`<td>${fmt(t)}</td>`);
  html+=`<td>${fmt(colTot.reduce((a,b)=>a+b,0))}</td></tr></tbody></table>`;
  document.getElementById('MAT').innerHTML = rowKeys.length ? html : '<div class="empty"><div class="ico">📋</div><p>Henüz ödeme yok.<br>+ butonuyla ekleyin.</p></div>';
}

// ── DETAY PANELLERİ ───────────────────────────────────────────────────────────
function openRow(keyEnc) {
  const key=decodeURIComponent(keyEnc), all=getAllItems(), mx=buildMx(all);
  const dispName=mx[key]?._displayName||mx[key]?._name||key;
  const months=Object.keys(mx[key]||{}).filter(k=>!k.startsWith('_')).sort();
  let h=`<div class="dtitle">${dispName}</div><div class="dsub">Tüm aylar — tıkla işaretlemek için</div>`;
  months.forEach(m=>{
    const c=mx[key][m];if(!c||!c.items)return;
    const s=c.status||'pending',over=s!=='paid'&&c.items.some(x=>isOD(x));
    const[y,mo]=m.split('-');
    const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
    h+=`<div class="drow">
      <span class="dk">${lbl}</span>
      <span style="display:flex;align-items:center;gap:8px">
        <span class="${sCls(s,over)}" style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600">${fmt(c.try)}</span>
        <span class="${sCls(s,over)}" style="font-size:11px">${sLbl(s,over)}</span>
        ${s!=='paid'?`<button class="dact da-ok" style="padding:3px 8px;font-size:11px;flex:none" onclick="markOk('${encodeURIComponent(key)}','${m}')">✓</button>`:''}
        ${s==='partial'?`<button class="dact da-part" style="padding:3px 8px;font-size:11px;flex:none" onclick="resetPartial('${encodeURIComponent(key)}','${m}')">↺</button>`:''}
        ${s!=='paid'?`<button class="dact da-part" style="padding:3px 8px;font-size:11px;flex:none" onclick="openKM('${encodeURIComponent(key)}','${m}')">½</button>`:''}
        ${(s==='paid'||s==='partial')?`<button class="dact da-undo" style="padding:3px 8px;font-size:11px;flex:none" onclick="undoCell('${encodeURIComponent(key)}','${m}')">↩</button>`:''}
      </span>
    </div>`;
  });
  h+=`<div class="dacts">
    <button class="dact da-edit" onclick="editByKey('${encodeURIComponent(key)}')">Düzenle</button>
    <button class="dact da-del" onclick="delByKey('${encodeURIComponent(key)}')">Sil</button>
    <button class="dact da-close" onclick="closeDV()">Kapat</button>
  </div>`;
  document.getElementById('DC').innerHTML=h;
  ModalManager.open('DV');
}

function openCell(keyEnc,month) {
  const key=decodeURIComponent(keyEnc),all=getAllItems(),mx=buildMx(all);
  const c=mx[key]?.[month];if(!c||!c.items)return;
  const name=mx[key]?._name||key;
  const[y,mo]=month.split('-');
  const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
  const s=c.status||'pending',over=s!=='paid'&&c.items.some(x=>isOD(x));
  const orig=c.items.find(x=>x.currency&&x.currency!=='TRY');
  let h=`<div class="dtitle">${name}</div><div class="dsub">${lbl}</div>`;
  h+=`<div class="drow"><span class="dk">Tutar</span><span class="dv">${fmt(c.try)}${orig?` <span style="font-size:11px;opacity:.65">${fmtA(orig.amount,orig.currency)}</span>`:''}</span></div>`;
  h+=`<div class="drow"><span class="dk">Durum</span><span class="${sCls(s,over)}" style="font-weight:600">${sLbl(s,over)}</span></div>`;
  if(s==='partial') h+=`<div class="drow"><span class="dk">Ödenen</span><span class="dv" style="color:var(--ora)">${fmt(c.items.reduce((a,p)=>a+(p.paid||0),0))}</span></div>`;
  c.items.forEach(p=>{if(p.date)h+=`<div class="drow"><span class="dk">Tarih</span><span class="dv" style="font-family:'Inter',sans-serif">${fmtD(p.date)}</span></div>`;});
  h+=`<div class="dedit">
    <div class="dedit-lbl">Bu Ayın Tutarını Düzenle${orig?' ('+orig.currency+')':' (₺)'}</div>
    <div class="dedit-row">
      <input class="fi mono-inp" id="CEA" type="number" value="${orig?orig.amount:Math.round(c.try)}" inputmode="decimal" style="flex:1;font-size:16px;text-align:center">
      <button onclick="saveCellAmt('${encodeURIComponent(key)}','${month}')" class="btn bs" style="flex:none;padding:10px 13px;font-size:12px">Kaydet</button>
    </div>
    ${orig&&rates[orig.currency]?`<div style="font-size:10px;color:var(--muted);margin-top:5px">1 ${orig.currency==='EUR'?'EUR':'gr'} = ${orig.currency==='EUR'?fmt(rates.EUR):fmt(rates.GOLD)}</div>`:''}
  </div>`;
  const cellKey=encodeURIComponent(key),cellMo=month;
  const isSingleItem=c.items.length===1&&!c.items[0]._cid;
  const delBtn=isSingleItem?`<button class="dact da-del" onclick="delMonthEntry('${encodeURIComponent(String(c.items[0].id))}')">Bu Ayı Sil</button>`:`<button class="dact da-del" onclick="delCellItems('${cellKey}','${cellMo}')">Bu Ayı Sil</button>`;
  const editItem=c.items.find(x=>!x._cid);
  const editBtn=editItem?`<button class="dact da-edit" onclick="closeDV();setTimeout(()=>editPay('${editItem.id}'),50)">Düzenle</button>`:`<button class="dact da-edit" onclick="editByKey('${cellKey}')">Düzenle</button>`;
  h+=`<div class="dacts">
    ${s!=='paid'?`<button class="dact da-ok" onclick="markOk('${cellKey}','${cellMo}')">✓ Ödendi</button>`:''}
    ${s==='partial'?`<button class="dact da-part" onclick="resetPartial('${cellKey}','${cellMo}')">↺ Sıfırla</button>`:''}
    ${(s==='pending'||s==='overdue')?`<button class="dact da-part" onclick="openKM('${cellKey}','${cellMo}')">½ Kısmi</button>`:''}
    ${s==='partial'?`<button class="dact da-part" onclick="openKM('${cellKey}','${cellMo}')">+ Ekle</button>`:''}
    ${(s==='paid'||s==='partial')?`<button class="dact da-undo" onclick="undoCell('${cellKey}','${cellMo}')">↩ Geri Al</button>`:''}
    ${editBtn}${delBtn}
    <button class="dact da-del" onclick="delByKey('${cellKey}')" style="font-size:10px">Tümünü Sil</button>
    <button class="dact da-close" onclick="closeDV()">Kapat</button>
  </div>`;
  document.getElementById('DC').innerHTML=h;
  ModalManager.open('DV');
}

function closeDV()   { ModalManager.close('DV'); }
function closeRDET() { ModalManager.close('RDET'); }

function openEmptyCell(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const name=mx[key]?._name||key.replace(/^(g_|pay_)/,'');
  const[y,mo]=month.split('-');
  const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
  const groupId=key.startsWith('g_')?key.replace('g_',''):null;
  const refItem=groupId
    ?all.filter(p=>p.groupId===groupId&&!p._cid).sort((a,b)=>b.date.localeCompare(a.date))[0]
    :all.filter(p=>p.name===name&&!p._cid).sort((a,b)=>b.date.localeCompare(a.date))[0];
  const refAmt=refItem?refItem.amount:'';
  const refCur=refItem?refItem.currency||'TRY':'TRY';
  const refDay=refItem?parseLocalDate(refItem.date).getDate():1;
  const lastDay=new Date(+y,+mo,0).getDate();
  const day=Math.min(refDay,lastDay);
  const dateStr=`${y}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  let h=`<div class="dtitle">${name}</div><div class="dsub">${lbl} — Bu Aya Ekle</div>`;
  h+=`<div class="dedit" style="margin-top:0;padding-top:0;border-top:none">
    <div class="dedit-lbl" style="margin-bottom:10px">Tutar</div>
    <div class="dedit-row" style="gap:8px;margin-bottom:10px">
      <input class="fi mono-inp" id="ECA" type="number" value="${refAmt}" inputmode="decimal" style="flex:1;font-size:18px;text-align:center" placeholder="0">
      <select class="fi" id="ECC" style="flex:none;width:90px">
        <option value="TRY"${refCur==='TRY'?' selected':''}>₺ TRY</option>
        <option value="EUR"${refCur==='EUR'?' selected':''}>€ EUR</option>
        <option value="GOLD"${refCur==='GOLD'?' selected':''}>Altın</option>
      </select>
    </div>
    <div class="dedit-lbl">Tarih</div>
    <input class="fi" id="ECD" type="date" value="${dateStr}" style="margin-bottom:0">
  </div>`;
  h+=`<div class="dacts" style="margin-top:14px">
    <button class="dact da-ok" onclick="addToMonth('${encodeURIComponent(key)}','${month}')">+ Ekle</button>
    <button class="dact da-close" onclick="closeDV()">İptal</button>
  </div>`;
  document.getElementById('DC').innerHTML=h;
  ModalManager.open('DV');
  setTimeout(()=>document.getElementById('ECA')?.focus(),100);
}

function addToMonth(keyEnc,month) {
  const amt=parseFloat(document.getElementById('ECA').value)||0;
  const cur=document.getElementById('ECC').value;
  const date=document.getElementById('ECD').value;
  if(!amt||!date){alert('Tutar ve tarih zorunlu');return;}
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const name=mx[key]?._name||key.replace(/^(g_|pay_)/,'');
  const groupId=key.startsWith('g_')?key.replace('g_',''):null;
  const refItem=groupId?findPaysByGroup(groupId)[0]:pays.find(p=>p.name===name);
  pays.push({id:Date.now()+Math.random(), groupId:groupId||String(Date.now()), name, amount:amt, currency:cur, date, category:refItem?refItem.category||'Diğer':'Diğer', status:'pending', paid:0});
  saveSecure(); closeDV(); render();
}

// ── ÖDEME DURUM AKSİYONLARI ──────────────────────────────────────────────────
function markOk(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='paid';i.paid=i.amount;}}}
    else{const orig=findPayById(p.id);if(orig){orig.status='paid';orig.paid=toTRY(orig.amount,orig.currency||'TRY');}}
    paidItems.push({...p, paidId:'pi_'+Date.now()+'_'+Math.random(), status:'paid', paid:toTRY(p.amount,p.currency||'TRY'), paidAt:new Date().toISOString()});
    try{addLog('paid','Ödeme yapıldı',(p.name||'')+' · ₺'+Number(toTRY(p.amount,p.currency||'TRY')).toLocaleString('tr-TR',{maximumFractionDigits:0}),1);}catch(e){}
  });
  save().then(()=>{closeDV();render();});
}

function undoCell(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='pending';i.paid=0;}}}
    else{const orig=findPayById(p.id);if(orig){orig.status='pending';orig.paid=0;}}
    const pidx=paidItems.findIndex(x=>String(x.id)===String(p.id)&&x.date===p.date);
    if(pidx>=0) paidItems.splice(pidx,1);
  });
  save().then(()=>{closeDV();render();});
}

function openKM(keyEnc,month) {
  window.partialCtx = {keyEnc, month};
  const key=decodeURIComponent(keyEnc),all=getAllItems(),mx=buildMx(all);
  const c=mx[key]?.[month];
  document.getElementById('KA').value='';
  document.getElementById('KI').textContent=c?fmt(c.try)+' toplam':'';
  closeDV();
  ModalManager.open('KM');
}

function doPartial() {
  const amt=parseFloat(document.getElementById('KA').value)||0;
  if(!amt){alert('Tutar girin');return;}
  const key=decodeURIComponent(window.partialCtx.keyEnc), month=window.partialCtx.month;
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.paid=(i.paid||0)+amt;i.status=i.paid>=i.amount?'paid':'partial';}}}
    else{const orig=findPayById(p.id);if(orig){orig.paid=(orig.paid||0)+amt;orig.status=orig.paid>=toTRY(orig.amount,orig.currency||'TRY')?'paid':'partial';}}
    const existing=paidItems.find(x=>String(x.id)===String(p.id)&&x.date===p.date);
    if(existing){existing.paid=(existing.paid||0)+amt;existing.status=existing.paid>=toTRY(p.amount,p.currency||'TRY')?'paid':'partial';}
    else{paidItems.push({...p, paidId:'pi_'+Date.now()+'_'+Math.random(), status:'partial', paid:amt, paidAt:new Date().toISOString()});}
  });
  save().then(()=>{closeMov('KM');render();});
}

function saveCellAmt(keyEnc,month) {
  const v=parseFloat(document.getElementById('CEA').value)||0;
  if(!v){alert('Geçerli tutar girin');return;}
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i)i.amount=v;}}
    else{const orig=findPayById(p.id);if(orig)orig.amount=v;}
  });
  save().then(()=>{render();openCell(keyEnc,month);});
}

function resetPartial(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='pending';i.paid=0;}}}
    else{const orig=findPayById(p.id);if(orig){orig.status='pending';orig.paid=0;}}
    const pidx=paidItems.findIndex(x=>String(x.id)===String(p.id)&&x.date===p.date);
    if(pidx>=0) paidItems.splice(pidx,1);
  });
  save().then(()=>{closeDV();render();});
}

// ── KAYIT DÜZENLE / SİL ──────────────────────────────────────────────────────
function editByKey(keyEnc) {
  const key=decodeURIComponent(keyEnc);
  closeDV();
  if(key.startsWith('cred_')){
    const credId=key.replace('cred_','');
    const c=findCredById(credId);
    if(c) setTimeout(()=>editCred(c.id),50);
    else alert('Düzenlenecek kayıt bulunamadı.');
  } else if(key.startsWith('g_')){
    const gid=key.replace('g_','');
    const p=findPaysByGroup(gid)[0];
    if(p) setTimeout(()=>editPay(p.id),50);
    else alert('Düzenlenecek kayıt bulunamadı.');
  } else {
    const pid=key.replace('pay_','');
    const p=pays.find(x=>String(Math.floor(Number(x.id)))===pid);
    if(p) setTimeout(()=>editPay(p.id),50);
    else alert('Düzenlenecek kayıt bulunamadı.');
  }
}

function delByKey(keyEnc) {
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const dispName=mx[key]?._displayName||mx[key]?._name||key;
  if(!confirm(dispName+' — tüm aylar silinecek. Emin misin?'))return;
  if(key.startsWith('cred_')){
    const credId=key.replace('cred_','');
    const c=findCredById(credId);
    if(c){c.pays.forEach(p=>hist.unshift({...p,name:c.name,currency:'TRY',delAt:new Date().toISOString()}));try{addLog('plan_del','Kredi silindi',c.name+' · '+c.pays.length+' taksit',0);}catch(e){}}
    window.creds=window.creds.filter(x=>String(x.id)!==credId);
  } else if(key.startsWith('g_')){
    const gid=key.replace('g_','');
    const toDelete=pays.filter(p=>p.groupId===gid);
    toDelete.forEach(p=>hist.unshift({...p,delAt:new Date().toISOString()}));
    try{addLog('plan_del','Kayıt silindi',dispName+' · '+toDelete.length+' ödeme',0);}catch(e){}
    window.pays=window.pays.filter(p=>p.groupId!==gid);
  } else {
    const pid=key.replace('pay_','');
    const toDelete=pays.filter(p=>String(Math.floor(Number(p.id)))===pid);
    toDelete.forEach(p=>hist.unshift({...p,delAt:new Date().toISOString()}));
    try{if(toDelete.length)addLog('plan_del','Kayıt silindi',toDelete[0].name+' · '+fmtAmt(toDelete[0].amount,toDelete[0].currency||'TRY'),0);}catch(e){}
    window.pays=window.pays.filter(p=>String(Math.floor(Number(p.id)))!==pid);
  }
  saveSecure(); closeDV(); render();
}

function delMonthEntry(idEnc) {
  const id=decodeURIComponent(idEnc);
  if(!confirm('Bu aya ait kayıt silinecek. Diğer aylar etkilenmez. Emin misin?'))return;
  const p=findPayById(id);
  if(p){try{addLog('plan_del','Kayıt silindi',p.name+' · '+fmtAmt(p.amount,p.currency||'TRY'),0);}catch(e){};hist.unshift({...p,delAt:new Date().toISOString()});window.pays=pays.filter(x=>String(x.id)!==id);}
  saveSecure(); closeDV(); render();
}

function delCellItems(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  if(!confirm('Bu aydaki kayıtlar silinecek. Emin misin?'))return;
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid) return;
    hist.unshift({...p,delAt:new Date().toISOString()});
    window.pays=window.pays.filter(x=>String(x.id)!==String(p.id));
  });
  saveSecure(); closeDV(); render();
}

// ── ÖDEME CRUD ────────────────────────────────────────────────────────────────
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
  try{
    const _eid3=document.getElementById('EID').value||'';
    const _spn2=document.getElementById('PN').value||'';
    const _spa2=parseFloat(document.getElementById('PA').value)||0;
    const _spc2=document.getElementById('PC').value||'TRY';
    if(_eid3){addLog('plan_edit','Kayıt düzenlendi',_spn2+' · '+fmtAmt(_spa2,_spc2),0);}
    else{addLog('plan_add','Kayıt eklendi',_spn2+' · '+fmtAmt(_spa2,_spc2),0);}
  }catch(e){console.warn('plan log hata:',e);}
  saveSecure(); closeMov('PM2'); render();
}

// ── KREDİ CRUD ────────────────────────────────────────────────────────────────
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

// ── GEÇMİŞ ───────────────────────────────────────────────────────────────────
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

// ── NOTLAR ───────────────────────────────────────────────────────────────────
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

// ── YAPILAN ÖDEMELER ─────────────────────────────────────────────────────────
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

// ── AKTİVİTE LOGU ─────────────────────────────────────────────────────────────
function renderActLog() {
  const el=document.getElementById('ACT_LOG_LIST');if(!el)return;
  const cntEl=document.getElementById('LOG_CNT');if(cntEl)cntEl.textContent=actLog.length+' hareket';
  if(!actLog.length){el.innerHTML='<div class="empty"><div class="ico">📋</div><p>Henüz kayıt yok.</p></div>';return;}
  const selMode=_logDelMode==='select';
  try {
    el.innerHTML=actLog.map((e,i)=>{
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
  if(checked){actLog.forEach((_,i)=>_logSelected.add(i));}else{_logSelected.clear();}
  renderActLog();_updateLogSelCount();
}

function toggleLogItem(idx) {
  if(_logSelected.has(idx))_logSelected.delete(idx);else _logSelected.add(idx);
  _updateLogSelCount();
  const cb=document.getElementById('LOG_CB_'+idx);if(cb)cb.checked=_logSelected.has(idx);
  const allCb=document.getElementById('LOG_SEL_ALL');if(allCb)allCb.checked=_logSelected.size===actLog.length;
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
  const before=actLog.length;
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

// ── REHBER ────────────────────────────────────────────────────────────────────
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
  let list=[...rehber];
  if(q)list=list.filter(p=>rhbGetName(p).toLocaleLowerCase('tr').includes(q)||(p.company||'').toLocaleLowerCase('tr').includes(q)||(p.phones||[]).some(ph=>ph.num.includes(q)));
  const sort=document.getElementById('RHB_SORT')?.value||'name';
  list.sort((a,b)=>{
    if(sort==='lastname'){const la=rhbGetName(a).trim().split(' ').pop()||'';const lb=rhbGetName(b).trim().split(' ').pop()||'';return la.localeCompare(lb,'tr')||rhbGetName(a).localeCompare(rhbGetName(b),'tr');}
    if(sort==='company'){const ca=(a.company||'\uffff').toLocaleLowerCase('tr');const cb=(b.company||'\uffff').toLocaleLowerCase('tr');return ca.localeCompare(cb,'tr')||rhbGetName(a).localeCompare(rhbGetName(b),'tr');}
    return rhbGetName(a).localeCompare(rhbGetName(b),'tr');
  });
  const coSet=[...new Set(rehber.map(p=>p.company).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
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
  const p=rehber.find(x=>String(x.id)===String(id));if(!p)return;
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
      const existKey=new Set(rehber.map(p=>rhbGetName(p)+'|'+(p.phones?.[0]?.num||'')));
      let added=0,skipped=0;
      data.forEach(p=>{const key=rhbGetName(p)+'|'+(p.phones?.[0]?.num||'');if(existKey.has(key)){skipped++;return;}p.id=p.id||Date.now()+added;rehber.push(p);added++;existKey.add(key);});
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
  const p=rehber.find(x=>String(x.id)===String(id));if(!p)return;
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
  if(eid){const p=rehber.find(x=>String(x.id)===String(eid));if(p)Object.assign(p,{name,company,phones,email,note});addLog('rhb_edit','Kişi düzenlendi',name+(company?' · '+company:''),6);}
  else{rehber.push({id:Date.now(),name,company,phones,email,note});addLog('rhb_add','Kişi eklendi',name+(company?' · '+company:'')+(phones[0]?' · '+phones[0].num:''),6);}
  rhbSave();closeMov('RMOD');renderRhb();
}

function rhbDel(id) {
  const p=rehber.find(x=>String(x.id)===String(id));
  if(!confirm(rhbGetName(p)+' silinecek. Emin misin?'))return;
  addLog('rhb_del','Kişi silindi',rhbGetName(p||{})+(p?.company?' · '+p.company:''),6);
  window.rehber=window.rehber.filter(x=>String(x.id)!==String(id));
  rhbSave();closeRDET();renderRhb();
}

// ── GLOBAL COMPAT ─────────────────────────────────────────────────────────────
window.renderPersons      = renderPersons;
window.updateDatalist     = updateDatalist;
window.openAddPerson      = openAddPerson;
window.editPerson         = editPerson;
window.savePerson         = savePerson;
window.delPerson          = delPerson;
window.getAllItems         = getAllItems;
window.buildMx            = buildMx;
window.render             = render;
window.openRow            = openRow;
window.openCell           = openCell;
window.closeDV            = closeDV;
window.closeRDET          = closeRDET;
window.openEmptyCell      = openEmptyCell;
window.addToMonth         = addToMonth;
window.markOk             = markOk;
window.undoCell           = undoCell;
window.openKM             = openKM;
window.doPartial          = doPartial;
window.saveCellAmt        = saveCellAmt;
window.resetPartial       = resetPartial;
window.editByKey          = editByKey;
window.delByKey           = delByKey;
window.delMonthEntry      = delMonthEntry;
window.delCellItems       = delCellItems;
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
window._rhbPhones         = _rhbPhones; // renderRhbPhones inline onclick'leri için
