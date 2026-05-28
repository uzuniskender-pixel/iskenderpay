// js/ui-plan.js — iskenderpay
// Plan matrisi, hücre detayları, ödeme durum aksiyonları

// ── DATA / HESAPLAMA ─────────────────────────────────────────────────────
function getAllItems() {
  const credPays = [];
  window.creds.forEach(c => c.pays.forEach((p,ii) => credPays.push({...p, name:c.name, currency:'TRY', _cid:c.id, _ii:p.idx})));
  return [...window.pays, ...credPays];
}

function buildMx(all) {
  const mx = {};
  all.forEach(p => {
    const d = window.parseLocalDate(p.date);
    const mk = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const rawKey = p._cid ? 'cred_'+p._cid : (p.groupId ? 'g_'+p.groupId : 'pay_'+String(Math.floor(Number(p.id))));
    if (!mx[rawKey]) mx[rawKey] = {_name:p.name};
    if (!mx[rawKey][mk]) mx[rawKey][mk] = {items:[], status:'pending', try:0};
    mx[rawKey][mk].items.push(p);
    mx[rawKey][mk].try += window.toTRY(p.amount, p.currency||'TRY');
  });
  // Durum hesabı düzeltme (item bazlı)
  Object.keys(mx).forEach(rk => {
    Object.keys(mx[rk]).filter(k=>!k.startsWith('_')).forEach(mk => {
      const cell = mx[rk][mk];
      const items = cell.items;
      if (items.every(p => (p.status||'pending')==='paid')) cell.status='paid';
      else if (items.some(p => (p.status||'pending')==='partial')) cell.status='partial';
      else if (items.some(p => (p.status||'pending')!=='paid' && window.isOD(p))) cell.status='overdue';
      else cell.status='pending';
    });
  });
  return mx;
}

