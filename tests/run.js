import { parseJSONL, extractText, parseLine } from '../src/core/parser.js';
import { worldToScreen, screenToWorld, applyZoom } from '../src/view/camera.js';
import { buildGraph, appendRawNodes } from '../src/core/graph.js';
import { computeBBox, fitToView, stepPhysics } from '../src/core/layout.js';
import { advanceTimeline } from '../src/ui/timeline.js';
import { birthFactor, easeOutCubic } from '../src/view/renderer.js';
import { pathToRoot } from '../src/view/path.js';
import { controlPoint, bezierPoint, advanceParticle } from '../src/view/particles.js';
import { generateStarfield, starScreen } from '../src/view/starfield.js';
import { toolIcon } from '../src/view/tool-icons.js';
import { matchNodes } from '../src/ui/search.js';
import { computeStats, formatDuration, formatTokens } from '../src/ui/stats-hud.js';
import { parseUrlParams } from '../src/ui/share.js';

let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); console.log('\u2713 ' + name); passed++; }
  catch (e) { console.log('\u2717 ' + name); console.log('    ' + e.message); failures.push({ name, msg: e.message }); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'equality') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}
function approx(a, b, eps, msg) {
  const e = eps == null ? 1e-6 : eps;
  if (Math.abs(a - b) > e) throw new Error((msg || 'approx') + ': expected ~' + b + ', got ' + a);
}

// --- Silence parser's warn noise during tests ---
const origWarn = console.warn;
console.warn = () => {};

// ==== PARSER ====
test('parser: filters queue-operation and last-prompt', () => {
  const t = [
    '{"type":"queue-operation","operation":"enqueue"}',
    '{"type":"last-prompt"}',
    '{"type":"user","uuid":"u1","parentUuid":null,"message":{"role":"user","content":"hi"}}',
  ].join('\n');
  const r = parseJSONL(t);
  eq(r.nodes.length, 1);
  eq(r.nodes[0].id, 'u1');
  eq(r.nodes[0].role, 'user');
  eq(r.stats.kept, 1);
  eq(r.stats.skipped, 2);
});

test('parser: combines multiple text blocks', () => {
  const t = '{"type":"assistant","uuid":"a1","parentUuid":"u1","message":{"role":"assistant","content":[{"type":"text","text":"hello"},{"type":"text","text":"world"}]}}';
  const r = parseJSONL(t);
  eq(r.nodes.length, 1);
  eq(r.nodes[0].text, 'hello\nworld');
});

test('parser: creates tool_use subnodes with parent link', () => {
  const t = '{"type":"assistant","uuid":"a1","parentUuid":null,"message":{"role":"assistant","content":[{"type":"text","text":"ok"},{"type":"tool_use","id":"tu_1","name":"bash","input":{"cmd":"ls"}}]}}';
  const r = parseJSONL(t);
  eq(r.nodes.length, 2);
  eq(r.nodes[0].role, 'assistant');
  eq(r.nodes[0].text, 'ok');
  eq(r.nodes[1].role, 'tool_use');
  eq(r.nodes[1].parentId, 'a1');
  eq(r.nodes[1].toolName, 'bash');
  assert(r.nodes[1].id !== 'a1', 'subnode id must differ from parent');
});

test('parser: skips malformed JSON without throwing', () => {
  const t = 'not json\n{"type":"user","uuid":"u1","message":{"content":"ok"}}';
  const r = parseJSONL(t);
  eq(r.stats.errors, 1);
  eq(r.nodes.length, 1);
});

test('parser: handles empty input', () => {
  const r = parseJSONL('');
  eq(r.nodes.length, 0);
  eq(r.stats.parsed, 0);
});

test('parser: string content for user message', () => {
  const t = '{"type":"user","uuid":"u1","message":{"content":"hello"}}';
  const r = parseJSONL(t);
  eq(r.nodes[0].text, 'hello');
});

test('parser: assistant without text blocks gives empty text node', () => {
  const t = '{"type":"assistant","uuid":"a1","parentUuid":null,"message":{"role":"assistant","content":[{"type":"tool_use","id":"tu_1","name":"grep","input":{"p":"x"}}]}}';
  const r = parseJSONL(t);
  eq(r.nodes.length, 2);
  eq(r.nodes[0].text, '');
  eq(r.nodes[0].textLen, 0);
  eq(r.nodes[1].role, 'tool_use');
});

test('extractText: handles null message', () => {
  eq(extractText(null), '');
  eq(extractText(undefined), '');
});

// ==== CAMERA ====
test('camera: worldToScreen identity at default cam', () => {
  const cam = { x: 0, y: 0, scale: 1 };
  const s = worldToScreen(100, 200, cam);
  eq(s.x, 100); eq(s.y, 200);
});

