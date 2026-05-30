// vitest.config.js — iskenderpay test konfigurasyonu
// Vanilla JS / ES module yapisina uygun minimal kurulum.
// - environment: happy-dom -> hesap.js'in `window.Hesap = Hesap` ve util.js esc()
//   icin window/document saglar (jsdom'dan hafif, CI'da hizli).
// - include: yalniz tests/ altindaki *.test.js dosyalari.
// - globals: false -> her test dosyasi vitest API'sini acikca import eder.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    globals: false,
    clearMocks: true,
    restoreMocks: true
  }
});