// ── ANA RENDER ───────────────────────────────────────────────────────────
function render() {
  const all = getAllItems();
  const now = new Date();
  const curMK = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const ozet = window.Hesap.buAyOzeti({all});
  const tot = ozet.tot, ok = ozet.ok, bek = ozet.bek, gec = ozet.gec;
  const okN = ozet.okN, bekN = ozet.bekN, gecN = ozet.gecN;
  // Sayfa başlığında geciken ödeme sayısı
  document.title = gecN > 0 ? `(${gecN} gecikmiş) iskenderpay` : 'iskenderpay';

  // Mobil nav badge — Plan butonuna gecikmiş sayısı
  const navPlan = document.getElementById('m0');
  if (navPlan) {
    navPlan.innerHTML = gecN > 0
      ? `📊 Plan <span style="background:var(--danger);color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700;margin-left:3px">${gecN}</span>`
      : '📊 Plan';
  }

  // 7 gün içi yaklaşan ödemeleri hesapla
  const today0 = window.todayMidnight();
  const soon7 = new Date(today0.getTime() + 7*24*60*60*1000);
  const yaklaşanN = all.filter(p => {
    if((p.status||'pending')==='paid') return false;
    if(p._cid) return false;
    const d = window.parseLocalDate(p.date);
    return d >= today0 && d <= soon7;
  }).length;

  document.getElementById('OC').innerHTML=`
    <div class="ocard t"><div class="lbl">Bu Ay Toplam</div><div class="val mono">${window.fmt(tot)}</div><div class="sub">${ozet.itemCount} ödeme</div></div>
    <div class="ocard p"><div class="lbl">Ödendi</div><div class="val">${window.fmt(ok)}</div><div class="sub">${okN} ödeme</div></div>
    <div class="ocard b"><div class="lbl">Bekliyor</div><div class="val">${window.fmt(bek)}</div><div class="sub">${yaklaşanN>0?`<span style="color:var(--ora)">⚡ ${yaklaşanN} bu hafta</span>`:bekN+' ödeme'}</div></div>
    <div class="ocard g"><div class="lbl">Gecikmiş</div><div class="val">${window.fmt(gec)}</div><div class="sub">${gecN} ödeme</div></div>`;
  const pct = tot>0 ? Math.round((ok/tot)*100) : 0;
  const pctColor = pct>=100?'var(--ok)':pct>=60?'var(--blue)':pct>=30?'var(--ora)':'var(--danger)';
  document.getElementById('OHS').innerHTML = `<div style="display:flex;align-items:center;gap:8px">
    <div style="flex:1;height:4px;background:var(--surf2);border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:2px;transition:width .4s"></div>
    </div>
    <span style="font-size:10px;font-family:'IBM Plex Mono',monospace;color:${pctColor};font-weight:600;flex-shrink:0">${pct}%</span>
  </div>`;
  document.getElementById('OD').textContent = now.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
  const mx = buildMx(all);
  const aheadVal = parseInt(localStorage.getItem('v5-ahead')||'6');
  const monthSet = new Set();
  const nowY=now.getFullYear(), nowM=now.getMonth();
  for(let i=0;i<aheadVal;i++){const d=new Date(nowY,nowM+i,1);monthSet.add(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));}
  all.forEach(p=>{const d=window.parseLocalDate(p.date);const mk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const pY=d.getFullYear(),pM=d.getMonth();if(pY<nowY||(pY===nowY&&pM<nowM))monthSet.add(mk);});
  const fltEl = document.getElementById('FLT');
  const fltVal = fltEl ? fltEl.value.trim().toLocaleLowerCase('tr') : '';
  let rowKeys = Object.keys(mx).filter(k=>mx[k]._name!==undefined);
  if(window.sortMode==='name'){
    rowKeys.sort((a,b)=>(mx[a]._name||'').localeCompare(mx[b]._name||'','tr'));
  } else {
    rowKeys.sort((a,b)=>{
      const dayOf=k=>{const mks=Object.keys(mx[k]).filter(x=>!x.startsWith('_')).sort();if(!mks.length)return 99;const items=mx[k][mks[0]]?.items||[];return items[0]?window.parseLocalDate(items[0].date).getDate():99;};
      const da=dayOf(a),db=dayOf(b);
      if(da!==db)return da-db;
      return (mx[a]._name||'').localeCompare(mx[b]._name||'','tr');
    });
  }
  if(fltVal) rowKeys=rowKeys.filter(k=>(mx[k]._name||'').toLocaleLowerCase('tr').includes(fltVal));
  // Display name (paylasilan logic — kredi paneliyle ayni)
  const dnMap = window.Hesap._displayNames(mx, rowKeys);
  rowKeys.forEach(k => { mx[k]._displayName = dnMap[k]; });
  const allMonths=Array.from(monthSet).sort();
  const showPaid = localStorage.getItem('v8-show-paid') === '1';
  const months = showPaid
    ? allMonths
    : allMonths.filter(m=>rowKeys.some(k=>{const c=mx[k]?.[m];return c&&c.status!=='paid';}));
  // Toggle buton görünümü
  const tb = document.getElementById('PAID_TOGGLE');
  if (tb) {
    tb.style.background = showPaid ? 'rgba(74,222,128,.15)' : 'var(--surf2)';
    tb.style.color = showPaid ? 'var(--ok)' : 'var(--muted)';
    tb.style.borderColor = showPaid ? 'rgba(74,222,128,.3)' : 'var(--bdr)';
    tb.textContent = showPaid ? '✓ Ödendiler gizle' : '✓ Ödendiler';
  }
  const mLbls=months.map(m=>{const[y,mo]=m.split('-');return new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'short',year:'2-digit'});});
  const colTot=months.map(m=>rowKeys.reduce((s,k)=>{const c=mx[k]&&mx[k][m];if(!c)return s;if(c.status==='paid')return s;if(c.status==='partial')return s+(c.try-c.items.reduce((a,p)=>a+(p.paid||0),0));return s+c.try;},0));
  let html='<table class="mtbl"><thead><tr><th class="rh">Ödeme</th><th style="min-width:32px;max-width:36px;width:32px">Gün</th>';
  months.forEach((m,i)=>html+=`<th${m===curMK?' style="color:var(--acc);font-weight:700"':''}>${mLbls[i]}</th>`);
  html+='<th>Toplam</th></tr></thead><tbody>';
  rowKeys.forEach(k=>{
    const dispName=mx[k]._displayName||mx[k]._name||k;
    const _firstMk=Object.keys(mx[k]).filter(x=>!x.startsWith('_')).sort()[0];
    const _dayNum=_firstMk&&mx[k][_firstMk]?.items?.[0]?.date?window.parseLocalDate(mx[k][_firstMk].items[0].date).getDate():'';
    html+=`<tr><td class="rh" onclick="openRow('${encodeURIComponent(k)}')" title="${window.esc(dispName)}">${window.esc(dispName)}</td><td style="text-align:center;font-size:10px;color:var(--muted);font-family:'IBM Plex Mono',monospace;min-width:32px;max-width:36px;width:32px">${_dayNum}</td>`;
    months.forEach(m=>{
      const c=mx[k]?.[m];
      if(!c||!c.items){html+=`<td class="ce" onclick="openEmptyCell('${encodeURIComponent(k)}','${m}')" style="cursor:pointer;opacity:.35" title="Bu aya ekle">+</td>`;return;}
      const isSoon=c.status!=='paid'&&c.items.some(p=>{const d=window.parseLocalDate(p.date);return d>=today0&&d<=soon7;});
      const cls=c.status==='paid'?'cp':c.status==='partial'?'ck':c.status==='overdue'?'cg':isSoon?'cy':'cb';
      const orig=c.items.find(x=>x.currency&&x.currency!=='TRY');
      const totalPaid=c.items.reduce((a,p)=>a+(p.paid||0),0);
      const kalan=c.try-totalPaid;
      let cellContent;
      if(c.status==='paid'){cellContent=`<span style="font-size:14px">✓</span>`;}
      else if(c.status==='partial'){const ob2=orig?`<span class="orig-small">${window.fmtA(orig.amount,orig.currency)}</span>`:'';cellContent=`${window.fmt(kalan)}${ob2}`;}
      else{const ob2=orig?`<span class="orig-small">${window.fmtA(orig.amount,orig.currency)}</span>`:'';cellContent=`${window.fmt(c.try)}${ob2}`;}
      html+=`<td class="${cls}" onclick="openCell('${encodeURIComponent(k)}','${m}')">${cellContent}</td>`;
    });
    const rKalan=months.reduce((acc,m)=>{const c=mx[k]?.[m];if(!c)return acc;if(c.status==='paid')return acc;if(c.status==='partial')return acc+(c.try-c.items.reduce((a,p)=>a+(p.paid||0),0));return acc+c.try;},0);
    html+=`<td style="font-weight:600;color:${rKalan===0?'var(--ok)':'var(--txt)'}">${rKalan===0?'✓':window.fmt(rKalan)}</td></tr>`;
  });
  html+=`<tr class="tot"><td class="rh">TOPLAM</td><td></td>`;
  colTot.forEach(t=>html+=`<td>${window.fmt(t)}</td>`);
  html+=`<td>${window.fmt(colTot.reduce((a,b)=>a+b,0))}</td></tr></tbody></table>`;
  document.getElementById('MAT').innerHTML = rowKeys.length ? html : '<div class="empty"><div class="ico">📋</div><p>Henüz ödeme yok.<br>+ butonuyla ekleyin.</p></div>';

  // Mevcut aya scroll
  requestAnimationFrame(() => {
    const mwrap = document.querySelector('.mwrap');
    const curTh = document.querySelector('.mtbl th[style*="color:var(--acc)"]');
    if (mwrap && curTh) {
      const thLeft = curTh.offsetLeft;
      const mwrapW = mwrap.offsetWidth;
      mwrap.scrollLeft = Math.max(0, thLeft - 180); // sticky rh sütunu payı
    }
  });

  // Bu hafta widget'ı
  renderHaftaWidget(all, now, soon7);
  if (window.renderSiradaki) window.renderSiradaki();
  // renderCredSummary decoupled (v9.0): ui-pay.js listener cagiriyor
}

