"use strict";

(function (window) {

// --- src/core/config.js ---

const CFG = {
  maxMessages: 5000,
  excerptChars: 400,
  tooltipMaxChars: 80,
  repulsion: 9000,
  spring: 0.05,
  springLen: 90,
  damping: 0.85,
  centerPull: 0.002,
  minR: 3,
  maxR: 20,
  pulseFreq: 2.0,
  clickTolerancePx: 4,
  hitPad: 4,
  toolNodeScale: 0.6,
  fitPadding: 0.85,
  prewarmIterations: 180,
  zoomStep: 1.1,
  zoomMin: 0.1,
  zoomMax: 8,
};
const COLORS = {
  bg: '#0a0e1a',
  user: '#7BAAF0',
  assistant: '#50D4B5',
  tool: '#ECA040',
  edge: 'rgba(0, 212, 255, 0.35)',
  toolEdge: 'rgba(236, 160, 64, 0.45)',
  accent: '#ECA040',
  text: '#cfe6ff',
  muted: '#6a7c95',
};


// --- src/core/sample.js ---

const SAMPLE_JSONL = [
  `{"type":"queue-operation","operation":"enqueue","timestamp":"2026-04-23T10:00:00.000Z","content":"служебное, должно отфильтроваться"}`,
  `{"type":"user","uuid":"u1","parentUuid":null,"timestamp":"2026-04-23T10:00:00.000Z","message":{"role":"user","content":"Хочу визуализировать разговор с ИИ как граф. Ноды = сообщения, рёбра = связи."}}`,
  `{"type":"assistant","uuid":"a1","parentUuid":"u1","timestamp":"2026-04-23T10:00:14.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Графом — хорошая идея. parentUuid даёт готовое дерево. Цветом по роли, размером по длине, пульсом по свежести."},{"type":"tool_use","id":"tu_a1_1","name":"Grep","input":{"pattern":"force.*directed","path":"src/"}}]}}`,
  `{"type":"user","uuid":"u2","parentUuid":"a1","timestamp":"2026-04-23T10:00:38.000Z","message":{"role":"user","content":"Да, именно так. А стек?"}}`,
  `{"type":"assistant","uuid":"a2","parentUuid":"u2","timestamp":"2026-04-23T10:00:50.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Canvas 2D без зависимостей — как lava-orb. Сначала один файл, потом модули."},{"type":"tool_use","id":"tu_a2_1","name":"Write","input":{"file_path":"index.html"}}]}}`,
  `{"type":"user","uuid":"u3","parentUuid":"a2","timestamp":"2026-04-23T10:01:15.000Z","message":{"role":"user","content":"Физика какая?"}}`,
  `{"type":"assistant","uuid":"a3","parentUuid":"u3","timestamp":"2026-04-23T10:01:30.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Классический spring-damper: Coulomb-repulsion, spring на рёбрах, damping 0.85, слабая центральная сила. До ~1000 нод без Barnes-Hut."}]}}`,
  `{"type":"user","uuid":"u4","parentUuid":"a1","timestamp":"2026-04-23T10:01:45.000Z","message":{"role":"user","content":"А данные откуда?"}}`,
  `{"type":"assistant","uuid":"a4","parentUuid":"u4","timestamp":"2026-04-23T10:02:05.000Z","message":{"role":"assistant","content":[{"type":"text","text":"JSONL-сессии Claude Code в ~/.claude/projects/. uuid + parentUuid — готовый граф."},{"type":"tool_use","id":"tu_a4_1","name":"Glob","input":{"pattern":"**/*.jsonl"}}]}}`,
  `{"type":"user","uuid":"u5","parentUuid":"a3","timestamp":"2026-04-23T10:02:30.000Z","message":{"role":"user","content":"Интерактив?"}}`,
  `{"type":"assistant","uuid":"a5","parentUuid":"u5","timestamp":"2026-04-23T10:02:48.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Zoom колесом, pan drag-ом, клик = панель с текстом, hover = тултип, timeline slider — видеть разговор во времени."}]}}`,
  `{"type":"queue-operation","operation":"dequeue","timestamp":"2026-04-23T10:02:48.010Z"}`,
].join('\n');


// --- src/core/parser.js ---


function classifyContent(content) {
  if (typeof content === 'string') return { text: content, toolUses: [] };
  if (!Array.isArray(content)) return { text: '', toolUses: [] };
  const textParts = [];
  const toolUses = [];
  for (const block of content) {
    if (!block) continue;
    if (block.type === 'text' && typeof block.text === 'string') {
      textParts.push(block.text);
    } else if (block.type === 'tool_use') {
      toolUses.push({
        id: block.id || null,
        name: typeof block.name === 'string' ? block.name : 'tool',
        input: block.input || {},
      });
    }
  }
  return { text: textParts.join('\n'), toolUses };
}
function extractText(message) {
  if (!message) return '';
  return classifyContent(message.content).text;
}
function parseJSONL(text) {
  const lines = text.split(/\r?\n/);
  const nodes = [];
  const unknownTypes = new Map();
  let parsed = 0, kept = 0, skipped = 0, errors = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    parsed++;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { errors++; continue; }

    const t = obj.type;
    if (t !== 'user' && t !== 'assistant') {
      if (t) unknownTypes.set(t, (unknownTypes.get(t) || 0) + 1);
      skipped++;
      continue;
    }

    const { text: msgText, toolUses } = classifyContent(obj.message && obj.message.content);
    const baseId = obj.uuid || `gen-${nodes.length}`;
    const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
    const parentId = obj.parentUuid || null;

    nodes.push({
      id: baseId,
      parentId,
      role: t,
      ts,
      text: msgText,
      textLen: msgText.length,
    });
    kept++;

    if (t === 'assistant') {
      for (let i = 0; i < toolUses.length; i++) {
        const tu = toolUses[i];
        const inputStr = safeStringify(tu.input);
        const subText = `${tu.name}\n${inputStr}`;
        nodes.push({
          id: `${baseId}#tu${i}`,
          parentId: baseId,
          role: 'tool_use',
          ts: ts + i + 1,
          text: subText,
          textLen: subText.length,
          toolName: tu.name,
        });
        kept++;
      }
    }

    if (kept >= CFG.maxMessages) break;
  }

  if (unknownTypes.size && typeof console !== 'undefined') {
    console.warn('[parseJSONL] skipped types:', JSON.stringify(Object.fromEntries(unknownTypes)));
  }

  return { nodes, stats: { parsed, kept, skipped, errors } };
}

function safeStringify(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}


// --- src/core/graph.js ---

function buildGraph(parsed, viewport) {
  const { width, height } = viewport;
  const cx = width / 2, cy = height / 2;
  const n = parsed.nodes.length;

  const nodes = parsed.nodes.map((src, i) => {
    const angle = n ? (i / n) * Math.PI * 2 : 0;
    const spread = 80 + Math.random() * 60;
    return {
      ...src,
      x: cx + Math.cos(angle) * spread + (Math.random() - 0.5) * 30,
      y: cy + Math.sin(angle) * spread + (Math.random() - 0.5) * 30,
      vx: 0, vy: 0,
      r: CFG.minR,
      recency: 0,
      phase: Math.random() * Math.PI * 2,
    };
  });

  const byId = new Map(nodes.map(node => [node.id, node]));

  const edges = [];
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) {
      edges.push({
        source: node.parentId,
        target: node.id,
        a: byId.get(node.parentId),
        b: node,
      });
    }
  }

  if (nodes.length) {
    let tMin = Infinity, tMax = -Infinity;
    for (const node of nodes) {
      if (node.ts < tMin) tMin = node.ts;
      if (node.ts > tMax) tMax = node.ts;
    }
    const dt = Math.max(1, tMax - tMin);
    for (const node of nodes) {
      node.recency = (node.ts - tMin) / dt;
      const baseR = CFG.minR + 2 * Math.log(node.textLen + 1);
      const clamped = Math.min(CFG.maxR, Math.max(CFG.minR, baseR));
      node.r = node.role === 'tool_use' ? Math.max(CFG.minR, clamped * CFG.toolNodeScale) : clamped;
    }
  }

  return { nodes, edges, byId };
}


