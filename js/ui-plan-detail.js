// js/ui-plan-detail.js — iskenderpay (v8.152)
// Detail panel (DV) modal açma fonksiyonları + dialog-flow orchestrator'ları
// (convertToCredit + editByKey — v8.152'de actions.js'ten taşındı).
// ui-plan.js'ten v8.150'de ayrıştırıldı.
// Cross-module çağrılar: window.getAllItems, window.buildMx (render.js);
// window.editCred, window.editPay, window.updLP (ui-pay.js).

import { sCls, sLbl } from './util.js';

// ── DETAIL PANEL (DV) ───────────────────────
function openRow(keyEnc) {
  const key=decodeURIComponent(keyEnc), all=window.getAllItems(), mx=window.buildMx(all);
  const dispName=mx[key]?._displayName||mx[key]?._name||key;
  const months=Object.keys(mx[key]||{}).filter(k=>!k.startsWith('_')).sort();
  // v8.157: kişi adı + groupId çözümü (actLog history için)
  const firstItem=months.length?mx[key][months[0]].items[0]:null;
  const personId=firstItem&&firstItem.personId;
  const groupId=key.startsWith('g_')?key.replace('g_',''):key.startsWith('pay_')?(firstItem&&firstItem.groupId):null;
  const personName=personId?((window.persons||[]).find(p=>p.id===personId)||{}).name:null;
  let h=`<div class="dtitle">${window.esc(dispName)}</div>`;
  if(personName) h+=`<div class="dsub" style="margin-bottom:4px">👤 ${window.esc(personName)}</div>`;
  h+=`<div class="dsub">Tüm aylar — tıkla işaretlemek için</div>`;
  months.forEach(m=>{
    const c=mx[key][m];if(!c||!c.items)return;
    const s=c.status||'pending',over=s!=='paid'&&c.items.some(x=>window.isOD(x));
    const[y,mo]=m.split('-');
    const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
    h+=`<div class="drow">
      <span class="dk">${lbl}</span>
      <span style="display:flex;align-items:center;gap:8px">
        <span class="${sCls(s,over)}" style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600">${window.fmt(c.try)}</span>
        <span class="${sCls(s,over)}" style="font-size:11px">${sLbl(s,over)}</span>
        ${s!=='paid'?`<button class="dact da-ok" style="padding:3px 8px;font-size:11px;flex:none" onclick="markOk('${encodeURIComponent(key)}','${m}')">✓</button>`:''}
        ${s==='partial'?`<button class="dact da-part" style="padding:3px 8px;font-size:11px;flex:none" onclick="resetPartial('${encodeURIComponent(key)}','${m}')">↺</button>`:''}
        ${s!=='paid'?`<button class="dact da-part" style="padding:3px 8px;font-size:11px;flex:none" onclick="openKM('${encodeURIComponent(key)}','${m}')">½</button>`:''}
        ${(s==='paid'||s==='partial')?`<button class="dact da-undo" style="padding:3px 8px;font-size:11px;flex:none" onclick="undoCell('${encodeURIComponent(key)}','${m}')">↩</button>`:''}
      </span>
    </div>`;
  });
  // v8.157: actLog history (groupId varsa, cred için skip — cred'in groupId'si yok)
  if(groupId&&window.actLog){
    const history=(window.actLog||[]).filter(e=>e.groupId===groupId).slice(0,10);
    if(history.length){
      h+=`<div style="margin-top:10px;border-top:1px solid var(--bdr);padding-top:8px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.8px">Aktivite Geçmişi (${history.length})</div>`;
      history.forEach(e=>{
        const time=e.at?window.fmtLogTime(e.at):'';
        const title=e.title?String(e.title):'(?)';
        const detail=e.detail?String(e.detail):'';
        h+=`<div style="display:flex;gap:8px;font-size:11px;padding:3px 0;color:var(--muted)">
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${window.esc(title)}${detail?' · '+window.esc(detail):''}</span>
          <span style="flex-shrink:0;font-size:10px">${window.esc(time)}</span>
        </div>`;
      });
      h+=`</div>`;
    }
  }
  const isCredRow = key.startsWith('cred_');
  h+=`<div class="dacts">
    <button class="dact da-edit" onclick="editByKey('${encodeURIComponent(key)}')">Düzenle</button>
    ${isCredRow?`<button class="dact da-edit" style="background:rgba(251,146,60,.15);border-color:rgba(251,146,60,.4);color:#fdba74" onclick="closeDV();setTimeout(()=>window.openRestructure('${key.replace('cred_','')}'),50)">Yapılandır</button>`:''}
    ${!isCredRow?`<button class="dact da-edit" style="background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.4);color:#a5b4fc" onclick="convertToCredit('${encodeURIComponent(key)}')">Krediye Dönüştür</button>`:''}
    <button class="dact da-del" onclick="delByKey('${encodeURIComponent(key)}')">Sil</button>
    <button class="dact da-close" onclick="closeDV()">Kapat</button>
  </div>`;
  document.getElementById('DC').innerHTML=h;
  ModalManager.open('DV');
}

