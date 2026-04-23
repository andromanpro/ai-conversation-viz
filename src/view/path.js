export function pathToRoot(node, byId, maxDepth = 500) {
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
