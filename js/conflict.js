// js/conflict.js — iskenderpay (v1.0)
// Saf cakisma karari (optimistic concurrency / compare-and-swap kapisi).
// firestore.js#_fbSave bunu kullanir. DIS BAGIMLILIK YOK (SDK import etmez) ->
// sandbox/CI'da TEST EDILEBILIR (firestore.js gstatic SDK import ettiginden test
// edilemiyordu; v8.199 DEVAM_NOTU'nda "saf shouldBlock cikarilabilir" notu).
//
// base  = en son bildigimiz UZAK updatedAt (Store.lastUpdated). 0 = bilinmiyor / ilk yazim.
// remoteTs = su an Firestore'daki updatedAt.
// Karar: base > 0 VE uzak ondan ILERIDE ise baska cihaz bizden sonra yazmis demektir
//        -> yazmayi BLOKLA (cagiran uzak veriyi yukler + uyarir). Aksi halde yaz.
//   base <= 0          -> bloklamA (ilk yazim / baseline yok)
//   remoteTs === base  -> bloklamA (senkronuz; kendi son yazimimiz)
//   remoteTs <  base   -> bloklamA (uzak geride/yok)
//   remoteTs >  base   -> BLOKLA  (uzak ileride = baska cihaz yazmis)
export function shouldBlock(remoteTs, base) {
  return base > 0 && remoteTs > base;
}
