// Theme toggle (dark ↔ light). CSS-vars в :root и :root[data-theme="light"]
// в HTML определяют все цвета — JS просто переключает атрибут на <html>.
//
// Renderer (Canvas 2D + WebGL) читает --canvas-vig-*, --canvas-star-alpha
// в каждом кадре через getComputedStyle, поэтому переключение мгновенное.

import { state } from '../view/state.js';
import { t } from '../core/i18n.js';

const KEY = 'viz:theme';
let _btn = null;

export function initThemeToggle() {
  // Восстановим сохранённую тему
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  if (saved === 'light' || saved === 'dark') state.theme = saved;
  applyTheme(state.theme || 'dark');

  _btn = document.getElementById('btn-theme');
  if (_btn) _btn.addEventListener('click', toggleTheme);
  window.addEventListener('languagechange', updateBtn);
  updateBtn();
}

export function toggleTheme() {
  const next = state.theme === 'light' ? 'dark' : 'light';
  state.theme = next;
  applyTheme(next);
  try { localStorage.setItem(KEY, next); } catch {}
  updateBtn();
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (theme === 'light') html.setAttribute('data-theme', 'light');
  else html.removeAttribute('data-theme');
}

function updateBtn() {
  if (!_btn) return;
  const isLight = state.theme === 'light';
  _btn.textContent = isLight ? '🌙' : '☀';
  _btn.title = isLight ? t('tip.theme_dark') : t('tip.theme_light');
  _btn.setAttribute('aria-label', t('aria.theme'));
}