// ── HAFTA WİDGET ─────────────────────────────────────────────────────────
function renderGecWidget(all) {
  const el = document.getElementById('HAFTA');
  if (!el) return null; // HAFTA elementini paylaşıyoruz, gecikmiş önce render edilecek
  const today = window.todayMidnight();
  const gecikmiş = all.filter(p => {
    if ((p.status||'pending') === 'paid') return false;
    if (p._cid) return false;
    return window.parseLocalDate(p.date) < today;
  }).sort((a,b) => window.parseLocalDate(a.date) - window.parseLocalDate(b.date));
  return gecikmiş;
}

function renderHaftaWidget(all, now, soon7) {
  const el = document.getElementById('HAFTA');
  if (!el) return;
  const today = window.todayMidnight();
  const soon7mid = new Date(today.getTime() + 7*24*60*60*1000);
  const yaklaşan = all.filter(p => {
    if ((p.status||'pending') === 'paid') return false;
    if (p._cid) return false; // kredi taksitlerini ayrı gösterme (matriste zaten var)
    const d = window.parseLocalDate(p.date);
    return d >= today && d <= soon7mid;
  }).sort((a,b) => window.parseLocalDate(a.date) - window.parseLocalDate(b.date));

  if (!yaklaşan.length) { el.innerHTML = ''; return; }

  const rows = yaklaşan.map(p => {
    const d = window.parseLocalDate(p.date);
    const gun = d.getDate(), ay = d.toLocaleDateString('tr-TR',{month:'short'});
    const kalan = Math.round((d - today) / 86400000);
    const kalanStr = kalan === 0 ? '<span style="color:var(--danger);font-weight:700">Bugün!</span>'
      : kalan === 1 ? '<span style="color:var(--ora)">Yarın</span>'
      : `<span style="color:#fcd34d">${kalan} gün</span>`;
    const tryAmt = window.toTRY(p.amount, p.currency||'TRY');
    const rawKey = p.groupId ? 'g_'+p.groupId : 'pay_'+String(Math.floor(Number(p.id)));
    const keyEnc = encodeURIComponent(rawKey);
    const mKey = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--surf2);border-radius:8px;margin-bottom:5px;cursor:pointer" onclick="openCell('${keyEnc}','${mKey}')">
      <div style="min-width:36px;text-align:center;background:rgba(252,211,77,.15);border-radius:6px;padding:3px 0">
        <div style="font-size:13px;font-weight:700;color:#fcd34d">${gun}</div>
        <div style="font-size:9px;color:var(--muted)">${ay}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window.esc(p.name)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace">${window.fmt(tryAmt)}</div>
        <div style="font-size:10px">${kalanStr}</div>
      </div>
    </div>`;
  }).join('');

  const gecList = renderGecWidget(all);
  let gecHTML = '';
  if (gecList && gecList.length) {
    const gecRows = gecList.slice(0,5).map(p => {
      const d = window.parseLocalDate(p.date);
      const gun = d.getDate(), ay = d.toLocaleDateString('tr-TR',{month:'short'});
      const gecGun = Math.round((window.todayMidnight() - d) / 86400000);
      const tryAmt = window.toTRY(p.amount, p.currency||'TRY');
      const rawKey = p.groupId ? 'g_'+p.groupId : 'pay_'+String(Math.floor(Number(p.id)));
      const mKey = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:rgba(248,113,113,.08);border-radius:8px;margin-bottom:5px;cursor:pointer" onclick="openCell('${encodeURIComponent(rawKey)}','${mKey}')">
        <div style="min-width:36px;text-align:center;background:rgba(248,113,113,.2);border-radius:6px;padding:3px 0">
          <div style="font-size:13px;font-weight:700;color:#fca5a5">${gun}</div>
          <div style="font-size:9px;color:var(--muted)">${ay}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${window.esc(p.name)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:12px;font-weight:600;font-family:'IBM Plex Mono',monospace;color:#fca5a5">${window.fmt(tryAmt)}</div>
          <div style="font-size:10px;color:var(--danger)">${gecGun} gün gecikti</div>
        </div>
      </div>`;
    }).join('');
    const artı = gecList.length > 5 ? `<div style="font-size:10px;color:var(--muted);text-align:center;padding-top:4px">+${gecList.length-5} daha</div>` : '';
    gecHTML = `<div style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.25);border-radius:10px;padding:10px 12px;margin:0 0 8px">
      <div style="font-size:10px;font-weight:700;color:#fca5a5;letter-spacing:.8px;margin-bottom:8px">⚠ GECİKMİŞ — ${gecList.length} ödeme</div>
      ${gecRows}${artı}
    </div>`;
  }

  el.innerHTML = gecHTML + (yaklaşan.length ? `<div style="background:rgba(252,211,77,.08);border:1px solid rgba(252,211,77,.2);border-radius:10px;padding:10px 12px;margin:0 0 10px">
    <div style="font-size:10px;font-weight:700;color:#fcd34d;letter-spacing:.8px;margin-bottom:8px">⚡ BU HAFTA — ${yaklaşan.length} ödeme</div>
    ${rows}
  </div>` : '');
}

