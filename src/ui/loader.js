import { state } from '../view/state.js';
import { CFG } from '../core/config.js';
import { parseJSONL } from '../core/parser.js';
import { buildGraph, detectTreeShape } from '../core/graph.js';
import { fitToView, prewarm, createSim, computeSwimLanes, computeRadialLayout } from '../core/layout.js';
import { SAMPLE_JSONL } from '../core/sample.js';
import { MULTI_AGENT_ORCHESTRATION_JSONL, DEEP_ORCHESTRATION_JSONL } from '../core/samples-embedded.js';

// Sample, который грузится по умолчанию при первом открытии страницы.
// Раньше был SAMPLE_JSONL (basic, ~40 линейных нод) — он не показывает
// ни ветвление графа, ни 3D-объём. Deep orchestration с 60 нодами и
// 2-уровневым subagent spawn — самый наглядный для wow-эффекта.
const DEFAULT_SAMPLE = DEEP_ORCHESTRATION_JSONL;
import { t } from '../core/i18n.js';
import { normalizeToClaudeJsonl } from '../core/adapters.js';
import { hideDetail } from './detail-panel.js';
import { hideTooltip } from './tooltip.js';
import { resetTimeline } from './timeline.js';
import { addSessionFiles } from './session-picker.js';
import { saveSessionForHandoff, loadSessionForHandoff, clearSessionForHandoff } from '../core/session-bridge.js';
import { loadAnnotationsForSession } from './annotations.js';
import { updateBadge as updateBookmarksBadge } from './bookmarks.js';

let _getViewport;
let _onReady = () => {};

// ==== Examples ▾ dropdown menu ====

const SAMPLE_OPTIONS = [
  { id: 'basic', i18n: 'sample.basic', text: () => SAMPLE_JSONL },
  { id: 'orchestration', i18n: 'sample.orchestration', text: () => MULTI_AGENT_ORCHESTRATION_JSONL },
  { id: 'deep_orchestration', i18n: 'sample.deep_orchestration', text: () => DEEP_ORCHESTRATION_JSONL },
];

function toggleSamplesMenu(anchor) {
  const existing = document.getElementById('samples-menu');
  if (existing) { existing.remove(); anchor.setAttribute('aria-expanded', 'false'); return; }
  const menu = document.createElement('div');
  menu.id = 'samples-menu';
  menu.className = 'samples-menu';
  menu.setAttribute('role', 'menu');
  const rect = anchor.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top = (rect.bottom + 4) + 'px';

  let outsideHandler = null;
  const closeMenu = () => {
    menu.remove();
    anchor.setAttribute('aria-expanded', 'false');
    if (outsideHandler) {
      document.removeEventListener('click', outsideHandler);
      document.removeEventListener('keydown', escHandler);
      outsideHandler = null;
    }
  };
  const escHandler = (ev) => { if (ev.key === 'Escape') closeMenu(); };

  for (const opt of SAMPLE_OPTIONS) {
    const item = document.createElement('button');
    item.className = 'samples-menu-item';
    item.setAttribute('role', 'menuitem');
    item.textContent = t(opt.i18n);
    item.addEventListener('click', () => {
      closeMenu();
      clearSessionForHandoff();
      loadText(opt.text());
    });
    menu.appendChild(item);
  }

  document.body.appendChild(menu);
  anchor.setAttribute('aria-expanded', 'true');

  setTimeout(() => {
    outsideHandler = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== anchor) closeMenu();
    };
    document.addEventListener('click', outsideHandler);
    document.addEventListener('keydown', escHandler);
  }, 0);
}

