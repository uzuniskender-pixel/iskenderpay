// js/snapshot.js — iskenderpay (v1.0, WO-06)
// Saf snapshot-uygulama karari. firestore.js#_fbStartListen onSnapshot dinleyicisi
// bunu kullanir. DIS BAGIMLILIK YOK (Firestore SDK import etmez) -> sandbox/CI'da
// TEST EDILEBILIR (conflict.js/keyguard.js deseni). SDK kismi saha-test, KARAR CI-kilit.
//
// Girdi:
//   exists           : uzak dokuman var mi (snap.exists())
//   ts               : uzak updatedAt (0 = yok)
//   base             : Store.lastUpdated (en son bildigimiz uzak ts; 0 = ilk sync)
//   lastOwnTs        : bu cihazin EN SON yazdigi updatedAt (echo guard; 0 = yok)
//   hasPendingWrites : snapshot bizim henuz server-ack OLMAMIS yazimimiz mi
//   dirty            : bekleyen yerel degisiklik (kaydedilmemis)
//   saving           : kayit ucusta (saveTimer aktif)
//
// Donus: 'apply' | 'baseline' | 'skip'
//   apply    -> Store.lastUpdated=ts + uzak veriyi uygula (decrypt+hydrate+render)
//   baseline -> Store.lastUpdated=ts, uygulamA (ilk sync VEYA kendi echo'muz)
//   skip     -> hicbir sey yapma
//
// SIRA onemli: echo (lastOwnTs) kontrolu ts>base'den ONCE gelir -> _doSave henuz
// lastUpdated'i set etmeden snapshot dusse bile kendi verimizi yeniden uygulamayiz.
export function classifySnapshot({ exists, ts, base, lastOwnTs, hasPendingWrites, dirty, saving }) {
  if (hasPendingWrites) return 'skip';                       // kendi in-flight yazimimizin echo'su
  if (!exists) return 'skip';                                // uzakta dokuman yok
  if (dirty || saving) return 'skip';                        // bekleyen yerel edit -> uzak ile EZME
  if (lastOwnTs > 0 && ts === lastOwnTs) return 'baseline';  // kendi server-ack yazimimiz: baseline, re-apply YOK
  if (!(base > 0)) return 'baseline';                        // ilk sync (base<=0): baseline kur, uygulamA
  if (ts > base) return 'apply';                             // uzak ileride = baska cihaz yazmis -> UYGULA
  return 'skip';                                             // ts <= base: yeni degil
}
