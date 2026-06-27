// @ozler/shared — text.js
// TR metin yardimcilari. Ortak yuzey (Faz C / Yol B), date.js ile ayni desen:
// saf ESM, sifir dis bagimlilik, side-effect yok -> hem uys (Vite/TS, build-time)
// hem iskenderpay (tarayici, build'siz, import-map) ayni dosyayi kullanir.
//
// Birlestirdigi kaynaklar (TEK kanonik kopya):
//   - uys src/lib/utils.ts#araNormalize
//   - iskenderpay js/util.js#araNormalize (v8.212'de eklenmisti -> burayi kopruler)

// Arama/filtrede Turkce buyuk/kucuk + aksanli harfleri ASCII'ye katlar.
// JS .toLocaleLowerCase('tr') tek-tarafli kullanimi "DIKME"->"di̇kme" (birlesik nokta)
// yapip eslesmeyi BOZUYORDU; "cay" da "Cay"i kacirIYORDU. Helper IKI tarafa da
// uygulanmali: araNormalize(metin).includes(araNormalize(sorgu)).
// "DIKME"/"DIKME"/"Dikme"/"dikme" -> "dikme"; "Capraz" -> "capraz".
const TR_KATLA = {
  'İ': 'i', 'I': 'i', 'ı': 'i', 'Ş': 's', 'ş': 's', 'Ç': 'c', 'ç': 'c',
  'Ğ': 'g', 'ğ': 'g', 'Ü': 'u', 'ü': 'u', 'Ö': 'o', 'ö': 'o',
  'Â': 'a', 'â': 'a', 'Î': 'i', 'î': 'i', 'Û': 'u', 'û': 'u',
};

/**
 * TR-duyarli arama normalizasyonu (aksana DUYARSIZ).
 * .trim(): kopya/cift-tik sonucu metne sizan bas/son boslugun aramayi bosa
 * dusurmesini onler.
 * @param {unknown} s
 * @returns {string}
 */
export function araNormalize(s) {
  return String(s ?? '')
    .replace(/[İIıŞşÇçĞğÜüÖöÂâÎîÛû]/g, c => TR_KATLA[c] || c)
    .toLowerCase()
    .trim();
}