// ── DETAIL PANEL (DV) ────────────────────────────────────────────────────
function openRow(keyEnc) {
  const key=decodeURIComponent(keyEnc), all=getAllItems(), mx=buildMx(all);
  const dispName=mx[key]?._displayName||mx[key]?._name||key;
  const months=Object.keys(mx[key]||{}).filter(k=>!k.startsWith('_')).sort();
  let h=`<div class="dtitle">${dispName}</div><div class="dsub">Tüm aylar — tıkla işaretlemek için</div>`;
  months.forEach(m=>{
    const c=mx[key][m];if(!c||!c.items)return;
    const s=c.status||'pending',over=s!=='paid'&&c.items.some(x=>window.isOD(x));
    const[y,mo]=m.split('-');
    const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
    h+=`<div class="drow">
      <span class="dk">${lbl}</span>
      <span style="display:flex;align-items:center;gap:8px">
        <span class="${window.sCls(s,over)}" style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600">${window.fmt(c.try)}</span>
        <span class="${window.sCls(s,over)}" style="font-size:11px">${window.sLbl(s,over)}</span>
        ${s!=='paid'?`<button class="dact da-ok" style="padding:3px 8px;font-size:11px;flex:none" onclick="markOk('${encodeURIComponent(key)}','${m}')">✓</button>`:''}
        ${s==='partial'?`<button class="dact da-part" style="padding:3px 8px;font-size:11px;flex:none" onclick="resetPartial('${encodeURIComponent(key)}','${m}')">↺</button>`:''}
        ${s!=='paid'?`<button class="dact da-part" style="padding:3px 8px;font-size:11px;flex:none" onclick="openKM('${encodeURIComponent(key)}','${m}')">½</button>`:''}
        ${(s==='paid'||s==='partial')?`<button class="dact da-undo" style="padding:3px 8px;font-size:11px;flex:none" onclick="undoCell('${encodeURIComponent(key)}','${m}')">↩</button>`:''}
      </span>
    </div>`;
  });
  const isCredRow = key.startsWith('cred_');
  h+=`<div class="dacts">
    <button class="dact da-edit" onclick="editByKey('${encodeURIComponent(key)}')">Düzenle</button>
    ${!isCredRow?`<button class="dact da-edit" style="background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.4);color:#a5b4fc" onclick="convertToCredit('${encodeURIComponent(key)}')">Krediye Dönüştür</button>`:''}
    <button class="dact da-del" onclick="delByKey('${encodeURIComponent(key)}')">Sil</button>
    <button class="dact da-close" onclick="closeDV()">Kapat</button>
  </div>`;
  document.getElementById('DC').innerHTML=h;
  ModalManager.open('DV');
}

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
  closeDV();
  setTimeout(()=>ModalManager.open('CM'),50);
}

