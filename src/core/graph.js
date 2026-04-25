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

// Эвристика: «дерево» в смысле визуальной читаемости — есть глубина и
// несколько fan-out точек. Используется loader'ом для авто-выбора radial
// layout вместо force при первом open. Простой алгоритм: BFS от roots,
// считаем maxDepth и кол-во nodes с ≥3 children.
export function detectTreeShape(nodes, edges) {
  if (nodes.length < 30) return false;
  const childrenByParent = new Map();
  for (const n of nodes) childrenByParent.set(n.id, []);
  for (const e of edges) {
    if (!e.adopted) childrenByParent.get(e.source).push(e.target);
  }
  const roots = nodes.filter(n => !n.parentId || !childrenByParent.has(n.parentId)).map(n => n.id);
  if (!roots.length) return false;
  let maxDepth = 0;
  let bigFanOuts = 0;
  const queue = roots.map(id => [id, 0]);
  while (queue.length) {
    const [id, d] = queue.shift();
    if (d > maxDepth) maxDepth = d;
    const kids = childrenByParent.get(id) || [];
    if (kids.length >= 3) bigFanOuts++;
    for (const k of kids) queue.push([k, d + 1]);
  }
  return maxDepth >= 3 && bigFanOuts >= 2;
}

// Pair edges — соединяют tool_use ноду с user-нодой содержащей matching
// tool_result. Эти связи существуют в JSONL через `tool_use_id`, но не
// материализованы как parent-child. Рисуются пунктиром в renderer'е.
//
// Для parallel Task (4 tool_use → 1 user-message с 4 tool_result) получаем
// 4 разных pairEdge — каждая исходит из своей virtual tool_use ноды
// (`<assistantId>#tu<index>`), все упираются в одну user-message, но визуально
// не overlap'ят потому что start-точки разные.
//
// Также проставляем флаг node.hasErrorTool для всех assistant-нод чьи
// virtual-children-tool_use получили is_error в matching tool_result —
// renderer рисует красную окантовку.
function buildPairEdges(nodes, byId) {
  // toolUseId → source node (virtual tool_use)
  const toolUseIndex = new Map();
  for (const n of nodes) {
    if (n.toolUseId) toolUseIndex.set(n.toolUseId, n);
  }
  const pairs = [];
  for (const n of nodes) {
    if (!n.toolResultIds || !n.toolResultIds.length) continue;
    for (const tuid of n.toolResultIds) {
      const src = toolUseIndex.get(tuid);
      if (!src) continue; // tool_use не нашёлся (orphan tool_result)
      pairs.push({ source: src.id, target: n.id, a: src, b: n });
      // Mark error на assistant если её tool_use получил is_error result
      if (n.hasError) {
        const assistantId = src.parentId; // virtual-tool_use's parent = assistant
        const assistant = byId.get(assistantId);
        if (assistant) assistant._hasErrorTool = true;
        src._isErrorToolUse = true; // на самой tool_use ноде тоже отметим
      }
    }
  }
  return pairs;
}

export function buildGraph(parsed, viewport) {
  const { width, height } = viewport;
  const cx = width / 2, cy = height / 2;
  const total = parsed.nodes.length;

  const nodes = parsed.nodes.map((src, i) => createPhysicsNode(src, i, total, cx, cy));
  const byId = new Map(nodes.map(node => [node.id, node]));

  markOrphans(nodes, byId);
  const edges = buildEdges(nodes, byId);
  const pairEdges = buildPairEdges(nodes, byId);
  recomputeRecency(nodes);
  computeDegreesAndHubs(nodes, edges);

  return { nodes, edges, byId, pairEdges };
}