// --- src/core/layout.js ---

function stepPhysics(nodes, edges, viewport) {
  if (!nodes.length) return;
  const cx = viewport.width / 2, cy = viewport.height / 2;

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = dx * dx + dy * dy + 0.01; }
      const d = Math.sqrt(d2);
      const f = CFG.repulsion / d2;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
  }

  for (const e of edges) {
    const a = e.a, b = e.b;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const disp = d - CFG.springLen;
    const f = CFG.spring * disp;
    const fx = (dx / d) * f, fy = (dy / d) * f;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  for (const n of nodes) {
    n.vx += (cx - n.x) * CFG.centerPull;
    n.vy += (cy - n.y) * CFG.centerPull;
    n.vx *= CFG.damping;
    n.vy *= CFG.damping;
    n.x += n.vx;
    n.y += n.vy;
  }
}
function prewarm(nodes, edges, viewport, iterations) {
  const n = iterations == null ? CFG.prewarmIterations : iterations;
  for (let i = 0; i < n; i++) stepPhysics(nodes, edges, viewport);
}
function computeBBox(nodes) {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0, cx: 0, cy: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x - n.r < minX) minX = n.x - n.r;
    if (n.y - n.r < minY) minY = n.y - n.r;
    if (n.x + n.r > maxX) maxX = n.x + n.r;
    if (n.y + n.r > maxY) maxY = n.y + n.r;
  }
  const w = maxX - minX, h = maxY - minY;
  return { minX, minY, maxX, maxY, w, h, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}
