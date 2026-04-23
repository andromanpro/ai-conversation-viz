import { CFG } from './config.js';

export function buildGraph(parsed, viewport) {
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