function openCell(keyEnc,month) {
  const key=decodeURIComponent(keyEnc),all=getAllItems(),mx=buildMx(all);
  const c=mx[key]?.[month];if(!c||!c.items)return;
  const name=mx[key]?._name||key;
  const[y,mo]=month.split('-');
  const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
  const s=c.status||'pending',over=s!=='paid'&&c.items.some(x=>window.isOD(x));
  const orig=c.items.find(x=>x.currency&&x.currency!=='TRY');
  let h=`<div class="dtitle">${name}</div><div class="dsub">${lbl}</div>`;
  h+=`<div class="drow"><span class="dk">Tutar</span><span class="dv">${window.fmt(c.try)}${orig?` <span style="font-size:11px;opacity:.65">${window.fmtA(orig.amount,orig.currency)}</span>`:''}</span></div>`;
  h+=`<div class="drow"><span class="dk">Durum</span><span class="${window.sCls(s,over)}" style="font-weight:600">${window.sLbl(s,over)}</span></div>`;
  if(s==='partial') h+=`<div class="drow"><span class="dk">Ödenen</span><span class="dv" style="color:var(--ora)">${window.fmt(c.items.reduce((a,p)=>a+(p.paid||0),0))}</span></div>`;
  c.items.forEach(p=>{if(p.date)h+=`<div class="drow"><span class="dk">Tarih</span><span class="dv" style="font-family:'Inter',sans-serif">${window.fmtD(p.date)}</span></div>`;});
  const isCreditCell = c.items.length > 0 && c.items.every(x => x._cid);
  const creditAmt = isCreditCell ? (()=>{ const cr=window.findCredById(c.items[0]._cid); const ti=cr&&cr.pays.find(x=>x.idx===c.items[0]._ii); return ti?Math.round(ti.amount):Math.round(c.try); })() : null;
  h+=`<div class="dedit">
    <div class="dedit-lbl">${isCreditCell?'Bu Taksiti Düzenle (₺)':'Bu Ayın Tutarını Düzenle'+(orig?' ('+orig.currency+')':' (₺)')}</div>
    <div class="dedit-row">
      <input class="fi mono-inp" id="CEA" type="number" value="${isCreditCell?creditAmt:(orig?orig.amount:Math.round(c.try))}" inputmode="decimal" style="flex:1;font-size:16px;text-align:center">
      <button onclick="saveCellAmt('${encodeURIComponent(key)}','${month}')" class="btn bs" style="flex:none;padding:10px 13px;font-size:12px">Kaydet</button>
    </div>
    ${orig&&window.rates[orig.currency]?`<div style="font-size:10px;color:var(--muted);margin-top:5px">1 ${orig.currency==='EUR'?'EUR':'gr'} = ${orig.currency==='EUR'?window.fmt(window.rates.EUR):window.fmt(window.rates.GOLD)}</div>`:''}
  </div>`;
  const cellKey=encodeURIComponent(key),cellMo=month;
  const isSingleItem=c.items.length===1&&!c.items[0]._cid;
  const delBtn=isSingleItem?`<button class="dact da-del" onclick="delMonthEntry('${encodeURIComponent(String(c.items[0].id))}')">Bu Ayı Sil</button>`:`<button class="dact da-del" onclick="delCellItems('${cellKey}','${cellMo}')">Bu Ayı Sil</button>`;
  const editItem=c.items.find(x=>!x._cid);
  const editBtn=editItem?`<button class="dact da-edit" onclick="closeDV();setTimeout(()=>window.editPay('${editItem.id}'),50)">Düzenle</button>`:isCreditCell?`<button class="dact da-edit" onclick="editByKey('${cellKey}')">Tüm Krediyi Düzenle</button>`:`<button class="dact da-edit" onclick="editByKey('${cellKey}')">Düzenle</button>`;
  // Geçmiş ödemeler
  const cellPaidHistory = (window.paidItems||[]).filter(pi =>
    c.items.some(x => String(x.id) === String(pi.id) || (x.name === pi.name && pi.date && pi.date.startsWith(month.slice(0,7))))
  );
  if (cellPaidHistory.length) {
    h += `<div style="margin-top:10px;border-top:1px solid var(--bdr);padding-top:8px">
      <div style="font-size:10px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.8px">Yapılan Ödemeler</div>`;
    cellPaidHistory.forEach(pi => {
      h += `<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--muted)">
        <span>${window.fmtD(pi.date||'')}</span>
        <span style="color:var(--ok);font-family:'IBM Plex Mono',monospace;font-weight:600">${window.fmt(pi.paid||0)}</span>
      </div>`;
    });
    h += `</div>`;
  }

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
  const refDay=refItem?window.parseLocalDate(refItem.date).getDate():1;
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

// ── HÜCRE CRUD ───────────────────────────────────────────────────────────
function addToMonth(keyEnc,month) {
  const amt=parseFloat(document.getElementById('ECA').value)||0;
  const cur=document.getElementById('ECC').value;
  const date=document.getElementById('ECD').value;
  if(!amt||!date){alert('Tutar ve tarih zorunlu');return;}
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const name=mx[key]?._name||key.replace(/^(g_|pay_)/,'');
  const groupId=key.startsWith('g_')?key.replace('g_',''):null;
  const refItem=groupId?window.findPaysByGroup(groupId)[0]:window.pays.find(p=>p.name===name);
  const newGroupId=groupId||String(Date.now());
  window.Store.push('pays', {id:Date.now()+Math.random(), groupId:newGroupId, name, amount:amt, currency:cur, date, category:refItem?refItem.category||'Diğer':'Diğer', status:'pending', paid:0});
  window.addLog('plan_add', 'Kayıt eklendi', name+' · '+window.fmtAmt(amt,cur), 0, {groupId: newGroupId});
  closeDV();
}

function markOk(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='paid';i.paid=i.amount;}}}
    else{const orig=window.findPayById(p.id);if(orig){orig.status='paid';orig.paid=window.toTRY(orig.amount,orig.currency||'TRY');}}
    window.Store.push('paidItems', {...p, paidId:'pi_'+Date.now()+'_'+Math.random(), status:'paid', paid:window.toTRY(p.amount,p.currency||'TRY'), paidAt:new Date().toISOString()});
    try{window.addLog('paid','Ödeme yapıldı',(p.name||'')+' · ₺'+Number(window.toTRY(p.amount,p.currency||'TRY')).toLocaleString('tr-TR',{maximumFractionDigits:0}),1,{groupId:p.groupId});}catch(e){}
  });
  window.Store.touch(); closeDV();
}

