// js/state.js
// iskenderpay — Merkezi Durum Yönetimi Modülü (v8.16)

/**
 * Uygulamanın bellekte tuttuğu tüm ham şifresiz çalışma dizileri (Merkezi State)
 * Kapsülleme (Encapsulation) kuralları gereği doğrudan window'a bağlanmak yerine 
 * modül içinde korunur ve sadece export edilen referansla okunur.
 */
export const state = {
  pays: [],       // Ana ödeme planı girdileri (Matris tablosu)
  creds: [],      // Kredi ve taksit takip kayıtları
  paidItems: [],  // Plandan bağımsız gerçekleştirilen fiili ödeme kayıtları
  hist: [],       // Silinen ödemelerin geçmişi
  persons: [],    // Kişi / firma listesi
  notes: [],      // Şifreli kişisel notlar
  rehber: [],     // Rehber (kişi detayları)
  actLog: []      // Aktivite logları
};

// Aktif plan seçimi (Açılışta localStorage'dan beslenir, default: plan1)
window._planId = localStorage.getItem('v6-active-plan') || 'plan1';

/**
 * State içerisindeki bir diziyi güvenli bir şekilde güncellemek için kullanılır.
 * @param {string} key - Güncellenecek dizi adı (örn: 'pays')
 * @param {Array} newData - Yeni veri dizisi
 */
export function updateState(key, newData) {
  if (state[key] !== undefined && Array.isArray(newData)) {
    state[key] = newData;
  } else {
    console.warn(`[State Warning] Geçersiz anahtar veya veri formatı: ${key}`);
  }
}

/**
 * Oturum kapatıldığında veya PIN temizlendiğinde 
 * bellekten hassas verilerin izini tamamen siler.
 */
export function clearState() {
  Object.keys(state).forEach(k => {
    state[k] = [];
  });
  console.log("[State] Bellekteki tüm kullanıcı verileri temizlendi.");
}