test('camera: round-trip screen->world->screen', () => {
  const cam = { x: 50, y: -20, scale: 2 };
  const w = screenToWorld(200, 300, cam);
  const s = worldToScreen(w.x, w.y, cam);
  approx(s.x, 200);
  approx(s.y, 300);
});

test('camera: scale doubles screen distance', () => {
  const cam = { x: 0, y: 0, scale: 2 };
  const s = worldToScreen(100, 100, cam);
  eq(s.x, 200); eq(s.y, 200);
});

test('camera: applyZoom preserves anchor world point', () => {
  const cam = { x: 0, y: 0, scale: 1 };
  const anchorSx = 400, anchorSy = 300;
  const anchorWorldBefore = screenToWorld(anchorSx, anchorSy, cam);
  applyZoom(cam, 1.5, anchorSx, anchorSy, 0.1, 8);
  const anchorWorldAfter = screenToWorld(anchorSx, anchorSy, cam);
  approx(anchorWorldBefore.x, anchorWorldAfter.x, 1e-9);
  approx(anchorWorldBefore.y, anchorWorldAfter.y, 1e-9);
  approx(cam.scale, 1.5);
});

test('camera: applyZoom clamps to max', () => {
  const cam = { x: 0, y: 0, scale: 5 };
  applyZoom(cam, 10, 0, 0, 0.1, 8);
  eq(cam.scale, 8);
});

// ==== GRAPH ====
test('graph: edges only created for existing parents', () => {
  const parsed = { nodes: [
    { id: 'n1', parentId: null, role: 'user', ts: 1, text: '', textLen: 0 },
    { id: 'n2', parentId: 'n1', role: 'assistant', ts: 2, text: '', textLen: 0 },
    { id: 'n3', parentId: 'GHOST', role: 'user', ts: 3, text: '', textLen: 0 },
  ], stats: {} };
  const g = buildGraph(parsed, { width: 800, height: 600 });
  eq(g.nodes.length, 3);
  eq(g.edges.length, 1);
  eq(g.edges[0].source, 'n1');
  eq(g.edges[0].target, 'n2');
});

test('graph: recency normalized to [0, 1]', () => {
  const parsed = { nodes: [
    { id: 'a', parentId: null, role: 'user', ts: 100, text: '', textLen: 0 },
    { id: 'b', parentId: null, role: 'user', ts: 200, text: '', textLen: 0 },
    { id: 'c', parentId: null, role: 'user', ts: 300, text: '', textLen: 0 },
  ], stats: {} };
  const g = buildGraph(parsed, { width: 800, height: 600 });
  const map = new Map(g.nodes.map(n => [n.id, n]));
  eq(map.get('a').recency, 0);
  eq(map.get('c').recency, 1);
  approx(map.get('b').recency, 0.5);
});

test('graph: tool_use node gets smaller radius', () => {
  const parsed = { nodes: [
    { id: 'a', parentId: null, role: 'assistant', ts: 1, text: 'long'.repeat(50), textLen: 200 },
    { id: 'a#tu0', parentId: 'a', role: 'tool_use', ts: 2, text: 'long'.repeat(50), textLen: 200, toolName: 'bash' },
  ], stats: {} };
  const g = buildGraph(parsed, { width: 800, height: 600 });
  const asst = g.nodes.find(n => n.role === 'assistant');
  const tool = g.nodes.find(n => n.role === 'tool_use');
  assert(tool.r < asst.r, 'tool_use radius must be smaller');
});

// ==== LAYOUT / BBOX ====
test('layout: computeBBox covers all node radii', () => {
  const nodes = [
    { x: 0, y: 0, r: 5 },
    { x: 100, y: 50, r: 10 },
  ];
  const b = computeBBox(nodes);
  eq(b.minX, -5);
  eq(b.maxX, 110);
  eq(b.minY, -5);
  eq(b.maxY, 60);
  eq(b.w, 115);
  eq(b.h, 65);
});

test('layout: fitToView centers bbox in viewport', () => {
  const nodes = [
    { x: 0, y: 0, r: 0 },
    { x: 100, y: 100, r: 0 },
  ];
  const cam = fitToView(nodes, { width: 800, height: 600 });
  approx(cam.scale, 5.1, 1e-6);
  // worldToScreen(50, 50, cam) should map to (400, 300)
  const s = worldToScreen(50, 50, cam);
  approx(s.x, 400, 1e-6);
  approx(s.y, 300, 1e-6);
});