export function initLoader(getViewportFn, onReady) {
  _getViewport = getViewportFn;
  if (onReady) _onReady = onReady;

  const fileInput = document.getElementById('file-input');
  // multiple=true ставится динамически, чтобы можно было выбирать несколько
  if (fileInput) fileInput.setAttribute('multiple', 'true');
  document.getElementById('btn-file').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (ev) => {
    const files = ev.target.files;
    if (files && files.length) handleFiles(files);
    fileInput.value = '';
  });

  // Examples ▾ dropdown — на клик открывает меню с тремя примерами.
  // Закрытие при клике вне или повторном клике по кнопке. Hover/focus
  // не используется — только явный клик, чтобы не мешать туториал-скриншотам.
  const sampleBtn = document.getElementById('btn-sample');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleSamplesMenu(sampleBtn);
    });
  }
  document.getElementById('btn-reset').addEventListener('click', resetView);

  initDragDrop();

  // Если пришли из 3D режима с уже загруженным файлом — восстановим его
  const handoff = loadSessionForHandoff();
  if (handoff && handoff.text) {
    loadText(handoff.text);
  } else {
    loadText(DEFAULT_SAMPLE);
  }
}

function initDragDrop() {
  const dropHint = document.getElementById('drop-hint');
  let depth = 0;
  window.addEventListener('dragenter', (ev) => { ev.preventDefault(); depth++; dropHint.classList.add('show'); });
  window.addEventListener('dragover', (ev) => ev.preventDefault());
  window.addEventListener('dragleave', (ev) => {
    ev.preventDefault();
    depth--;
    if (depth <= 0) { depth = 0; dropHint.classList.remove('show'); }
  });
  window.addEventListener('drop', (ev) => {
    ev.preventDefault();
    depth = 0;
    dropHint.classList.remove('show');
    const files = ev.dataTransfer && ev.dataTransfer.files;
    if (files && files.length) handleFiles(files);
  });
}

/**
 * Обрабатывает один или несколько файлов: все кладём в session-picker,
 * а первый сразу загружаем для отображения.
 */
function handleFiles(files) {
  if (files.length === 1) {
    const f = files[0];
    loadFile(f);
    // также добавить в список сессий без autoLoad (уже загружается)
    addSessionFiles([f], { autoLoadFirst: false });
    return;
  }
  // Multi: все в picker, первый авто-загружается
  addSessionFiles(files, { autoLoadFirst: true });
}

