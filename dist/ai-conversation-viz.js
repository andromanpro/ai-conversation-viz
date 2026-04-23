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
  toolIconMinR: 6,
  toolIconMinFontPx: 9,
  toolIconFontMul: 1.25,
  nodeGlowRadiusMul: 1.9,
  nodeGlowAlphaBase: 0.08,
  nodeGlowAlphaPulse: 0.04,
  nodeGlowInnerStop: 0.4,
  searchDimAlpha: 0.22,
  searchPulseFreq: 3.5,
  livePollMs: 800,
  liveReconnectMs: 2500,
  minimapW: 170,
  minimapH: 110,
  minimapEveryNFrames: 3,
  minimapNodeR: 1.3,
  minimapPadding: 8,
  radialRingGap: 130,
  layoutTransitionMs: 900,
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

/**
 * Парсит одну JSONL-строку. Возвращает массив raw-нод (0-N шт):
 *  - 0 если строка пустая/невалидная/служебный type
 *  - 1 для user
 *  - 1+N для assistant (основная + N tool_use подноды)
 */
function parseLine(line, seedCounter) {
  const trimmed = (line || '').trim();
  if (!trimmed) return [];
  let obj;
  try { obj = JSON.parse(trimmed); } catch { return []; }
  const t = obj.type;
  if (t !== 'user' && t !== 'assistant') return [];

  const { text: msgText, toolUses } = classifyContent(obj.message && obj.message.content);
  const baseId = obj.uuid || `gen-${seedCounter != null ? seedCounter : Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
  const parentId = obj.parentUuid || null;

  const out = [{
    id: baseId,
    parentId,
    role: t,
    ts,
    text: msgText,
    textLen: msgText.length,
  }];
  if (t === 'assistant') {
    for (let i = 0; i < toolUses.length; i++) {
      const tu = toolUses[i];
      const inputStr = safeStringify(tu.input);
      const subText = `${tu.name}\n${inputStr}`;
      out.push({
        id: `${baseId}#tu${i}`,
        parentId: baseId,
        role: 'tool_use',
        ts: ts + (i + 1) * CFG.toolUseTsStepMs,
        text: subText,
        textLen: subText.length,
        toolName: tu.name,
      });
    }
  }
  return out;
}


// --- src/core/adapters.js ---

// Формат-адаптеры. На входе — сырой текст файла, на выходе
// либо уже Claude JSONL (`type: user/assistant + parentUuid`),
// либо пустая строка. loader.js использует detectFormat()
// и вызывает соответствующий toClaudeJsonl().
function detectFormat(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'unknown';
  if (trimmed[0] === '[' || trimmed[0] === '{') {
    try {
      const obj = JSON.parse(trimmed);
      const sample = Array.isArray(obj) ? obj[0] : obj;
      if (sample && sample.mapping) return 'chatgpt-export';
      if (Array.isArray(obj) && obj.length && obj[0].role && obj[0].content != null) return 'anthropic-messages';
    } catch { /* might be JSONL */ }
  }
  // Первая непустая строка — валидный JSON c типом/полями Claude Code
  for (const line of trimmed.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (obj.type === 'user' || obj.type === 'assistant'
          || obj.type === 'queue-operation' || obj.type === 'last-prompt'
          || obj.parentUuid !== undefined) {
        return 'claude-jsonl';
      }
    } catch {}
    break;
  }
  return 'unknown';
}
function chatgptToClaudeJsonl(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return ''; }
  const conversations = Array.isArray(obj) ? obj : [obj];
  const out = [];
  for (const conv of conversations) {
    const mapping = conv && conv.mapping;
    if (!mapping) continue;
    const convId = conv.id || conv.conversation_id || '';
    for (const [id, node] of Object.entries(mapping)) {
      const msg = node && node.message;
      if (!msg || !msg.author) continue;
      const role = msg.author.role;
      if (role !== 'user' && role !== 'assistant') continue;
      const c = msg.content || {};
      const parts = Array.isArray(c.parts) ? c.parts : (c.text ? [c.text] : []);
      const textJoined = parts
        .map(p => (typeof p === 'string' ? p : (p && p.text) || ''))
        .filter(Boolean)
        .join('\n');
      if (!textJoined) continue;
      const ts = msg.create_time
        ? new Date(msg.create_time * 1000).toISOString()
        : new Date().toISOString();
      const parentId = node.parent || null;
      out.push(JSON.stringify({
        type: role,
        uuid: convId ? `${convId}:${id}` : id,
        parentUuid: parentId ? (convId ? `${convId}:${parentId}` : parentId) : null,
        timestamp: ts,
        message: { role, content: textJoined },
      }));
    }
  }
  return out.join('\n');
}
function anthropicMessagesToClaudeJsonl(text) {
  let arr;
  try { arr = JSON.parse(text); } catch { return ''; }
  if (!Array.isArray(arr)) return '';
  const out = [];
  const baseTs = Date.now();
  let prevId = null;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    const role = m.role;
    if (role !== 'user' && role !== 'assistant') continue;
    let textBlock = '';
    if (typeof m.content === 'string') textBlock = m.content;
    else if (Array.isArray(m.content)) {
      textBlock = m.content
        .filter(b => b && b.type === 'text')
        .map(b => b.text)
        .join('\n');
    }
    const id = `msg-${i}`;
    const ts = new Date(baseTs + i * 15000).toISOString();
    out.push(JSON.stringify({
      type: role,
      uuid: id,
      parentUuid: prevId,
      timestamp: ts,
      message: { role, content: textBlock },
    }));
    prevId = id;
  }
  return out.join('\n');
}
function normalizeToClaudeJsonl(text) {
  const fmt = detectFormat(text);
  if (fmt === 'chatgpt-export') {
    return { format: fmt, text: chatgptToClaudeJsonl(text) };
  }
  if (fmt === 'anthropic-messages') {
    return { format: fmt, text: anthropicMessagesToClaudeJsonl(text) };
  }
  return { format: fmt, text };
}


