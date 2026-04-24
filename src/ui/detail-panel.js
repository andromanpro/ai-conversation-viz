import { CFG } from '../core/config.js';
import { state } from '../view/state.js';
import { getAnnotation, setAnnotation, toggleStar } from './annotations.js';

let detailEl, detailRoleEl, detailTsEl, detailBodyEl;
let starBtn, noteTextarea, noteHint;
let _currentNode = null;
let _saveTimer = null;

export function initDetail() {
  detailEl = document.getElementById('detail');
  detailRoleEl = document.getElementById('detail-role');
  detailTsEl = document.getElementById('detail-ts');
  detailBodyEl = document.getElementById('detail-body');
  document.getElementById('detail-close').addEventListener('click', () => {
    flushNote();
    state.selected = null;
    hideDetail();
  });
  ensureAnnotationUI();
}

function ensureAnnotationUI() {
  if (!detailEl) return;
  if (starBtn && noteTextarea) return;

  // Secure: создаём DOM-ноды без innerHTML — user text сюда не попадает,
  // но шаблон всё равно пишем программно для единообразия с остальным UI.
  const wrap = document.createElement('div');
  wrap.className = 'detail-annot';

  // Row: [⭐ Star] [✍ hint]
  const row = document.createElement('div');
  row.className = 'detail-annot-row';

  starBtn = document.createElement('button');
  starBtn.className = 'detail-star';
  starBtn.type = 'button';
  starBtn.textContent = '☆ Star';
  starBtn.title = 'Отметить (S)';
  starBtn.addEventListener('click', () => {
    if (!_currentNode) return;
    toggleStar(_currentNode.id);
    updateAnnotUI();
  });
  row.appendChild(starBtn);

  noteHint = document.createElement('span');
  noteHint.className = 'detail-note-hint';
  noteHint.textContent = 'Note (сохраняется в localStorage):';
  row.appendChild(noteHint);

  wrap.appendChild(row);

  noteTextarea = document.createElement('textarea');
  noteTextarea.className = 'detail-note';
  noteTextarea.rows = 3;
  noteTextarea.placeholder = 'Ваша заметка к этой ноде…';
  noteTextarea.addEventListener('input', () => {
    // Debounce — сохраняем через 400мс после остановки ввода
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      if (_currentNode) {
        setAnnotation(_currentNode.id, { text: noteTextarea.value });
      }
    }, 400);
  });
  // Гарантируем сохранение при blur (переключение фокуса, закрытие панели)
  noteTextarea.addEventListener('blur', flushNote);
  wrap.appendChild(noteTextarea);

  detailEl.appendChild(wrap);

  // CSS — inline, чтобы не трогать HTML-файлы
  const css = document.createElement('style');
  css.textContent = `
    .detail-annot { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); }
    .detail-annot-row { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; font-size: 10px; }
    .detail-star { background: transparent; border: 1px solid var(--border); color: var(--muted);
      padding: 3px 9px; cursor: pointer; font-family: inherit; font-size: 10px;
      letter-spacing: 0.08em; border-radius: 2px; transition: all .15s; }
    .detail-star:hover { color: var(--text); border-color: var(--user); }
    .detail-star.starred { color: #ffd778; border-color: #ffd778; background: rgba(255,215,120,0.08); }
    .detail-note-hint { color: var(--muted); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; }
    .detail-note { width: 100%; background: rgba(255,255,255,0.02); border: 1px solid var(--border);
      color: var(--text); font-family: inherit; font-size: 11px; padding: 6px 8px;
      border-radius: 2px; resize: vertical; outline: none; }
    .detail-note:focus { border-color: var(--assistant); }
    .detail-note::placeholder { color: var(--muted); }
  `;
  document.head.appendChild(css);
}

function flushNote() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  if (_currentNode && noteTextarea) {
    setAnnotation(_currentNode.id, { text: noteTextarea.value });
  }
}

function updateAnnotUI() {
  if (!_currentNode || !starBtn || !noteTextarea) return;
  const ann = getAnnotation(_currentNode.id);
  const starred = !!(ann && ann.starred);
  starBtn.classList.toggle('starred', starred);
  starBtn.textContent = starred ? '★ Starred' : '☆ Star';
  noteTextarea.value = (ann && ann.text) || '';
}

export function showDetail(n) {
  // Если переключаемся между нодами — сохраним заметку предыдущей
  if (_currentNode && _currentNode.id !== n.id) flushNote();
  _currentNode = n;
  detailRoleEl.textContent = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
  detailRoleEl.className = 'role ' + n.role;
  detailTsEl.textContent = new Date(n.ts).toISOString().replace('T', ' ').slice(0, 19);
  const txt = n.text || '(empty)';
  detailBodyEl.textContent = txt.length > CFG.excerptChars ? txt.slice(0, CFG.excerptChars) + '…' : txt;
  updateAnnotUI();
  detailEl.classList.add('show');
}

export function hideDetail() {
  flushNote();
  _currentNode = null;
  if (detailEl) detailEl.classList.remove('show');
}

/** Вызывается из keyboard.js для hotkey S */
export function toggleStarOnCurrent() {
  if (_currentNode) {
    toggleStar(_currentNode.id);
    updateAnnotUI();
    return true;
  }
  return false;
}
