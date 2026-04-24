import { state } from '../view/state.js';
import { CFG } from '../core/config.js';
import { parseJSONL } from '../core/parser.js';
import { buildGraph } from '../core/graph.js';
import { fitToView, prewarm, createSim } from '../core/layout.js';
import { SAMPLE_JSONL } from '../core/sample.js';
import { normalizeToClaudeJsonl } from '../core/adapters.js';
import { hideDetail } from './detail-panel.js';
import { hideTooltip } from './tooltip.js';
import { resetTimeline } from './timeline.js';

let _getViewport;
let _onReady = () => {};

export function initLoader(getViewportFn, onReady) {
  _getViewport = getViewportFn;
  if (onReady) _onReady = onReady;

  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-file').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (f) loadFile(f);
    fileInput.value = '';
  });

  document.getElementById('btn-sample').addEventListener('click', () => loadText(SAMPLE_JSONL));
  document.getElementById('btn-reset').addEventListener('click', resetView);

  initDragDrop();
  loadText(SAMPLE_JSONL);
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
    const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f) loadFile(f);
  });
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
    state.sim = createSim();
    prewarm(g.nodes, g.edges, vp, state.sim, prewarmN);
    state.nodes = g.nodes;
    state.edges = g.edges;
    state.byId = g.byId;
    state.selected = null;
    state.hover = null;
    state.pathSet = new Set();
    state.cameraTarget = null;
    state.stats = parsed.stats;
    const cam = fitToView(state.nodes, vp);
    state.camera.scale = cam.scale;
    state.camera.x = cam.x;
    state.camera.y = cam.y;
    resetTimeline();
    hideDetail();
    hideTooltip();
    updateStatsHUD();
    _onReady();
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