function undoCell(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='pending';i.paid=0;}}}
    else{const orig=window.findPayById(p.id);if(orig){orig.status='pending';orig.paid=0;}}
    const pidx=window.paidItems.findIndex(x=>String(x.id)===String(p.id)&&x.date===p.date);
    if(pidx>=0) window.Store.spliceAt('paidItems', pidx, 1);
    try{window.addLog('plan_undo','Ödeme geri alındı',(p.name||'')+' · ₺'+Number(window.toTRY(p.amount,p.currency||'TRY')).toLocaleString('tr-TR',{maximumFractionDigits:0}),1,{groupId:p.groupId});}catch(e){}
  });
  window.Store.touch(); closeDV();
}

function openKM(keyEnc,month) {
  window.partialCtx = {keyEnc, month};
  const key=decodeURIComponent(keyEnc),all=getAllItems(),mx=buildMx(all);
  const c=mx[key]?.[month];
  document.getElementById('KA').value='';
  document.getElementById('KI').textContent=c?window.fmt(c.try)+' toplam':'';
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
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i)i.amount=v;}}
    else{const orig=window.findPayById(p.id);if(orig)orig.amount=v;}
  });
  window.Store.touch(); openCell(keyEnc, month);
}

function resetPartial(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid){const c=window.findCredById(p._cid);if(c){const i=c.pays.find(x=>x.idx===p._ii);if(i){i.status='pending';i.paid=0;}}}
    else{const orig=window.findPayById(p.id);if(orig){orig.status='pending';orig.paid=0;}}
    const pidx=window.paidItems.findIndex(x=>String(x.id)===String(p.id)&&x.date===p.date);
    if(pidx>=0) window.Store.spliceAt('paidItems', pidx, 1);
  });
  window.Store.touch(); closeDV();
}

