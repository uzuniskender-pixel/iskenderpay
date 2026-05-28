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
let _logFilter = 'all'; // 'all' | 'today' | 'week' | 'month'
let _logPersonFilter = ''; // '' = tum kisiler; personId = sadece o kisi (v8.141)

function _passesPersonFilter(entry) {
  return !_logPersonFilter || entry.personId === _logPersonFilter;
}

// Dropdown options'i actLog'tan benzersiz personId'ler + persons.name join ile uret (v8.141)
function _renderLogPersonFilterOptions() {
  const sel = document.getElementById('LOG_FILT_PERSON');
  if (!sel) return;
  const personIdsInLog = new Set();
  (window.actLog || []).forEach(e => { if (e.personId) personIdsInLog.add(e.personId); });
  const personById = new Map((window.persons || []).map(p => [p.id, p.name]));
  const sortedPids = [...personIdsInLog].sort((a, b) =>
    (personById.get(a) || '~').localeCompare(personById.get(b) || '~', 'tr'));
  const opts = ['<option value=""' + (!_logPersonFilter ? ' selected' : '') + '>Tüm kişiler / loglar</option>'];
  sortedPids.forEach(pid => {
    const name = personById.get(pid) || '(silinmiş kişi)';
    const count = (window.actLog || []).filter(e => e.personId === pid).length;
    const isSel = pid === _logPersonFilter ? ' selected' : '';
    opts.push('<option value="' + window.esc(pid) + '"' + isSel + '>' + window.esc(name) + ' (' + count + ')</option>');
  });
  sel.innerHTML = opts.join('');
}

function setLogPersonFilter(pid) {
  _logPersonFilter = pid || '';
  // Filter degisince stale index'leri temizle (gorunmez kayitlarda selection olmasin)
  _logSelected.clear();
  renderActLog();
}

function _passesLogFilter(entry) {
  if (_logFilter === 'all') return true;
  const t = new Date(entry.at);
  if (isNaN(t.getTime())) return false;
  const now = new Date();
  if (_logFilter === 'today') {
    return t.toDateString() === now.toDateString();
  }
  if (_logFilter === 'week') {
    // ISO hafta — Pazartesi 00:00 baslangic
    const wkStart = new Date(now);
    const dow = (wkStart.getDay() + 6) % 7; // Pzt=0, Paz=6
    wkStart.setHours(0,0,0,0);
    wkStart.setDate(wkStart.getDate() - dow);
    return t >= wkStart;
  }
  if (_logFilter === 'month') {
    return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth();
  }
  return true;
}

function setLogFilter(mode) {
  _logFilter = mode;
  ['all','today','week','month'].forEach(m => {
    const b = document.getElementById('LOG_FILTER_' + m.toUpperCase());
    if (!b) return;
    const active = (m === mode);
    b.style.background  = active ? 'rgba(96,165,250,.15)' : '';
    b.style.color       = active ? 'var(--blue)'          : '';
    b.style.borderColor = active ? 'rgba(96,165,250,.3)'  : '';
  });
  _logSelected.clear();
  renderActLog();
}