export function loadText(text) {
  try {
    hideError();
    const norm = normalizeToClaudeJsonl(text);
    if (norm.format !== 'claude-jsonl' && norm.format !== 'unknown') {
      setLoadFormat(norm.format);
    } else {
      setLoadFormat(null);
    }
    const parsed = parseJSONL(norm.text);
    if (!parsed.nodes.length) { showError('No user/assistant messages found.'); return; }
    const vp = _getViewport();
    const g = buildGraph(parsed, vp);
    // Auto-degrade: при больших графах уменьшаем prewarm чтобы не зафризить UI
    const n = g.nodes.length;
    if (n >= CFG.perfHeavyThreshold) state.perfMode = 'minimal';
    else if (n >= CFG.perfDegradeThreshold) state.perfMode = 'degraded';
    else state.perfMode = 'normal';
    const prewarmN = state.perfMode === 'minimal' ? CFG.perfMinimalPrewarm
      : state.perfMode === 'degraded' ? Math.max(40, Math.floor(CFG.prewarmIterations / 3))
      : CFG.prewarmIterations;
    // В minimal режиме — более быстрое охлаждение (physics быстрее дойдёт до settled)
    const simOpts = state.perfMode === 'minimal' ? { alphaDecay: CFG.perfMinimalAlphaDecay } : {};
    state.sim = createSim(simOpts);
    prewarm(g.nodes, g.edges, vp, state.sim, prewarmN);
    state.nodes = g.nodes;
    state.edges = g.edges;
    state.pairEdges = g.pairEdges || [];
    state.byId = g.byId;
    state.selected = null;
    state.hover = null;
    state.pathSet = new Set();
    state.cameraTarget = null;
    state.searchMatches = new Set();
    state.searchActive = null;
    state.collapsed = new Set();
    state.stats = parsed.stats;
    // Auto-detect tree-shape — если граф похож на дерево с 2+ fan-out
    // точками и глубиной >=3, переключаемся в radial. Только при первом
    // load (или если пользователь не закрепил выбор через localStorage).
    const userPickedLayout = (() => {
      try { return localStorage.getItem('viz:layoutMode'); } catch { return null; }
    })();
    if (!userPickedLayout && detectTreeShape(state.nodes, state.edges)) {
      state.layoutMode = 'radial';
    }
    // Если активен не-force layout — применяем его сразу к новым нодам
    if (state.layoutMode === 'swim') {
      const pos = computeSwimLanes(state.nodes, vp);
      for (const [id, p] of pos) {
        const n = state.byId.get(id);
        if (n) { n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0; }
      }
    } else if (state.layoutMode === 'radial') {
      const pos = computeRadialLayout(state.nodes, state.byId, vp);
      for (const [id, p] of pos) {
        const n = state.byId.get(id);
        if (n) { n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0; }
      }
    }
    const cam = fitToView(state.nodes, vp);
    state.camera.scale = cam.scale;
    state.camera.x = cam.x;
    state.camera.y = cam.y;
    resetTimeline();
    hideDetail();
    hideTooltip();
    updateStatsHUD();
    // Восстановим сохранённые аннотации (звёзды и заметки) для этой сессии
    loadAnnotationsForSession();
    updateBookmarksBadge();
    _onReady();
    // Запомним текст для возможного перехода в 3D. Sample-ы не сохраняем —
    // пусть 3D при первом открытии тоже покажет default sample.
    const isSample = text === SAMPLE_JSONL || text === MULTI_AGENT_ORCHESTRATION_JSONL || text === DEEP_ORCHESTRATION_JSONL;
    if (!isSample) saveSessionForHandoff(text);
  } catch (e) {
    showError('Parse error: ' + e.message);
    console.error(e);
  }
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = () => loadText(String(reader.result));
  reader.onerror = () => showError('Read error: ' + reader.error);
  reader.readAsText(file);
}

function resetView() {
  if (!state.nodes.length) return;
  const cam = fitToView(state.nodes, _getViewport());
  state.camera.scale = cam.scale;
  state.camera.x = cam.x;
  state.camera.y = cam.y;
}

// Перерисовываем stats при переключении языка
if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    if (state.stats) updateStatsHUD();
  });
}

function updateStatsHUD() {
  const s = state.stats;
  const el = document.getElementById('stats');
  if (!s) { el.textContent = '—'; return; }
  const fmtEl = document.getElementById('load-format');
  const fmtSuffix = fmtEl && fmtEl.textContent ? ' &middot; <span class="fmt-chip">' + fmtEl.textContent + '</span>' : '';
  const perfSuffix = state.perfMode && state.perfMode !== 'normal'
    ? ` &middot; <span class="perf-chip" style="color:var(--accent)">${state.perfMode}</span>`
    : '';
  el.innerHTML = `<b>${state.nodes.length}</b> ${t('stats.nodes')} &middot; <b>${state.edges.length}</b> ${t('stats.edges')} &middot; <span>${s.parsed} ${t('stats.lines')}</span>${fmtSuffix}${perfSuffix}`;
  const compLine = s.compactions ? `\n${t('stats.compactions')}: ${s.compactions}` : '';
  el.title = `${t('stats.parsed')}: ${s.parsed}\n${t('stats.kept')}: ${s.kept}\n${t('stats.skipped')}: ${s.skipped}\n${t('stats.errors')}: ${s.errors}${compLine}\nperf: ${state.perfMode}`;
}

function setLoadFormat(fmt) {
  let el = document.getElementById('load-format');
  if (!el) {
    el = document.createElement('span');
    el.id = 'load-format';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  el.textContent = fmt || '';
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(hideError, 5000);
}
function hideError() {
  const el = document.getElementById('error');
  if (el) el.classList.remove('show');
}
