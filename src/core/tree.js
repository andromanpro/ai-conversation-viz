// Общие tree-утилиты: глубина ноды относительно root, обход BFS.

export function computeDepths(nodes, byId) {
  const depths = new Map();
  const queue = [];
  // roots
  for (const n of nodes) {
    if (!n.parentId || !byId.has(n.parentId)) {
      depths.set(n.id, 0);
      queue.push(n);
    }
  }
  // children lookup
  const children = new Map();
  for (const n of nodes) children.set(n.id, []);
  for (const n of nodes) {
    if (n.parentId && children.has(n.parentId)) {
      children.get(n.parentId).push(n);
    }
  }
  while (queue.length) {
    const cur = queue.shift();
    const d = depths.get(cur.id);
    for (const kid of children.get(cur.id) || []) {
      if (!depths.has(kid.id)) {
        depths.set(kid.id, d + 1);
        queue.push(kid);
      }
    }
  }
  return depths;
}
