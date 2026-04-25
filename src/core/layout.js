import { CFG } from './config.js';
import { buildQuadtree, computeRepulsion } from './quadtree.js';

// ---------- D3-style simulation state ----------

export function createSim(opts = {}) {
  return {
    alpha: 1,
    alphaTarget: 0,
    alphaDecay: opts.alphaDecay != null ? opts.alphaDecay : CFG.alphaDecay,
    alphaMin: opts.alphaMin != null ? opts.alphaMin : CFG.alphaMin,
    velocityDecay: opts.velocityDecay != null ? opts.velocityDecay : CFG.velocityDecay,
    frozen: false,
    manualFrozen: false,
    // UI-флаг: включены ли adopted-edges в физику. Меняется из ui/orphans-toggle.
    connectOrphans: !!opts.connectOrphans,
  };
}

export function reheat(sim, a) {
  if (!sim) return;
  const target = a != null ? a : CFG.reheatAlpha;
  sim.alpha = Math.max(sim.alpha, target);
  sim.alphaTarget = target;
  sim.frozen = false;
}

export function freeze(sim) {
  if (!sim) return;
  sim.manualFrozen = true;
  sim.frozen = true;
}

export function unfreeze(sim) {
  if (!sim) return;
  sim.manualFrozen = false;
  sim.frozen = false;
  reheat(sim, CFG.reheatAlpha);
}

export function isSettled(sim) {
  if (!sim) return true;
  return sim.alpha < sim.alphaMin && sim.alphaTarget === 0;
}

// ---------- deterministic hash for stable jitter ----------

function hashStrToUnit(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return (h >>> 0) / 4294967296;
}
export function seedJitter(id) {
  const u1 = hashStrToUnit(id + '|x');
  const u2 = hashStrToUnit(id + '|y');
  return { dx: u1 - 0.5, dy: u2 - 0.5 };
}

// ---------- core step ----------

