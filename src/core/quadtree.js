import { CFG } from './config.js';

function createQuad(x, y, s) {
  return { x, y, s, cx: 0, cy: 0, mass: 0, point: null, children: null };
}

function findQuadrantIndex(q, px, py) {
  const mx = q.x + q.s / 2;
  const my = q.y + q.s / 2;
  let idx = 0;
  if (px >= mx) idx |= 1;
  if (py >= my) idx |= 2;
  return idx;
}

function insert(q, n) {
  if (!q.children && !q.point) {
    q.point = n;
    q.cx = n.x;
    q.cy = n.y;
    q.mass = 1;
    return;
  }
  if (!q.children) {
    const old = q.point;
    q.point = null;
    const half = q.s / 2;
    q.children = [
      createQuad(q.x,        q.y,        half),
      createQuad(q.x + half, q.y,        half),
      createQuad(q.x,        q.y + half, half),
      createQuad(q.x + half, q.y + half, half),
    ];
    q.mass = 0; q.cx = 0; q.cy = 0;
    insert(q.children[findQuadrantIndex(q, old.x, old.y)], old);
    q.mass = 1;
    q.cx = old.x;
    q.cy = old.y;
  }
  const newMass = q.mass + 1;
  q.cx = (q.cx * q.mass + n.x) / newMass;
  q.cy = (q.cy * q.mass + n.y) / newMass;
  q.mass = newMass;
  insert(q.children[findQuadrantIndex(q, n.x, n.y)], n);
}

export function buildQuadtree(nodes) {
  if (!nodes.length) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const size = Math.max(w, h) + 2;
  const root = createQuad(minX - 1, minY - 1, size);
  for (const n of nodes) insert(root, n);
  return root;
}

/**
 * Repulsion на node от всего дерева. cutoff2 — opt. squared-distance cutoff.
 */
export function computeRepulsion(tree, node, theta, kRep, cutoff2) {
  const acc = { fx: 0, fy: 0 };
  if (!tree || tree.mass === 0) return acc;
  _accumulate(tree, node, theta, kRep, cutoff2, acc);
  return acc;
}

function _accumulate(q, node, theta, k, cutoff2, acc) {
  if (!q || q.mass === 0) return;
  if (q.point && q.point === node) return;
  let dx = node.x - q.cx;
  let dy = node.y - q.cy;
  let d2 = dx * dx + dy * dy;
  // cutoff для дальних кластеров (перформанс)
  if (cutoff2 && d2 > cutoff2) {
    // если это leaf с точкой — skip; для group с массой — тоже skip (вклад малый)
    return;
  }
  if (d2 < 0.01) {
    // deterministic offset по seed если есть
    const sn = node._seedDx != null ? { dx: node._seedDx, dy: node._seedDy } : { dx: 0.01, dy: 0.01 };
    const pt = q.point;
    const sq = pt && pt._seedDx != null ? { dx: pt._seedDx, dy: pt._seedDy } : { dx: -0.01, dy: -0.01 };
    dx = (sn.dx - sq.dx) || 0.01;
    dy = (sn.dy - sq.dy) || 0.01;
    d2 = dx * dx + dy * dy + 0.01;
  }
  const isLeaf = !q.children;
  // leaf с мелким size — не рекурсим (bhLeafMinSize guard)
  if (q.s < CFG.bhLeafMinSize) {
    if (!isLeaf || !q.point || q.point === node) return;
    const d = Math.sqrt(d2);
    const f = (k * q.mass) / d2;
    acc.fx += (dx / d) * f;
    acc.fy += (dy / d) * f;
    return;
  }
  const d = Math.sqrt(d2);
  if (isLeaf || (q.s / d) < theta) {
    const f = (k * q.mass) / d2;
    acc.fx += (dx / d) * f;
    acc.fy += (dy / d) * f;
    return;
  }
  for (const ch of q.children) _accumulate(ch, node, theta, k, cutoff2, acc);
}
