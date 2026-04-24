// Annotations — личные заметки и закладки пользователя к нодам. Хранятся
// в localStorage по ключу, привязанному к id первой ноды сессии (стабильно
// для одного JSONL, не зависит от имени файла).
//
// Схема в localStorage:
//   'viz:annot:<sessionKey>' →
//     { version: 1, annotations: { [nodeId]: { text, starred, ts } } }
//
// API:
//   loadAnnotationsForSession() — вызывается после успешной loadText;
//     восстанавливает state.annotations из localStorage.
//   setAnnotation(nodeId, { text?, starred? }) — обновляет поля (merge),
//     пустой text и starred=false → удаление.
//   getAnnotation(nodeId) → { text, starred } | null
//   toggleStar(nodeId) → bool (новое состояние)
//   listStarred() → Array<nodeId>
//   listAnnotated() → Array<nodeId> (все с text или starred)

import { state } from '../view/state.js';

const LS_PREFIX = 'viz:annot:';
const VERSION = 1;

export function initAnnotations() {
  if (!state.annotations) state.annotations = new Map();
}

/** Ключ localStorage по первой (по ts) ноде — стабилен для данного JSONL. */
function sessionKey() {
  if (!state.nodes || !state.nodes.length) return null;
  let firstId = null, firstTs = Infinity;
  for (const n of state.nodes) {
    if (n.ts < firstTs) { firstTs = n.ts; firstId = n.id; }
  }
  return firstId ? LS_PREFIX + firstId : null;
}

/** Загрузить сохранённые аннотации для текущей сессии. Идемпотентно. */
export function loadAnnotationsForSession() {
  state.annotations = new Map();
  const key = sessionKey();
  if (!key) return;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || data.version !== VERSION || !data.annotations) return;
    for (const [nodeId, ann] of Object.entries(data.annotations)) {
      if (ann && (ann.text || ann.starred)) {
        state.annotations.set(nodeId, ann);
      }
    }
  } catch (e) {
    console.warn('[annotations] load failed:', e.message);
  }
}

function save() {
  const key = sessionKey();
  if (!key) return;
  try {
    if (!state.annotations || !state.annotations.size) {
      localStorage.removeItem(key);
      return;
    }
    const obj = { version: VERSION, annotations: {} };
    for (const [id, ann] of state.annotations) obj.annotations[id] = ann;
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {
    // quota exceeded или private mode — тихо игнорируем (данные в памяти остаются)
    console.warn('[annotations] save failed:', e.message);
  }
}

export function setAnnotation(nodeId, patch) {
  if (!nodeId) return;
  if (!state.annotations) state.annotations = new Map();
  const current = state.annotations.get(nodeId) || { text: '', starred: false, ts: Date.now() };
  const next = {
    text: patch.text != null ? String(patch.text) : current.text,
    starred: patch.starred != null ? !!patch.starred : current.starred,
    ts: Date.now(),
  };
  // Если после patch пусто — удаляем
  if (!next.text && !next.starred) {
    state.annotations.delete(nodeId);
  } else {
    state.annotations.set(nodeId, next);
  }
  save();
}

export function getAnnotation(nodeId) {
  if (!state.annotations) return null;
  return state.annotations.get(nodeId) || null;
}

/** @returns {boolean} новое значение starred */
export function toggleStar(nodeId) {
  const cur = getAnnotation(nodeId);
  const next = !(cur && cur.starred);
  setAnnotation(nodeId, { starred: next });
  return next;
}

export function listStarred() {
  if (!state.annotations) return [];
  return [...state.annotations.entries()]
    .filter(([, a]) => a.starred)
    .map(([id]) => id);
}

export function listAnnotated() {
  if (!state.annotations) return [];
  return [...state.annotations.entries()]
    .filter(([, a]) => a.starred || a.text)
    .map(([id]) => id);
}

/** Есть ли хоть одна аннотация — для UI-индикаторов. */
export function hasAnnotations() {
  return state.annotations && state.annotations.size > 0;
}
