/**
 * modal.js — Modal open/close utilities and Escape key handler
 */

export function closeModal(modal) {
  if (!modal || !modal.classList.contains('visible')) return;
  modal.classList.add('hiding');
  // Wait for animation to finish before hiding
  setTimeout(() => {
    modal.classList.remove('visible');
    modal.classList.remove('hiding');
  }, 250);
}

export function bindEscapeClose() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modals = Array.from(document.querySelectorAll('.fp-modal.visible'));
      if (modals.length > 0) {
        const modalToClose = modals[modals.length - 1];
        // Simulate click on the modal overlay which triggers the close handler
        modalToClose.click();
      }
    }
  });
}
