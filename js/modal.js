// js/modal.js — iskenderpay (v1.0)
// Modal yönetim sistemi. index.html'den taşındı.

const _open = new Set();

function open(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  _open.add(id);
  document.body.style.overflow = 'hidden';
}

function close(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  _open.delete(id);
  if (_open.size === 0) document.body.style.overflow = '';
}

function closeAll() {
  _open.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  _open.clear();
  document.body.style.overflow = '';
}

// Click-outside + data-modal-open/close attribute desteği
document.addEventListener('click', e => {
  if ((e.target.classList.contains('mov') || e.target.classList.contains('dov')) && e.target.id) {
    close(e.target.id);
    return;
  }
  const openBtn = e.target.closest('[data-modal-open]');
  if (openBtn) { open(openBtn.dataset.modalOpen); return; }
  const closeBtn = e.target.closest('[data-modal-close]');
  if (closeBtn) { close(closeBtn.dataset.modalClose); return; }
});

// ESC tuşu — en üstteki modalı kapat
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _open.size > 0) close([..._open].pop());
});

export const ModalManager = { open, close, closeAll };

// Global compat — index.html inline kodu ModalManager.open/close/closeAll kullanıyor
window.ModalManager = ModalManager;
window.closeMov = (id) => close(id);

// ── GLOBAL COMPAT ──────────────────────────────────────────────────────────
window.ModalManager = ModalManager;
window.closeMov     = (id) => close(id);