export function stepPhysics(nodes, edges, viewport, sim) {
  const _sim = sim || createSim();

  // alpha cooling (в начале step, до всех ранних return'ов)
  _sim.alpha += (_sim.alphaTarget - _sim.alpha) * _sim.alphaDecay;
  if (_sim.manualFrozen) { _sim.frozen = true; return; }
  if (_sim.alpha < _sim.alphaMin && _sim.alphaTarget === 0) {
    _sim.frozen = true;
    return;
  }
  _sim.frozen = false;

  if (!nodes.length) return;

  const alpha = _sim.alpha;
  const N = nodes.length;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;

  // accumulate forces в fxAcc/fyAcc
  for (const n of nodes) { n.fxAcc = 0; n.fyAcc = 0; }

  // adaptive repulsion strength — растёт логарифмически с N
  const kRep = CFG.repulsion * (1 + Math.log(Math.max(1, N / 100))) * alpha;
  const cutoff2 = CFG.repulsionCutoff * CFG.repulsionCutoff;

  if (N > CFG.barnesHutThreshold) {
    const tree = buildQuadtree(nodes);
    for (const n of nodes) {
      const f = computeRepulsion(tree, n, CFG.barnesHutTheta, kRep, cutoff2);
      n.fxAcc += f.fx;
      n.fyAcc += f.fy;
    }
  } else {
    for (let i = 0; i < N; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < N; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 > cutoff2) continue;
        if (d2 < 0.01) {
          const sa = a._seedDx != null ? { dx: a._seedDx, dy: a._seedDy } : seedJitter(a.id || ('n' + i));
          const sb = b._seedDx != null ? { dx: b._seedDx, dy: b._seedDy } : seedJitter(b.id || ('n' + j));
          dx = (sa.dx - sb.dx) || 0.01;
          dy = (sa.dy - sb.dy) || 0.01;
          d2 = dx * dx + dy * dy + 0.01;
        }
        const d = Math.sqrt(d2);
        const f = kRep / d2;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.fxAcc += fx; a.fyAcc += fy;
        b.fxAcc -= fx; b.fyAcc -= fy;
      }
    }
  }

  // spring (hub-safe: strength ~ 1/sqrt(min deg)); усиливаем для leaf-edges.
  // Adopted-edges (orphan → ts-predecessor) участвуют в физике только когда
  // включён connectOrphans. Иначе orphan forest лежит отдельно.
  //
  // connectOrphans передаётся через sim.connectOrphans чтобы core-модуль
  // не зависел от window.__viz.state (развязка core ↔ UI).
  const connectOrphans = !!(sim && sim.connectOrphans);
  for (const e of edges) {
    if (e.adopted && !connectOrphans) continue;
    const a = e.a, b = e.b;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const disp = d - CFG.springLen;
    const degMin = Math.max(1, Math.min(a.degree || 1, b.degree || 1));
    const leafBoost = (degMin === 1) ? CFG.leafSpringBoost : 1;
    const adoptedMul = e.adopted ? 0.4 : 1; // adopted-edge слабее — хронология, не реальная связь
    const kLink = (CFG.spring * leafBoost * adoptedMul / Math.sqrt(degMin)) * alpha;
    const f = kLink * disp;
    const fx = (dx / d) * f, fy = (dy / d) * f;
    a.fxAcc += fx; a.fyAcc += fy;
    b.fxAcc -= fx; b.fyAcc -= fy;
  }

  // central pull — растёт с N (sqrt-scaled), чтобы держать большой граф в окружности
  const centerScale = Math.sqrt(Math.max(1, N / CFG.centerPullScaleN));
  const kCenter = CFG.centerPull * centerScale * alpha;
  for (const n of nodes) {
    n.fxAcc += (cx - n.x) * kCenter;
    n.fyAcc += (cy - n.y) * kCenter;
  }

  // bounds soft-wall
  const pad = CFG.wallPaddingMul;
  const halfW = (viewport.safeW != null ? viewport.safeW : viewport.width) * pad / 2;
  const halfH = (viewport.safeH != null ? viewport.safeH : viewport.height) * pad / 2;
  const wallLeft = cx - halfW, wallRight = cx + halfW;
  const wallTop = cy - halfH, wallBottom = cy + halfH;
  const kWall = CFG.wallStiffness;
  for (const n of nodes) {
    if (n.x < wallLeft) n.fxAcc += (wallLeft - n.x) * kWall;
    else if (n.x > wallRight) n.fxAcc += (wallRight - n.x) * kWall;
    if (n.y < wallTop) n.fyAcc += (wallTop - n.y) * kWall;
    else if (n.y > wallBottom) n.fyAcc += (wallBottom - n.y) * kWall;
  }

  // Velocity Verlet: v = (v + f) * (1 - velocityDecay); x += v
  const friction = 1 - _sim.velocityDecay;
  const maxV = CFG.maxVelocity;
  const maxV2 = maxV * maxV;
  for (const n of nodes) {
    n.vx = (n.vx + n.fxAcc) * friction;
    n.vy = (n.vy + n.fyAcc) * friction;
    // clamp
    const sp2 = n.vx * n.vx + n.vy * n.vy;
    if (sp2 > maxV2) {
      const k = maxV / Math.sqrt(sp2);
      n.vx *= k;
      n.vy *= k;
    }
    n.x += n.vx;
    n.y += n.vy;
  }
}

