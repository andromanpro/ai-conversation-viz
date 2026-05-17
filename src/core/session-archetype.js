import { CFG } from './config.js';

const ARCHETYPES = new Set([
  'linear_solve',
  'tool_storm',
  'agent_swarm',
  'debugging_spiral',
  'review_loop',
  'research_dive',
]);

const ROLE_ORDER = ['user', 'assistant', 'tool_use', 'tool_result', 'subagent_input', 'thinking'];
const RESEARCH_TOOLS = new Set(['read', 'grep', 'glob', 'find', 'webfetch', 'websearch', 'search', 'fetch']);
const DEFAULT_SNIPPET_MAX = CFG.storyMaxChars || 360;

function archetype(key) {
  const safeKey = ARCHETYPES.has(key) ? key : 'linear_solve';
  return { key: safeKey, labelKey: 'archetype.' + safeKey };
}

function safeRole(role) {
  const value = String(role || 'assistant').trim();
  if (ROLE_ORDER.includes(value)) return value;
  return sanitizeCardText(value, { max: 32 }) || 'assistant';
}

function normalizeToolName(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function mapCount(mapLike, key) {
  if (!mapLike) return 0;
  if (typeof mapLike.get === 'function') return mapLike.get(key) || 0;
  return mapLike[key] || 0;
}

function entriesOf(mapLike) {
  if (!mapLike) return [];
  if (typeof mapLike.entries === 'function') return [...mapLike.entries()];
  if (Array.isArray(mapLike)) return mapLike;
  return Object.entries(mapLike);
}

function computeDepths(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const memo = new Map();
  const visiting = new Set();
  const depthOf = (node) => {
    if (!node || !node.id) return 0;
    if (memo.has(node.id)) return memo.get(node.id);
    if (visiting.has(node.id)) return 0;
    visiting.add(node.id);
    const parent = node.parentId ? byId.get(node.parentId) : null;
    const depth = parent ? depthOf(parent) + 1 : 0;
    visiting.delete(node.id);
    memo.set(node.id, depth);
    return depth;
  };
  let maxDepth = 0;
  for (const n of nodes) maxDepth = Math.max(maxDepth, depthOf(n));
  return maxDepth;
}

function computeBranching(nodes) {
  const childCounts = new Map();
  for (const n of nodes) {
    if (!n.parentId) continue;
    childCounts.set(n.parentId, (childCounts.get(n.parentId) || 0) + 1);
  }
  let maxChildren = 0;
  let branchNodes = 0;
  for (const count of childCounts.values()) {
    maxChildren = Math.max(maxChildren, count);
    if (count >= 3) branchNodes++;
  }
  return { maxChildren, branchNodes };
}

function dialogueSwitchRatio(nodes) {
  const sorted = [...nodes].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  let previous = null;
  let pairs = 0;
  let switches = 0;
  for (const n of sorted) {
    const role = n.role === 'subagent_input' ? 'user' : n.role;
    if (role !== 'user' && role !== 'assistant') continue;
    if (previous) {
      pairs++;
      if (previous !== role) switches++;
    }
    previous = role;
  }
  return { switches, ratio: pairs ? switches / pairs : 0 };
}

function computeFeatures(stats, nodes) {
  const roleCounts = stats && stats.roleCounts;
  const toolCounts = stats && stats.toolCounts;
  let toolUseCount = mapCount(roleCounts, 'tool_use');
  let toolResultCount = mapCount(roleCounts, 'tool_result');
  let subagentCount = mapCount(roleCounts, 'subagent_input');
  let userCount = mapCount(roleCounts, 'user');
  let assistantCount = mapCount(roleCounts, 'assistant');
  let thinkingCount = mapCount(roleCounts, 'thinking');
  let taskToolCount = 0;
  let researchToolCount = 0;
  let errorCount = 0;

  const localToolCounts = new Map();
  for (const n of nodes) {
    const role = n.role || 'assistant';
    if (!roleCounts) {
      if (role === 'tool_use') toolUseCount++;
      else if (role === 'tool_result') toolResultCount++;
      else if (role === 'subagent_input') subagentCount++;
      else if (role === 'user') userCount++;
      else if (role === 'thinking') thinkingCount++;
      else if (role === 'assistant') assistantCount++;
    }
    if (n.hasError || n._hasErrorTool || n._isErrorToolUse) errorCount++;
    if (role === 'tool_use' && n.toolName) {
      const key = normalizeToolName(n.toolName);
      localToolCounts.set(key, (localToolCounts.get(key) || 0) + 1);
    }
  }

  const toolEntries = toolCounts ? entriesOf(toolCounts) : [...localToolCounts.entries()];
  const uniqueToolCount = toolEntries.length;
  for (const [name, count] of toolEntries) {
    const key = normalizeToolName(name);
    if (key === 'task') taskToolCount += count;
    if (RESEARCH_TOOLS.has(key)) researchToolCount += count;
  }

  const { maxChildren, branchNodes } = computeBranching(nodes);
  const { switches, ratio } = dialogueSwitchRatio(nodes);
  return {
    total: nodes.length,
    toolUseCount,
    toolResultCount,
    subagentCount,
    userCount,
    assistantCount,
    thinkingCount,
    taskToolCount,
    researchToolCount,
    uniqueToolCount,
    errorCount,
    hubs: stats && typeof stats.hubs === 'number' ? stats.hubs : nodes.filter(n => n.isHub).length,
    maxDepth: computeDepths(nodes),
    maxChildren,
    branchNodes,
    dialogueSwitches: switches,
    backAndForthRatio: ratio,
  };
}

/**
 * Derive a deterministic visual archetype from graph shape and aggregate counts.
 * No message text is inspected here; only roles, tool names, errors, depth, and branching.
 *
 * @param {object|null} stats Aggregate stats, preferably from computeStats(nodes).
 * @param {Array<object>} nodes Conversation graph nodes.
 * @returns {{key:string,labelKey:string}} Archetype key and i18n label key.
 */
export function deriveArchetype(stats, nodes) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (!list.length) return archetype('linear_solve');

  const f = computeFeatures(stats, list);
  const toolShare = f.total ? f.toolUseCount / f.total : 0;

  // Agent swarm: explicit Task fan-out or multiple subagent prompts dominate the shape.
  if (f.subagentCount >= 3 || f.taskToolCount >= 3 || (f.subagentCount >= 2 && f.branchNodes >= 2)) {
    return archetype('agent_swarm');
  }

  // Debugging spiral: repeated failing tool loops create error rings and tool_result churn.
  if (f.errorCount >= 2 || (f.toolResultCount >= 4 && f.toolUseCount >= 3 && f.backAndForthRatio >= 0.5 && f.hubs >= 1)) {
    return archetype('debugging_spiral');
  }

  // Tool storm: many tool calls or a broad tool palette outnumber the dialogue spine.
  if ((f.toolUseCount >= 8 && toolShare >= 0.28) || (f.uniqueToolCount >= 5 && f.toolUseCount >= 6)) {
    return archetype('tool_storm');
  }

  // Review loop: dense user/assistant alternation with little tool activity.
  if (f.dialogueSwitches >= 6 && f.backAndForthRatio >= 0.72 && f.toolUseCount <= Math.max(2, f.total * 0.12)) {
    return archetype('review_loop');
  }

  // Research dive: read/search/glob style tools on a deeper investigation chain.
  if (f.researchToolCount >= 4 && f.maxDepth >= 3) {
    return archetype('research_dive');
  }

  // Linear solve: a mostly single-spine session or the safe fallback for ambiguous input.
  return archetype('linear_solve');
}

