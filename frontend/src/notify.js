/**
 * notify.js — Toast notification system
 */

export function notify(message, type = 'success') {
  const $n = document.getElementById('notification');
  if (!$n) return;
  $n.textContent = message;
  $n.className = `fp-notification fp-notification--${type} visible`;
  setTimeout(() => $n.classList.remove('visible'), 3000);
}
