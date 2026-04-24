// Diff mode — сравнение двух сессий. Пользователь уже загрузил файл A,
// нажимает "🔀 Diff" и дропает второй JSONL. Мы парсим B, хешируем
// каждую ноду по (role + первые 300 символов text), находим совпадения
// с A и подсвечиваем три группы:
//   - _diffOrigin='A'     — нода только в A (розоватый)
//   - _diffOrigin='B'     — нода только в B (бирюзовый)
//   - _diffOrigin='both'  — нода в обоих (серый/общий)
// Уникальные ноды B добавляются в state.nodes со сдвигом по X
// (чтобы образовался «правый кластер»). Рёбра B, смотрящие на общие ноды,
// перецепляются на A-id.
//
// Повторный клик по кнопке отключает режим: удаляем B-ноды/edges,
// очищаем _diffOrigin, сбрасываем stats. Родной набор A никогда не
// мутируется деструктивно (кроме очистки annotations).

import { state } from '../view/state.js';
import { parseJSONL } from '../core/parser.js';
import { normalizeToClaudeJsonl } from '../core/adapters.js';
import { CFG } from '../core/config.js';
import { seedJitter, computeBBox, fitToView } from '../core/layout.js';
import { t } from '../core/i18n.js';

let _diffGetViewport;
let _diffBtn;

export function initDiffMode(getViewportFn) {
  _diffGetViewport = getViewportFn;
  _diffBtn = document.getElementById('btn-diff');
  if (_diffBtn) _diffBtn.addEventListener('click', onBtnClick);
  initDropZone();
  updateBtn();
}

function onBtnClick() {
  if (state.diffMode) {
    clearDiff();
  } else {
    openDropZone();
  }
}

function initDropZone() {
  const overlay = document.getElementById('diff-drop');
  if (!overlay) return;
  const cancelBtn = document.getElementById('diff-cancel');
  const fileInput = document.getElementById('diff-file-input');
  if (cancelBtn) cancelBtn.addEventListener('click', closeDropZone);
  if (fileInput) fileInput.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (f) { readAndApply(f); fileInput.value = ''; }
  });
  const browseBtn = document.getElementById('diff-browse');
  if (browseBtn && fileInput) browseBtn.addEventListener('click', () => fileInput.click());
  overlay.addEventListener('dragover', (ev) => { ev.preventDefault(); overlay.classList.add('hover'); });
  overlay.addEventListener('dragleave', () => overlay.classList.remove('hover'));
  overlay.addEventListener('drop', (ev) => {
    ev.preventDefault();
    overlay.classList.remove('hover');
    const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f) readAndApply(f);
  });
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closeDropZone();
  });
}

function openDropZone() {
  const overlay = document.getElementById('diff-drop');
  if (overlay) overlay.classList.add('show');
}
function closeDropZone() {
  const overlay = document.getElementById('diff-drop');
  if (overlay) overlay.classList.remove('show');
}

function readAndApply(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyDiffText(String(reader.result));
      closeDropZone();
    } catch (e) {
      setDropError('Parse error: ' + e.message);
      console.error(e);
    }
  };
  reader.onerror = () => setDropError('Read error: ' + (reader.error && reader.error.message));
  reader.readAsText(file);
}

function setDropError(msg) {
  const el = document.getElementById('diff-drop-error');
  if (el) el.textContent = msg;
}

export function applyDiffText(text) {
  if (!state.nodes.length) {
    setDropError('Сначала загрузите первую сессию.');
    return;
  }
  const norm = normalizeToClaudeJsonl(text);
  const parsed = parseJSONL(norm.text);
  if (!parsed.nodes.length) {
    setDropError('Во втором файле нет сообщений.');
    return;
  }
  const stats = mergeDiff(state, parsed.nodes, _diffGetViewport());
  state.diffMode = true;
  state.diffStats = stats;
  updateBtn();
  refitCamera();
}

/**
 * Чистая функция слияния. Мутирует state.nodes/edges/byId, добавляя
 * уникальные B-ноды, и помечает _diffOrigin на всех A и B.
 *
 * @returns {{ onlyA: number, onlyB: number, both: number }}
 */
