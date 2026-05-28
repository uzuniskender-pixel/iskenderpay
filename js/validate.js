// js/validate.js — iskenderpay (v1.0)
// pays/creds/persons schema validation. Hata yakalanir ama save iptal EDILMEZ
// (forensic icin sadece console.error/warn). v8.135'te persist.js'ten ayristirildi.
// Genisletme adayi (v9.0): notes/paidItems/rehber/hist/actLog icin ayri validator'lar.

function validateBeforeSave() {
  let errN = 0;
  try {
    (window.pays||[]).forEach((p,i) => {
      if (p.id === undefined || p.id === null)          { console.error('[integrity] pays['+i+'] id yok', p); errN++; }
      if (typeof p.name !== 'string')                    { console.error('[integrity] pays['+i+'] name string degil', p); errN++; }
      if (typeof p.amount !== 'number' || isNaN(p.amount)){ console.error('[integrity] pays['+i+'] amount gecersiz', p); errN++; }
      if (typeof p.date !== 'string')                    { console.error('[integrity] pays['+i+'] date string degil', p); errN++; }
      if (!p.groupId)                                    { console.error('[integrity] pays['+i+'] groupId yok', p); errN++; }
    });
    (window.creds||[]).forEach((c,i) => {
      if (c.id === undefined || c.id === null)             { console.error('[integrity] creds['+i+'] id yok', c); errN++; }
      if (typeof c.name !== 'string')                       { console.error('[integrity] creds['+i+'] name string degil', c); errN++; }
      if (typeof c.monthly !== 'number' || isNaN(c.monthly)){ console.error('[integrity] creds['+i+'] amount(monthly) gecersiz', c); errN++; }
    });
    (window.persons||[]).forEach((pr,i) => {
      if (!pr.id)                       { console.error('[integrity] persons['+i+'] id yok', pr); errN++; }
      if (typeof pr.name !== 'string')  { console.error('[integrity] persons['+i+'] name string degil', pr); errN++; }
    });
    if (errN > 0) console.warn('[integrity] toplam '+errN+' veri hatasi tespit edildi — kayit yine de yapiliyor');
  } catch(e) {
    console.warn('[integrity] check hatasi:', e);
  }
  return errN;
}

window.validateBeforeSave = validateBeforeSave;
