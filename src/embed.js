// npm-entry: программный monting в контейнер.
// Usage:
//   import { mount } from '@andromanpro/ai-conversation-viz';
//   const viz = mount(element, { jsonl: '...', width: 800, height: 600 });
//   viz.loadJsonl(newText);
//   viz.play(); viz.pause(); viz.destroy();

import { state } from './view/state.js';
import { CFG } from './core/config.js';
import { parseJSONL } from './core/parser.js';
import { normalizeToClaudeJsonl } from './core/adapters.js';
import { buildGraph } from './core/graph.js';
import { stepPhysics, createSim, fitToView, prewarm } from './core/layout.js';
import { draw } from './view/renderer.js';
import { generateStarfield, drawStarfield } from './view/starfield.js';
import { ensureParticles, tickParticles, drawParticles } from './view/particles.js';
import { SAMPLE_JSONL } from './core/sample.js';

// Публичный API экспорт
export { state, CFG, SAMPLE_JSONL };
export { parseJSONL } from './core/parser.js';
export { normalizeToClaudeJsonl, detectFormat } from './core/adapters.js';
export { buildGraph, appendRawNodes } from './core/graph.js';
export { stepPhysics, createSim, reheat, freeze, unfreeze, isSettled, fitToView } from './core/layout.js';

/**
 * Монтирует минимальный viewer в указанный DOM-элемент.
 * Возвращает API: { loadJsonl, play, pause, reset, destroy }.
 *
 * Options:
 *   jsonl?: string — начальный JSONL контент (Claude Code / ChatGPT / Anthropic)
 *   width?: number — ширина canvas (default = element.clientWidth)
 *   height?: number — высота canvas (default = element.clientHeight)
 *   starfield?: boolean — рисовать звёзды (default true)
 *   autoFit?: boolean — автофит камеры при load (default true)
 */
export function mount(container, options = {}) {
  if (!container) throw new Error('mount: container is required');
  container.style.position = container.style.position || 'relative';
  container.style.overflow = 'hidden';
  container.style.background = '#0a0e1a';

  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function getViewport() {
    const w = options.width || container.clientWidth || 800;
    const h = options.height || container.clientHeight || 600;
    return { width: w, height: h, safeW: w, safeH: h, cx: w / 2, cy: h / 2 };
  }

  function resize() {
    const vp = getViewport();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = vp.width * dpr;
    canvas.height = vp.height * dpr;
    canvas.style.width = vp.width + 'px';
    canvas.style.height = vp.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (resizeObserver) resizeObserver.observe(container);
  else window.addEventListener('resize', resize);

  // Starfield
  const stars = options.starfield !== false ? generateStarfield(CFG.starfieldCount) : [];

  // Local state (не трогаем глобальный для multi-instance)
  const embedState = {
    nodes: [], edges: [], byId: new Map(),
    selected: null, hover: null,
    camera: { x: 0, y: 0, scale: 1 },
    stats: null, running: true, timelineMax: 1,
    pathSet: new Set(), stars,
    cameraTarget: null,
    searchMatches: new Set(), searchActive: null,
    hiddenRoles: new Set(),
    layoutMode: 'force', perfMode: 'normal',
    sim: null, playSpeed: 1,
    connectOrphans: false, collapsed: new Set(),
  };

  function loadJsonl(text) {
    const norm = normalizeToClaudeJsonl(text);
    const parsed = parseJSONL(norm.text);
    if (!parsed.nodes.length) return;
    const vp = getViewport();
    const g = buildGraph(parsed, vp);
    embedState.sim = createSim();
    prewarm(g.nodes, g.edges, vp, embedState.sim);
    embedState.nodes = g.nodes;
    embedState.edges = g.edges;
    embedState.byId = g.byId;
    embedState.stats = parsed.stats;
    ensureParticles(embedState.edges);
    if (options.autoFit !== false) {
      const cam = fitToView(embedState.nodes, vp);
      embedState.camera.scale = cam.scale;
      embedState.camera.x = cam.x;
      embedState.camera.y = cam.y;
    }
  }

  let lastMs = performance.now();
  let rafId = 0;
  let destroyed = false;

  function frame(tms) {
    if (destroyed) return;
    const tSec = tms / 1000;
    const dt = Math.min(0.1, (tms - lastMs) / 1000);
    lastMs = tms;
    const vp = getViewport();
    if (embedState.running && embedState.sim && !embedState.sim.frozen) {
      stepPhysics(embedState.nodes, embedState.edges, vp, embedState.sim);
    }
    tickParticles(embedState.edges, dt);
    draw(ctx, embedState, tSec, vp, {
      starfield: options.starfield !== false ? (c, t) => drawStarfield(c, embedState.stars, embedState.camera, vp, t) : null,
      particles: (c, alphaOf) => drawParticles(c, embedState.edges, embedState.camera, alphaOf, embedState.perfMode),
      perfMode: embedState.perfMode,
    });
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  if (options.jsonl) loadJsonl(options.jsonl);

  return {
    /** Загрузить новый JSONL */
    loadJsonl,
    /** Получить доступ к state для тонкой настройки */
    getState() { return embedState; },
    /** Установить timeline позицию [0..1] */
    setTimeline(t) { embedState.timelineMax = Math.max(0, Math.min(1, t)); },
    /** Воспроизвести от начала */
    play() { embedState.running = true; embedState.timelineMax = 0; },
    /** Пауза (заморозка физики) */
    pause() { embedState.running = false; },
    /** Сбросить viewport на fit */
    fitView() {
      const cam = fitToView(embedState.nodes, getViewport());
      embedState.camera.scale = cam.scale;
      embedState.camera.x = cam.x;
      embedState.camera.y = cam.y;
    },
    /** Уничтожить: остановить анимацию, снять listener'ы */
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', resize);
      canvas.remove();
    },
  };
}

// UMD-style глобал для standalone использования через <script src>
if (typeof window !== 'undefined') {
  window.AIConvViz = Object.assign(window.AIConvViz || {}, { mount, SAMPLE_JSONL });
}