// --- src/core/graph.js ---


function computeRadius(n) {
  const baseR = CFG.minR + 2 * Math.log(n.textLen + 1);
  const clamped = Math.min(CFG.maxR, Math.max(CFG.minR, baseR));
  return n.role === 'tool_use' ? Math.max(CFG.minR, clamped * CFG.toolNodeScale) : clamped;
}

function recomputeRecency(nodes) {
  if (!nodes.length) return;
  let tMin = Infinity, tMax = -Infinity;
  for (const n of nodes) {
    if (n.ts < tMin) tMin = n.ts;
    if (n.ts > tMax) tMax = n.ts;
  }
  const dt = Math.max(1, tMax - tMin);
  for (const n of nodes) {
    n.recency = (n.ts - tMin) / dt;
    n.r = computeRadius(n);
  }
}

/**
 * Добавляет raw-ноды (от parseLine) в уже существующий state.
 * Дедупит по id. Связи строятся по parentId, если он есть в byId.
 * Возвращает список РЕАЛЬНО добавленных нод.
 */
function appendRawNodes(state, rawNodes, viewport) {
  if (!rawNodes || !rawNodes.length) return [];
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;
  const added = [];
  for (const src of rawNodes) {
    if (state.byId.has(src.id)) continue;
    const parent = src.parentId ? state.byId.get(src.parentId) : null;
    const angle = Math.random() * Math.PI * 2;
    const dist = CFG.springLen * (CFG.birthSpreadMin + Math.random() * (CFG.birthSpreadMax - CFG.birthSpreadMin));
    const node = {
      ...src,
      x: parent ? parent.x + Math.cos(angle) * dist : cx + (Math.random() - 0.5) * 60,
      y: parent ? parent.y + Math.sin(angle) * dist : cy + (Math.random() - 0.5) * 60,
      vx: 0, vy: 0,
      r: CFG.minR,
      recency: 1,
      phase: Math.random() * Math.PI * 2,
    };
    state.nodes.push(node);
    state.byId.set(node.id, node);
    if (parent) {
      state.edges.push({ source: parent.id, target: node.id, a: parent, b: node });
    }
    added.push(node);
  }
  recomputeRecency(state.nodes);
  return added;
}
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
function computeRadialLayout(nodes, byId, viewport) {
  const positions = new Map();
  if (!nodes.length) return positions;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;

  // Построим дерево: parentId → [childId]
  const children = new Map();
  const roots = [];
  for (const n of nodes) children.set(n.id, []);
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) {
      children.get(n.parentId).push(n.id);
    } else {
      roots.push(n.id);
    }
  }
  // Children сортируем по ts
  for (const arr of children.values()) {
    arr.sort((a, b) => (byId.get(a)?.ts || 0) - (byId.get(b)?.ts || 0));
  }

  // Считаем leaves в каждом subtree
  const leaves = new Map();
  const countLeaves = (id) => {
    const kids = children.get(id) || [];
    if (!kids.length) { leaves.set(id, 1); return 1; }
    let sum = 0;
    for (const k of kids) sum += countLeaves(k);
    leaves.set(id, sum);
    return sum;
  };
  for (const r of roots) countLeaves(r);

  const ring = CFG.radialRingGap;
  const assign = (id, depth, angleStart, angleEnd) => {
    const mid = (angleStart + angleEnd) / 2;
    const radius = depth * ring;
    positions.set(id, {
      x: cx + Math.cos(mid) * radius,
      y: cy + Math.sin(mid) * radius,
    });
    const kids = children.get(id) || [];
    if (!kids.length) return;
    const total = leaves.get(id);
    let cur = angleStart;
    for (const k of kids) {
      const share = leaves.get(k) / total;
      const next = cur + (angleEnd - angleStart) * share;
      assign(k, depth + 1, cur, next);
      cur = next;
    }
  };

  if (roots.length === 1) {
    assign(roots[0], 0, -Math.PI / 2, (3 * Math.PI) / 2);
  } else {
    const slice = (Math.PI * 2) / roots.length;
    for (let i = 0; i < roots.length; i++) {
      assign(roots[i], 0, i * slice - Math.PI / 2, (i + 1) * slice - Math.PI / 2);
    }
  }
  return positions;
}
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
  searchMatches: new Set(),
  searchActive: null,
  hiddenRoles: new Set(),
  layoutMode: 'force', // 'force' | 'radial'
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