// 3D вариант stepPhysics — все три оси (x, y, z) полноценно участвуют
// в физике. Для < ~300 нод — O(N²) repulsion (octree пока не делаем).
// Используется только в 3D-режиме (src/3d/main.js); 2D остаётся на 2D.
export function stepPhysics3D(nodes, edges, viewport, sim) {
  const _sim = sim || createSim();
  _sim.alpha += (_sim.alphaTarget - _sim.alpha) * _sim.alphaDecay;
  if (_sim.manualFrozen) { _sim.frozen = true; return; }
  if (_sim.alpha < _sim.alphaMin && _sim.alphaTarget === 0) {
    _sim.frozen = true;
    return;
  }
  _sim.frozen = false;
  if (!nodes.length) return;

  const alpha = _sim.alpha;
  const N = nodes.length;
  // 3D-сцена центрируется в (0, 0, 0) — viewport.cx/cy не используем.
  const cx = 0, cy = 0, cz = 0;

  for (const n of nodes) { n.fxAcc = 0; n.fyAcc = 0; n.fzAcc = 0; }

  // Repulsion — O(N²), 3D-distance. На <300 nodes за <2ms на средней
  // машине; для бóльших графов нужен 3D Octree (TODO).
  const kRep = CFG.repulsion * (1 + Math.log(Math.max(1, N / 100))) * alpha;
  const cutoff2 = CFG.repulsionCutoff * CFG.repulsionCutoff;
  for (let i = 0; i < N; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < N; j++) {
      const b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
      let d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > cutoff2) continue;
      if (d2 < 0.01) {
        // deterministic mini-jitter если ноды совпадают
        const sa = a._seedDx != null ? a._seedDx : 0.01;
        const sb = b._seedDx != null ? b._seedDx : -0.01;
        dx = (sa - sb) || 0.01;
        dy = ((a._seedDy || 0) - (b._seedDy || 0)) || 0.01;
        dz = ((sa * 0.7) - (sb * 0.7)) || 0.01;
        d2 = dx * dx + dy * dy + dz * dz + 0.01;
      }
      const d = Math.sqrt(d2);
      const f = kRep / d2;
      const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
      a.fxAcc += fx; a.fyAcc += fy; a.fzAcc += fz;
      b.fxAcc -= fx; b.fyAcc -= fy; b.fzAcc -= fz;
    }
  }

  // Spring — pulls connected nodes к springLen. 3D-distance.
  const connectOrphans = !!(sim && sim.connectOrphans);
  for (const e of edges) {
    if (e.adopted && !connectOrphans) continue;
    const a = e.a, b = e.b;
    const dx = b.x - a.x, dy = b.y - a.y, dz = (b.z || 0) - (a.z || 0);
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    const disp = d - CFG.springLen;
    const degMin = Math.max(1, Math.min(a.degree || 1, b.degree || 1));
    const leafBoost = (degMin === 1) ? CFG.leafSpringBoost : 1;
    const adoptedMul = e.adopted ? 0.4 : 1;
    const kLink = (CFG.spring * leafBoost * adoptedMul / Math.sqrt(degMin)) * alpha;
    const f = kLink * disp;
    const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
    a.fxAcc += fx; a.fyAcc += fy; a.fzAcc += fz;
    b.fxAcc -= fx; b.fyAcc -= fy; b.fzAcc -= fz;
  }

  // Central pull в (0, 0, 0). Полный 3D — все три оси.
  const centerScale = Math.sqrt(Math.max(1, N / CFG.centerPullScaleN));
  const kCenter = CFG.centerPull * centerScale * alpha;
  for (const n of nodes) {
    n.fxAcc += (cx - n.x) * kCenter;
    n.fyAcc += (cy - n.y) * kCenter;
    n.fzAcc += (cz - (n.z || 0)) * kCenter;
  }

  // Bounds soft-wall — кубическая. Размер берём симметричным от
  // viewport.safeW (как proxy для 3D-куба).
  const pad = CFG.wallPaddingMul;
  const half = (viewport.safeW != null ? viewport.safeW : viewport.width || 1600) * pad / 2;
  const kWall = CFG.wallStiffness;
  for (const n of nodes) {
    if (n.x < -half) n.fxAcc += (-half - n.x) * kWall;
    else if (n.x > half) n.fxAcc += (half - n.x) * kWall;
    if (n.y < -half) n.fyAcc += (-half - n.y) * kWall;
    else if (n.y > half) n.fyAcc += (half - n.y) * kWall;
    const z = n.z || 0;
    if (z < -half) n.fzAcc += (-half - z) * kWall;
    else if (z > half) n.fzAcc += (half - z) * kWall;
  }

  // Velocity Verlet — 3D
  const friction = 1 - _sim.velocityDecay;
  const maxV = CFG.maxVelocity;
  const maxV2 = maxV * maxV;
  for (const n of nodes) {
    if (n.vz == null) n.vz = 0;
    if (n.z == null) n.z = 0;
    n.vx = (n.vx + n.fxAcc) * friction;
    n.vy = (n.vy + n.fyAcc) * friction;
    n.vz = (n.vz + n.fzAcc) * friction;
    const sp2 = n.vx * n.vx + n.vy * n.vy + n.vz * n.vz;
    if (sp2 > maxV2) {
      const k = maxV / Math.sqrt(sp2);
      n.vx *= k; n.vy *= k; n.vz *= k;
    }
    n.x += n.vx;
    n.y += n.vy;
    n.z += n.vz;
  }
}

