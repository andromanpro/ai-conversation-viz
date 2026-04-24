// Session picker — in-memory список JSONL-сессий. Пользователь кидает
// несколько файлов одновременно (или указывает ?sessions=<index.json>),
// и может переключаться между ними через боковую панель.
//
// Локальный режим: каждая загруженная сессия хранится в state.sessions как
//   { id, name, size, content, meta: { nodes?, edges?, firstTs?, lastTs? } }
// Контент храним прямо в памяти — это JSONL-строка, после parseJSONL её
// можно заново превращать в граф. Для 30MB сессии это ~30MB в RAM,
// на 5 сессий = 150MB — приемлемо для браузерного UX.
//
// Remote режим: URL параметр ?sessions=<url> указывает на JSON-индекс
//   { sessions: [{ id, title, url, mtime?, size? }, ...] }
// Контент подгружается по требованию (fetch() при клике на элемент).

import { state } from '../view/state.js';
import { parseJSONL } from '../core/parser.js';
import { normalizeToClaudeJsonl } from '../core/adapters.js';
import { safeFetch } from '../core/url-safety.js';
import { t } from '../core/i18n.js';

let _loadText = null;
let _panel = null;
let _toggleBtn = null;
let _activeId = null;

/**
 * @param {(text: string) => void} loadTextFn — колбэк из loader.js
 */
export function initSessionPicker(loadTextFn) {
  _loadText = loadTextFn;
  _panel = document.getElementById('sessions-panel');
  _toggleBtn = document.getElementById('btn-sessions');
  if (_toggleBtn) _toggleBtn.addEventListener('click', togglePanel);
  if (!state.sessions) state.sessions = [];
  render();
}

export function toggleSessions() { togglePanel(); }

function togglePanel() {
  if (!_panel) return;
  state.sessionsOpen = !state.sessionsOpen;
  _panel.classList.toggle('open', !!state.sessionsOpen);
  if (_toggleBtn) _toggleBtn.classList.toggle('active-sessions', !!state.sessionsOpen);
}

/**
 * Добавить локальные файлы в список сессий (вызывается из loader.js
 * при drag-drop или file-input с multi).
 *
 * @param {FileList | Array<File>} files
 * @param {{ autoLoadFirst?: boolean }} opts
 */
export async function addSessionFiles(files, opts = {}) {
  if (!files || !files.length) return;
  const added = [];
  for (const f of Array.from(files)) {
    if (!f) continue;
    // Читаем как текст
    const content = await f.text();
    const session = createSession({
      id: 'local:' + f.name + ':' + f.size + ':' + (f.lastModified || 0),
      name: f.name,
      size: f.size,
      content,
    });
    added.push(session);
  }
  // Дедуп по id — если повторно тот же файл
  for (const s of added) {
    const existing = state.sessions.findIndex(x => x.id === s.id);
    if (existing >= 0) state.sessions[existing] = s;
    else state.sessions.push(s);
  }
  render();
  if (opts.autoLoadFirst && added.length) {
    selectSession(added[0].id);
    if (!state.sessionsOpen && state.sessions.length > 1) togglePanel(); // показать список когда 2+
  }
}

/**
 * Добавить удалённые сессии из index.json.
 * @param {Array<{id, title, url, mtime?, size?}>} items
 */
export function addRemoteSessions(items) {
  if (!Array.isArray(items)) return;
  for (const it of items) {
    if (!it || !it.url) continue;
    const id = 'remote:' + (it.id || it.url);
    if (state.sessions.some(s => s.id === id)) continue;
    state.sessions.push({
      id,
      name: it.title || it.id || it.url,
      size: it.size || 0,
      content: null, // lazy load
      remoteUrl: it.url,
      mtime: it.mtime || null,
    });
  }
  render();
}

/**
 * Загрузить индекс с сервера и добавить сессии.
 * @param {string} url
 */
export async function loadSessionIndex(url) {
  try {
    const res = await safeFetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.sessions || []);
    addRemoteSessions(items);
    // Показать панель чтобы пользователь сразу увидел
    if (!state.sessionsOpen) togglePanel();
  } catch (e) {
    console.warn('[sessions] не смог загрузить индекс', url, e.message);
  }
}

function createSession({ id, name, size, content }) {
  const meta = computeMeta(content);
  return { id, name, size, content, meta };
}

function computeMeta(content) {
  try {
    const norm = normalizeToClaudeJsonl(content || '');
    const parsed = parseJSONL(norm.text);
    const tsList = parsed.nodes.map(n => n.ts).filter(Number.isFinite).sort((a, b) => a - b);
    return {
      format: norm.format,
      nodes: parsed.nodes.length,
      firstTs: tsList[0] || null,
      lastTs: tsList[tsList.length - 1] || null,
    };
  } catch (e) {
    return { format: 'unknown', nodes: 0, firstTs: null, lastTs: null };
  }
}

async function selectSession(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s || !_loadText) return;
  // Ленивая загрузка удалённых сессий
  if (!s.content && s.remoteUrl) {
    try {
      const res = await safeFetch(s.remoteUrl, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      s.content = await res.text();
      s.meta = computeMeta(s.content);
    } catch (e) {
      console.warn('[sessions] не могу загрузить', s.remoteUrl, e.message);
      return;
    }
  }
  if (s.content) {
    _activeId = id;
    _loadText(s.content);
    render();
  }
}

function removeSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  if (_activeId === id) _activeId = null;
  render();
}

function render() {
  if (!_panel) return;
  const listEl = _panel.querySelector('.sessions-list');
  const hintEl = _panel.querySelector('.sessions-hint');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!state.sessions.length) {
    if (hintEl) hintEl.style.display = '';
    if (_toggleBtn) updateBadge();
    return;
  }
  if (hintEl) hintEl.style.display = 'none';
  for (const s of state.sessions) {
    const item = document.createElement('div');
    item.className = 'session-item' + (s.id === _activeId ? ' active' : '');
    const title = document.createElement('div');
    title.className = 'session-title';
    title.textContent = s.name;
    const meta = document.createElement('div');
    meta.className = 'session-meta';
    const parts = [];
    if (s.meta?.nodes) parts.push(`${s.meta.nodes} nodes`);
    if (s.meta?.format && s.meta.format !== 'claude-jsonl') parts.push(s.meta.format);
    if (s.size) parts.push(formatBytes(s.size));
    if (s.meta?.firstTs) parts.push(formatShortDate(s.meta.firstTs));
    meta.textContent = parts.join(' · ');
    const rm = document.createElement('button');
    rm.className = 'session-remove';
    rm.textContent = '×';
    rm.title = 'Удалить из списка';
    rm.addEventListener('click', (ev) => { ev.stopPropagation(); removeSession(s.id); });
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(rm);
    item.addEventListener('click', () => selectSession(s.id));
    listEl.appendChild(item);
  }
  updateBadge();
}

function updateBadge() {
  if (!_toggleBtn) return;
  const n = state.sessions.length;
  _toggleBtn.textContent = '📚';
  _toggleBtn.title = n ? t('tip.sessions_loaded', { n }) : t('tip.sessions_empty');
  if (n > 0) _toggleBtn.dataset.badge = String(n);
  else delete _toggleBtn.dataset.badge;
}

if (typeof window !== 'undefined') window.addEventListener('languagechange', updateBadge);

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatShortDate(ts) {
  try {
    const d = new Date(ts);
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}