// --- src/view/tool-icons.js ---

// Unicode-символы (одноцветные, без emoji — стабильный рендер в canvas)
const TOOL_ICON_MAP = {
  bash: '▶',
  powershell: '▶',
  shell: '▶',
  read: '≡',
  grep: '⌕',
  glob: '✱',
  find: '⌕',
  write: '✎',
  edit: '✎',
  multiedit: '✎',
  notebookedit: '✎',
  task: '◇',
  agent: '◇',
  skill: '✦',
  webfetch: '↗',
  websearch: '↗',
  todowrite: '☑',
  exitplanmode: '✓',
  enterplanmode: '☰',
  askuserquestion: '?',
  schedulewakeup: '⏱',
  toolsearch: '⌘',
};
function toolIcon(toolName) {
  if (!toolName) return '•';
  const key = String(toolName).toLowerCase().replace(/[^a-z]/g, '');
  if (TOOL_ICON_MAP[key]) return TOOL_ICON_MAP[key];
  // Попробуем распознать по содержимому (mcp__server__foo_bar → foo_bar)
  const tail = key.replace(/^mcp/, '').replace(/^[a-z]+?(?=[A-Z])/, '');
  if (TOOL_ICON_MAP[tail]) return TOOL_ICON_MAP[tail];
  // Fallback — первая буква в uppercase
  return String(toolName).trim().charAt(0).toUpperCase() || '•';
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
  const visible = n => n.ts <= cutoff && n.bornAt != null && !(state.hiddenRoles && state.hiddenRoles.has(n.role));

  const hasPath = state.pathSet && state.pathSet.size > 0;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const dimMul = node => {
    if (hasSearch) return state.searchMatches.has(node.id) ? 1 : CFG.searchDimAlpha;
    if (!hasPath) return 1;
    return state.pathSet.has(node.id) ? 1 : CFG.focusDimAlpha;
  };
  const edgeDim = e => {
    if (hasSearch) {
      return (state.searchMatches.has(e.a.id) && state.searchMatches.has(e.b.id)) ? 1 : CFG.searchDimAlpha;
    }
    if (!hasPath) return 1;
    return (state.pathSet.has(e.a.id) && state.pathSet.has(e.b.id)) ? 1 : CFG.focusDimAlpha;
  };

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
    const isMatch = hasSearch && state.searchMatches.has(n.id);
    const ag = alpha(n) * dimMul(n);
    const ss = sizeScale(n);
    const s = worldToScreen(n.x, n.y, cam);
    const boost = 0.3 + 0.7 * n.recency;
    const pulse = (Math.sin(tSec * CFG.pulseFreq + n.phase) + 1) * 0.5;
    const searchPulse = isMatch ? (0.5 + 0.5 * Math.sin(tSec * CFG.searchPulseFreq + n.phase)) : 0;
    const r = (n.r * ss * (1 + searchPulse * 0.25) + pulse * 0.8 * boost * ss) * cam.scale;
    if (r <= 0) continue;

    const glowR = r * CFG.nodeGlowRadiusMul;
    const innerA = (CFG.nodeGlowAlphaBase + CFG.nodeGlowAlphaPulse * pulse * boost) * ag;
    const glowGrad = ctx.createRadialGradient(s.x, s.y, r * CFG.nodeGlowInnerStop, s.x, s.y, glowR);
    glowGrad.addColorStop(0, glowRgba(n.role, innerA));
    glowGrad.addColorStop(1, glowRgba(n.role, 0));
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
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

    // Tool icon внутри tool_use ноды
    if (n.role === 'tool_use' && r >= CFG.toolIconMinR) {
      const fs = Math.max(CFG.toolIconMinFontPx, Math.round(r * CFG.toolIconFontMul));
      ctx.font = `${fs}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(20, 14, 4, ${Math.min(1, ag * 0.92)})`;
      ctx.fillText(toolIcon(n.toolName), s.x, s.y + fs * 0.05);
    }
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

  // Активный search-результат — подсветка
  if (state.searchActive) {
    const activeNode = state.byId.get(state.searchActive);
    if (activeNode && visible(activeNode)) {
      const s = worldToScreen(activeNode.x, activeNode.y, cam);
      const r = activeNode.r * cam.scale + 10;
      const pulse = (Math.sin(tSec * CFG.searchPulseFreq) + 1) * 0.5;
      ctx.strokeStyle = `rgba(236, 160, 64, ${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
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
  syncChatToTimeline(state);
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
  sortedIds = [...state.nodes].sort((a, b) => a.ts - b.ts).map(n => n.id);
  const atEnd = state.timelineMax >= 0.9999;
  if (atEnd) {
    // Досмотрено — начать заново
    resetStory();
    state.timelineMax = 0;
    stepIndex = 0;
  } else {
    // Возобновить с текущей позиции — вычисляем stepIndex по cutoff
    const { tsMin, tsMax } = computeTsBounds();
    const range = Math.max(1, tsMax - tsMin);
    const cutoff = tsMin + range * state.timelineMax;
    stepIndex = 0;
    for (let i = 0; i < sortedIds.length; i++) {
      const node = state.byId.get(sortedIds[i]);
      if (node && node.ts <= cutoff) stepIndex = i + 1;
      else break;
    }
  }
  playing = true;
  lastStepMs = performance.now();
  updatePlayBtn();
  updateLabel();
  if (atEnd) advanceStep(); // в рестарте сразу показываем первую
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
  if (node.role === 'tool_use') {
    const icon = document.createElement('span');
    icon.className = 'chat-tool-icon';
    icon.textContent = toolIcon(node.toolName);
    roleEl.appendChild(icon);
    roleEl.appendChild(document.createTextNode(' ' + (node.toolName || 'tool')));
  } else {
    roleEl.textContent = node.role;
  }

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
  wrap.dataset.nodeId = node.id;
  streamEl.appendChild(wrap);
  requestAnimationFrame(() => {
    wrap.classList.add('show');
    streamEl.scrollTop = streamEl.scrollHeight;
    typeOut(textEl, fullText);
  });
  while (streamEl.children.length > CFG.storyMaxHistory) {
    const removed = streamEl.firstChild;
    seen.delete(removed?.dataset?.nodeId);
    streamEl.removeChild(removed);
  }
  seen.add(node.id);
  activeNodeId = node.id;
  if (phoneEl) phoneEl.classList.add('active');
}

function postBubbleInstant(node) {
  if (!streamEl) return;
  const { wrap, textEl, fullText } = buildBubble(node);
  wrap.dataset.nodeId = node.id;
  wrap.classList.add('show');
  textEl.textContent = fullText;
  textEl.classList.remove('typing');
  streamEl.appendChild(wrap);
  seen.add(node.id);
  activeNodeId = node.id;
  if (phoneEl) phoneEl.classList.add('active');
}

function cutoffTs(state) {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}
function syncChatToTimeline(state) {
  if (!streamEl) return;
  const cutoff = cutoffTs(state);
  // Определяем целевой набор id (все ноды с ts <= cutoff)
  const targetIds = new Set();
  for (const n of state.nodes) {
    if (n.ts <= cutoff) targetIds.add(n.id);
  }
  // Удаляем те bubble которые больше не должны быть
  for (const child of [...streamEl.children]) {
    const id = child.dataset.nodeId;
    if (!targetIds.has(id)) {
      child.remove();
      seen.delete(id);
    }
  }
  // Добавляем недостающие — мгновенно, без typewriter
  const toAdd = [];
  for (const n of state.nodes) {
    if (!targetIds.has(n.id)) continue;
    if (seen.has(n.id)) continue;
    toAdd.push(n);
  }
  toAdd.sort((a, b) => a.ts - b.ts);
  for (const n of toAdd) postBubbleInstant(n);
  // Обрезка по лимиту
  while (streamEl.children.length > CFG.storyMaxHistory) {
    const removed = streamEl.firstChild;
    seen.delete(removed?.dataset?.nodeId);
    streamEl.removeChild(removed);
  }
  // Скролл вниз чтобы видно было новейшие
  streamEl.scrollTop = streamEl.scrollHeight;
  if (phoneEl) {
    if (streamEl.children.length > 0) phoneEl.classList.add('active');
    else phoneEl.classList.remove('active');
  }
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


// --- src/ui/search.js ---


let barEl, inputEl, countEl, closeEl;
let matches = [];
let currentIndex = 0;
let getViewport = () => ({ cx: window.innerWidth / 2, cy: window.innerHeight / 2 });
function initSearch(getViewportFn) {
  if (getViewportFn) getViewport = getViewportFn;
  barEl = document.getElementById('search-bar');
  inputEl = document.getElementById('search-input');
  countEl = document.getElementById('search-count');
  closeEl = document.getElementById('search-close');
  if (!barEl) return;
  inputEl.addEventListener('input', runSearch);
  inputEl.addEventListener('keydown', onInputKey);
  closeEl.addEventListener('click', closeSearch);
  window.addEventListener('keydown', onGlobalKey);
  updateCount();
}

function onGlobalKey(ev) {
  const typingInField = document.activeElement === inputEl;
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'f' || ev.key === 'F')) {
    ev.preventDefault();
    openSearch();
  } else if (ev.key === '/' && !typingInField) {
    ev.preventDefault();
    openSearch();
  } else if (ev.key === 'Escape' && barEl && barEl.classList.contains('show')) {
    closeSearch();
  }
}

function onInputKey(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    goto(ev.shiftKey ? -1 : 1);
  } else if (ev.key === 'Escape') {
    ev.preventDefault();
    closeSearch();
  }
}

function openSearch() {
  if (!barEl) return;
  barEl.classList.add('show');
  inputEl.focus();
  inputEl.select();
}

function closeSearch() {
  if (!barEl) return;
  barEl.classList.remove('show');
  inputEl.value = '';
  matches = [];
  currentIndex = 0;
  state.searchMatches = new Set();
  state.searchActive = null;
  updateCount();
}
function matchNodes(q, nodes) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [];
  const out = [];
  for (const n of nodes) {
    const hay = ((n.text || '') + ' ' + (n.toolName || '')).toLowerCase();
    if (hay.includes(query)) out.push(n.id);
  }
  return out;
}

function runSearch() {
  matches = matchNodes(inputEl.value, state.nodes);
  state.searchMatches = new Set(matches);
  if (matches.length > 0) {
    currentIndex = 0;
    focusMatch();
  } else {
    state.searchActive = null;
  }
  updateCount();
}

function goto(dir) {
  if (!matches.length) return;
  currentIndex = (currentIndex + dir + matches.length) % matches.length;
  focusMatch();
  updateCount();
}

function focusMatch() {
  const id = matches[currentIndex];
  const node = state.byId.get(id);
  if (!node) return;
  state.searchActive = id;
  state.selected = node;
  const vp = getViewport();
  const cx = vp.cx != null ? vp.cx : window.innerWidth / 2;
  const cy = vp.cy != null ? vp.cy : window.innerHeight / 2;
  state.cameraTarget = {
    x: node.x - cx / state.camera.scale,
    y: node.y - cy / state.camera.scale,
    scale: state.camera.scale,
  };
}

function updateCount() {
  if (!countEl) return;
  if (!inputEl || !inputEl.value) {
    countEl.textContent = '—';
  } else if (!matches.length) {
    countEl.textContent = '0 matches';
  } else {
    countEl.textContent = `${currentIndex + 1} / ${matches.length}`;
  }
}


// --- src/ui/live.js ---






let urlInput, btnStart, btnStop, statusEl;
let pollingId = null;
let lastByteLen = 0;
let lastUrl = '';
let getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});
function initLive(getViewportFn) {
  if (getViewportFn) getViewport = getViewportFn;
  urlInput = document.getElementById('live-url');
  btnStart = document.getElementById('btn-live-start');
  btnStop = document.getElementById('btn-live-stop');
  statusEl = document.getElementById('live-status');
  if (!btnStart) return;
  btnStart.addEventListener('click', startWatching);
  btnStop.addEventListener('click', stopWatching);
  urlInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); startWatching(); }
  });
  setStatus('idle');
}

function startWatching() {
  const url = urlInput.value.trim();
  if (!url) return;
  lastUrl = url;
  lastByteLen = 0;
  setStatus('connecting…');
  pullOnce();
  if (pollingId) clearInterval(pollingId);
  pollingId = setInterval(pullOnce, CFG.livePollMs);
  btnStart.style.display = 'none';
  btnStop.style.display = '';
}

function stopWatching() {
  if (pollingId) clearInterval(pollingId);
  pollingId = null;
  setStatus('stopped');
  if (btnStart) btnStart.style.display = '';
  if (btnStop) btnStop.style.display = 'none';
}

async function pullOnce() {
  if (!lastUrl) return;
  try {
    const sep = lastUrl.includes('?') ? '&' : '?';
    const resp = await fetch(lastUrl + sep + '_t=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) { setStatus('http ' + resp.status); return; }
    const text = await resp.text();
    const byteLen = text.length;
    if (byteLen < lastByteLen) {
      // файл был обрезан/пересоздан — начинаем заново
      lastByteLen = 0;
    }
    const newText = text.slice(lastByteLen);
    lastByteLen = byteLen;

    const lines = newText.split(/\r?\n/);
    const newRaw = [];
    let counter = state.nodes.length;
    for (const line of lines) {
      const parsed = parseLine(line, counter++);
      for (const p of parsed) newRaw.push(p);
    }
    if (newRaw.length) {
      const added = appendRawNodes(state, newRaw, getViewport());
      ensureParticles(state.edges);
      state.timelineMax = 1; // показываем актуальное
      updateStatsHUD();
      setStatus(`+${added.length} @ ${timeNow()} (${state.nodes.length} total)`);
    } else {
      setStatus(`up-to-date · ${byteLen}b`);
    }
  } catch (e) {
    setStatus('err: ' + e.message);
  }
}

function updateStatsHUD() {
  const el = document.getElementById('stats');
  if (el) {
    el.innerHTML = `<b>${state.nodes.length}</b> nodes &middot; <b>${state.edges.length}</b> edges &middot; <span>live</span>`;
  }
}

function timeNow() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
}

function setStatus(s) {
  if (statusEl) statusEl.textContent = s;
}


// --- src/ui/filter.js ---


const ROLES = ['user', 'assistant', 'tool_use'];
function initFilter() {
  for (const role of ROLES) {
    const btn = document.querySelector(`.btn-role[data-role="${role}"]`);
    if (!btn) continue;
    btn.addEventListener('click', () => toggleRole(role, btn));
    btn.classList.add('active');
  }
}

function toggleRole(role, btn) {
  if (state.hiddenRoles.has(role)) {
    state.hiddenRoles.delete(role);
    btn.classList.add('active');
  } else {
    state.hiddenRoles.add(role);
    btn.classList.remove('active');
  }
}
function isRoleVisible(role) {
  return !state.hiddenRoles.has(role);
}


// --- src/ui/minimap.js ---



let canvasEl, ctx, dpr = 1;
let tf = null; // сохранённая трансформация для click->world
let frameCounter = 0;
let getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});
function initMinimap(getViewportFn) {
  if (getViewportFn) getViewport = getViewportFn;
  canvasEl = document.getElementById('minimap');
  if (!canvasEl) return;
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvasEl.width = CFG.minimapW * dpr;
  canvasEl.height = CFG.minimapH * dpr;
  canvasEl.style.width = CFG.minimapW + 'px';
  canvasEl.style.height = CFG.minimapH + 'px';
  ctx = canvasEl.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvasEl.addEventListener('click', onClick);
}

function colorFor(role) {
  if (role === 'user') return '#7BAAF0';
  if (role === 'tool_use') return '#ECA040';
  return '#50D4B5';
}
function tickMinimap() {
  if (!canvasEl || !ctx) return;
  if ((frameCounter++) % CFG.minimapEveryNFrames !== 0) return;
  const W = CFG.minimapW, H = CFG.minimapH;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10, 14, 26, 0.55)';
  ctx.fillRect(0, 0, W, H);

  if (!state.nodes.length) {
    tf = null;
    return;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of state.nodes) {
    if (state.hiddenRoles.has(n.role)) continue;
    if (n.bornAt == null) continue;
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  if (!isFinite(minX)) { tf = null; return; }
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const pad = CFG.minimapPadding;
  const s = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
  const ox = pad + ((W - pad * 2) - bw * s) / 2;
  const oy = pad + ((H - pad * 2) - bh * s) / 2;
  const w2m = (wx, wy) => ({ x: ox + (wx - minX) * s, y: oy + (wy - minY) * s });

  // edges
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.22)';
  ctx.lineWidth = 0.5;
  for (const e of state.edges) {
    if (state.hiddenRoles.has(e.a.role) || state.hiddenRoles.has(e.b.role)) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    const a = w2m(e.a.x, e.a.y);
    const b = w2m(e.b.x, e.b.y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // nodes
  for (const n of state.nodes) {
    if (state.hiddenRoles.has(n.role)) continue;
    if (n.bornAt == null) continue;
    const p = w2m(n.x, n.y);
    ctx.fillStyle = colorFor(n.role);
    ctx.beginPath();
    ctx.arc(p.x, p.y, CFG.minimapNodeR, 0, Math.PI * 2);
    ctx.fill();
  }

  // viewport rectangle
  const cam = state.camera;
  const vp = getViewport();
  const vw = vp.width / cam.scale;
  const vh = vp.height / cam.scale;
  const tl = w2m(cam.x, cam.y);
  const br = w2m(cam.x + vw, cam.y + vh);
  ctx.strokeStyle = 'rgba(236, 160, 64, 0.75)';
  ctx.lineWidth = 1;
  const rx = Math.max(0, Math.min(W, tl.x));
  const ry = Math.max(0, Math.min(H, tl.y));
  const rw = Math.max(1, Math.min(W - rx, br.x - tl.x));
  const rh = Math.max(1, Math.min(H - ry, br.y - tl.y));
  ctx.strokeRect(rx, ry, rw, rh);

  tf = { ox, oy, s, minX, minY };
}

function onClick(ev) {
  if (!tf) return;
  const rect = canvasEl.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const my = ev.clientY - rect.top;
  const wx = (mx - tf.ox) / tf.s + tf.minX;
  const wy = (my - tf.oy) / tf.s + tf.minY;
  const vp = getViewport();
  const cx = vp.cx != null ? vp.cx : vp.width / 2;
  const cy = vp.cy != null ? vp.cy : vp.height / 2;
  state.cameraTarget = {
    x: wx - cx / state.camera.scale,
    y: wy - cy / state.camera.scale,
    scale: state.camera.scale,
  };
}


// --- src/ui/keyboard.js ---






let getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});
function initKeyboard(getViewportFn) {
  if (getViewportFn) getViewport = getViewportFn;
  window.addEventListener('keydown', onKey);
  // Чтобы Space/Enter на наших кнопках не триггерил shortcut повторно — blur после click
  document.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => { try { b.blur(); } catch {} });
  });
}

function isInputFocused() {
  const a = document.activeElement;
  if (!a) return false;
  const tag = a.tagName && a.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || a.isContentEditable;
}

function onKey(ev) {
  if (isInputFocused()) return;
  if (ev.key === ' ') {
    ev.preventDefault();
    togglePlay();
  } else if (ev.key === 'ArrowRight') {
    ev.preventDefault();
    stepTimeline(1);
  } else if (ev.key === 'ArrowLeft') {
    ev.preventDefault();
    stepTimeline(-1);
  } else if (ev.key === 'Home' || ev.key === 'r' || ev.key === 'R') {
    ev.preventDefault();
    resetView();
  } else if (ev.key === 'Escape') {
    if (state.selected || state.cameraTarget) {
      state.selected = null;
      state.cameraTarget = null;
      hideDetail();
    }
  }
}

function stepTimeline(dir) {
  if (!state.nodes.length) return;
  const sorted = [...state.nodes].sort((a, b) => a.ts - b.ts);
  const tsMin = sorted[0].ts;
  const tsMax = sorted[sorted.length - 1].ts;
  const range = Math.max(1, tsMax - tsMin);
  const cutoff = tsMin + range * state.timelineMax;
  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].ts <= cutoff) currentIdx = i;
    else break;
  }
  const newIdx = Math.max(0, Math.min(sorted.length - 1, currentIdx + dir));
  state.timelineMax = Math.min(1, (sorted[newIdx].ts - tsMin) / range + 0.0001);
  const slider = document.getElementById('timeline');
  if (slider) {
    slider.value = String(Math.round(state.timelineMax * 100));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    syncChatToTimeline(state);
  }
}

function resetView() {
  if (!state.nodes.length) return;
  const cam = fitToView(state.nodes, getViewport());
  state.cameraTarget = { x: cam.x, y: cam.y, scale: cam.scale };
}


// --- src/ui/stats-hud.js ---



let panelEl, tokensEl, durationEl, topToolsEl, longestEl;
let tickCounter = 0;
function initStats() {
  panelEl = document.getElementById('stats-panel');
  tokensEl = document.getElementById('stat-tokens');
  durationEl = document.getElementById('stat-duration');
  topToolsEl = document.getElementById('stat-top-tools');
  longestEl = document.getElementById('stat-longest');
}
function computeStats(nodes) {
  if (!nodes || !nodes.length) return null;
  let totalChars = 0;
  let tsMin = Infinity, tsMax = -Infinity;
  let longest = null;
  const toolCounts = new Map();
  for (const n of nodes) {
    if (typeof n.textLen === 'number') totalChars += n.textLen;
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
    if (!longest || n.textLen > longest.textLen) longest = n;
    if (n.role === 'tool_use' && n.toolName) {
      toolCounts.set(n.toolName, (toolCounts.get(n.toolName) || 0) + 1);
    }
  }
  return {
    tokens: Math.round(totalChars / 4),
    durationSec: (tsMax - tsMin) / 1000,
    longest,
    topTools: [...toolCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
}
function formatDuration(sec) {
  if (sec < 0 || !isFinite(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const parts = [];
  if (h) parts.push(h + 'h');
  if (m || h) parts.push(m + 'm');
  parts.push(s + 's');
  return parts.join(' ');
}
function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function recomputeStats() {
  if (!panelEl) return;
  const s = computeStats(state.nodes);
  if (!s) { panelEl.style.display = 'none'; return; }
  panelEl.style.display = '';
  tokensEl.textContent = '~' + formatTokens(s.tokens);
  durationEl.textContent = formatDuration(s.durationSec);
  if (s.topTools.length) {
    topToolsEl.innerHTML = s.topTools.map(([name, count]) =>
      `<span class="tool-chip"><span class="tool-chip-icon">${escapeHtml(toolIcon(name))}</span>${escapeHtml(name)} <b>×${count}</b></span>`
    ).join(' ');
  } else {
    topToolsEl.innerHTML = '<span class="muted">—</span>';
  }
  if (s.longest) {
    const preview = (s.longest.text || '').slice(0, 36).replace(/\n/g, ' ');
    const ellipsis = (s.longest.text || '').length > 36 ? '…' : '';
    longestEl.innerHTML = `<span class="longest-role ${s.longest.role}">${s.longest.role}</span> <span class="longest-len">${s.longest.textLen}</span> <span class="longest-preview">${escapeHtml(preview)}${ellipsis}</span>`;
  } else {
    longestEl.textContent = '—';
  }
}
function tickStats() {
  if ((tickCounter++) % 180 !== 0) return;
  recomputeStats();
}


// --- src/ui/layout-toggle.js ---




let btn;
let transition = null;
let getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});
function initLayoutToggle(getViewportFn) {
  if (getViewportFn) getViewport = getViewportFn;
  btn = document.getElementById('btn-layout');
  if (btn) btn.addEventListener('click', toggleLayout);
  updateBtnLabel();
}

function toggleLayout() {
  if (transition) return;
  const toMode = state.layoutMode === 'radial' ? 'force' : 'radial';
  const from = new Map();
  for (const n of state.nodes) from.set(n.id, { x: n.x, y: n.y });
  let to;
  if (toMode === 'radial') {
    to = computeRadialLayout(state.nodes, state.byId, getViewport());
  } else {
    // В force — возвращаем в текущие (физика потом расставит органично),
    // но лёгкий jitter чтобы оторваться от идеальных окружностей
    to = new Map();
    for (const n of state.nodes) {
      to.set(n.id, { x: n.x + (Math.random() - 0.5) * 20, y: n.y + (Math.random() - 0.5) * 20 });
    }
  }
  transition = { from, to, startTime: performance.now(), duration: CFG.layoutTransitionMs, toMode };
  // Фитим камеру под новую раскладку
  setTimeout(() => {
    if (state.nodes.length) {
      const cam = fitToView(state.nodes, getViewport());
      state.cameraTarget = { x: cam.x, y: cam.y, scale: cam.scale };
    }
  }, CFG.layoutTransitionMs + 50);
}
function tickLayoutTransition() {
  if (!transition) return;
  const now = performance.now();
  const t = Math.min(1, (now - transition.startTime) / transition.duration);
  const e = easeInOutQuad(t);
  for (const n of state.nodes) {
    const from = transition.from.get(n.id);
    const to = transition.to.get(n.id);
    if (!from || !to) continue;
    n.x = from.x + (to.x - from.x) * e;
    n.y = from.y + (to.y - from.y) * e;
    n.vx = 0;
    n.vy = 0;
  }
  if (t >= 1) {
    state.layoutMode = transition.toMode;
    transition = null;
    updateBtnLabel();
  }
}
function isRadialActive() {
  return state.layoutMode === 'radial' || (transition && transition.toMode === 'radial');
}

function updateBtnLabel() {
  if (!btn) return;
  btn.textContent = state.layoutMode === 'radial' ? 'Force' : 'Radial';
  btn.classList.toggle('accent', state.layoutMode === 'radial');
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
  const fmtEl = document.getElementById('load-format');
  const fmtSuffix = fmtEl && fmtEl.textContent ? ' &middot; <span class="fmt-chip">' + fmtEl.textContent + '</span>' : '';
  el.innerHTML = `<b>${state.nodes.length}</b> nodes &middot; <b>${state.edges.length}</b> edges &middot; <span>${s.parsed} lines</span>${fmtSuffix}`;
  el.title = `parsed: ${s.parsed}\nkept: ${s.kept}\nskipped: ${s.skipped}\nerrors: ${s.errors}`;
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


// --- src/ui/share.js ---



let toastEl, btnShare;
function initShare() {
  btnShare = document.getElementById('btn-share');
  toastEl = document.getElementById('toast');
  if (btnShare) btnShare.addEventListener('click', shareCurrent);
}
function buildShareUrl() {
  const params = new URLSearchParams();
  params.set('t', String(Math.round(state.timelineMax * 100)));
  if (state.selected && state.selected.id) params.set('n', state.selected.id);
  const hidden = [...state.hiddenRoles];
  if (hidden.length) params.set('hide', hidden.join(','));
  return window.location.origin + window.location.pathname + '?' + params.toString();
}
function parseUrlParams(search) {
  const out = {};
  const p = new URLSearchParams(search || '');
  if (p.has('jsonl')) out.jsonl = p.get('jsonl');
  if (p.has('t')) {
    const t = parseFloat(p.get('t'));
    if (!isNaN(t)) out.t = Math.max(0, Math.min(1, t / 100));
  }
  if (p.has('n')) out.nodeId = p.get('n');
  if (p.has('hide')) {
    out.hide = p.get('hide').split(',').map(r => r.trim()).filter(Boolean);
  }
  return out;
}

async function shareCurrent() {
  const url = buildShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard');
  } catch {
    prompt('Copy URL:', url);
  }
}

function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2000);
}
async function applyUrlParamsLate() {
  const params = parseUrlParams(window.location.search);

  if (params.jsonl) {
    try {
      const resp = await fetch(params.jsonl, { cache: 'no-store' });
      if (resp.ok) {
        const text = await resp.text();
        loadText(text);
      }
    } catch (e) {
      console.warn('[share] failed to fetch jsonl param:', e.message);
    }
  }

  if (params.t != null) {
    state.timelineMax = params.t;
    const slider = document.getElementById('timeline');
    if (slider) {
      slider.value = String(Math.round(state.timelineMax * 100));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  if (Array.isArray(params.hide)) {
    for (const r of params.hide) {
      state.hiddenRoles.add(r);
      const btn = document.querySelector(`.btn-role[data-role="${r}"]`);
      if (btn) btn.classList.remove('active');
    }
  }

  if (params.nodeId && state.byId) {
    const node = state.byId.get(params.nodeId);
    if (node) state.selected = node;
  }
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
initSearch(getViewport);
initLive(getViewport);
initFilter();
initMinimap(getViewport);
initStats();
initShare();
initLayoutToggle(getViewport);
initInteraction(canvas, getViewport);
initLoader(getViewport, onGraphReady);
initKeyboard(getViewport);

state.stars = generateStarfield(CFG.starfieldCount);

let urlParamsApplied = false;
function onGraphReady() {
  ensureParticles(state.edges);
  resetStory();
  recomputeStats();
  if (!urlParamsApplied) {
    urlParamsApplied = true;
    applyUrlParamsLate();
  }
}

let lastMs = performance.now();
function frame(tms) {
  const tSec = tms / 1000;
  const dt = Math.min(0.1, (tms - lastMs) / 1000);
  lastMs = tms;
  const vp = getViewport();

  tickPlay();
  tickLayoutTransition();
  const physicsDisabled = isRadialActive();
  if (state.running && !physicsDisabled) stepPhysics(state.nodes, state.edges, vp);
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
  tickMinimap();
  tickStats();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__viz = { state, CFG };


})(typeof window !== "undefined" ? window : this);