function fitToView(nodes, viewport) {
  const bbox = computeBBox(nodes);
  if (bbox.w <= 0 || bbox.h <= 0) {
    return {
      scale: 1,
      x: bbox.cx - viewport.width / 2,
      y: bbox.cy - viewport.height / 2,
    };
  }
  const scale = Math.min(viewport.width / bbox.w, viewport.height / bbox.h) * CFG.fitPadding;
  return {
    scale,
    x: bbox.cx - viewport.width / (2 * scale),
    y: bbox.cy - viewport.height / (2 * scale),
  };
}


// --- src/view/state.js ---

const state = {
  nodes: [],
  edges: [],
  byId: new Map(),
  selected: null,
  hover: null,
  camera: { x: 0, y: 0, scale: 1 },
  stats: null,
  running: true,
  timelineMax: 1,
};
function resetInteractionState() {
  state.selected = null;
  state.hover = null;
}


// --- src/view/camera.js ---

function worldToScreen(wx, wy, cam) {
  return { x: (wx - cam.x) * cam.scale, y: (wy - cam.y) * cam.scale };
}
function screenToWorld(sx, sy, cam) {
  return { x: sx / cam.scale + cam.x, y: sy / cam.scale + cam.y };
}
function applyZoom(cam, factor, anchorSx, anchorSy, min, max) {
  const before = screenToWorld(anchorSx, anchorSy, cam);
  cam.scale *= factor;
  if (cam.scale < min) cam.scale = min;
  if (cam.scale > max) cam.scale = max;
  const after = screenToWorld(anchorSx, anchorSy, cam);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
}


// --- src/view/renderer.js ---



