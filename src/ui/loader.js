import { state } from '../view/state.js';
import { CFG } from '../core/config.js';
import { parseJSONL } from '../core/parser.js';
import { buildGraph } from '../core/graph.js';
import { fitToView, prewarm, createSim, computeSwimLanes, computeRadialLayout } from '../core/layout.js';
import { SAMPLE_JSONL } from '../core/sample.js';
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

  document.getElementById('btn-sample').addEventListener('click', () => {
    clearSessionForHandoff(); // юзер явно выбрал sample — не сохраняем его как «последнюю сессию»
    loadText(SAMPLE_JSONL);
  });
  document.getElementById('btn-reset').addEventListener('click', resetView);

  initDragDrop();

  // Если пришли из 3D режима с уже загруженным файлом — восстановим его
  const handoff = loadSessionForHandoff();
  if (handoff && handoff.text) {
    loadText(handoff.text);
  } else {
    loadText(SAMPLE_JSONL);
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
    state.byId = g.byId;
    state.selected = null;
    state.hover = null;
    state.pathSet = new Set();
    state.cameraTarget = null;
    state.searchMatches = new Set();
    state.searchActive = null;
    state.collapsed = new Set();
    state.stats = parsed.stats;
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
    // Запомним текст для возможного перехода в 3D. Sample не сохраняем —
    // пусть 3D при первом открытии тоже покажет sample.
    if (text !== SAMPLE_JSONL) saveSessionForHandoff(text);
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

function updateStatsHUD() {
  const s = state.stats;
  const el = document.getElementById('stats');
  if (!s) { el.textContent = '—'; return; }
  const fmtEl = document.getElementById('load-format');
  const fmtSuffix = fmtEl && fmtEl.textContent ? ' &middot; <span class="fmt-chip">' + fmtEl.textContent + '</span>' : '';
  const perfSuffix = state.perfMode && state.perfMode !== 'normal'
    ? ` &middot; <span class="perf-chip" style="color:var(--accent)">${state.perfMode}</span>`
    : '';
  el.innerHTML = `<b>${state.nodes.length}</b> nodes &middot; <b>${state.edges.length}</b> edges &middot; <span>${s.parsed} lines</span>${fmtSuffix}${perfSuffix}`;
  el.title = `parsed: ${s.parsed}\nkept: ${s.kept}\nskipped: ${s.skipped}\nerrors: ${s.errors}\nperf: ${state.perfMode}`;
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