// ── SATIR / AY CRUD ──────────────────────────────────────────────────────
function editByKey(keyEnc) {
  const key=decodeURIComponent(keyEnc);
  closeDV();
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
  const all=getAllItems(),mx=buildMx(all);
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
    try{window.addLog('plan_del','Kayıt silindi',dispName+' · '+toDelete.length+' ödeme',0,{groupId:gid});}catch(e){}
    window.Store.removeWhere('pays', p => p.groupId===gid);
  } else {
    const pid=key.replace('pay_','');
    const toDelete=window.pays.filter(p=>String(Math.floor(Number(p.id)))===pid);
    toDelete.forEach(p=>window.Store.unshift('hist',{...p,delAt:new Date().toISOString()}));
    try{if(toDelete.length)window.addLog('plan_del','Kayıt silindi',toDelete[0].name+' · '+window.fmtAmt(toDelete[0].amount,toDelete[0].currency||'TRY'),0,{groupId:toDelete[0].groupId});}catch(e){}
    window.Store.removeWhere('pays', p => String(Math.floor(Number(p.id)))===pid);
  }
  closeDV();
}

function delMonthEntry(idEnc) {
  const id=decodeURIComponent(idEnc);
  if(!confirm('Bu aya ait kayıt silinecek. Diğer aylar etkilenmez. Emin misin?'))return;
  const p=window.findPayById(id);
  if(p){try{window.addLog('plan_del','Kayıt silindi',p.name+' · '+window.fmtAmt(p.amount,p.currency||'TRY'),0,{groupId:p.groupId});}catch(e){};window.Store.unshift('hist',{...p,delAt:new Date().toISOString()});window.Store.removeWhere('pays', x => String(x.id)===id);}
  closeDV();
}