function renderActLog() {
  const el=document.getElementById('ACT_LOG_LIST');if(!el)return;
  _renderLogPersonFilterOptions();
  const total=window.actLog.length;
  // Date + person filter birlikte uygulanir (v8.141)
  const entries=window.actLog.map((e,i)=>({e,i})).filter(({e})=>_passesLogFilter(e)&&_passesPersonFilter(e));
  const shown=entries.length;
  const filterActive=(_logFilter!=='all')||!!_logPersonFilter;
  const cntEl=document.getElementById('LOG_CNT');
  if(cntEl){
    cntEl.textContent=(!filterActive||shown===total)
      ? total+' hareket'
      : shown+' / '+total+' hareket';
  }
  if(!total){el.innerHTML='<div class="empty"><div class="ico">📋</div><p>Henüz kayıt yok.</p></div>';return;}
  if(!shown){
    const msg=_logPersonFilter?'Bu kişiye ait kayıt yok.':'Bu aralıkta kayıt yok.';
    el.innerHTML='<div class="empty"><div class="ico">🔍</div><p>'+msg+'</p></div>';return;
  }
  const selMode=_logDelMode==='select';
  try {
    el.innerHTML=entries.map(({e,i})=>{
      try {
        const cfg=(LOG_ICONS&&LOG_ICONS[e.type])||{icon:'📋',bg:'rgba(255,255,255,.07)'};
        const time=e.at?window.fmtLogTime(e.at):'';
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
          +'<div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:2px">'
          +  title
          +  (e.personId?`<span onclick="event.stopPropagation();logJumpPerson('${e.personId}')" style="margin-left:5px;font-size:11px;opacity:.55;cursor:pointer" title="Kişiyi göster">👤</span>`:'')
          +  (e.groupId?`<span onclick="event.stopPropagation();logJumpGroup('${e.groupId}')" style="margin-left:3px;font-size:11px;opacity:.55;cursor:pointer" title="Plan matrisinde göster">📋</span>`:'')
          +'</div>'
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

// v8.144: log ikonlarindan plan matrisine / kisilere jump + flash highlight
function logJumpGroup(groupId) {
  go(0);
  setTimeout(() => {
    let row = document.querySelector(`tr[data-row-key="g_${groupId}"]`);
    if (!row) row = document.querySelector(`tr[data-row-key="pay_${groupId}"]`);
    if (!row) return;
    row.scrollIntoView({behavior:'smooth', block:'center'});
    row.classList.add('jump-flash');
    setTimeout(() => row.classList.remove('jump-flash'), 1500);
  }, 100);
}

function logJumpPerson(personId) {
  go(2);
  setTimeout(() => {
    const card = document.querySelector(`[data-person-id="${personId}"]`);
    if (!card) return;
    card.scrollIntoView({behavior:'smooth', block:'center'});
    card.classList.add('jump-flash');
    setTimeout(() => card.classList.remove('jump-flash'), 1500);
  }, 100);
}

function setLogDelMode(mode) {
  _logDelMode=mode;
  document.getElementById('LOG_RANGE_PANEL').style.display=mode==='range'?'':'none';
  document.getElementById('LOG_SEL_PANEL').style.display=mode==='select'?'':'none';
  const personPanel=document.getElementById('LOG_PERSON_PANEL');
  if(personPanel) personPanel.style.display=mode==='person'?'':'none';
  // Mod butonu stilleri
  const setBtnStyle=(id,active)=>{
    const el=document.getElementById(id); if(!el) return;
    el.style.background=active?'rgba(96,165,250,.15)':'';
    el.style.color=active?'var(--blue)':'';
    el.style.borderColor=active?'rgba(96,165,250,.3)':'';
  };
  setBtnStyle('LOG_MODE_RANGE', mode==='range');
  setBtnStyle('LOG_MODE_SEL',   mode==='select');
  setBtnStyle('LOG_MODE_PERSON',mode==='person');
  if(mode==='person') _populateLogPersonSelect();
  if(mode==='select'){_logSelected.clear();renderActLog();}else{renderActLog();}
}

function _populateLogPersonSelect() {
  const sel=document.getElementById('LOG_PERSON_SEL'); if(!sel) return;
  const persons=(window.persons||[]).filter(p => p.id)
    .sort((a,b) => (a.name||'').localeCompare(b.name||'','tr'));
  if(!persons.length){
    sel.innerHTML='<option value="">Listede id\'li kişi yok</option>';
    sel.disabled=true;
    return;
  }
  sel.disabled=false;
  sel.innerHTML='<option value="">— Kişi seçin —</option>'+
    persons.map(p => '<option value="'+p.id+'">'+window.esc(p.name)+'</option>').join('');
}

function toggleSelectAllLogs(checked) {
  if(checked){window.actLog.forEach((e,i)=>{if(_passesLogFilter(e)&&_passesPersonFilter(e))_logSelected.add(i);});}else{_logSelected.clear();}
  renderActLog();_updateLogSelCount();
}

function toggleLogItem(idx) {
  if(_logSelected.has(idx))_logSelected.delete(idx);else _logSelected.add(idx);
  _updateLogSelCount();
  const cb=document.getElementById('LOG_CB_'+idx);if(cb)cb.checked=_logSelected.has(idx);
  const allCb=document.getElementById('LOG_SEL_ALL');
  if(allCb){
    const visibleCount=window.actLog.filter(e=>_passesLogFilter(e)&&_passesPersonFilter(e)).length;
    allCb.checked=_logSelected.size===visibleCount && visibleCount>0;
  }
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
  window.Store.removeWhere('actLog', e => { const t=new Date(e.at).getTime(); return !(t<from||t>to); });
  const deleted=before-window.actLog.length;
  renderActLog();closeLogDel();
  if(deleted>0)alert(deleted+' kayıt silindi.');else alert('Bu aralıkta kayıt bulunamadı.');
}

function doLogDelSelected() {
  if(!_logSelected.size){alert('Önce silinecek kayıtları seçin.');return;}
  if(!confirm(_logSelected.size+' kayıt silinecek. Emin misin?'))return;
  window.Store.removeWhere('actLog', (_, i) => _logSelected.has(i));
  _logSelected.clear();renderActLog();closeLogDel();
}

function doLogDelAll() {
  if(!confirm('Tüm log silinecek. Emin misin?'))return;
  window.Store.replace('actLog', []);renderActLog();closeLogDel();
}

function doLogDelByPerson() {
  const sel=document.getElementById('LOG_PERSON_SEL');
  const pid=sel?sel.value:'';
  if(!pid){alert('Kişi seçin');return;}
  const person=(window.persons||[]).find(p => p.id===pid);
  const name=person?person.name:'(?)';
  if(!confirm('"'+name+'" kişisinin tüm log\'ları silinecek. Emin misin?'))return;
  const before=window.actLog.length;
  window.Store.removeWhere('actLog', e => e.personId===pid);
  const deleted=before-window.actLog.length;
  renderActLog();closeLogDel();
  if(deleted>0)alert(deleted+' kayıt silindi.');else alert('Bu kişiye ait kayıt bulunamadı.');
}


// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.renderActLog       = renderActLog;
window.setLogFilter       = setLogFilter;
window.setLogPersonFilter = setLogPersonFilter;
window.logNav             = logNav;
window.logJumpGroup       = logJumpGroup;
window.logJumpPerson      = logJumpPerson;
window.setLogDelMode      = setLogDelMode;
window.toggleSelectAllLogs= toggleSelectAllLogs;
window.toggleLogItem      = toggleLogItem;
window._updateLogSelCount = _updateLogSelCount;
window.openLogDel         = openLogDel;
window.closeLogDel        = closeLogDel;
window.doLogDel           = doLogDel;
window.doLogDelSelected   = doLogDelSelected;
window.doLogDelAll        = doLogDelAll;
window.doLogDelByPerson   = doLogDelByPerson;
window._populateLogPersonSelect = _populateLogPersonSelect;