// 3D prewarm — то же что обычный prewarm, но stepPhysics3D
export function prewarm3D(nodes, edges, viewport, sim, iters) {
  const _sim = sim || createSim();
  const _iters = iters != null ? iters : CFG.prewarmIterations;
  const savedTarget = _sim.alphaTarget;
  _sim.alphaTarget = 0;
  for (let i = 0; i < _iters; i++) stepPhysics3D(nodes, edges, viewport, _sim);
  _sim.alphaTarget = savedTarget;
}

export function prewarm(nodes, edges, viewport, simOrIters, maybeIters) {
  // Backward-compat: prewarm(nodes, edges, vp) или (nodes, edges, vp, sim) или (nodes, edges, vp, sim, iters)
  // Старый вызов: prewarm(nodes, edges, vp) — используется в 3d/main.js
  let sim, iters;
  if (simOrIters == null) { sim = createSim(); iters = CFG.prewarmIterations; }
  else if (typeof simOrIters === 'number') { sim = createSim(); iters = simOrIters; }
  else { sim = simOrIters; iters = maybeIters != null ? maybeIters : CFG.prewarmIterations; }
  const savedTarget = sim.alphaTarget;
  sim.alphaTarget = 0; // prewarm остывает
  for (let i = 0; i < iters; i++) stepPhysics(nodes, edges, viewport, sim);
  sim.alphaTarget = savedTarget;
}

// ---------- radial / bbox / fit (без изменений) ----------

// Сложение parent-children словаря и списка корней. Дети одного родителя
// сортируются по timestamp для стабильного визуала.
function buildParentChildIndex(nodes, byId) {
  const children = new Map();
  const roots = [];
  for (const n of nodes) children.set(n.id, []);
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) children.get(n.parentId).push(n.id);
    else roots.push(n.id);
  }
  const byTs = (a, b) => (byId.get(a)?.ts || 0) - (byId.get(b)?.ts || 0);
  for (const arr of children.values()) arr.sort(byTs);
  roots.sort(byTs);
  return { children, roots };
}

// Подсчёт листьев в каждом поддереве — определяет угловой share.
function countLeavesPerSubtree(roots, children) {
  const leaves = new Map();
  const visit = (id) => {
    const kids = children.get(id) || [];
    if (!kids.length) { leaves.set(id, 1); return 1; }
    let sum = 0;
    for (const k of kids) sum += visit(k);
    leaves.set(id, sum);
    return sum;
  };
  for (const r of roots) visit(r);
  return leaves;
}

// Один проход sunburst: рисуем ноду на радиусе depth*ring, делим
// угловую долю между детьми пропорционально количеству их листьев.
function assignRadialPosition(id, depth, angleStart, angleEnd, ctx) {
  const { children, leaves, byId, positions, cx, cy, ring } = ctx;
  const mid = (angleStart + angleEnd) / 2;
  const radius = depth * ring;
  const x = cx + Math.cos(mid) * radius;
  const y = cy + Math.sin(mid) * radius;
  positions.set(id, { x, y });
  const n = byId.get(id);
  if (n) { n._radialX = x; n._radialY = y; }
  const kids = children.get(id) || [];
  if (!kids.length) return;
  const total = leaves.get(id);
  let cur = angleStart;
  for (const k of kids) {
    const share = leaves.get(k) / total;
    const next = cur + (angleEnd - angleStart) * share;
    assignRadialPosition(k, depth + 1, cur, next, ctx);
    cur = next;
  }
}