test('layout: fitToView with single node gives scale 1 and centers', () => {
  const nodes = [{ x: 200, y: 100, r: 0 }];
  const cam = fitToView(nodes, { width: 800, height: 600 });
  eq(cam.scale, 1);
  const s = worldToScreen(200, 100, cam);
  approx(s.x, 400);
  approx(s.y, 300);
});

test('layout: fitToView respects safe-area (cx/cy + safeW/safeH)', () => {
  const nodes = [
    { x: 0, y: 0, r: 0 },
    { x: 100, y: 100, r: 0 },
  ];
  const cam = fitToView(nodes, { width: 800, height: 600, safeW: 600, safeH: 400, cx: 400, cy: 330 });
  // bbox центр (50, 50) должен оказаться в screen-центре safe-area (400, 330)
  const s = worldToScreen(50, 50, cam);
  approx(s.x, 400, 1e-6);
  approx(s.y, 330, 1e-6);
  // scale должен помещать bbox в safe area, не в весь viewport
  approx(cam.scale, Math.min(600 / 100, 400 / 100) * 0.85);
});

test('layout: stepPhysics moves isolated pair apart (repulsion)', () => {
  const a = { x: 400, y: 300, vx: 0, vy: 0, r: 5 };
  const b = { x: 405, y: 300, vx: 0, vy: 0, r: 5 };
  const d0 = Math.abs(b.x - a.x);
  stepPhysics([a, b], [], { width: 800, height: 600 });
  const d1 = Math.abs(b.x - a.x);
  assert(d1 > d0, 'nodes should repel');
});

// ==== TIMELINE PLAYBACK ====
test('timeline: advanceTimeline adds dt/duration', () => {
  const r = advanceTimeline(0, 1, 10);
  approx(r.value, 0.1);
  eq(r.finished, false);
});

test('timeline: advanceTimeline clamps to 1 and flags finished', () => {
  const r = advanceTimeline(0.95, 1, 10);
  eq(r.value, 1);
  eq(r.finished, true);
});

test('timeline: advanceTimeline crosses exactly 1', () => {
  const r = advanceTimeline(0.8, 2, 10);
  eq(r.value, 1);
  eq(r.finished, true);
});

// ==== BIRTH ANIMATION ====
test('renderer: birthFactor null means 0 (not born)', () => {
  eq(birthFactor(null, 1000, 600), 0);
});

test('renderer: birthFactor linear mid', () => {
  eq(birthFactor(100, 400, 600), 0.5);
});

test('renderer: birthFactor clamps above 1', () => {
  eq(birthFactor(100, 5000, 600), 1);
});

test('renderer: birthFactor clamps below 0 (time rewind)', () => {
  eq(birthFactor(1000, 500, 600), 0);
});

test('renderer: easeOutCubic endpoints', () => {
  eq(easeOutCubic(0), 0);
  eq(easeOutCubic(1), 1);
  assert(easeOutCubic(0.5) > 0.5, 'easeOut steeper at start');
});

// ==== v3: PATH / PARTICLES / STARFIELD ====
test('path: pathToRoot collects chain by parentId', () => {
  const n1 = { id: 'n1', parentId: null };
  const n2 = { id: 'n2', parentId: 'n1' };
  const n3 = { id: 'n3', parentId: 'n2' };
  const byId = new Map([['n1', n1], ['n2', n2], ['n3', n3]]);
  const p = pathToRoot(n3, byId);
  eq(p.size, 3);
  assert(p.has('n1') && p.has('n2') && p.has('n3'));
});

test('path: pathToRoot handles missing parent gracefully', () => {
  const n = { id: 'x', parentId: 'GHOST' };
  const byId = new Map([['x', n]]);
  const p = pathToRoot(n, byId);
  eq(p.size, 1);
  assert(p.has('x'));
});

test('path: pathToRoot handles cycle (safety)', () => {
  const a = { id: 'a', parentId: 'b' };
  const b = { id: 'b', parentId: 'a' };
  const byId = new Map([['a', a], ['b', b]]);
  const p = pathToRoot(a, byId);
  eq(p.size, 2);
});

test('particles: bezier endpoints match at t=0, t=1', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };
  const cp = controlPoint(a, b, 0.2);
  const p0 = bezierPoint(a, b, cp, 0);
  const p1 = bezierPoint(a, b, cp, 1);
  approx(p0.x, 0); approx(p0.y, 0);
  approx(p1.x, 100); approx(p1.y, 0);
});

test('particles: controlPoint offsets perpendicular to segment', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };
  const cp = controlPoint(a, b, 0.2);
  approx(cp.x, 50);
  approx(Math.abs(cp.y), 20);
});