export function mergeDiff(target, rawNodesB, viewport) {
  const hashA = new Map(); // hash → A-node
  for (const a of target.nodes) {
    a._diffOrigin = 'A';
    hashA.set(hashNode(a), a);
  }
  // BBox для сдвига B-подграфа
  const bbox = computeBBox(target.nodes);
  const gap = 220;
  const offsetX = (bbox.maxX ?? viewport.cx) + gap;
  const centerY = ((bbox.minY ?? 0) + (bbox.maxY ?? 0)) / 2;

  const mappedId = new Map(); // rawId → resolved id in target.byId
  let onlyB = 0, both = 0;

  // Первый проход — дедуп: либо совпадает по хэшу с A (both),
  // либо добавляем новую B-ноду
  for (const raw of rawNodesB) {
    const h = hashNode(raw);
    const existing = hashA.get(h);
    if (existing) {
      existing._diffOrigin = 'both';
      mappedId.set(raw.id, existing.id);
      both++;
    } else {
      const newId = 'B:' + raw.id;
      mappedId.set(raw.id, newId);
      // Позиция: ниже B-кластера + небольшое облако
      const s = seedJitter(newId);
      const node = {
        ...raw,
        id: newId,
        parentId: null, // резолвим ниже
        x: offsetX + (s.dx - 0.5) * 400,
        y: centerY + (s.dy - 0.5) * 400,
        vx: 0, vy: 0,
        fxAcc: 0, fyAcc: 0,
        r: CFG.minR,
        recency: 1,
        phase: ((s.dx + s.dy) * Math.PI),
        degree: 0,
        isHub: false,
        _seedDx: s.dx,
        _seedDy: s.dy,
        _diffOrigin: 'B',
      };
      target.nodes.push(node);
      target.byId.set(newId, node);
      onlyB++;
    }
  }

  // Второй проход — рёбра B: родитель резолвится через mappedId.
  // Если raw.parentId → общая нода (both), edge свяжет её с B-ребёнком.
  for (const raw of rawNodesB) {
    const resolvedId = mappedId.get(raw.id);
    const node = target.byId.get(resolvedId);
    if (!node) continue;
    if (!raw.parentId) continue;
    const parentResolved = mappedId.get(raw.parentId);
    if (!parentResolved) continue;
    const parent = target.byId.get(parentResolved);
    if (!parent) continue;
    // Только для B-уникальной ноды добавим ребро; для both-ноды это её родная связь из A
    if (resolvedId.startsWith('B:')) {
      // Но только если такого ребра ещё нет (дубль из A)
      const already = target.edges.some(e => e.source === parent.id && e.target === resolvedId);
      if (!already) {
        target.edges.push({
          source: parent.id,
          target: resolvedId,
          a: parent,
          b: node,
          adopted: false,
          diffSide: 'B',
        });
      }
    }
  }

  // Пересчёт степеней
  for (const n of target.nodes) n.degree = 0;
  for (const e of target.edges) {
    if (e.a) e.a.degree = (e.a.degree || 0) + 1;
    if (e.b) e.b.degree = (e.b.degree || 0) + 1;
  }

  const onlyA = target.nodes.filter(n => n._diffOrigin === 'A').length;
  return { onlyA, onlyB, both };
}

export function clearDiff() {
  if (!state.diffMode) return;
  // Выкинуть все B-ноды (id начинается с 'B:') и их edges
  const removeIds = new Set();
  state.nodes = state.nodes.filter(n => {
    if (typeof n.id === 'string' && n.id.startsWith('B:')) {
      removeIds.add(n.id);
      state.byId.delete(n.id);
      return false;
    }
    return true;
  });
  state.edges = state.edges.filter(e => !removeIds.has(e.source) && !removeIds.has(e.target));
  for (const n of state.nodes) delete n._diffOrigin;
  state.diffMode = false;
  state.diffStats = null;
  updateBtn();
  refitCamera();
}

function refitCamera() {
  if (!state.nodes.length) return;
  const cam = fitToView(state.nodes, _diffGetViewport());
  state.cameraTarget = { x: cam.x, y: cam.y, scale: cam.scale };
}

function updateBtn() {
  if (!_diffBtn) return;
  _diffBtn.textContent = '🔀';
  if (state.diffMode && state.diffStats) {
    const s = state.diffStats;
    _diffBtn.title = t('tip.diff_on', { a: s.onlyA, b: s.onlyB, both: s.both });
    _diffBtn.dataset.badge = String(s.onlyB);
    _diffBtn.classList.add('active-diff');
  } else {
    _diffBtn.title = t('tip.diff_off');
    delete _diffBtn.dataset.badge;
    _diffBtn.classList.remove('active-diff');
  }
}

if (typeof window !== 'undefined') window.addEventListener('languagechange', updateBtn);

// FNV-1a hash. Пусть две ноды считаются одинаковыми если совпадает
// role + первые 300 символов текста (после trim и схлопывания whitespace).
export function hashNode(n) {
  const role = n.role || '';
  const raw = String(n.text || '').slice(0, 300).trim().replace(/\s+/g, ' ');
  return fnv1a(role + '\u0001' + raw);
}

export function fnv1a(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}
