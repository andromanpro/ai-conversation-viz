// Bookmarks panel — показывает все starred-ноды в текущей сессии,
// клик фокусирует камеру и открывает detail-panel. Кнопка ⭐ в HUD
// открывает панель.

import { state } from '../view/state.js';
import { listStarred, getAnnotation } from './annotations.js';
import { showDetail } from './detail-panel.js';

let _btn, _panel, _listEl;

export function initBookmarks() {
  _btn = document.getElementById('btn-bookmarks');
  if (_btn) _btn.addEventListener('click', toggle);
  _panel = ensurePanel();
  updateBadge();
}

export function toggleBookmarks() { toggle(); }

function toggle() {
  if (!_panel) return;
  const open = !_panel.classList.contains('open');
  _panel.classList.toggle('open', open);
  if (open) render();
  if (_btn) _btn.classList.toggle('active-bookmarks', open);
}

/** Вызывается после loadAnnotations — обновляет счётчик на кнопке. */
export function updateBadge() {
  if (!_btn) return;
  const starred = listStarred();
  _btn.textContent = '⭐';
  _btn.title = starred.length
    ? `Bookmarks: ${starred.length} закладок. Клик — открыть список.`
    : 'Bookmarks (B). Выдели ноду и нажми S чтобы отметить.';
  if (starred.length) _btn.dataset.badge = String(starred.length);
  else delete _btn.dataset.badge;
}

function ensurePanel() {
  let el = document.getElementById('bookmarks-panel');
  if (el) return el;
  el = document.createElement('aside');
  el.id = 'bookmarks-panel';
  el.className = 'bookmarks-panel';

  const header = document.createElement('div');
  header.className = 'bookmarks-header';
  const title = document.createElement('span');
  title.textContent = '⭐ Bookmarks';
  header.appendChild(title);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'bookmarks-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', toggle);
  header.appendChild(closeBtn);
  el.appendChild(header);

  _listEl = document.createElement('div');
  _listEl.className = 'bookmarks-list';
  el.appendChild(_listEl);

  const hint = document.createElement('div');
  hint.className = 'bookmarks-hint';
  hint.textContent = 'Выдели ноду и нажми S или ☆ Star в панели детали. Клик здесь — фокус на ноде.';
  el.appendChild(hint);

  // CSS — inline, не трогаем HTML
  const css = document.createElement('style');
  css.textContent = `
    .bookmarks-panel { position: fixed; top: 80px; right: 16px; width: 300px;
      max-height: calc(100vh - 180px); z-index: 22; display: none; flex-direction: column;
      background: var(--panel); border: 1px solid var(--border); border-radius: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; }
    .bookmarks-panel.open { display: flex; }
    .bookmarks-header { display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-bottom: 1px solid var(--border);
      font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); }
    .bookmarks-close { background: transparent; border: 0; color: var(--muted);
      font-size: 18px; cursor: pointer; line-height: 1; padding: 0 4px; }
    .bookmarks-close:hover { color: var(--accent); }
    .bookmarks-list { flex: 1; overflow-y: auto; padding: 6px 0; }
    .bookmarks-empty { padding: 16px; color: var(--muted); font-size: 11px; font-style: italic; }
    .bookmark-item { padding: 8px 14px; cursor: pointer; border-bottom: 1px solid rgba(123,170,240,0.06);
      transition: background .12s; }
    .bookmark-item:hover { background: rgba(255,215,120,0.08); }
    .bookmark-role { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 3px; }
    .bookmark-role.user { color: var(--user); }
    .bookmark-role.assistant { color: var(--assistant); }
    .bookmark-role.tool_use { color: var(--tool); }
    .bookmark-preview { font-size: 11px; color: var(--text); line-height: 1.3;
      max-height: 3em; overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .bookmark-note { font-size: 10px; color: var(--accent); margin-top: 3px;
      font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bookmarks-hint { padding: 10px 14px; font-size: 10px; color: var(--muted);
      border-top: 1px solid var(--border); line-height: 1.5; }
    .btn.active-bookmarks { border-color: #ffd778; color: #ffd778; }
  `;
  document.head.appendChild(css);
  document.body.appendChild(el);
  return el;
}

function render() {
  if (!_listEl) return;
  _listEl.innerHTML = '';
  const starred = listStarred();
  if (!starred.length) {
    const empty = document.createElement('div');
    empty.className = 'bookmarks-empty';
    empty.textContent = 'Нет закладок в этой сессии.';
    _listEl.appendChild(empty);
    updateBadge();
    return;
  }
  // Сортировка: по времени ноды
  const items = starred
    .map(id => state.byId.get(id))
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);
  for (const n of items) {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    const role = document.createElement('div');
    role.className = 'bookmark-role ' + n.role;
    role.textContent = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
    item.appendChild(role);
    const preview = document.createElement('div');
    preview.className = 'bookmark-preview';
    preview.textContent = (n.text || '(empty)').slice(0, 140);
    item.appendChild(preview);
    const ann = getAnnotation(n.id);
    if (ann && ann.text) {
      const note = document.createElement('div');
      note.className = 'bookmark-note';
      note.textContent = '✍ ' + ann.text.slice(0, 80);
      item.appendChild(note);
    }
    item.addEventListener('click', () => focusOnNode(n));
    _listEl.appendChild(item);
  }
  updateBadge();
}

function focusOnNode(n) {
  state.selected = n;
  // Camera zoom — повторяем логику из interaction.js
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = 1.5;
  state.cameraTarget = {
    x: n.x - (w / 2) / scale,
    y: n.y - (h / 2) / scale,
    scale,
  };
  showDetail(n);
}
