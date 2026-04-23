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
  birthDurationMs: 600,
  birthSpreadMin: 0.7,
  birthSpreadMax: 1.0,
  birthAlphaStart: 0.25,
  birthRadiusStart: 0.5,

  // v3 wow
  edgeCurveStrength: 0.18,
  particleSpeed: 0.5,
  particlesPerEdge: 1,
  particleSize: 1,
  particleTrailLen: 4,
  particleTrailGap: 0.02,
  particleJitterPx: 1.8,
  particleHaloMul: 2.2,
  particleMidMul: 1.4,
  particleFlashChance: 0.04,
  particleFlashMul: 1.4,
  edgeFlashChance: 0.0012,
  edgeFlashDurationMs: 100,
  edgeFlashLineWidth: 0.9,
  heartbeatAmplitude: 0.005,
  heartbeatFreq: 0.35,
  starfieldCount: 400,
  starDepthMin: 0.1,
  starDepthMax: 0.5,
  starWorldRange: 3000,
  storyFadeMs: 260,
  storyMaxChars: 360,
  storyDwellMs: 1600,
  storyMaxHistory: 40,
  storyCharMs: 22,
  storyMaxTypeMs: 1300,
  toolUseTsStepMs: 300,
  focusDimAlpha: 0.3,
  cameraFollowLerp: 0.05,
  cameraTargetLerp: 0.15,
  zoomOnClickFactor: 1.8,
  useGradientFillBelow: 250,
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
  particle: 'rgba(140, 230, 255, ',
  star: 'rgba(200, 220, 255, ',
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
          ts: ts + (i + 1) * CFG.toolUseTsStepMs,
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
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;

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
  const areaW = viewport.safeW != null ? viewport.safeW : viewport.width;
  const areaH = viewport.safeH != null ? viewport.safeH : viewport.height;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;
  if (bbox.w <= 0 || bbox.h <= 0) {
    return {
      scale: 1,
      x: bbox.cx - cx,
      y: bbox.cy - cy,
    };
  }
  const scale = Math.min(areaW / bbox.w, areaH / bbox.h) * CFG.fitPadding;
  return {
    scale,
    x: bbox.cx - cx / scale,
    y: bbox.cy - cy / scale,
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
  pathSet: new Set(),
  stars: [],
  cameraTarget: null,
};
function resetInteractionState() {
  state.selected = null;
  state.hover = null;
  state.pathSet = new Set();
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


// --- src/view/path.js ---

function pathToRoot(node, byId, maxDepth = 500) {
  const ids = new Set();
  if (!node) return ids;
  let cur = node;
  let depth = 0;
  while (cur && !ids.has(cur.id) && depth++ < maxDepth) {
    ids.add(cur.id);
    if (!cur.parentId) break;
    const next = byId.get(cur.parentId);
    if (!next) break;
    cur = next;
  }
  return ids;
}


// --- src/view/particles.js ---

function controlPoint(a, b, strength) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const offset = len * strength;
  return {
    x: midX - (dy / len) * offset,
    y: midY + (dx / len) * offset,
  };
}
function bezierPoint(a, b, cp, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * cp.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * cp.y + t * t * b.y,
  };
}

// Касательная в точке t (нужно для perpendicular jitter)
function bezierTangent(a, b, cp, t) {
  return {
    x: 2 * (1 - t) * (cp.x - a.x) + 2 * t * (b.x - cp.x),
    y: 2 * (1 - t) * (cp.y - a.y) + 2 * t * (b.y - cp.y),
  };
}
function advanceParticle(progress, dt, speed) {
  let p = progress + dt * speed;
  while (p > 1) p -= 1;
  while (p < 0) p += 1;
  return p;
}
function ensureParticles(edges) {
  for (const e of edges) {
    if (!e.particles) {
      e.particles = [];
      for (let i = 0; i < CFG.particlesPerEdge; i++) {
        e.particles.push({ progress: (i + Math.random()) / CFG.particlesPerEdge });
      }
    }
  }
}
function tickParticles(edges, dt) {
  for (const e of edges) {
    if (!e.particles) continue;
    for (const p of e.particles) {
      p.progress = advanceParticle(p.progress, dt, CFG.particleSpeed);
    }
  }
}