/**
 * Strip identity-heavy strings before they reach the session-card renderer.
 *
 * @param {unknown} value Raw value.
 * @param {{max?:number}=} opts Sanitization options.
 * @returns {string} Sanitized and clipped string.
 */
export function sanitizeCardText(value, opts = {}) {
  const max = opts.max == null ? 120 : opts.max;
  let s = String(value == null ? '' : value);
  if (!s) return '';
  s = s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]');
  s = s.replace(/\b[A-Za-z]:[\\/][^\s"'<>|]+/g, '[path]');
  s = s.replace(/\\\\[^\\/\s]+\\[^\s"'<>|]+/g, '[path]');
  s = s.replace(/(^|[\s("'=])\/(?:Users|home|mnt|var|etc|tmp|Volumes|workspaces|workspace|repo|root|private|data|opt)[^\s"',;)]*/g, '$1[path]');
  s = s.replace(/\b[\w.-]+(?:[\\/][\w .@()+-]+)+\.[A-Za-z0-9]{1,10}\b/g, '[path]');
  s = s.replace(/\bworking[_-]?dir\s*[:=]\s*[^\s,;}]+/gi, 'working_dir=[path]');
  s = s.replace(/\s+/g, ' ').trim();
  if (max > 0 && s.length > max) return s.slice(0, Math.max(0, max - 3)).trimEnd() + '...';
  return s;
}

function sanitizeShareUrl(value) {
  if (!value) return '';
  let s = String(value);
  try {
    const url = new URL(s, 'https://ai-conversation-viz.local');
    url.searchParams.delete('jsonl');
    url.searchParams.delete('n');
    if (url.origin === 'https://ai-conversation-viz.local') {
      s = url.pathname + (url.search ? url.search : '');
    } else {
      s = url.origin + url.pathname + (url.search ? url.search : '');
    }
  } catch {}
  let decoded = s;
  try { decoded = decodeURIComponent(s); } catch {}
  return sanitizeCardText(decoded, { max: 160 });
}

function roleBreakdown(nodes) {
  const counts = new Map();
  for (const n of nodes) {
    const role = safeRole(n.role);
    counts.set(role, (counts.get(role) || 0) + 1);
  }
  const ordered = [];
  for (const role of ROLE_ORDER) {
    const count = counts.get(role) || 0;
    if (count) ordered.push({ role, count });
    counts.delete(role);
  }
  for (const [role, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    ordered.push({ role, count });
  }
  return ordered;
}

function collectToolCounts(nodes, stats) {
  const source = stats && stats.toolCounts;
  if (source) return entriesOf(source);
  const counts = new Map();
  for (const n of nodes) {
    if (n.role !== 'tool_use' || !n.toolName) continue;
    const name = sanitizeCardText(n.toolName, { max: 36 });
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()];
}

// A model identifier has a known narrow shape (claude-opus-4-7, gpt-5.5,
// deepseek/deepseek-v4-pro, anthropic:claude-3). sanitizeCardText only
// strips paths/emails — a polluted field like "gpt-5.5 ghp_<token>" would
// otherwise surface the token into the PUBLIC default card. So whitelist
// the model-id shape instead of sanitize-and-pass: take the first
// whitespace-delimited token and accept it only if it matches the shape;
// otherwise drop entirely (better to show no model than leak).
function safeModelId(raw) {
  if (raw == null) return '';
  const first = String(raw).trim().split(/\s+/)[0] || '';
  return /^[A-Za-z0-9][\w.:/-]{1,46}$/.test(first) ? first : '';
}

function collectModels(nodes) {
  const out = new Set();
  for (const n of nodes) {
    const candidates = [
      n.model,
      n.modelName,
      n.model_name,
      n.assistant_model,
      n.providerModel,
      n.message && n.message.model,
      n.raw && n.raw.model,
    ];
    for (const candidate of candidates) {
      const value = safeModelId(candidate);
      if (value) out.add(value);
    }
  }
  return [...out].slice(0, 3);
}

function makeGraphPayload(nodes, edges, includeSnippets, snippetMaxChars) {
  const sorted = [...nodes].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const idMap = new Map();
  sorted.forEach((n, i) => idMap.set(n.id, 'n' + i));
  const graphNodes = sorted.map((n, i) => {
    const item = {
      id: 'n' + i,
      role: safeRole(n.role),
      x: Number.isFinite(n.x) ? n.x : 0,
      y: Number.isFinite(n.y) ? n.y : 0,
      r: Number.isFinite(n.r) ? n.r : 5,
      textLen: typeof n.textLen === 'number' ? n.textLen : String(n.text || '').length,
      isHub: !!n.isHub,
      hasError: !!(n.hasError || n._hasErrorTool || n._isErrorToolUse),
    };
    if (n.role === 'tool_use' && n.toolName) item.toolName = sanitizeCardText(n.toolName, { max: 36 });
    if (includeSnippets) item.snippet = sanitizeCardText(n.text || '', { max: snippetMaxChars });
    return item;
  });
  const graphEdges = [];
  for (const e of edges || []) {
    const source = idMap.get(e.source || (e.a && e.a.id));
    const target = idMap.get(e.target || (e.b && e.b.id));
    if (!source || !target) continue;
    graphEdges.push({ source, target, adopted: !!e.adopted });
  }
  if (!graphEdges.length) {
    for (const n of sorted) {
      if (!n.parentId || !idMap.has(n.parentId)) continue;
      graphEdges.push({ source: idMap.get(n.parentId), target: idMap.get(n.id), adopted: false });
    }
  }
  return { nodes: graphNodes, edges: graphEdges };
}

/**
 * Build the structured payload consumed by the session-card canvas renderer.
 * Message text is excluded by default; opt-in snippets are sanitized and clipped.
 *
 * @param {{nodes?:Array<object>,edges?:Array<object>,stats?:object}} session Session-like state.
 * @param {{includeSnippets?:boolean,stats?:object,shareUrl?:string,snippetMaxChars?:number}=} opts Options.
 * @returns {object} Redaction-safe card model.
 */
export function buildCardModel(session, opts = {}) {
  const nodes = Array.isArray(session && session.nodes) ? session.nodes : [];
  const edges = Array.isArray(session && session.edges) ? session.edges : [];
  const stats = opts.stats || (session && session.stats) || null;
  const includeSnippets = !!opts.includeSnippets;
  const snippetMaxChars = Math.max(12, Math.min(DEFAULT_SNIPPET_MAX, opts.snippetMaxChars || DEFAULT_SNIPPET_MAX));
  const roles = roleBreakdown(nodes);
  const toolPairs = collectToolCounts(nodes, stats);
  const topTools = toolPairs
    .map(([name, count]) => ({ name: sanitizeCardText(name, { max: 36 }), count }))
    .filter(item => item.name && item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);
  // In Claude Code the `Task` tool IS the sub-agent spawn mechanism. When
  // the parser produced no separate `subagent_input` nodes (some samples),
  // raw subagent_input count is 0 even though N agents were spawned — which
  // looked self-contradictory next to an "agent swarm" archetype. Report
  // the truthful spawn count: max(explicit subagent nodes, Task calls).
  const taskToolCount = toolPairs.reduce(
    (sum, [name, count]) => sum + (normalizeToolName(name) === 'task' ? count : 0),
    0,
  );
  const roleCount = role => roles.find(r => r.role === role)?.count || 0;
  const longest = stats && stats.longest;
  const durationSec = stats && typeof stats.durationSec === 'number'
    ? stats.durationSec
    : durationFromNodes(nodes);

  return {
    version: 1,
    brand: 'ai-conversation-viz',
    coBrand: 'andromanpro',
    includeSnippets,
    archetype: deriveArchetype(stats, nodes),
    counts: {
      events: nodes.length,
      nodes: nodes.length,
      edges: edges.length,
      tokens: stats && typeof stats.tokens === 'number' ? stats.tokens : 0,
      durationSec,
      toolUseTotal: roleCount('tool_use'),
      subagentCount: Math.max(roleCount('subagent_input'), taskToolCount),
      hubs: stats && typeof stats.hubs === 'number' ? stats.hubs : nodes.filter(n => n.isHub).length,
      longestTextLen: longest && typeof longest.textLen === 'number' ? longest.textLen : 0,
    },
    roles,
    topTools,
    models: collectModels(nodes),
    shareUrl: sanitizeShareUrl(opts.shareUrl || ''),
    graph: makeGraphPayload(nodes, edges, includeSnippets, snippetMaxChars),
  };
}

function durationFromNodes(nodes) {
  if (!nodes.length) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const n of nodes) {
    if (typeof n.ts !== 'number') continue;
    min = Math.min(min, n.ts);
    max = Math.max(max, n.ts);
  }
  return isFinite(min) && isFinite(max) ? Math.max(0, (max - min) / 1000) : 0;
}
