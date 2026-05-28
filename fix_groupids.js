(function fixGroupIds() {
  let fixed = 0;
  const byGroup = {};
  window.pays.forEach(p => {
    if (!byGroup[p.groupId]) byGroup[p.groupId] = [];
    byGroup[p.groupId].push(p);
  });
  Object.entries(byGroup).forEach(([gid, entries]) => {
    const names = new Set(entries.map(e => e.name));
    if (names.size <= 1) return;
    // Farkli isimler ayni groupId paylasiyor - her isim kendi groupId'sini alsin
    const nameGroups = {};
    entries.forEach(p => {
      if (!nameGroups[p.name]) nameGroups[p.name] = [];
      nameGroups[p.name].push(p);
    });
    Object.entries(nameGroups).forEach(([name, ps]) => {
      const newGid = String(Math.floor(Number(ps[0].id)));
      ps.forEach(p => { p.groupId = newGid; fixed++; });
      console.log(name + ': groupId -> ' + newGid);
    });
  });
  window.saveSecure();
  window.render();
  console.log('Toplam ' + fixed + ' kayit duzeltildi');
})();