test('particles: advanceParticle wraps 0..1', () => {
  eq(advanceParticle(0.9, 0.3, 1), 0.20000000000000007 > 0 ? advanceParticle(0.9, 0.3, 1) : 0);
  approx(advanceParticle(0.9, 0.3, 1), 0.2, 1e-9);
  approx(advanceParticle(0.1, 0.5, 1), 0.6, 1e-9);
});

test('starfield: generateStarfield deterministic from seed', () => {
  const a = generateStarfield(5, 42);
  const b = generateStarfield(5, 42);
  eq(a.length, 5);
  eq(a[0].x, b[0].x);
  eq(a[2].depth, b[2].depth);
});

test('starfield: starScreen applies depth-parallax', () => {
  const star = { x: 100, y: 100, depth: 0.3 };
  const p0 = starScreen(star, { x: 0, y: 0, scale: 1 });
  const p1 = starScreen(star, { x: 200, y: 0, scale: 1 });
  eq(p0.x, 100);
  approx(p1.x, 100 - 200 * 0.3);
});

// ==== TOOL ICONS ====
test('toolIcon: known tools return specific icons', () => {
  eq(toolIcon('Grep'), '⌕');
  eq(toolIcon('Write'), '✎');
  eq(toolIcon('Bash'), '▶');
  eq(toolIcon('WebFetch'), '↗');
  eq(toolIcon('TodoWrite'), '☑');
});

test('toolIcon: case- and dash-insensitive', () => {
  eq(toolIcon('bash'), '▶');
  eq(toolIcon('multi-edit'), '✎');
  eq(toolIcon('MultiEdit'), '✎');
});

test('toolIcon: unknown tool falls back to first letter uppercase', () => {
  eq(toolIcon('WeirdTool'), 'W');
  eq(toolIcon('custom_thing'), 'C');
});

test('toolIcon: empty/null input falls back to bullet', () => {
  eq(toolIcon(''), '•');
  eq(toolIcon(null), '•');
  eq(toolIcon(undefined), '•');
});

// ==== SEARCH ====
test('search: matches text case-insensitively', () => {
  const nodes = [
    { id: 'a', text: 'Привет мир' },
    { id: 'b', text: 'Hello WORLD' },
    { id: 'c', text: 'other' },
  ];
  const r = matchNodes('world', nodes);
  eq(r.length, 1);
  eq(r[0], 'b');
});

test('search: matches toolName too', () => {
  const nodes = [
    { id: 'a', text: 'foo', toolName: 'Grep' },
    { id: 'b', text: 'bar', toolName: 'Bash' },
  ];
  const r = matchNodes('grep', nodes);
  eq(r.length, 1);
  eq(r[0], 'a');
});

test('search: empty query returns empty', () => {
  const nodes = [{ id: 'a', text: 'hello' }];
  eq(matchNodes('', nodes).length, 0);
  eq(matchNodes('   ', nodes).length, 0);
});

test('search: missing text fields do not throw', () => {
  const nodes = [
    { id: 'a' },
    { id: 'b', text: 'find me' },
  ];
  const r = matchNodes('find', nodes);
  eq(r.length, 1);
  eq(r[0], 'b');
});

// ==== LIVE-STREAM (parseLine + appendRawNodes) ====
test('parseLine: returns empty for blank/service lines', () => {
  eq(parseLine('').length, 0);
  eq(parseLine('   ').length, 0);
  eq(parseLine('{"type":"queue-operation"}').length, 0);
  eq(parseLine('{"type":"last-prompt"}').length, 0);
  eq(parseLine('not-json').length, 0);
});

test('parseLine: user message → one node', () => {
  const r = parseLine('{"type":"user","uuid":"u1","parentUuid":null,"message":{"role":"user","content":"hi"}}');
  eq(r.length, 1);
  eq(r[0].id, 'u1');
  eq(r[0].role, 'user');
  eq(r[0].text, 'hi');
});

test('parseLine: assistant with tool_use → main + subnode', () => {
  const r = parseLine('{"type":"assistant","uuid":"a1","parentUuid":"u1","message":{"role":"assistant","content":[{"type":"text","text":"ok"},{"type":"tool_use","id":"tu_1","name":"Grep","input":{"p":"x"}}]}}');
  eq(r.length, 2);
  eq(r[0].role, 'assistant');
  eq(r[1].role, 'tool_use');
  eq(r[1].parentId, 'a1');
  eq(r[1].toolName, 'Grep');
});