// _buildPersonHistory: o ay öncesi, refItem'ın kişisi/grubunun paidItems özeti (v8.161)
// Cred cell'lerinde null döner (anlamsız). Öncelik: personId > groupId > name fallback.
function _buildPersonHistory(refItem, currentMonth) {
  if (!refItem || refItem._cid) return null;
  const personId = refItem.personId;
  const groupId  = refItem.groupId;
  const name     = refItem.name;
  const monthStart = currentMonth + '-01';
  const filtered = (window.paidItems || []).filter(pi => {
    if (!pi.date || pi.date >= monthStart) return false;
    if (personId && pi.personId) return pi.personId === personId;
    if (groupId  && pi.groupId)  return pi.groupId  === groupId;
    return pi.name === name;
  });
  if (!filtered.length) return null;
  const totalAmt = filtered.reduce((s, pi) => s + (pi.paid || 0), 0);
  const avgAmt = Math.round(totalAmt / filtered.length);
  const lateItems = filtered.filter(pi => {
    if (!pi.paidAt || !pi.date) return false;
    return new Date(pi.paidAt) > window.parseLocalDate(pi.date);
  });
  const avgLate = lateItems.length
    ? Math.round(lateItems.reduce((s, pi) =>
        s + (new Date(pi.paidAt) - window.parseLocalDate(pi.date)) / 86400000, 0
      ) / lateItems.length)
    : 0;
  return {
    items: [...filtered].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5),
    totalCount: filtered.length,
    avgAmt,
    lateCount: lateItems.length,
    avgLate
  };
}

function openCell(keyEnc,month) {
  const key=decodeURIComponent(keyEnc),all=window.getAllItems(),mx=window.buildMx(all);
  const c=mx[key]?.[month];if(!c||!c.items)return;
  const name=mx[key]?._name||key;
  const[y,mo]=month.split('-');
  const lbl=new Date(+y,+mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
  const s=c.status||'pending',over=s!=='paid'&&c.items.some(x=>window.isOD(x));
  const orig=c.items.find(x=>x.currency&&x.currency!=='TRY');
  let h=`<div class="dtitle">${name}</div><div class="dsub">${lbl}</div>`;
  h+=`<div class="drow"><span class="dk">Tutar</span><span class="dv">${window.fmt(c.try)}${orig?` <span style="font-size:11px;opacity:.65">${window.fmtA(orig.amount,orig.currency)}</span>`:''}</span></div>`;
  h+=`<div class="drow"><span class="dk">Durum</span><span class="${sCls(s,over)}" style="font-weight:600">${sLbl(s,over)}</span></div>`;
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

  // v8.161: o kişinin/grubun bu ay öncesi geçmiş istatistiği
  const insights = _buildPersonHistory(c.items[0], month);
  if (insights) {
    h += `<div style="margin-top:10px;border-top:1px solid var(--bdr);padding-top:8px">
      <div style="font-size:10px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.8px">İstatistik (${insights.totalCount} önceki ödeme)</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0">
        <span style="color:var(--muted)">Ortalama tutar</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-weight:600">${window.fmt(insights.avgAmt)}</span>
      </div>`;
    if (insights.lateCount > 0) {
      h += `<div style="font-size:11px;color:#fcd34d;margin:4px 0">⚠ ${insights.lateCount}/${insights.totalCount} ödeme geç (ort. ${insights.avgLate} gün)</div>`;
    }
    if (insights.items.length) {
      h += `<div style="font-size:10px;color:var(--muted);margin-top:6px;margin-bottom:3px">Son ${insights.items.length} ödeme:</div>`;
      insights.items.forEach(pi => {
        h += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;color:var(--muted)">
          <span>${window.fmtD(pi.date)}</span>
          <span style="font-family:'IBM Plex Mono',monospace">${window.fmt(pi.paid||0)}</span>
        </div>`;
      });
    }
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
  const all=window.getAllItems(),mx=window.buildMx(all);
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

function openKM(keyEnc,month) {
  window.partialCtx = {keyEnc, month};
  const key=decodeURIComponent(keyEnc),all=window.getAllItems(),mx=window.buildMx(all);
  const c=mx[key]?.[month];
  document.getElementById('KA').value='';
  document.getElementById('KI').textContent=c?window.fmt(c.try)+' toplam':'';
  closeDV();
  ModalManager.open('KM');
}

// ── DIALOG FLOW (DV → diğer modal) ──────────
// DV'den başka modal'a geçiş orchestrator'ları. v8.152'de actions.js'ten taşındı.
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
  window.closeDV();
  setTimeout(()=>ModalManager.open('CM'),50);
}

function editByKey(keyEnc) {
  const key=decodeURIComponent(keyEnc);
  window.closeDV();
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

// ── GLOBAL COMPAT ──────────────────────────
window.openRow         = openRow;
window.openCell        = openCell;
window.openEmptyCell   = openEmptyCell;
window.openKM          = openKM;
window.closeDV         = closeDV;
window.closeRDET       = closeRDET;
window.convertToCredit = convertToCredit;
window.editByKey       = editByKey;
