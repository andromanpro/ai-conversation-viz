import { CFG } from './config.js';
import { seedJitter } from './layout.js';

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

function computeDegreesAndHubs(nodes, edges) {
  for (const n of nodes) n.degree = 0;
  for (const e of edges) {
    if (e.a) e.a.degree = (e.a.degree || 0) + 1;
    if (e.b) e.b.degree = (e.b.degree || 0) + 1;
  }
  // p90 of degree
  if (!nodes.length) return;
  const degs = nodes.map(n => n.degree).sort((a, b) => a - b);
  const p90 = degs[Math.floor(degs.length * 0.9)] || 0;
  const hubThreshold = Math.max(3, p90);
  for (const n of nodes) n.isHub = n.degree > hubThreshold;
}

function applySeedJitter(n) {
  const s = seedJitter(n.id || ('n' + Math.random()));
  n._seedDx = s.dx;
  n._seedDy = s.dy;
}

/**
 * Добавляет raw-ноды (от parseLine) в уже существующий state.
 * Дедупит по id. Связи строятся по parentId, если он есть в byId.
 * Возвращает список РЕАЛЬНО добавленных нод.
 */
export function appendRawNodes(state, rawNodes, viewport) {
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
      fxAcc: 0, fyAcc: 0,
      r: CFG.minR,
      recency: 1,
      phase: Math.random() * Math.PI * 2,
      degree: 0,
      isHub: false,
    };
    applySeedJitter(node);
    state.nodes.push(node);
    state.byId.set(node.id, node);
    if (parent) {
      state.edges.push({ source: parent.id, target: node.id, a: parent, b: node });
    }
    added.push(node);
  }
  recomputeRecency(state.nodes);
  computeDegreesAndHubs(state.nodes, state.edges);
  return added;
}

// Создание одной physics-ноды из raw parsed-данных. Стартовая позиция —
// круг радиуса 80-140 px вокруг центра viewport, чтобы prewarm не начинал
// с одной точки.
function createPhysicsNode(src, index, total, cx, cy) {
  const angle = total ? (index / total) * Math.PI * 2 : 0;
  const spread = 80 + Math.random() * 60;
  const node = {
    ...src,
    x: cx + Math.cos(angle) * spread + (Math.random() - 0.5) * 30,
    y: cy + Math.sin(angle) * spread + (Math.random() - 0.5) * 30,
    vx: 0, vy: 0,
    fxAcc: 0, fyAcc: 0,
    r: CFG.minR,
    recency: 0,
    phase: Math.random() * Math.PI * 2,
    degree: 0,
    isHub: false,
  };
  applySeedJitter(node);
  return node;
}

// Orphan detection: помечаем ноды у которых parentId не в byId (subagent-
// сессии или обрезано maxMessages). Не меняем parentId — создаём
// adopted-edge к ближайшему по ts предшественнику.
function markOrphans(nodes, byId) {
  const sortedByTs = [...nodes].sort((a, b) => a.ts - b.ts);
  for (let i = 0; i < sortedByTs.length; i++) {
    const node = sortedByTs[i];
    if (node.parentId && !byId.has(node.parentId)) {
      node._isOrphanRoot = true;
      const prev = i > 0 ? sortedByTs[i - 1] : null;
      if (prev) node._adoptedParentId = prev.id;
    }
  }
}

// Сборка edge-списка. Real edge — node.parentId известен. Adopted edge —
// fallback для orphan-нод (отрисовывается пунктиром, в физике участвует
// только когда state.connectOrphans=true).
function buildEdges(nodes, byId) {
  const edges = [];
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) {
      edges.push({
        source: node.parentId, target: node.id,
        a: byId.get(node.parentId), b: node, adopted: false,
      });
    } else if (node._adoptedParentId && byId.has(node._adoptedParentId)) {
      const parent = byId.get(node._adoptedParentId);
      edges.push({
        source: parent.id, target: node.id,
        a: parent, b: node, adopted: true,
      });
    }
  }
  return edges;
}

export function buildGraph(parsed, viewport) {
  const { width, height } = viewport;
  const cx = width / 2, cy = height / 2;
  const total = parsed.nodes.length;

  const nodes = parsed.nodes.map((src, i) => createPhysicsNode(src, i, total, cx, cy));
  const byId = new Map(nodes.map(node => [node.id, node]));

  markOrphans(nodes, byId);
  const edges = buildEdges(nodes, byId);
  recomputeRecency(nodes);
  computeDegreesAndHubs(nodes, edges);

  return { nodes, edges, byId };
}