test('appendRawNodes: deduplicates by id', () => {
  const state = {
    nodes: [], edges: [], byId: new Map(),
  };
  const vp = { width: 800, height: 600, cx: 400, cy: 300 };
  const raw1 = [{ id: 'x', parentId: null, role: 'user', ts: 1, text: 'a', textLen: 1 }];
  const added1 = appendRawNodes(state, raw1, vp);
  eq(added1.length, 1);
  const added2 = appendRawNodes(state, raw1, vp); // тот же id
  eq(added2.length, 0);
  eq(state.nodes.length, 1);
});

test('appendRawNodes: создаёт edge если parent уже есть', () => {
  const state = { nodes: [], edges: [], byId: new Map() };
  const vp = { width: 800, height: 600, cx: 400, cy: 300 };
  appendRawNodes(state, [{ id: 'p', parentId: null, role: 'user', ts: 1, text: '', textLen: 0 }], vp);
  appendRawNodes(state, [{ id: 'c', parentId: 'p', role: 'assistant', ts: 2, text: '', textLen: 0 }], vp);
  eq(state.edges.length, 1);
  eq(state.edges[0].source, 'p');
  eq(state.edges[0].target, 'c');
});

test('appendRawNodes: пересчитывает recency при добавлении', () => {
  const state = { nodes: [], edges: [], byId: new Map() };
  const vp = { width: 800, height: 600, cx: 400, cy: 300 };
  appendRawNodes(state, [{ id: 'a', parentId: null, role: 'user', ts: 100, text: '', textLen: 0 }], vp);
  appendRawNodes(state, [{ id: 'b', parentId: null, role: 'user', ts: 300, text: '', textLen: 0 }], vp);
  const a = state.byId.get('a'), b = state.byId.get('b');
  eq(a.recency, 0);
  eq(b.recency, 1);
});

// ==== STATS HUD ====
test('stats: computeStats aggregates tokens/longest/topTools', () => {
  const nodes = [
    { id: 'u1', role: 'user', ts: 1000, text: 'a'.repeat(40), textLen: 40 },
    { id: 'a1', role: 'assistant', ts: 2000, text: 'b'.repeat(200), textLen: 200 },
    { id: 't1', role: 'tool_use', toolName: 'Grep', ts: 2100, text: 'x', textLen: 1 },
    { id: 't2', role: 'tool_use', toolName: 'Grep', ts: 2200, text: 'x', textLen: 1 },
    { id: 't3', role: 'tool_use', toolName: 'Write', ts: 2300, text: 'x', textLen: 1 },
  ];
  const s = computeStats(nodes);
  eq(s.tokens, Math.round(243 / 4));
  eq(s.durationSec, 1.3);
  eq(s.longest.id, 'a1');
  eq(s.topTools[0][0], 'Grep');
  eq(s.topTools[0][1], 2);
  eq(s.topTools[1][0], 'Write');
});

test('stats: computeStats null for empty', () => {
  eq(computeStats([]), null);
  eq(computeStats(null), null);
});

test('stats: formatDuration handles h/m/s', () => {
  eq(formatDuration(45), '45s');
  eq(formatDuration(90), '1m 30s');
  eq(formatDuration(3661), '1h 1m 1s');
});

test('stats: formatTokens uses k/M', () => {
  eq(formatTokens(500), '500');
  eq(formatTokens(1500), '1.5k');
  eq(formatTokens(2_500_000), '2.5M');
});

// ==== SHARE URL ====
test('share: parseUrlParams parses t', () => {
  eq(parseUrlParams('?t=50').t, 0.5);
  eq(parseUrlParams('?t=0').t, 0);
  eq(parseUrlParams('?t=100').t, 1);
  eq(parseUrlParams('?t=150').t, 1); // clamped
});

test('share: parseUrlParams parses hide as array', () => {
  const p = parseUrlParams('?hide=user,tool_use');
  assert(Array.isArray(p.hide));
  eq(p.hide.length, 2);
  eq(p.hide[0], 'user');
});

test('share: parseUrlParams parses n and jsonl', () => {
  const p = parseUrlParams('?n=abc-123&jsonl=http://localhost/x.jsonl');
  eq(p.nodeId, 'abc-123');
  eq(p.jsonl, 'http://localhost/x.jsonl');
});

test('share: parseUrlParams empty returns empty object', () => {
  eq(Object.keys(parseUrlParams('')).length, 0);
  eq(Object.keys(parseUrlParams('?other=1')).length, 0);
});

// ==== SUMMARY ====
console.warn = origWarn;
console.log('');
console.log(passed + ' passed \u00b7 ' + failed + ' failed');
if (failed) {
  console.log('');
  for (const f of failures) console.log('  \u2717 ' + f.name + ' -- ' + f.msg);
}
process.exit(failed ? 1 : 0);