function timelineCutoff(state) {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

function glowRgba(role, alpha) {
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreColor(role) {
  if (role === 'user') return COLORS.user;
  if (role === 'tool_use') return COLORS.tool;
  return COLORS.assistant;
}
function draw(ctx, state, tSec, viewport) {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  const cam = state.camera;
  const scale = cam.scale;
  const cutoff = timelineCutoff(state);
  const visible = n => n.ts <= cutoff;

  ctx.lineWidth = 0.8;
  for (const e of state.edges) {
    if (!visible(e.a) || !visible(e.b)) continue;
    const a = worldToScreen(e.a.x, e.a.y, cam);
    const b = worldToScreen(e.b.x, e.b.y, cam);
    ctx.strokeStyle = e.b.role === 'tool_use' ? COLORS.toolEdge : COLORS.edge;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (const n of state.nodes) {
    if (!visible(n)) continue;
    const s = worldToScreen(n.x, n.y, cam);
    const boost = 0.3 + 0.7 * n.recency;
    const pulse = (Math.sin(tSec * CFG.pulseFreq + n.phase) + 1) * 0.5;
    const r = (n.r + pulse * 0.8 * boost) * scale;

    ctx.fillStyle = glowRgba(n.role, 0.18 + 0.12 * pulse * boost);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = coreColor(n.role);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.hover && visible(state.hover)) {
    const s = worldToScreen(state.hover.x, state.hover.y, cam);
    const r = state.hover.r * scale + 4;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.selected && visible(state.selected)) {
    const s = worldToScreen(state.selected.x, state.selected.y, cam);
    const r = state.selected.r * scale + 7;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}


// --- src/ui/detail-panel.js ---



let detailEl, detailRoleEl, detailTsEl, detailBodyEl;
function initDetail() {
  detailEl = document.getElementById('detail');
  detailRoleEl = document.getElementById('detail-role');
  detailTsEl = document.getElementById('detail-ts');
  detailBodyEl = document.getElementById('detail-body');
  document.getElementById('detail-close').addEventListener('click', () => {
    state.selected = null;
    hideDetail();
  });
}
function showDetail(n) {
  detailRoleEl.textContent = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
  detailRoleEl.className = 'role ' + n.role;
  detailTsEl.textContent = new Date(n.ts).toISOString().replace('T', ' ').slice(0, 19);
  const txt = n.text || '(empty)';
  detailBodyEl.textContent = txt.length > CFG.excerptChars ? txt.slice(0, CFG.excerptChars) + '…' : txt;
  detailEl.classList.add('show');
}
function hideDetail() {
  if (detailEl) detailEl.classList.remove('show');
}


// --- src/ui/tooltip.js ---


let tooltipEl, tooltipRoleEl, tooltipBodyEl;
function initTooltip() {
  tooltipEl = document.getElementById('tooltip');
  tooltipRoleEl = tooltipEl.querySelector('.tt-role');
  tooltipBodyEl = tooltipEl.querySelector('.tt-body');
}
function showTooltip(node, screenX, screenY) {
  if (!tooltipEl || !node) return;
  const text = node.text || '';
  const trimmed = text.slice(0, CFG.tooltipMaxChars);
  const suffix = text.length > CFG.tooltipMaxChars ? '…' : '';
  tooltipRoleEl.textContent = node.role === 'tool_use' ? (node.toolName || 'tool') : node.role;
  tooltipRoleEl.className = 'tt-role ' + node.role;
  tooltipBodyEl.textContent = trimmed + suffix;
  const { innerWidth: W, innerHeight: H } = window;
  const rect = tooltipEl.getBoundingClientRect();
  const padding = 14;
  let left = screenX + padding;
  let top = screenY + padding;
  if (left + rect.width > W - 8) left = screenX - rect.width - padding;
  if (top + rect.height > H - 8) top = screenY - rect.height - padding;
  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top = top + 'px';
  tooltipEl.classList.add('show');
}
function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('show');
}


// --- src/ui/timeline.js ---


let sliderEl, labelEl, playBtn;
let playing = false;
let lastPlayTime = 0;
const PLAY_DURATION_SEC = 20;
function initTimeline() {
  sliderEl = document.getElementById('timeline');
  labelEl = document.getElementById('timeline-label');
  playBtn = document.getElementById('btn-play');
  sliderEl.addEventListener('input', onSliderInput);
  playBtn.addEventListener('click', togglePlay);
  updateLabel();
  updatePlayBtn();
}

function onSliderInput() {
  state.timelineMax = parseFloat(sliderEl.value) / 100;
  if (playing) stopPlay();
  updateLabel();
}
function togglePlay() {
  if (playing) stopPlay(); else startPlay();
}

function startPlay() {
  if (!state.nodes.length) return;
  if (state.timelineMax >= 1) state.timelineMax = 0;
  syncSlider();
  playing = true;
  lastPlayTime = performance.now() / 1000;
  updatePlayBtn();
  updateLabel();
}

function stopPlay() {
  playing = false;
  updatePlayBtn();
}
function tickPlay() {
  if (!playing) return;
  const now = performance.now() / 1000;
  const dt = now - lastPlayTime;
  lastPlayTime = now;
  const step = advanceTimeline(state.timelineMax, dt, PLAY_DURATION_SEC);
  state.timelineMax = step.value;
  syncSlider();
  updateLabel();
  if (step.finished) stopPlay();
}
function advanceTimeline(current, dt, duration) {
  const next = current + dt / duration;
  if (next >= 1) return { value: 1, finished: true };
  return { value: next, finished: false };
}

function syncSlider() {
  if (sliderEl) sliderEl.value = String(Math.round(state.timelineMax * 100));
}

function updatePlayBtn() {
  if (!playBtn) return;
  playBtn.textContent = playing ? '⏸' : '▶';
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  playBtn.classList.toggle('playing', playing);
}

function updateLabel() {
  if (!labelEl) return;
  if (!state.nodes.length) { labelEl.textContent = '—'; return; }
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  const t = tsMin + (tsMax - tsMin) * state.timelineMax;
  const visible = state.nodes.filter(n => n.ts <= t).length;
  labelEl.innerHTML = `<b>${visible}</b> / ${state.nodes.length} &middot; <span>${new Date(t).toISOString().replace('T', ' ').slice(0, 19)}</span>`;
}
function resetTimeline() {
  stopPlay();
  if (sliderEl) sliderEl.value = 100;
  state.timelineMax = 1;
  updateLabel();
}


// --- src/ui/interaction.js ---






let interactionCanvas;
let dragging = false, dragStart = null, dragMoved = false, lastMouse = null;
let draggedNode = null;
function initInteraction(canvasEl) {
  interactionCanvas = canvasEl;
  interactionCanvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  interactionCanvas.addEventListener('wheel', onWheel, { passive: false });
  interactionCanvas.addEventListener('mouseleave', () => { state.hover = null; hideTooltip(); });
}

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
  if (draggedNode) {
    state.hover = draggedNode;
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
  if (!dragMoved) {
    const hit = hitTest(ev.clientX, ev.clientY);
    if (hit) {
      state.selected = hit;
      showDetail(hit);
    } else {
      state.selected = null;
      hideDetail();
    }
  }
  interactionCanvas.style.cursor = wasNodeDrag ? 'pointer' : 'grab';
}

function onWheel(ev) {
  ev.preventDefault();
  const factor = ev.deltaY < 0 ? CFG.zoomStep : 1 / CFG.zoomStep;
  applyZoom(state.camera, factor, ev.clientX, ev.clientY, CFG.zoomMin, CFG.zoomMax);
  hideTooltip();
}


// --- src/ui/loader.js ---









let _getViewport;
function initLoader(getViewportFn) {
  _getViewport = getViewportFn;

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
function loadText(text) {
  try {
    hideError();
    const parsed = parseJSONL(text);
    if (!parsed.nodes.length) { showError('No user/assistant messages found.'); return; }
    const vp = _getViewport();
    const g = buildGraph(parsed, vp);
    prewarm(g.nodes, g.edges, vp);
    state.nodes = g.nodes;
    state.edges = g.edges;
    state.byId = g.byId;
    state.selected = null;
    state.hover = null;
    state.stats = parsed.stats;
    const cam = fitToView(state.nodes, vp);
    state.camera.scale = cam.scale;
    state.camera.x = cam.x;
    state.camera.y = cam.y;
    resetTimeline();
    hideDetail();
    hideTooltip();
    updateStatsHUD();
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
  el.innerHTML = `<b>${state.nodes.length}</b> nodes &middot; <b>${state.edges.length}</b> edges &middot; <span>${s.parsed} lines</span>`;
  el.title = `parsed: ${s.parsed}\nkept: ${s.kept}\nskipped: ${s.skipped}\nerrors: ${s.errors}`;
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


// --- src/main.js ---









const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');

function getViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

initDetail();
initTooltip();
initTimeline();
initInteraction(canvas);
initLoader(getViewport);

function frame(tms) {
  const tSec = tms / 1000;
  const vp = getViewport();
  tickPlay();
  if (state.running) stepPhysics(state.nodes, state.edges, vp);
  draw(ctx, state, tSec, vp);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__viz = { state };


})(typeof window !== "undefined" ? window : this);