export function computeRadialLayout(nodes, byId, viewport) {
  const positions = new Map();
  if (!nodes.length) return positions;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;
  const { children, roots } = buildParentChildIndex(nodes, byId);
  const leaves = countLeavesPerSubtree(roots, children);
  const ctx = { children, leaves, byId, positions, cx, cy, ring: CFG.radialRingGap };

  if (roots.length === 1) {
    assignRadialPosition(roots[0], 0, -Math.PI / 2, (3 * Math.PI) / 2, ctx);
  } else {
    // Несколько roots: каждый занимает свой сектор на depth=1, центр свободен.
    const slice = (Math.PI * 2) / roots.length;
    for (let i = 0; i < roots.length; i++) {
      const a0 = i * slice - Math.PI / 2;
      const a1 = (i + 1) * slice - Math.PI / 2;
      assignRadialPosition(roots[i], 1, a0, a1, ctx);
    }
  }
  return positions;
}

export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Time-as-river (swim-lanes) layout. X — по РАНГУ (индексу после сортировки
 * по ts), не по сырому ts. Это распределяет ноды равномерно и разводит
 * плотные кластеры. Y — по роли (три плавательные дорожки).
 * Внутри lane локальный y-jitter + лёгкий x-offset чтобы ноды с близким
 * рангом не накладывались.
 */
export function computeSwimLanes(nodes, viewport) {
  const positions = new Map();
  if (!nodes.length) return positions;
  const W = viewport.safeW != null ? viewport.safeW : viewport.width;
  const H = viewport.safeH != null ? viewport.safeH : viewport.height;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;

  // Длина реки зависит от количества нод: ~40px на ноду, но не меньше 2×W
  const perNode = 40;
  const lineW = Math.max(W * 2.0, nodes.length * perNode);
  const left = cx - lineW / 2;
  const right = cx + lineW / 2;

  // Рангируем по ts (stable: tool_use подноды идут после своего parent assistant)
  const sorted = [...nodes].sort((a, b) => a.ts - b.ts);
  const rankById = new Map();
  sorted.forEach((n, i) => rankById.set(n.id, i));
  const lastRank = Math.max(1, sorted.length - 1);

  const laneSpacing = H * 0.32;
  const laneY = {
    user: cy - laneSpacing,
    assistant: cy,
    tool_use: cy + laneSpacing,
  };

  for (const n of nodes) {
    const rank = rankById.get(n.id) || 0;
    const t = rank / lastRank;
    const lane = laneY[n.role] != null ? laneY[n.role] : cy;
    const yJ = (n._seedDy != null ? n._seedDy : 0) * laneSpacing * 0.45;
    const xJ = (n._seedDx != null ? n._seedDx : 0) * 16;
    const x = left + t * (right - left) + xJ;
    const y = lane + yJ;
    positions.set(n.id, { x, y });
    // Сохраняем target на ноде — чтобы birth-animation в swim-режиме не тянула к parent
    n._swimX = x;
    n._swimY = y;
  }
  return positions;
}

export function computeBBox(nodes) {
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

export function fitToView(nodes, viewport) {
  const bbox = computeBBox(nodes);
  const areaW = viewport.safeW != null ? viewport.safeW : viewport.width;
  const areaH = viewport.safeH != null ? viewport.safeH : viewport.height;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;
  if (bbox.w <= 0 || bbox.h <= 0) {
    return { scale: 1, x: bbox.cx - cx, y: bbox.cy - cy };
  }
  const scale = Math.min(areaW / bbox.w, areaH / bbox.h) * CFG.fitPadding;
  return {
    scale,
    x: bbox.cx - cx / scale,
    y: bbox.cy - cy / scale,
  };
}