function delCellItems(keyEnc,month) {
  const key=decodeURIComponent(keyEnc);
  if(!confirm('Bu aydaki kayıtlar silinecek. Emin misin?'))return;
  const all=getAllItems(),mx=buildMx(all);
  const items=(mx[key]?.[month]?.items)||[];
  items.forEach(p=>{
    if(p._cid) return;
    window.Store.unshift('hist',{...p,delAt:new Date().toISOString()});
    window.Store.removeWhere('pays', x => String(x.id)===String(p.id));
  });
  closeDV();
}



// ── EVENT + TOGGLE ───────────────────────────────────────────────────────
// Store mutation -> 'store:change' event -> active tab 0 ise render
window.addEventListener('store:change', e => {
  if (window.curTab !== 0) return;
  if (window.Store && window.Store._affects(e.detail, ['pays','creds','paidItems'])) render();
});

// ── GLOBAL COMPAT ─────────────────────────────────────────────────────────────
window.getAllItems         = getAllItems;
window.buildMx            = buildMx;
window.render             = render;
window.renderHaftaWidget  = renderHaftaWidget;
window.renderGecWidget    = renderGecWidget;
window.openRow            = openRow;
window.convertToCredit    = convertToCredit;
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

// ── ÖDENDI AY TOGGLE ─────────────────────────────────────────────────────────
function togglePaidMonths() {
  const current = localStorage.getItem('v8-show-paid') === '1';
  localStorage.setItem('v8-show-paid', current ? '0' : '1');
  window.render();
}
window.togglePaidMonths = togglePaidMonths;
