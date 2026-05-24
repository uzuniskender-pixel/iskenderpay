// js/log.js — iskenderpay
// Aktivite logu render, filtre, sil

const LOG_ICONS = {
  plan_add:{icon:'📅',bg:'rgba(96,165,250,.15)'},
  plan_del:{icon:'🗑️',bg:'rgba(248,113,113,.15)'},
  plan_edit:{icon:'✏️',bg:'rgba(251,191,36,.15)'},
  paid:{icon:'✅',bg:'rgba(74,222,128,.15)'},
  rhb_add:{icon:'👤',bg:'rgba(167,139,250,.15)'},
  rhb_edit:{icon:'✏️',bg:'rgba(251,191,36,.15)'},
  rhb_del:{icon:'🗑️',bg:'rgba(248,113,113,.15)'},
  rhb_import:{icon:'📥',bg:'rgba(96,165,250,.15)'},
  hist_del:{icon:'🗑️',bg:'rgba(248,113,113,.15)'},
  restore:{icon:'↩️',bg:'rgba(74,222,128,.15)'},
  cred_add:{icon:'💳',bg:'rgba(251,191,36,.15)'},
  default:{icon:'📋',bg:'rgba(255,255,255,.07)'},
};
let _logDelMode = 'range';
let _logSelected = new Set();

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


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
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
