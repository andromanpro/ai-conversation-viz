import { CFG } from './config.js';

export function stepPhysics(nodes, edges, viewport) {
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

export function prewarm(nodes, edges, viewport, iterations) {
  const n = iterations == null ? CFG.prewarmIterations : iterations;
  for (let i = 0; i < n; i++) stepPhysics(nodes, edges, viewport);
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