function colorsFor(role) {
  if (role === 'tool_use') return { core: '255, 220, 170', mid: '255, 180, 90', halo: '255, 140, 50' };
  return { core: '240, 250, 255', mid: '160, 230, 255', halo: '70, 190, 255' };
}

function drawSpark(ctx, edge, cp, progress, edgeAlpha, camera) {
  const a = { x: edge.a.x, y: edge.a.y };
  const b = { x: edge.b.x, y: edge.b.y };
  const colors = colorsFor(edge.b.role);
  const trailN = CFG.particleTrailLen;
  const gap = CFG.particleTrailGap;
  const sz = CFG.particleSize;
  const jitter = CFG.particleJitterPx;

  // Случайная вспышка — увеличивает halo на этом кадре
  const flash = Math.random() < CFG.particleFlashChance ? CFG.particleFlashMul : 1;

  for (let k = 0; k < trailN; k++) {
    const t = progress - k * gap;
    if (t < 0 || t > 1) continue;
    const wp = bezierPoint(a, b, cp, t);
    let sx = (wp.x - camera.x) * camera.scale;
    let sy = (wp.y - camera.y) * camera.scale;

    // Perpendicular к касательной для jitter
    const tan = bezierTangent(a, b, cp, t);
    const tanLen = Math.hypot(tan.x, tan.y) || 1;
    const perpX = -tan.y / tanLen;
    const perpY = tan.x / tanLen;

    // Jitter — яркий для ядра, умеренный для хвоста
    const headFactor = k === 0 ? 1 : 0.4;
    const jitterAmt = (Math.random() - 0.5) * jitter * 2 * headFactor;
    sx += perpX * jitterAmt;
    sy += perpY * jitterAmt;

    const envelope = Math.sin(progress * Math.PI) * 1.4;
    const progressFade = Math.min(1, Math.max(0, envelope));
    const trailFade = 1 - k / trailN;
    const alpha = progressFade * trailFade * edgeAlpha;
    if (alpha < 0.02) continue;

    const haloR = sz * CFG.particleHaloMul * trailFade * flash;
    ctx.fillStyle = `rgba(${colors.halo}, ${alpha * 0.22})`;
    ctx.beginPath();
    ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
    ctx.fill();

    const midR = sz * CFG.particleMidMul * trailFade;
    ctx.fillStyle = `rgba(${colors.mid}, ${alpha * 0.55})`;
    ctx.beginPath();
    ctx.arc(sx, sy, midR, 0, Math.PI * 2);
    ctx.fill();

    const coreR = Math.max(0.6, sz * trailFade * 0.7);
    ctx.fillStyle = `rgba(${colors.core}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEdgeFlash(ctx, edge, cp, camera, ageFrac, edgeAlpha) {
  const colors = colorsFor(edge.b.role);
  const aScreen = { x: (edge.a.x - camera.x) * camera.scale, y: (edge.a.y - camera.y) * camera.scale };
  const bScreen = { x: (edge.b.x - camera.x) * camera.scale, y: (edge.b.y - camera.y) * camera.scale };
  const cpScreen = { x: (cp.x - camera.x) * camera.scale, y: (cp.y - camera.y) * camera.scale };
  const intensity = Math.pow(1 - ageFrac, 2) * edgeAlpha;

  // outer aura
  ctx.strokeStyle = `rgba(${colors.halo}, ${0.45 * intensity})`;
  ctx.lineWidth = CFG.edgeFlashLineWidth * 2.5;
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();

  // mid
  ctx.strokeStyle = `rgba(${colors.mid}, ${0.75 * intensity})`;
  ctx.lineWidth = CFG.edgeFlashLineWidth * 1.3;
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();

  // bright core
  ctx.strokeStyle = `rgba(${colors.core}, ${intensity})`;
  ctx.lineWidth = CFG.edgeFlashLineWidth * 0.6;
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();
}
function drawParticles(ctx, edges, camera, alphaOf) {
  const nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const e of edges) {
    if (!e.particles) continue;
    const edgeAlpha = alphaOf ? alphaOf(e) : 1;
    if (edgeAlpha <= 0.02) continue;
    const cp = controlPoint({ x: e.a.x, y: e.a.y }, { x: e.b.x, y: e.b.y }, CFG.edgeCurveStrength);

    // Редко триггерим полный разряд по ребру
    if (!e.flashStartMs && Math.random() < CFG.edgeFlashChance) {
      e.flashStartMs = nowMs;
    }
    if (e.flashStartMs != null) {
      const age = nowMs - e.flashStartMs;
      if (age >= CFG.edgeFlashDurationMs) {
        e.flashStartMs = null;
      } else {
        drawEdgeFlash(ctx, e, cp, camera, age / CFG.edgeFlashDurationMs, edgeAlpha);
      }
    }

    for (const p of e.particles) {
      drawSpark(ctx, e, cp, p.progress, edgeAlpha, camera);
    }
  }
  ctx.globalCompositeOperation = prev;
}


// --- src/view/starfield.js ---


function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function generateStarfield(count, seed = 1337, range = CFG.starWorldRange) {
  const rng = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (rng() - 0.5) * range * 2,
      y: (rng() - 0.5) * range * 2,
      depth: CFG.starDepthMin + rng() * (CFG.starDepthMax - CFG.starDepthMin),
      size: 0.3 + rng() * 1.3,
      alpha: 0.18 + rng() * 0.6,
      phase: rng() * Math.PI * 2,
    });
  }
  return stars;
}
function starScreen(star, camera) {
  return {
    x: star.x - camera.x * star.depth,
    y: star.y - camera.y * star.depth,
  };
}
function drawStarfield(ctx, stars, camera, viewport, tSec) {
  const W = viewport.width, H = viewport.height;
  for (const s of stars) {
    const p = starScreen(s, camera);
    if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4) continue;
    const twinkle = 0.85 + 0.15 * Math.sin(tSec * 0.7 + s.phase);
    ctx.fillStyle = `rgba(200, 220, 255, ${s.alpha * twinkle})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
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

function coreRgba(role, alpha) {
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreDarkRgba(role, alpha) {
  if (role === 'user') return `rgba(60, 100, 170, ${alpha})`;
  if (role === 'tool_use') return `rgba(140, 80, 30, ${alpha})`;
  return `rgba(30, 110, 95, ${alpha})`;
}

function edgeRgba(childRole, alpha) {
  if (childRole === 'tool_use') return `rgba(236, 160, 64, ${alpha * 1.28})`;
  return `rgba(0, 212, 255, ${alpha})`;
}
function birthFactor(bornAt, now, duration) {
  if (bornAt == null) return 0;
  const t = (now - bornAt) / duration;
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  return t;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function updateBirths(state, cutoff, nowMs) {
  for (const n of state.nodes) {
    const alive = n.ts <= cutoff;
    if (alive && n.bornAt == null) {
      n.bornAt = nowMs;
      const parent = n.parentId ? state.byId.get(n.parentId) : null;
      if (parent && parent.bornAt != null) {
        const angle = Math.random() * Math.PI * 2;
        const dist = CFG.springLen * (CFG.birthSpreadMin + Math.random() * (CFG.birthSpreadMax - CFG.birthSpreadMin));
        n.x = parent.x + Math.cos(angle) * dist;
        n.y = parent.y + Math.sin(angle) * dist;
        n.vx = 0;
        n.vy = 0;
      }
    } else if (!alive && n.bornAt != null) {
      n.bornAt = null;
    }
  }
}

function drawEdgeCurve(ctx, aScreen, bScreen, cpScreen) {
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();
}
function draw(ctx, state, tSec, viewport, extras) {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  const cam = state.camera;
  const cutoff = timelineCutoff(state);
  const nowMs = tSec * 1000;
  updateBirths(state, cutoff, nowMs);

  const heartbeat = (extras && extras.allowHeartbeat !== false)
    ? 1 + Math.sin(tSec * CFG.heartbeatFreq) * CFG.heartbeatAmplitude
    : 1;

  // ---- STARFIELD (не подвержен heartbeat)
  if (extras && extras.starfield) {
    extras.starfield(ctx, tSec);
  }

  // ---- Применяем heartbeat на графе вокруг центра viewport
  const cxScreen = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cyScreen = viewport.cy != null ? viewport.cy : viewport.height / 2;
  ctx.save();
  if (heartbeat !== 1) {
    ctx.translate(cxScreen, cyScreen);
    ctx.scale(heartbeat, heartbeat);
    ctx.translate(-cxScreen, -cyScreen);
  }

  const bfOf = n => birthFactor(n.bornAt, nowMs, CFG.birthDurationMs);
  const alpha = n => CFG.birthAlphaStart + (1 - CFG.birthAlphaStart) * easeOutCubic(bfOf(n));
  const sizeScale = n => CFG.birthRadiusStart + (1 - CFG.birthRadiusStart) * easeOutCubic(bfOf(n));
  const visible = n => n.ts <= cutoff && n.bornAt != null;

  const hasPath = state.pathSet && state.pathSet.size > 0;
  const dimMul = node => {
    if (!hasPath) return 1;
    return state.pathSet.has(node.id) ? 1 : CFG.focusDimAlpha;
  };
  const edgeDim = e => hasPath
    ? (state.pathSet.has(e.a.id) && state.pathSet.has(e.b.id) ? 1 : CFG.focusDimAlpha)
    : 1;

  // ---- EDGES (curved)
  ctx.lineWidth = 0.8;
  const edgeCPs = new Map();
  for (const e of state.edges) {
    if (!visible(e.a) || !visible(e.b)) continue;
    const ag = alpha(e.b) * edgeDim(e);
    const aS = worldToScreen(e.a.x, e.a.y, cam);
    const bS = worldToScreen(e.b.x, e.b.y, cam);
    const cpWorld = controlPoint({ x: e.a.x, y: e.a.y }, { x: e.b.x, y: e.b.y }, CFG.edgeCurveStrength);
    const cpS = worldToScreen(cpWorld.x, cpWorld.y, cam);
    edgeCPs.set(e, cpWorld);
    ctx.strokeStyle = edgeRgba(e.b.role, 0.35 * ag);
    drawEdgeCurve(ctx, aS, bS, cpS);
  }

  // ---- PARTICLES (по кривым рёбер)
  if (extras && extras.particles) {
    extras.particles(ctx, (edge) => {
      if (!visible(edge.a) || !visible(edge.b)) return 0;
      return alpha(edge.b) * edgeDim(edge);
    });
  }

  // ---- NODES
  const useGradient = state.nodes.length < CFG.useGradientFillBelow;
  for (const n of state.nodes) {
    if (!visible(n)) continue;
    const ag = alpha(n) * dimMul(n);
    const ss = sizeScale(n);
    const s = worldToScreen(n.x, n.y, cam);
    const boost = 0.3 + 0.7 * n.recency;
    const pulse = (Math.sin(tSec * CFG.pulseFreq + n.phase) + 1) * 0.5;
    const r = (n.r * ss + pulse * 0.8 * boost * ss) * cam.scale;
    if (r <= 0) continue;

    ctx.fillStyle = glowRgba(n.role, (0.18 + 0.12 * pulse * boost) * ag);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    if (useGradient) {
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      grad.addColorStop(0, coreRgba(n.role, ag));
      grad.addColorStop(1, coreDarkRgba(n.role, ag));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = coreRgba(n.role, ag);
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- HOVER RING
  if (state.hover && visible(state.hover)) {
    const s = worldToScreen(state.hover.x, state.hover.y, cam);
    const r = state.hover.r * cam.scale + 4;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.selected && visible(state.selected)) {
    const s = worldToScreen(state.selected.x, state.selected.y, cam);
    const r = state.selected.r * cam.scale + 7;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
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
let lastStepMs = 0;
let sortedIds = [];
let stepIndex = 0;
const STEP_INTERVAL_MS = CFG.storyDwellMs;
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
function isPlaying() { return playing; }

function computeTsBounds() {
  if (!state.nodes.length) return { tsMin: 0, tsMax: 1 };
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return { tsMin, tsMax };
}

function startPlay() {
  if (!state.nodes.length) return;
  // Сортируем ноды по ts
  sortedIds = [...state.nodes].sort((a, b) => a.ts - b.ts).map(n => n.id);
  // Если диалог уже досмотрен или стартуем с нуля — обнуляем
  resetStory();
  state.timelineMax = 0;
  stepIndex = 0;
  playing = true;
  lastStepMs = performance.now();
  updatePlayBtn();
  updateLabel();
  // Шагаем первую ноду сразу, чтобы не ждать интервал
  advanceStep();
}

function stopPlay() {
  playing = false;
  updatePlayBtn();
}

function advanceStep() {
  if (stepIndex >= sortedIds.length) {
    state.timelineMax = 1;
    syncSlider();
    updateLabel();
    stopPlay();
    return;
  }
  const id = sortedIds[stepIndex++];
  const node = state.byId.get(id);
  if (!node) return advanceStep();
  const { tsMin, tsMax } = computeTsBounds();
  const range = Math.max(1, tsMax - tsMin);
  const desired = (node.ts - tsMin) / range;
  // Небольшая дельта, чтобы cutoff строго >= ts ноды
  state.timelineMax = Math.min(1, desired + 0.0001);
  syncSlider();
  updateLabel();
}
function tickPlay() {
  if (!playing) return;
  const now = performance.now();
  if (now - lastStepMs >= STEP_INTERVAL_MS) {
    lastStepMs = now;
    advanceStep();
  }
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
  const { tsMin, tsMax } = computeTsBounds();
  const t = tsMin + (tsMax - tsMin) * state.timelineMax;
  const visible = state.nodes.filter(n => n.ts <= t).length;
  labelEl.innerHTML = `<b>${visible}</b> / ${state.nodes.length} &middot; <span>${new Date(t).toISOString().replace('T', ' ').slice(0, 19)}</span>`;
}
function resetTimeline() {
  stopPlay();
  if (sliderEl) sliderEl.value = 100;
  state.timelineMax = 1;
  sortedIds = [];
  stepIndex = 0;
  updateLabel();
}


// --- src/ui/story-mode.js ---



let streamEl, phoneEl;

const seen = new Set();
let activeNodeId = null;
function initStory() {
  streamEl = document.getElementById('chat-stream');
  phoneEl = document.getElementById('phone');
}

function buildBubble(node) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-row role-' + node.role;

  const msg = document.createElement('div');
  msg.className = 'chat-msg role-' + node.role;

  const roleEl = document.createElement('div');
  roleEl.className = 'chat-role ' + node.role;
  roleEl.textContent = node.role === 'tool_use' ? (node.toolName || 'tool') : node.role;

  const textEl = document.createElement('div');
  textEl.className = 'chat-text typing';

  const raw = node.text || '';
  const trimmed = raw.length > CFG.storyMaxChars ? raw.slice(0, CFG.storyMaxChars) + '…' : (raw || '(no text)');

  msg.appendChild(roleEl);
  msg.appendChild(textEl);
  wrap.appendChild(msg);
  return { wrap, textEl, fullText: trimmed };
}

function typeOut(textEl, fullText) {
  const total = fullText.length;
  if (total === 0) { textEl.classList.remove('typing'); return; }
  const charMs = CFG.storyCharMs;
  const estimatedMs = total * charMs;
  const stepPerTick = estimatedMs > CFG.storyMaxTypeMs
    ? Math.ceil(total / (CFG.storyMaxTypeMs / charMs))
    : 1;
  let i = 0;
  const tick = () => {
    i = Math.min(total, i + stepPerTick);
    textEl.textContent = fullText.slice(0, i);
    if (streamEl) streamEl.scrollTop = streamEl.scrollHeight;
    if (i < total) {
      textEl._typeTimer = setTimeout(tick, charMs);
    } else {
      textEl._typeTimer = null;
      textEl.classList.remove('typing');
    }
  };
  tick();
}

function collectNew(state) {
  const newly = [];
  for (const n of state.nodes) {
    if (n.bornAt == null) continue;
    if (seen.has(n.id)) continue;
    newly.push(n);
    seen.add(n.id);
  }
  newly.sort((a, b) => a.ts - b.ts);
  return newly;
}

function postBubble(node) {
  if (!streamEl) return;
  const { wrap, textEl, fullText } = buildBubble(node);
  streamEl.appendChild(wrap);
  requestAnimationFrame(() => {
    wrap.classList.add('show');
    streamEl.scrollTop = streamEl.scrollHeight;
    typeOut(textEl, fullText);
  });
  while (streamEl.children.length > CFG.storyMaxHistory) {
    streamEl.removeChild(streamEl.firstChild);
  }
  activeNodeId = node.id;
  if (phoneEl) phoneEl.classList.add('active');
}
function tickStory(nowMs, state) {
  const active = isPlaying() && state.nodes.length > 0;
  if (!active) return;
  const newly = collectNew(state);
  for (const n of newly) postBubble(n);
}
function getFrontierNodeId() { return activeNodeId; }
function resetStory() {
  seen.clear();
  activeNodeId = null;
  if (streamEl) streamEl.innerHTML = '';
  if (phoneEl) phoneEl.classList.remove('active');
}


// --- src/ui/interaction.js ---







let interactionCanvas;
let dragging = false, dragStart = null, dragMoved = false, lastMouse = null;
let draggedNode = null;
let getViewportFn = () => ({ width: window.innerWidth, height: window.innerHeight, cx: window.innerWidth / 2, cy: window.innerHeight / 2 });
function initInteraction(canvasEl, getViewport) {
  interactionCanvas = canvasEl;
  if (getViewport) getViewportFn = getViewport;
  interactionCanvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  interactionCanvas.addEventListener('wheel', onWheel, { passive: false });
  interactionCanvas.addEventListener('mouseleave', () => { state.hover = null; state.pathSet = new Set(); hideTooltip(); });
  window.addEventListener('keydown', onKey);
}
function isPanning() { return dragging && !draggedNode; }
function isDraggingNode() { return !!draggedNode; }

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


// --- src/ui/loader.js ---









let _getViewport;
let _onReady = () => {};
function initLoader(getViewportFn, onReady) {
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

const SAFE_INSETS = { top: 130, bottom: 80, left: 16, right: 16 };

function getViewport() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const safeW = Math.max(100, w - SAFE_INSETS.left - SAFE_INSETS.right);
  const safeH = Math.max(100, h - SAFE_INSETS.top - SAFE_INSETS.bottom);
  return {
    width: w,
    height: h,
    safeW,
    safeH,
    cx: SAFE_INSETS.left + safeW / 2,
    cy: SAFE_INSETS.top + safeH / 2,
  };
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
initStory();
initInteraction(canvas, getViewport);
initLoader(getViewport, onGraphReady);

state.stars = generateStarfield(CFG.starfieldCount);

function onGraphReady() {
  ensureParticles(state.edges);
  resetStory();
}

let lastMs = performance.now();
function frame(tms) {
  const tSec = tms / 1000;
  const dt = Math.min(0.1, (tms - lastMs) / 1000);
  lastMs = tms;
  const vp = getViewport();

  tickPlay();
  if (state.running) stepPhysics(state.nodes, state.edges, vp);
  tickParticles(state.edges, dt);

  // Camera auto-follow при play (если пользователь ничего не тащит)
  if (isPlaying() && !isPanning() && !isDraggingNode()) {
    const fid = getFrontierNodeId();
    if (fid) {
      const target = state.byId.get(fid);
      if (target) {
        const desiredX = target.x - vp.cx / state.camera.scale;
        const desiredY = target.y - vp.cy / state.camera.scale;
        state.camera.x += (desiredX - state.camera.x) * CFG.cameraFollowLerp;
        state.camera.y += (desiredY - state.camera.y) * CFG.cameraFollowLerp;
      }
    }
  }

  // Camera target (zoom-to-node)
  if (state.cameraTarget) {
    const t = state.cameraTarget;
    const dx = t.x - state.camera.x;
    const dy = t.y - state.camera.y;
    const ds = t.scale - state.camera.scale;
    state.camera.x += dx * CFG.cameraTargetLerp;
    state.camera.y += dy * CFG.cameraTargetLerp;
    state.camera.scale += ds * CFG.cameraTargetLerp;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(ds) < 0.001) {
      state.cameraTarget = null;
    }
  }

  const allowHeartbeat = !isDraggingNode() && !isPanning();

  draw(ctx, state, tSec, vp, {
    allowHeartbeat,
    starfield: (c, t) => drawStarfield(c, state.stars, state.camera, vp, t),
    particles: (c, alphaOf) => drawParticles(c, state.edges, state.camera, alphaOf),
  });

  // Story mode должен читать bornAt после того как draw()/updateBirths его обновил
  tickStory(tms, state);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__viz = { state, CFG };


})(typeof window !== "undefined" ? window : this);