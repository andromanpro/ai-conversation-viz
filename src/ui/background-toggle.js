// Background mode controller — wraps drop-in LavaBackgrounds library.
// 7 WebGL2 шейдеров для full-screen фона за всем UI.
//
// API (window.LavaBackgrounds должен быть подгружен через <script>):
//   LavaBackgrounds.init(canvas, { mode, dark })
//   LavaBackgrounds.setMode(mode)
//   LavaBackgrounds.setTheme(theme)
//   LavaBackgrounds.destroy()
//
// Сохранение выбора в localStorage. Default — 'none' чтобы не сюрприз
// при первой загрузке (и чтобы не давать дополнительной нагрузки тем
// кому это не нужно).

import { state } from '../view/state.js';

const KEY = 'viz:bg-mode';
export const BG_MODES = [
  { id: 'none',     label: 'None',           emoji: '·' },
  { id: 'space',    label: 'Space',          emoji: '🌌' },
  { id: 'aurora',   label: 'Aurora',         emoji: '🌠' },
  { id: 'embers',   label: 'Embers',         emoji: '🔥' },
  { id: 'grid',     label: 'Synthwave',      emoji: '🎮' },
  { id: 'rain',     label: 'Rain',           emoji: '🌧' },
  { id: 'ocean',    label: 'Ocean',          emoji: '🌊' },
  { id: 'abstract', label: 'Abstract blobs', emoji: '🫧' },
];

let _initialized = false;
let _currentMode = 'none';

export function initBackground() {
  if (typeof window === 'undefined') return;
  if (typeof window.LavaBackgrounds === 'undefined') {
    // Скрипт не подгрузился (offline/file:// без bundle) — silently skip
    return;
  }
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  const mode = (saved && BG_MODES.some(m => m.id === saved)) ? saved : 'none';
  _currentMode = mode;
  state.bgMode = mode;
  try {
    window.LavaBackgrounds.init(canvas, { mode, dark: true });
    _initialized = true;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[background] init failed:', e.message);
  }
}

export function setBackgroundMode(mode) {
  if (!BG_MODES.some(m => m.id === mode)) return;
  _currentMode = mode;
  state.bgMode = mode;
  try { localStorage.setItem(KEY, mode); } catch {}
  if (_initialized && window.LavaBackgrounds) {
    try { window.LavaBackgrounds.setMode(mode); } catch (e) {}
  }
}

export function getCurrentBgMode() { return _currentMode; }

// Dropdown UI — кнопка #btn-bg раскрывает меню. Стили `.samples-menu`
// переиспользуем (одинаковая идиома). Иконка кнопки = эмодзи текущего mode.
export function initBackgroundDropdown(buttonId) {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById(buttonId || 'btn-bg');
  if (!btn) return;
  function syncBtnLabel() {
    const cur = BG_MODES.find(m => m.id === _currentMode) || BG_MODES[0];
    btn.textContent = cur.emoji;
    btn.title = 'Background: ' + cur.label;
  }
  syncBtnLabel();
  btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const existing = document.getElementById('bg-menu');
    if (existing) { existing.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
    const menu = document.createElement('div');
    menu.id = 'bg-menu';
    menu.className = 'samples-menu';
    menu.setAttribute('role', 'menu');
    const rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.zIndex = '100';
    menu.style.minWidth = '180px';

    let outsideHandler = null;
    const escHandler = (e) => { if (e.key === 'Escape') closeMenu(); };
    const closeMenu = () => {
      menu.remove();
      btn.setAttribute('aria-expanded', 'false');
      if (outsideHandler) {
        document.removeEventListener('click', outsideHandler);
        document.removeEventListener('keydown', escHandler);
      }
    };

    for (const m of BG_MODES) {
      const item = document.createElement('button');
      item.className = 'samples-menu-item';
      item.setAttribute('role', 'menuitem');
      item.textContent = m.emoji + '  ' + m.label + (m.id === _currentMode ? '  ✓' : '');
      item.addEventListener('click', () => {
        closeMenu();
        setBackgroundMode(m.id);
        syncBtnLabel();
      });
      menu.appendChild(item);
    }
    document.body.appendChild(menu);
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      outsideHandler = (e) => {
        if (!menu.contains(e.target) && e.target !== btn) closeMenu();
      };
      document.addEventListener('click', outsideHandler);
      document.addEventListener('keydown', escHandler);
    }, 0);
  });
}
