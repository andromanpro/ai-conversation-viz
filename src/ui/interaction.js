import { CFG } from '../core/config.js';
import { state } from '../view/state.js';
import { screenToWorld, applyZoom } from '../view/camera.js';
import { pathToRoot } from '../view/path.js';
import { reheat, unfreeze } from '../core/layout.js';
import { updateFreezeBtn } from './freeze-toggle.js';
import { showDetail, hideDetail } from './detail-panel.js';
import { showTooltip, hideTooltip } from './tooltip.js';

let interactionCanvas;
let dragging = false, dragStart = null, dragMoved = false, lastMouse = null;
let draggedNode = null;
let getViewportFn = () => ({ width: window.innerWidth, height: window.innerHeight, cx: window.innerWidth / 2, cy: window.innerHeight / 2 });

export function initInteraction(canvasEl, getViewport) {
  interactionCanvas = canvasEl;
  if (getViewport) getViewportFn = getViewport;
  attachToCanvas(canvasEl);
  // Также привязываемся к WebGL-канвасу, если он существует — события
  // обрабатываются на видимом canvas, поэтому listener'ы на обоих не мешают.
  const webglCanvas = document.getElementById('graph-webgl');
  if (webglCanvas && webglCanvas !== canvasEl) attachToCanvas(webglCanvas);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('keydown', onKey);
}

function attachToCanvas(c) {
  c.addEventListener('mousedown', onDown);
  c.addEventListener('wheel', onWheel, { passive: false });
  c.addEventListener('mouseleave', () => { state.hover = null; state.pathSet = new Set(); hideTooltip(); });
  c.addEventListener('dblclick', onDblClick);
}

function onDblClick(ev) {
  const hit = hitTest(ev.clientX, ev.clientY);
  if (!hit) return;
  if (hit.role !== 'assistant') return;
  // Проверяем есть ли tool_use дети
  let hasToolChildren = false;
  for (const n of state.nodes) {
    if (n.parentId === hit.id && n.role === 'tool_use') { hasToolChildren = true; break; }
  }
  if (!hasToolChildren) return;
  if (state.collapsed.has(hit.id)) state.collapsed.delete(hit.id);
  else state.collapsed.add(hit.id);
  if (state.sim) reheat(state.sim, 0.3);
}

export function isPanning() { return dragging && !draggedNode; }
export function isDraggingNode() { return !!draggedNode; }

function timelineCutoff() {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

function hitTest(sx, sy) {
  const cam = state.camera;
  const cutoff = timelineCutoff();
  const world = screenToWorld(sx, sy, cam);
  let best = null, bestD2 = Infinity;
  for (const n of state.nodes) {
    if (n.ts > cutoff) continue;
    if (n.bornAt == null) continue;
    const dx = n.x - world.x, dy = n.y - world.y;
    const d2 = dx * dx + dy * dy;
    const r = n.r + CFG.hitPad / cam.scale;
    if (d2 < r * r && d2 < bestD2) { bestD2 = d2; best = n; }
  }
  return best;
}

function onDown(ev) {
  dragging = true;
  dragMoved = false;
  dragStart = { x: ev.clientX, y: ev.clientY };
  lastMouse = { x: ev.clientX, y: ev.clientY };
  draggedNode = hitTest(ev.clientX, ev.clientY);
  state.cameraTarget = null;
  if (draggedNode) {
    // Auto-unfreeze + re-heat на drag ноды
    if (state.sim && state.sim.manualFrozen) { unfreeze(state.sim); updateFreezeBtn(); }
    if (state.sim) { reheat(state.sim, 0.3); state.sim.alphaTarget = 0.3; }
    state.hover = draggedNode;
    state.pathSet = pathToRoot(draggedNode, state.byId);
    hideTooltip();
    interactionCanvas.style.cursor = 'grabbing';
  } else {
    interactionCanvas.classList.add('dragging');
  }
}

function onMove(ev) {
  if (dragging) {
    const dx = ev.clientX - lastMouse.x;
    const dy = ev.clientY - lastMouse.y;
    const totalDx = ev.clientX - dragStart.x;
    const totalDy = ev.clientY - dragStart.y;
    if (Math.abs(totalDx) > CFG.clickTolerancePx || Math.abs(totalDy) > CFG.clickTolerancePx) dragMoved = true;
    if (draggedNode) {
      const world = screenToWorld(ev.clientX, ev.clientY, state.camera);
      draggedNode.x = world.x;
      draggedNode.y = world.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else {
      state.camera.x -= dx / state.camera.scale;
      state.camera.y -= dy / state.camera.scale;
    }
    lastMouse = { x: ev.clientX, y: ev.clientY };
    hideTooltip();
  } else {
    const h = hitTest(ev.clientX, ev.clientY);
    state.hover = h;
    state.pathSet = h ? pathToRoot(h, state.byId) : new Set();
    interactionCanvas.style.cursor = h ? 'pointer' : 'grab';
    if (h) showTooltip(h, ev.clientX, ev.clientY);
    else hideTooltip();
  }
}

function onUp(ev) {
  if (!dragging) return;
  dragging = false;
  interactionCanvas.classList.remove('dragging');
  const wasNodeDrag = !!draggedNode;
  draggedNode = null;
  if (wasNodeDrag && state.sim) state.sim.alphaTarget = 0; // отпустили — cool down
  if (!dragMoved) {
    const hit = hitTest(ev.clientX, ev.clientY);
    if (hit) {
      state.selected = hit;
      showDetail(hit);
      zoomToNode(hit);
    } else {
      state.selected = null;
      hideDetail();
    }
  }
  interactionCanvas.style.cursor = wasNodeDrag ? 'pointer' : 'grab';
}

function zoomToNode(node) {
  const vp = getViewportFn();
  const cx = vp.cx != null ? vp.cx : vp.width / 2;
  const cy = vp.cy != null ? vp.cy : vp.height / 2;
  const curScale = state.camera.scale;
  const nextScale = Math.min(CFG.zoomMax, Math.max(curScale, curScale * 1.1));
  state.cameraTarget = {
    x: node.x - cx / nextScale,
    y: node.y - cy / nextScale,
    scale: nextScale,
  };
}

function onWheel(ev) {
  ev.preventDefault();
  state.cameraTarget = null;
  const factor = ev.deltaY < 0 ? CFG.zoomStep : 1 / CFG.zoomStep;
  applyZoom(state.camera, factor, ev.clientX, ev.clientY, CFG.zoomMin, CFG.zoomMax);
  hideTooltip();
}

function onKey(ev) {
  if (ev.key === 'Escape') {
    state.selected = null;
    state.cameraTarget = null;
    hideDetail();
  }
}
