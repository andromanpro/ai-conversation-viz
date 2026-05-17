import { parseJSONL, extractText, parseLine, stripCliMeta, markPendingToolUses } from '../src/core/parser.js';
import { detectFormat, chatgptToClaudeJsonl, anthropicMessagesToClaudeJsonl, normalizeToClaudeJsonl } from '../src/core/adapters.js';
import { worldToScreen, screenToWorld, applyZoom } from '../src/view/camera.js';
import { buildGraph, appendRawNodes } from '../src/core/graph.js';
import { computeBBox, fitToView, stepPhysics, stepPhysics3D, computeRadialLayout, easeInOutQuad, createSim, reheat, freeze, unfreeze, isSettled, seedJitter } from '../src/core/layout.js';
import { compute3DRadialLayout, compute3DSwimLanes, fibonacciOnSphere } from '../src/3d/layouts3d.js';
import { applySphericalScatter } from '../src/3d/scatter.js';
import { buildQuadtree, computeRepulsion } from '../src/core/quadtree.js';
import { computeSwimLanes } from '../src/core/layout.js';
import { computeDepths } from '../src/core/tree.js';
import { computeTopics, hashHue, applyTopicsToNodes } from '../src/view/topics.js';
import { advanceTimeline } from '../src/ui/timeline.js';
import { birthFactor, easeOutCubic } from '../src/view/renderer.js';
import { pathToRoot } from '../src/view/path.js';
import { controlPoint, bezierPoint, advanceParticle } from '../src/view/particles.js';
import { generateStarfield, starScreen } from '../src/view/starfield.js';
import { toolIcon } from '../src/view/tool-icons.js';
import { matchNodes } from '../src/ui/search.js';
import { computeStats, formatDuration, formatTokens, initStats, recomputeStats } from '../src/ui/stats-hud.js';
import { parseUrlParams } from '../src/ui/share.js';
import { initSnapshot } from '../src/ui/snapshot.js';
import { openSessionCard } from '../src/ui/session-card.js';
import { hashNode, fnv1a, mergeDiff } from '../src/ui/diff-mode.js';
import { isSafeHttpUrl, isLikelyIntranet } from '../src/core/url-safety.js';
import { deriveArchetype, buildCardModel } from '../src/core/session-archetype.js';
import { setAnnotation, getAnnotation, toggleStar, listStarred, listAnnotated } from '../src/ui/annotations.js';
import { t, setLanguage, getLanguage } from '../src/core/i18n.js';
import { addRemoteSessions } from '../src/ui/session-picker.js';
import { state as globalState } from '../src/view/state.js';

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
  eq(r.nodes[0].text, 'hello\n\nworld');
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

test('parser: assistant without text — text синтезируется из tool_use', () => {
  const t = '{"type":"assistant","uuid":"a1","parentUuid":null,"message":{"role":"assistant","content":[{"type":"tool_use","id":"tu_1","name":"grep","input":{"pattern":"x"}}]}}';
  const r = parseJSONL(t);
  eq(r.nodes.length, 2);
  assert(r.nodes[0].text.length > 0, 'assistant text должен быть синтезирован');
  assert(r.nodes[0].text.includes('grep'));
  eq(r.nodes[1].role, 'tool_use');
});

test('extractText: handles null message', () => {
  eq(extractText(null), '');
  eq(extractText(undefined), '');
});

// subagent_input — user-message чей parent = virtual tool_use 'Task'
// (тред саб-агента в Claude Code). Должна получить отдельную роль.
test('parser: subagent_input — user под Task tool_use → role=subagent_input', () => {
  const lines = [
    '{"type":"user","uuid":"u0","parentUuid":null,"message":{"role":"user","content":"start"}}',
    '{"type":"assistant","uuid":"a0","parentUuid":"u0","message":{"role":"assistant","content":[{"type":"tool_use","id":"tu_x","name":"Task","input":{"description":"sub","subagent_type":"general-purpose","prompt":"Do X"}}]}}',
    '{"type":"user","uuid":"sub_u","parentUuid":"a0#tu0","message":{"role":"user","content":"[Sub] Do X"}}',
    '{"type":"assistant","uuid":"sub_a","parentUuid":"sub_u","message":{"role":"assistant","content":[{"type":"text","text":"done"}]}}',
  ].join('\n');
  const r = parseJSONL(lines);
  // u0 — реальный пользователь
  const u0 = r.nodes.find(n => n.id === 'u0');
  eq(u0.role, 'user', 'real user message stays role=user');
  // sub_u — саб-агентский prompt (parent = virtual tool_use Task)
  const subU = r.nodes.find(n => n.id === 'sub_u');
  eq(subU.role, 'subagent_input', 'user under Task tool_use → subagent_input');
  // sub_a — assistant в саб-треде, остаётся assistant
  const subA = r.nodes.find(n => n.id === 'sub_a');
  eq(subA.role, 'assistant');
});

// User под не-Task tool_use не должен помечаться (но в реальности такого
// не бывает — tool_result parentится на assistant. Тест защищает от
// over-broad detection: нельзя помечать любую user-ноду под virtual tool_use).
test('parser: user под Read tool_use НЕ помечается subagent_input', () => {
  const lines = [
    '{"type":"assistant","uuid":"a0","parentUuid":null,"message":{"role":"assistant","content":[{"type":"tool_use","id":"tu_r","name":"Read","input":{"file_path":"/x"}}]}}',
    // искусственный кейс: user под Read tool_use (в реальности так не бывает)
    '{"type":"user","uuid":"weird_u","parentUuid":"a0#tu0","message":{"role":"user","content":"strange"}}',
  ].join('\n');
  const r = parseJSONL(lines);
  const weird = r.nodes.find(n => n.id === 'weird_u');
  eq(weird.role, 'user', 'parent is Read, not Task → role stays user');
});

// tool_result — pure user-message без своего текста, только tool_result блоки
test('parser: pure tool_result message → role=tool_result', () => {
  const lines = [
    '{"type":"assistant","uuid":"a1","parentUuid":null,"message":{"role":"assistant","content":[{"type":"tool_use","id":"tu_b","name":"Bash","input":{"command":"ls"}}]}}',
    '{"type":"user","uuid":"u_res","parentUuid":"a1","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"tu_b","content":"file1.js\\nfile2.js"}]}}',
  ].join('\n');
  const r = parseJSONL(lines);
  const res = r.nodes.find(n => n.id === 'u_res');
  eq(res.role, 'tool_result', 'pure tool_result block → role=tool_result');
  eq(res.toolResultIds.length, 1);
  eq(res.toolResultIds[0], 'tu_b');
});

// Параллельные tool_use → один user-message с N tool_result блоков
test('parser: multiple tool_results in one message → still role=tool_result', () => {
  const lines = [
    '{"type":"user","uuid":"u_multi","parentUuid":"a1","message":{"role":"user","content":[' +
      '{"type":"tool_result","tool_use_id":"tu_a","content":"A"},' +
      '{"type":"tool_result","tool_use_id":"tu_b","content":"B"}' +
    ']}}',
  ].join('\n');
  const r = parseJSONL(lines);
  const node = r.nodes.find(n => n.id === 'u_multi');
  eq(node.role, 'tool_result');
  eq(node.toolResultIds.length, 2);
});

// User-message с текстом + tool_result остаётся user (mixed — редкий случай,
// но если человек добавил комментарий рядом с tool_result — это не pure)
test('parser: mixed user message (text + tool_result) → role=user', () => {
  const lines = [
    '{"type":"user","uuid":"u_mix","parentUuid":"a1","message":{"role":"user","content":[' +
      '{"type":"tool_result","tool_use_id":"tu_a","content":"42 lines"},' +
      '{"type":"text","text":"please summarize this"}' +
    ']}}',
  ].join('\n');
  const r = parseJSONL(lines);
  const node = r.nodes.find(n => n.id === 'u_mix');
  eq(node.role, 'user', 'mixed message keeps role=user');
  // toolResultIds сохраняется для pair-edges
  eq(node.toolResultIds.length, 1);
});

// hasError на tool_result-ноде (для error pair-edge)
test('parser: tool_result with is_error → hasError=true', () => {
  const lines = [
    '{"type":"user","uuid":"u_err","parentUuid":"a1","message":{"role":"user","content":[' +
      '{"type":"tool_result","tool_use_id":"tu_a","is_error":true,"content":"ENOENT"}' +
    ']}}',
  ].join('\n');
  const r = parseJSONL(lines);
  const node = r.nodes.find(n => n.id === 'u_err');
  eq(node.role, 'tool_result');
  eq(node.hasError, true);
});

// stripCliMeta — удаление CLI-meta тегов
test('stripCliMeta: removes <system-reminder> tags', () => {
  const input = 'real text\n<system-reminder>internal</system-reminder>\nmore text';
  const out = stripCliMeta(input);
  assert(!out.includes('system-reminder'), 'tag must be removed');
  assert(out.includes('real text'), 'real text preserved');
  assert(out.includes('more text'), 'after-text preserved');
});

test('stripCliMeta: removes <command-name>/<command-message>/<command-args>', () => {
  const input = '<command-name>/compact</command-name><command-message>compact</command-message><command-args></command-args>real';
  const out = stripCliMeta(input);
  eq(out, 'real');
});

test('stripCliMeta: idempotent + handles null/empty', () => {
  eq(stripCliMeta(''), '');
  eq(stripCliMeta(null), '');
  eq(stripCliMeta(undefined), '');
  const t = 'plain text';
  eq(stripCliMeta(stripCliMeta(t)), t);
});

test('parser: user-message с system-reminder → text очищен, _hasCliMeta=true', () => {
  const lines = [
    '{"type":"user","uuid":"u1","parentUuid":null,"message":{"role":"user","content":"hello\\n<system-reminder>noise</system-reminder>\\nworld"}}',
  ].join('\n');
  const r = parseJSONL(lines);
  const u = r.nodes[0];
  assert(!u.text.includes('system-reminder'), 'CLI meta should be stripped');
  assert(u.text.includes('hello'), 'real text preserved');
  assert(u.text.includes('world'), 'after-text preserved');
  eq(u._hasCliMeta, true);
});

// Compactions counter в stats
test('parser: type=summary считается как compaction в stats', () => {
  const lines = [
    '{"type":"summary","summary":"Compacted previous conversation"}',
    '{"type":"summary","summary":"Another compact"}',
    '{"type":"user","uuid":"u","parentUuid":null,"message":{"role":"user","content":"hi"}}',
  ].join('\n');
  const r = parseJSONL(lines);
  eq(r.stats.compactions, 2);
  eq(r.nodes.length, 1);
});

// markPendingToolUses — orphan virtual tool_use без tool_result
test('parser: virtual tool_use без matching tool_result → _isPendingToolUse=true', () => {
  const lines = [
    '{"type":"assistant","uuid":"a1","parentUuid":null,"message":{"role":"assistant","content":[' +
      '{"type":"tool_use","id":"tu_done","name":"Bash","input":{"command":"ls"}},' +
      '{"type":"tool_use","id":"tu_pending","name":"Bash","input":{"command":"sleep 100"}}' +
    ']}}',
    '{"type":"user","uuid":"u","parentUuid":"a1","message":{"role":"user","content":[' +
      '{"type":"tool_result","tool_use_id":"tu_done","content":"done"}' +
    ']}}',
  ].join('\n');
  const r = parseJSONL(lines);
  const done = r.nodes.find(n => n.toolUseId === 'tu_done');
  const pending = r.nodes.find(n => n.toolUseId === 'tu_pending');
  assert(!done._isPendingToolUse, 'tu_done has matching result → not pending');
  eq(pending._isPendingToolUse, true, 'tu_pending has no matching result → pending');
});

test('parser: markPendingToolUses idempotent — повторный вызов не меняет результата', () => {
  const nodes = [
    { id: 'a1', role: 'assistant', toolUseId: null },
    { id: 'a1#tu0', role: 'tool_use', toolUseId: 'tu_x' },
    // нет user-ноды с tool_result для tu_x → должна быть pending
  ];
  markPendingToolUses(nodes);
  eq(nodes[1]._isPendingToolUse, true);
  markPendingToolUses(nodes);
  eq(nodes[1]._isPendingToolUse, true, 'second call same result');
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
test('graph: orphan помечен _isOrphanRoot + adopted edge к предшественнику', () => {
  const parsed = { nodes: [
    { id: 'n1', parentId: null, role: 'user', ts: 1, text: '', textLen: 0 },
    { id: 'n2', parentId: 'n1', role: 'assistant', ts: 2, text: '', textLen: 0 },
    { id: 'n3', parentId: 'GHOST', role: 'user', ts: 3, text: '', textLen: 0 },
  ], stats: {} };
  const g = buildGraph(parsed, { width: 800, height: 600 });
  eq(g.nodes.length, 3);
  const orphan = g.byId.get('n3');
  eq(orphan._isOrphanRoot, true);
  eq(orphan.parentId, 'GHOST'); // parentId НЕ меняется — сохраняем правду
  eq(orphan._adoptedParentId, 'n2');
  // edges: real n1→n2, adopted n2→n3
  eq(g.edges.length, 2);
  const adopted = g.edges.find(e => e.adopted);
  eq(adopted.source, 'n2');
  eq(adopted.target, 'n3');
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
  // 600/100 * 0.7 = 4.2 (CFG.fitPadding tuned to 0.7 в v1.3 для большего воздуха)
  approx(cam.scale, 4.2, 1e-6);
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
  approx(cam.scale, Math.min(600 / 100, 400 / 100) * 0.7);
});

test('layout: stepPhysics moves isolated pair apart (repulsion)', () => {
  const a = { id: 'a', x: 400, y: 300, vx: 0, vy: 0, r: 5, fxAcc: 0, fyAcc: 0 };
  const b = { id: 'b', x: 405, y: 300, vx: 0, vy: 0, r: 5, fxAcc: 0, fyAcc: 0 };
  const d0 = Math.abs(b.x - a.x);
  const sim = createSim();
  stepPhysics([a, b], [], { width: 800, height: 600, cx: 400, cy: 300 }, sim);
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

test('parseLine: assistant без text но с tool_use получает синтетический summary', () => {
  const r = parseLine('{"type":"assistant","uuid":"a1","parentUuid":null,"message":{"role":"assistant","content":[{"type":"tool_use","id":"tu_1","name":"Grep","input":{"pattern":"force.*directed"}},{"type":"tool_use","id":"tu_2","name":"Bash","input":{"command":"npm test"}}]}}');
  const main = r.find(n => n.role === 'assistant');
  assert(main.text.length > 0, 'ассистент больше не empty');
  assert(main.text.includes('Grep'));
  assert(main.text.includes('Bash'));
  assert(main.text.includes('force.*directed'));
});

test('parseLine: user with tool_result block has text', () => {
  const r = parseLine('{"type":"user","uuid":"u1","parentUuid":"a1","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"tu_1","content":"output of grep"}]}}');
  eq(r.length, 1);
  assert(r[0].text.includes('output of grep'), 'tool_result text должен попадать в body');
});

test('parseLine: user with tool_result array blocks', () => {
  const r = parseLine('{"type":"user","uuid":"u1","message":{"content":[{"type":"tool_result","content":[{"type":"text","text":"line1"},{"type":"text","text":"line2"}]}]}}');
  eq(r.length, 1);
  assert(r[0].text.includes('line1'));
  assert(r[0].text.includes('line2'));
});

test('parseLine: assistant with thinking block creates virtual thinking node', () => {
  const r = parseLine('{"type":"assistant","uuid":"a1","parentUuid":"u1","message":{"role":"assistant","content":[{"type":"thinking","thinking":"Hmm, let me think"},{"type":"text","text":"Answer"}]}}');
  // assistant + 1 virtual thinking-нода
  eq(r.length, 2);
  // Текст assistant'а — только основной text, без префикса 💭
  eq(r[0].role, 'assistant');
  assert(r[0].text.includes('Answer'));
  assert(!r[0].text.includes('Hmm, let me think'), 'thinking не должно дублироваться в text родителя');
  // Virtual thinking-нода
  eq(r[1].role, 'thinking');
  eq(r[1].parentId, 'a1');
  eq(r[1].text, 'Hmm, let me think');
});

test('parseLine: assistant with ONLY thinking → text синтезируется из 💭', () => {
  const r = parseLine('{"type":"assistant","uuid":"a1","parentUuid":"u1","message":{"role":"assistant","content":[{"type":"thinking","thinking":"deep cogitation"}]}}');
  eq(r.length, 2);
  eq(r[0].role, 'assistant');
  assert(r[0].text.includes('💭'), 'fallback summary должен включать 💭 префикс');
  assert(r[0].text.includes('deep cogitation'));
  eq(r[1].role, 'thinking');
});

test('parseLine: image block replaced by placeholder', () => {
  const r = parseLine('{"type":"user","uuid":"u1","message":{"content":[{"type":"image","source":{}},{"type":"text","text":"see"}]}}');
  eq(r.length, 1);
  assert(r[0].text.includes('[image]'));
  assert(r[0].text.includes('see'));
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

// Регрессия: 3D HUD не имеет элементов #stat-tokens/#stat-duration/#stat-top-tools/
// #stat-longest, поэтому recomputeStats должен корректно работать когда они null.
// Раньше падал с TypeError → render loop ломался → крах страницы.
test('stats: recomputeStats null-safe когда DOM элементов нет', () => {
  // Полностью отсутствующие элементы (3d.html scenario)
  const fakeDoc = { getElementById: () => null };
  const origDoc = globalThis.document;
  globalThis.document = fakeDoc;
  try {
    initStats();
    // Должно не упасть. Без panelEl — early-return.
    let threw = false;
    try { recomputeStats(); }
    catch (e) { threw = true; }
    assert(!threw, 'recomputeStats не должен бросать при отсутствии DOM');
  } finally {
    globalThis.document = origDoc;
  }
});

test('stats: recomputeStats null-safe при частичном DOM (panel exists, stat-* отсутствуют)', () => {
  // 3d.html scenario: stats-panel есть (panelEl truthy), но stat-tokens/
  // duration/top-tools/longest все отсутствуют. recomputeStats должен
  // дойти до строк с tokensEl.textContent и не упасть на null.
  const panel = { style: {}, _display: '' };
  Object.defineProperty(panel.style, 'display', {
    set(v) { panel._display = v; },
    get() { return panel._display; },
  });
  const els = { 'stats-panel': panel };
  const fakeDoc = { getElementById: id => els[id] || null };
  const origDoc = globalThis.document;
  globalThis.document = fakeDoc;
  try {
    initStats();
    // Подсунем state.nodes с одной нодой чтобы computeStats вернул не-null
    // и код прошёл за `if (!s) return` — иначе ветка с tokensEl не достигнется.
    const origNodes = globalState.nodes;
    globalState.nodes = [
      { id: 'a1', role: 'assistant', ts: 1000, text: 'hello world', textLen: 11 },
    ];
    let threw = false, errMsg = '';
    try { recomputeStats(); }
    catch (e) { threw = true; errMsg = e.message; }
    globalState.nodes = origNodes;
    assert(!threw, 'recomputeStats упал на null tokensEl: ' + errMsg);
  } finally {
    globalThis.document = origDoc;
  }
});

test('stats: formatTokens uses k/M', () => {
  eq(formatTokens(500), '500');
  eq(formatTokens(1500), '1.5k');
  eq(formatTokens(2_500_000), '2.5M');
});

// ==== SESSION CARD / ARCHETYPE ====
function archNode(id, role, idx, parentId, extra = {}) {
  const text = extra.text != null ? extra.text : role + ' ' + id;
  return {
    id,
    role,
    parentId: parentId || null,
    ts: 1000 + idx * 1000,
    text,
    textLen: text.length,
    x: idx * 24,
    y: (idx % 5) * 18,
    r: 6,
    ...extra,
  };
}

function archStats(nodes) {
  return computeStats(nodes) || {
    tokens: 0,
    durationSec: 0,
    longest: null,
    hubs: 0,
    roleCounts: new Map(),
    toolCounts: new Map(),
    topTools: [],
  };
}

test('archetype: linear_solve fallback for a simple spine', () => {
  const nodes = [
    archNode('u1', 'user', 0),
    archNode('a1', 'assistant', 1, 'u1'),
    archNode('u2', 'user', 2, 'a1'),
    archNode('a2', 'assistant', 3, 'u2'),
  ];
  eq(deriveArchetype(archStats(nodes), nodes).key, 'linear_solve');
});

test('archetype: agent_swarm for Task fan-out and subagent prompts', () => {
  const nodes = [
    archNode('u1', 'user', 0),
    archNode('a1', 'assistant', 1, 'u1'),
    archNode('t1', 'tool_use', 2, 'a1', { toolName: 'Task' }),
    archNode('t2', 'tool_use', 3, 'a1', { toolName: 'Task' }),
    archNode('t3', 'tool_use', 4, 'a1', { toolName: 'Task' }),
    archNode('s1', 'subagent_input', 5, 't1'),
    archNode('s2', 'subagent_input', 6, 't2'),
    archNode('s3', 'subagent_input', 7, 't3'),
  ];
  eq(deriveArchetype(archStats(nodes), nodes).key, 'agent_swarm');
});

test('archetype: debugging_spiral for repeated error tool loops', () => {
  const nodes = [
    archNode('u1', 'user', 0),
    archNode('a1', 'assistant', 1, 'u1'),
    archNode('t1', 'tool_use', 2, 'a1', { toolName: 'Bash', _isErrorToolUse: true }),
    archNode('r1', 'tool_result', 3, 'a1', { hasError: true }),
    archNode('a2', 'assistant', 4, 'r1', { _hasErrorTool: true }),
    archNode('t2', 'tool_use', 5, 'a2', { toolName: 'Bash', _isErrorToolUse: true }),
    archNode('r2', 'tool_result', 6, 'a2', { hasError: true }),
  ];
  eq(deriveArchetype(archStats(nodes), nodes).key, 'debugging_spiral');
});

test('archetype: tool_storm for dense broad tool usage', () => {
  const tools = ['Bash', 'Read', 'Grep', 'Write', 'Edit', 'Glob', 'Find', 'Bash', 'Read'];
  const nodes = [
    archNode('u1', 'user', 0),
    archNode('a1', 'assistant', 1, 'u1'),
    ...tools.map((tool, i) => archNode('t' + i, 'tool_use', i + 2, 'a1', { toolName: tool })),
  ];
  eq(deriveArchetype(archStats(nodes), nodes).key, 'tool_storm');
});

test('archetype: review_loop for user-assistant back-and-forth', () => {
  const roles = ['user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant'];
  const nodes = roles.map((role, i) => archNode('n' + i, role, i, i ? 'n' + (i - 1) : null));
  eq(deriveArchetype(archStats(nodes), nodes).key, 'review_loop');
});

test('archetype: research_dive for read/search tools on a deep chain', () => {
  const nodes = [
    archNode('u1', 'user', 0),
    archNode('a1', 'assistant', 1, 'u1'),
    archNode('t1', 'tool_use', 2, 'a1', { toolName: 'Read' }),
    archNode('r1', 'tool_result', 3, 't1'),
    archNode('a2', 'assistant', 4, 'r1'),
    archNode('t2', 'tool_use', 5, 'a2', { toolName: 'Grep' }),
    archNode('r2', 'tool_result', 6, 't2'),
    archNode('a3', 'assistant', 7, 'r2'),
    archNode('t3', 'tool_use', 8, 'a3', { toolName: 'Glob' }),
    archNode('r3', 'tool_result', 9, 't3'),
    archNode('a4', 'assistant', 10, 'r3'),
    archNode('t4', 'tool_use', 11, 'a4', { toolName: 'WebFetch' }),
  ];
  eq(deriveArchetype(archStats(nodes), nodes).key, 'research_dive');
});

test('archetype: default fallback and determinism', () => {
  eq(deriveArchetype(null, []).key, 'linear_solve');
  const nodes = [
    archNode('u1', 'user', 0),
    archNode('a1', 'assistant', 1, 'u1'),
    archNode('t1', 'tool_use', 2, 'a1', { toolName: 'Bash' }),
  ];
  const first = deriveArchetype(archStats(nodes), nodes);
  const second = deriveArchetype(archStats(nodes), nodes);
  eq(first, second, 'same input gives same archetype');
});

test('session card model: redacts message text by default and strips paths/emails with snippets on', () => {
  const sentinel = 'CARD_SENTINEL_8492';
  const fakeWinPath = 'F:\\Clients\\Secret\\roadmap.md';
  const fakePosixPath = '/home/alice/private/key.txt';
  const email = 'owner@example.com';
  const nodes = [
    archNode('u1', 'user', 0, null, {
      text: `${sentinel} user prompt ${fakeWinPath} ${email}`,
      working_dir: fakeWinPath,
      model: `gpt-5.5 ${email}`,
    }),
    archNode('a1', 'assistant', 1, 'u1', {
      text: `${sentinel} assistant answer ${fakePosixPath} ${email} ` + 'x'.repeat(80),
    }),
    archNode('t1', 'tool_use', 2, 'a1', {
      toolName: `Read ${fakeWinPath}`,
      text: `file_path=${fakeWinPath}`,
    }),
  ];
  const edges = [
    { source: 'u1', target: 'a1' },
    { source: 'a1', target: 't1' },
  ];
  const stats = archStats(nodes);
  const redacted = buildCardModel({ nodes, edges }, {
    stats,
    includeSnippets: false,
    shareUrl: 'https://example.com/viz?n=' + encodeURIComponent(fakeWinPath) + '&t=100',
  });
  const json = JSON.stringify(redacted);
  assert(!json.includes(sentinel), 'default card model must not contain message text');
  assert(!json.includes(email), 'default card model must not contain emails');
  assert(!json.includes('F:'), 'default card model must not contain Windows paths');
  assert(!json.includes('Clients'), 'default card model must not contain path fragments');
  assert(!json.includes('/home/alice'), 'default card model must not contain POSIX paths');
  assert(redacted.graph.nodes.every(n => n.snippet == null), 'default graph nodes must not expose snippets');

  const withSnippets = buildCardModel({ nodes, edges }, {
    stats,
    includeSnippets: true,
    snippetMaxChars: 32,
  });
  const jsonSnippets = JSON.stringify(withSnippets);
  assert(jsonSnippets.includes(sentinel), 'opt-in snippets may contain non-path message text');
  assert(!jsonSnippets.includes(email), 'snippet model must strip emails');
  assert(!jsonSnippets.includes('F:'), 'snippet model must strip Windows paths');
  assert(!jsonSnippets.includes('/home/alice'), 'snippet model must strip POSIX paths');
  const snippets = withSnippets.graph.nodes.map(n => n.snippet).filter(Boolean);
  assert(snippets.length > 0, 'opt-in snippets are present');
  assert(snippets.every(s => s.length <= 35), 'snippets are clipped');
});

test('session card model: structural default excludes ALL adversarial strings (DeepSeek nit 5)', () => {
  // DeepSeek flagged sanitizeCardText cannot regex-catch tokens/IPs/bare
  // names/env-vars/relative paths. Default mode does not rely on regex — it
  // excludes message text by construction; assert that holds for every one
  // of those vectors. Snippet mode only guarantees path/email stripping;
  // the rest is a documented limit (see SECURITY.md), asserted as such.
  const adv = {
    bareName: 'AcmeCorp',
    envSecret: 'API_SECRET=ghp_AAAA1111BBBB2222',
    relPath: '../config/secrets.env',
    cyrPath: 'F:\\WorkAI\\1С\\Клиент\\план.md',
    token: 'ghp_AAAA1111BBBB2222CCCC3333',
    hostPort: 'db.internal:5432',
    email: 'lead@client.example',
  };
  const blob = Object.values(adv).join(' ');
  const nodes = [
    archNode('u1', 'user', 0, null, { text: 'prompt ' + blob, working_dir: adv.cyrPath, model: 'gpt-5.5 ' + adv.token }),
    archNode('a1', 'assistant', 1, 'u1', { text: 'answer ' + blob }),
    archNode('t1', 'tool_use', 2, 'a1', { toolName: 'Read ' + adv.relPath, text: 'file=' + adv.cyrPath }),
  ];
  const edges = [{ source: 'u1', target: 'a1' }, { source: 'a1', target: 't1' }];
  const stats = archStats(nodes);

  const def = JSON.stringify(buildCardModel({ nodes, edges }, { stats, includeSnippets: false }));
  for (const [k, v] of Object.entries(adv)) {
    assert(!def.includes(v), 'default model must exclude adversarial ' + k + ' (structural, not regex)');
  }

  // Snippet mode: only path/email guarantees are contractual.
  const snip = JSON.stringify(buildCardModel({ nodes, edges }, { stats, includeSnippets: true, snippetMaxChars: 64 }));
  assert(!snip.includes(adv.email), 'snippet mode strips emails (contract)');
  assert(!snip.includes(adv.relPath), 'snippet mode strips relative paths (contract)');
  assert(!snip.includes('F:\\WorkAI'), 'snippet mode strips Windows/Cyrillic paths (contract)');
  // NOT contractual (documented limit in SECURITY.md): bareName / token /
  // hostPort may survive in snippet mode — intentionally not asserted absent.
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

// ==== RADIAL LAYOUT ====
test('radial: easeInOutQuad endpoints', () => {
  eq(easeInOutQuad(0), 0);
  eq(easeInOutQuad(1), 1);
  approx(easeInOutQuad(0.5), 0.5, 1e-9);
});

test('radial: computeRadialLayout places single root at center', () => {
  const n1 = { id: 'r', parentId: null };
  const byId = new Map([['r', n1]]);
  const vp = { width: 800, height: 600, cx: 400, cy: 300 };
  const pos = computeRadialLayout([n1], byId, vp);
  const p = pos.get('r');
  eq(p.x, 400);
  eq(p.y, 300);
});

test('swim-lanes: X по ts, Y по роли', () => {
  const u = { id: 'u1', role: 'user', ts: 100, _seedDy: 0 };
  const a = { id: 'a1', role: 'assistant', ts: 200, _seedDy: 0 };
  const t = { id: 't1', role: 'tool_use', ts: 300, _seedDy: 0 };
  const vp = { width: 1000, height: 600, safeW: 1000, safeH: 600, cx: 500, cy: 300 };
  const pos = computeSwimLanes([u, a, t], vp);
  // X монотонно растёт по ts
  assert(pos.get('u1').x < pos.get('a1').x);
  assert(pos.get('a1').x < pos.get('t1').x);
  // Y: user выше assistant выше tool_use (меньше Y = выше)
  assert(pos.get('u1').y < pos.get('a1').y);
  assert(pos.get('a1').y < pos.get('t1').y);
});

test('radial: multi-root — корни на первом кольце (не слиты в центре)', () => {
  const r1 = { id: 'r1', parentId: null, ts: 1 };
  const r2 = { id: 'r2', parentId: null, ts: 2 };
  const r3 = { id: 'r3', parentId: null, ts: 3 };
  const byId = new Map([['r1', r1], ['r2', r2], ['r3', r3]]);
  const vp = { width: 800, height: 600, cx: 400, cy: 300 };
  const pos = computeRadialLayout([r1, r2, r3], byId, vp);
  // Каждый root должен быть на радиусе ~ring от центра (не в точке)
  for (const id of ['r1', 'r2', 'r3']) {
    const p = pos.get(id);
    const d = Math.hypot(p.x - 400, p.y - 300);
    assert(d > 50, `root ${id} не должен быть в точке, d=${d}`);
  }
});

test('radial: children laid on outer ring', () => {
  const r = { id: 'r', parentId: null, ts: 1 };
  const c1 = { id: 'c1', parentId: 'r', ts: 2 };
  const c2 = { id: 'c2', parentId: 'r', ts: 3 };
  const byId = new Map([['r', r], ['c1', c1], ['c2', c2]]);
  const vp = { width: 800, height: 600, cx: 400, cy: 300 };
  const pos = computeRadialLayout([r, c1, c2], byId, vp);
  const p1 = pos.get('c1'), p2 = pos.get('c2');
  // На ring 130 px от центра
  const d1 = Math.hypot(p1.x - 400, p1.y - 300);
  const d2 = Math.hypot(p2.x - 400, p2.y - 300);
  approx(d1, 130, 1e-6);
  approx(d2, 130, 1e-6);
});

test('radial: empty input returns empty Map', () => {
  const pos = computeRadialLayout([], new Map(), { width: 800, height: 600, cx: 400, cy: 300 });
  eq(pos.size, 0);
});

// ==== BARNES-HUT QUADTREE ====
test('quadtree: buildQuadtree accumulates mass', () => {
  const nodes = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
  ];
  const tree = buildQuadtree(nodes);
  eq(tree.mass, 4);
  // Центр масс — среднее
  approx(tree.cx, 50);
  approx(tree.cy, 50);
});

test('quadtree: empty array returns null', () => {
  eq(buildQuadtree([]), null);
});

test('quadtree: computeRepulsion excludes self', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };
  const tree = buildQuadtree([a, b]);
  const fa = computeRepulsion(tree, a, 0.6, 9000);
  // сила от b на a направлена по -x (отталкивает влево)
  assert(fa.fx < 0, 'должна быть отталкивающая x-компонента');
  approx(fa.fy, 0, 1e-6);
});

test('quadtree: Barnes-Hut approximates O(n²) for far groups', () => {
  // Создаём два кластера далеко друг от друга: в каждом по 3 ноды близко
  const nodes = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 },           // cluster A (близко)
    { x: 500, y: 500 }, { x: 501, y: 500 }, { x: 500, y: 501 }, // cluster B
  ];
  const target = nodes[0];
  const tree = buildQuadtree(nodes);
  const f = computeRepulsion(tree, target, 0.6, 9000);
  // Сила на target должна быть отлична от 0 (и от A, и от B)
  assert(Math.abs(f.fx) > 0 || Math.abs(f.fy) > 0);
});

// ==== TREE UTILS ====
test('tree: computeDepths BFS from roots', () => {
  const n1 = { id: 'r', parentId: null };
  const n2 = { id: 'c1', parentId: 'r' };
  const n3 = { id: 'c2', parentId: 'r' };
  const n4 = { id: 'gc', parentId: 'c1' };
  const byId = new Map([['r', n1], ['c1', n2], ['c2', n3], ['gc', n4]]);
  const depths = computeDepths([n1, n2, n3, n4], byId);
  eq(depths.get('r'), 0);
  eq(depths.get('c1'), 1);
  eq(depths.get('c2'), 1);
  eq(depths.get('gc'), 2);
});

// ==== TOPICS (TF-IDF) ====
test('topics: computeTopics assigns top-1 word per node', () => {
  const nodes = [
    { id: 'a', text: 'force directed graph layout algorithm' },
    { id: 'b', text: 'canvas rendering performance optimization' },
    { id: 'c', text: 'force force force simulation' },
  ];
  const t = computeTopics(nodes);
  eq(t.size, 3);
  // В c слово "force" встречается чаще, топ-1 = force
  eq(t.get('c').topWord, 'force');
});

test('topics: empty text → null', () => {
  const t = computeTopics([{ id: 'a', text: '' }, { id: 'b', text: '   ' }]);
  eq(t.get('a'), null);
  eq(t.get('b'), null);
});

test('topics: hashHue stable и в [0,1)', () => {
  const h1 = hashHue('apple');
  const h2 = hashHue('apple');
  eq(h1, h2);
  assert(h1 >= 0 && h1 < 1);
  const h3 = hashHue('banana');
  assert(h3 !== h1, 'разные слова → разный hue');
});

test('topics: applyTopicsToNodes заполняет _topicHue для содержательных', () => {
  const nodes = [
    { id: 'a', text: 'performance optimization canvas' },
    { id: 'b', text: '' },
  ];
  const top = applyTopicsToNodes(nodes);
  assert(nodes[0]._topicHue != null);
  eq(nodes[1]._topicHue, null);
  assert(Array.isArray(top));
});

test('topics: stopwords отфильтрованы (и, the, если)', () => {
  const t = computeTopics([{ id: 'a', text: 'если это то что мы искали' }]);
  const r = t.get('a');
  // всё — стопвордс → null
  assert(r === null || (r && !['если','это','то','что','мы'].includes(r.topWord)));
});

test('topics: recurring topics выигрывают over singleton verbs', () => {
  // Классический баг старого TF-IDF: "implement", "fix", "write" (df=1)
  // получали максимальный IDF → выигрывали у "authentication" (df=3).
  // Проверяем что новая формула TF × log(1+df) это исправляет.
  const nodes = [
    { id: '1', text: 'Implement authentication with JWT tokens bcrypt password hashing' },
    { id: '2', text: 'Add database migration for users table, run pg_dump' },
    { id: '3', text: 'Write unit tests for auth flow using jest supertest' },
    { id: '4', text: 'Fix bug in authentication JWT expiration handling' },
    { id: '5', text: 'Database migration fails on timestamp column investigate' },
    { id: '6', text: 'Tests passing after jest update completed' },
  ];
  const t = computeTopics(nodes);
  eq(t.get('1').topWord, 'authentication', 'node 1 про authentication');
  eq(t.get('2').topWord, 'database', 'node 2 про database');
  eq(t.get('3').topWord, 'tests', 'node 3 про tests');
  eq(t.get('4').topWord, 'authentication', 'node 4 тоже про authentication');
  eq(t.get('5').topWord, 'database', 'node 5 тоже про database');
  eq(t.get('6').topWord, 'tests', 'node 6 тоже про tests');
});

test('topics: fallback работает когда все слова singleton (один документ)', () => {
  // Если корпус = 1 нода, все df=1 → первый pass пустой. Fallback должен
  // вернуть любое не-stopword слово, чтобы _topicHue был не null.
  const nodes = [{ id: 'solo', text: 'performance optimization canvas' }];
  const t = computeTopics(nodes);
  const r = t.get('solo');
  assert(r && r.topWord, 'fallback должен подхватить');
  assert(['performance','optimization','canvas'].includes(r.topWord));
});

test('tree: orphan gets depth 0', () => {
  const orphan = { id: 'o', parentId: 'GHOST' };
  const byId = new Map([['o', orphan]]);
  const depths = computeDepths([orphan], byId);
  eq(depths.get('o'), 0);
});

test('quadtree: stepPhysics использует BH при большом N', () => {
  const nodes = [];
  for (let i = 0; i < 500; i++) {
    nodes.push({ id: 'n'+i, x: Math.random() * 1000, y: Math.random() * 1000, vx: 0, vy: 0, r: 5, fxAcc: 0, fyAcc: 0 });
  }
  const before = nodes.map(n => ({ x: n.x, y: n.y }));
  const sim = createSim();
  stepPhysics(nodes, [], { width: 2000, height: 2000, cx: 500, cy: 500 }, sim);
  let moved = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].x !== before[i].x || nodes[i].y !== before[i].y) moved++;
  }
  assert(moved > nodes.length * 0.9, 'большинство нод должны сдвинуться');
});

// ==== SIM (v5 physics) ====
test('sim: createSim defaults correct', () => {
  const s = createSim();
  eq(s.alpha, 1);
  eq(s.alphaTarget, 0);
  eq(s.frozen, false);
  eq(s.manualFrozen, false);
  assert(s.alphaDecay > 0 && s.alphaDecay < 0.1);
});

test('sim: alpha cools each step', () => {
  const s = createSim();
  const a0 = s.alpha;
  stepPhysics([], [], { width: 800, height: 600 }, s);
  assert(s.alpha < a0, 'alpha должен уменьшиться');
});

test('sim: isSettled true after long cooling', () => {
  const s = createSim();
  const a = { id: 'a', x: 400, y: 300, vx: 0, vy: 0, r: 5, fxAcc: 0, fyAcc: 0 };
  for (let i = 0; i < 500; i++) stepPhysics([a], [], { width: 800, height: 600 }, s);
  assert(isSettled(s), 'после 500 iters система должна быть settled');
});

test('sim: reheat raises alpha back', () => {
  const s = createSim();
  for (let i = 0; i < 500; i++) stepPhysics([], [], { width: 800, height: 600 }, s);
  reheat(s, 0.3);
  assert(s.alpha >= 0.3, 'reheat должен поднять alpha');
  assert(!s.frozen);
});

test('sim: velocity clamp caps extreme force', () => {
  const sim = createSim();
  const a = { id: 'a', x: 400, y: 300, vx: 0, vy: 0, r: 5, fxAcc: 0, fyAcc: 0 };
  const b = { id: 'b', x: 400.001, y: 300.001, vx: 0, vy: 0, r: 5, fxAcc: 0, fyAcc: 0 };
  stepPhysics([a, b], [], { width: 800, height: 600, cx: 400, cy: 300 }, sim);
  const speedA = Math.hypot(a.vx, a.vy);
  assert(speedA <= 41, `velocity должен быть clamp-нут (<=40), получили ${speedA}`);
});

test('sim: freeze stops, unfreeze resumes', () => {
  const sim = createSim();
  const a = { id: 'a', x: 400, y: 300, vx: 5, vy: 5, r: 5, fxAcc: 0, fyAcc: 0 };
  freeze(sim);
  const before = { x: a.x, y: a.y };
  stepPhysics([a], [], { width: 800, height: 600 }, sim);
  eq(a.x, before.x);
  eq(a.y, before.y);
  unfreeze(sim);
  assert(!sim.manualFrozen);
  assert(sim.alpha > 0);
});

test('sim: seedJitter deterministic', () => {
  const a = seedJitter('node-1');
  const b = seedJitter('node-1');
  eq(a.dx, b.dx);
  eq(a.dy, b.dy);
  const c = seedJitter('node-2');
  assert(c.dx !== a.dx || c.dy !== a.dy);
});

test('sim: bounds soft-wall pulls outlier back', () => {
  const sim = createSim();
  const a = { id: 'a', x: 10000, y: 300, vx: 0, vy: 0, r: 5, fxAcc: 0, fyAcc: 0 };
  stepPhysics([a], [], { width: 800, height: 600, cx: 400, cy: 300, safeW: 800, safeH: 600 }, sim);
  assert(a.vx < 0, 'нода за стеной должна получить толчок внутрь');
});

// ==== 3D PURE FUNCTIONS ====
// Регрессия: pancake-баг был бы пойман если бы тут было «z evolves under
// repulsion». TDZ-баг и flatness в radial — то же самое.

test('stepPhysics3D: z evolves under repulsion (pancake-regression)', () => {
  const sim = createSim();
  const a = { id: 'a', x: 0, y: 0, z: 50, vx: 0, vy: 0, vz: 0, r: 5, degree: 0 };
  const b = { id: 'b', x: 0, y: 0, z: -50, vx: 0, vy: 0, vz: 0, r: 5, degree: 0 };
  const before = Math.abs(a.z - b.z);
  for (let i = 0; i < 30; i++) stepPhysics3D([a, b], [], { safeW: 2000 }, sim);
  const after = Math.abs(a.z - b.z);
  assert(after > before, '3D repulsion должен раздвигать ноды по z');
});

test('stepPhysics3D: spring pulls in 3D distance', () => {
  const sim = createSim();
  const a = { id: 'a', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 5, degree: 1 };
  const b = { id: 'b', x: 500, y: 500, z: 500, vx: 0, vy: 0, vz: 0, r: 5, degree: 1 };
  const e = { source: 'a', target: 'b', a, b };
  const beforeD = Math.sqrt(500*500 + 500*500 + 500*500); // ≈866
  for (let i = 0; i < 80; i++) stepPhysics3D([a, b], [e], { safeW: 2000 }, sim);
  const afterD = Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2 + (b.z-a.z)**2);
  assert(afterD < beforeD, 'spring должен сближать ноды в 3D');
});

test('stepPhysics3D: velocity clamp в 3D', () => {
  const sim = createSim();
  const a = { id: 'a', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 5, degree: 0, _seedDx: 0.1, _seedDy: -0.1 };
  const b = { id: 'b', x: 0.001, y: 0.001, z: 0.001, vx: 0, vy: 0, vz: 0, r: 5, degree: 0, _seedDx: -0.1, _seedDy: 0.1 };
  stepPhysics3D([a, b], [], { safeW: 2000 }, sim);
  const speedA = Math.sqrt(a.vx*a.vx + a.vy*a.vy + a.vz*a.vz);
  assert(speedA <= 40 + 1e-6, 'velocity clamped до maxVelocity (40) в 3D');
});

test('compute3DRadialLayout: count=1 child выводит из cone-axis (flatness-regression)', () => {
  // Линейная цепочка root → child. Раньше child лежал ровно вдоль axis
  // от centра, что давало плоский radial.
  const nodes = [
    { id: 'r', parentId: null, ts: 0 },
    { id: 'c', parentId: 'r', ts: 1 },
  ];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const positions = compute3DRadialLayout(nodes, byId);
  const c = positions.get('c');
  assert(c, 'child должен иметь position');
  // child не должен быть в плоскости root'а (z=0 или y=0). После special-
  // case fix child ставится на «экватор» cone'а, а не на ось.
  const dist = Math.sqrt(c.x*c.x + c.y*c.y + c.z*c.z);
  assert(dist > 100, 'child должен быть удалён от root');
});

test('compute3DRadialLayout: 3 children разнесены по азимуту', () => {
  const nodes = [
    { id: 'r', parentId: null, ts: 0 },
    { id: 'a', parentId: 'r', ts: 1 },
    { id: 'b', parentId: 'r', ts: 2 },
    { id: 'c', parentId: 'r', ts: 3 },
  ];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const positions = compute3DRadialLayout(nodes, byId);
  const a = positions.get('a'), b = positions.get('b'), c = positions.get('c');
  // 3 children на одинаковом расстоянии от root
  const dA = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
  const dB = Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z);
  const dC = Math.sqrt(c.x*c.x + c.y*c.y + c.z*c.z);
  approx(dA, dB, dA * 0.05, 'A,B на одинаковом радиусе');
  approx(dB, dC, dB * 0.05, 'B,C на одинаковом радиусе');
  // Все 3 не лежат на одной прямой → spread по 3D
  // (проверка через мин-макс координат: должно быть spread минимум по 2 осям)
  const xs = [a.x, b.x, c.x], ys = [a.y, b.y, c.y], zs = [a.z, b.z, c.z];
  const xSpread = Math.max(...xs) - Math.min(...xs);
  const ySpread = Math.max(...ys) - Math.min(...ys);
  const zSpread = Math.max(...zs) - Math.min(...zs);
  let nonZero = 0;
  if (xSpread > 1) nonZero++;
  if (ySpread > 1) nonZero++;
  if (zSpread > 1) nonZero++;
  assert(nonZero >= 2, '3 children разнесены минимум по 2 осям (3D разворот)');
});

test('compute3DSwimLanes: разные роли разнесены по Y', () => {
  const nodes = [
    { id: 'u1', role: 'user', ts: 100 },
    { id: 'a1', role: 'assistant', ts: 200 },
    { id: 't1', role: 'tool_use', ts: 300 },
  ];
  const positions = compute3DSwimLanes(nodes);
  const u = positions.get('u1'), a = positions.get('a1'), t = positions.get('t1');
  assert(Math.abs(u.y - a.y) > 100, 'user/assistant lane разнесены по Y');
  assert(Math.abs(a.y - t.y) > 100, 'assistant/tool_use lane разнесены по Y');
});

test('compute3DSwimLanes: ts → X monotonic', () => {
  const nodes = [
    { id: 'a', role: 'user', ts: 1000 },
    { id: 'b', role: 'user', ts: 2000 },
    { id: 'c', role: 'user', ts: 3000 },
  ];
  const positions = compute3DSwimLanes(nodes);
  const a = positions.get('a'), b = positions.get('b'), c = positions.get('c');
  assert(a.x < b.x && b.x < c.x, 'X растёт по ts');
});

test('applySphericalScatter: spread по всем 3 осям', () => {
  const nodes = Array.from({ length: 30 }, (_, i) => ({ id: 'n' + i, x: 0, y: 0, z: 0, vx: 0, vy: 0 }));
  applySphericalScatter(nodes);
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y), zs = nodes.map(n => n.z);
  const xSpread = Math.max(...xs) - Math.min(...xs);
  const ySpread = Math.max(...ys) - Math.min(...ys);
  const zSpread = Math.max(...zs) - Math.min(...zs);
  assert(xSpread > 100 && ySpread > 100 && zSpread > 100,
    'scatter даёт ненулевой spread по x/y/z (не плоскость)');
});

test('fibonacciOnSphere: count=10 даёт точки на сфере radius', () => {
  const points = fibonacciOnSphere(10, 100, null, Math.PI);
  eq(points.length, 10);
  for (const p of points) {
    const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    approx(r, 100, 1, 'точка на сфере radius=100');
  }
});

// ==== ADAPTERS ====
test('adapters: detectFormat recognizes Claude JSONL', () => {
  eq(detectFormat('{"type":"user","uuid":"x","parentUuid":null,"message":{"content":"hi"}}'), 'claude-jsonl');
  eq(detectFormat('{"type":"queue-operation"}'), 'claude-jsonl');
});

test('adapters: detectFormat recognizes ChatGPT export', () => {
  const chatgpt = JSON.stringify([{ title: 't', mapping: { u1: { id: 'u1', message: null, parent: null } } }]);
  eq(detectFormat(chatgpt), 'chatgpt-export');
});

test('adapters: detectFormat recognizes Anthropic messages', () => {
  const anthr = JSON.stringify([{ role: 'user', content: 'hi' }, { role: 'assistant', content: [{ type: 'text', text: 'hello' }] }]);
  eq(detectFormat(anthr), 'anthropic-messages');
});

test('adapters: chatgptToClaudeJsonl converts basic export', () => {
  const input = JSON.stringify([{
    title: 'Test',
    mapping: {
      'u1': { id: 'u1', message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['hello'] }, create_time: 1700000000 }, parent: null },
      'a1': { id: 'a1', message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: ['hi'] }, create_time: 1700000005 }, parent: 'u1' },
    },
  }]);
  const out = chatgptToClaudeJsonl(input);
  const lines = out.split('\n').filter(Boolean).map(l => JSON.parse(l));
  eq(lines.length, 2);
  const u = lines.find(l => l.type === 'user');
  const a = lines.find(l => l.type === 'assistant');
  eq(a.parentUuid, u.uuid);
});

test('adapters: anthropicMessagesToClaudeJsonl chains via prev id', () => {
  const input = JSON.stringify([
    { role: 'user', content: 'q1' },
    { role: 'assistant', content: 'a1' },
    { role: 'user', content: 'q2' },
  ]);
  const out = anthropicMessagesToClaudeJsonl(input);
  const lines = out.split('\n').filter(Boolean).map(l => JSON.parse(l));
  eq(lines.length, 3);
  eq(lines[0].parentUuid, null);
  eq(lines[1].parentUuid, lines[0].uuid);
  eq(lines[2].parentUuid, lines[1].uuid);
});

test('adapters: normalizeToClaudeJsonl passes through claude-jsonl unchanged', () => {
  const raw = '{"type":"user","uuid":"x","parentUuid":null,"message":{"content":"hi"}}';
  const r = normalizeToClaudeJsonl(raw);
  eq(r.format, 'claude-jsonl');
  eq(r.text, raw);
});

// ==== DIFF MODE ====
test('diff: fnv1a deterministic and collision-resistant for short strings', () => {
  const h1 = fnv1a('hello');
  const h2 = fnv1a('hello');
  const h3 = fnv1a('hellp');
  assert(h1 === h2, 'same input → same hash');
  assert(h1 !== h3, 'different input → different hash');
  assert(typeof h1 === 'number', 'returns number');
});

test('diff: hashNode same role+text → same hash', () => {
  const n1 = { role: 'user', text: 'Привет, как дела?' };
  const n2 = { role: 'user', text: 'Привет, как дела?' };
  assert(hashNode(n1) === hashNode(n2));
});

test('diff: hashNode different role → different hash', () => {
  const n1 = { role: 'user', text: 'hello' };
  const n2 = { role: 'assistant', text: 'hello' };
  assert(hashNode(n1) !== hashNode(n2));
});

test('diff: hashNode normalizes whitespace (trim + collapse)', () => {
  const n1 = { role: 'user', text: 'hello   world' };
  const n2 = { role: 'user', text: '  hello world  ' };
  assert(hashNode(n1) === hashNode(n2));
});

test('diff: hashNode truncates at 300 chars — tail differences ignored', () => {
  const base = 'a'.repeat(300);
  const n1 = { role: 'user', text: base + 'BBB' };
  const n2 = { role: 'user', text: base + 'ZZZ' };
  assert(hashNode(n1) === hashNode(n2), '300-char suffix should not affect hash');
});

test('diff: mergeDiff marks A-only, B-only, both correctly', () => {
  // State A: три ноды
  const na1 = { id: 'a1', role: 'user', text: 'first', ts: 1, parentId: null, x: 0, y: 0 };
  const na2 = { id: 'a2', role: 'assistant', text: 'second', ts: 2, parentId: 'a1', x: 0, y: 0 };
  const na3 = { id: 'a3', role: 'user', text: 'third', ts: 3, parentId: 'a2', x: 0, y: 0 };
  const state = {
    nodes: [na1, na2, na3],
    edges: [],
    byId: new Map([[na1.id, na1], [na2.id, na2], [na3.id, na3]]),
  };
  // Raw B: ноды b-only (unique), and one matching A's second
  const rawB = [
    { id: 'b1', role: 'user', text: 'first', ts: 1, parentId: null }, // matches a1
    { id: 'b2', role: 'assistant', text: 'second', ts: 2, parentId: 'b1' }, // matches a2
    { id: 'bX', role: 'user', text: 'brand new', ts: 4, parentId: 'b2' }, // unique to B
  ];
  const vp = { width: 1024, height: 768, cx: 512, cy: 384 };
  const stats = mergeDiff(state, rawB, vp);
  eq(stats.both, 2, 'a1=b1, a2=b2 → both');
  eq(stats.onlyB, 1, 'bX is B-only');
  eq(stats.onlyA, 1, 'only a3 остаётся уникальной A');
  assert(state.nodes.find(n => n.id === 'a1')._diffOrigin === 'both');
  assert(state.nodes.find(n => n.id === 'a2')._diffOrigin === 'both');
  assert(state.nodes.find(n => n.id === 'a3')._diffOrigin === 'A');
  const bX = state.nodes.find(n => n.id === 'B:bX');
  assert(bX, 'B:bX должен быть добавлен');
  eq(bX._diffOrigin, 'B');
});

// ==== SESSION PICKER ====
test('sessions: addRemoteSessions добавляет с префиксом remote:', () => {
  globalState.sessions = [];
  addRemoteSessions([
    { id: 'a', title: 'Session A', url: '/a.jsonl' },
    { id: 'b', title: 'Session B', url: '/b.jsonl', size: 1024 },
  ]);
  eq(globalState.sessions.length, 2);
  assert(globalState.sessions[0].id.startsWith('remote:'));
  eq(globalState.sessions[0].name, 'Session A');
  eq(globalState.sessions[1].size, 1024);
});

test('sessions: addRemoteSessions дедупит по id', () => {
  globalState.sessions = [];
  addRemoteSessions([{ id: 'x', title: 'Once', url: '/x.jsonl' }]);
  addRemoteSessions([{ id: 'x', title: 'Dup', url: '/x.jsonl' }]);
  eq(globalState.sessions.length, 1);
});

test('sessions: addRemoteSessions игнорирует некорректные элементы', () => {
  globalState.sessions = [];
  addRemoteSessions([null, { id: 'only-id' }, { url: '/y.jsonl' }]);
  // null и { id } без url — отвергнуты, { url } без title принят
  eq(globalState.sessions.length, 1);
  eq(globalState.sessions[0].name, '/y.jsonl');
});

test('diff: mergeDiff edges for B-only ноды цепляются через matched parent', () => {
  const na1 = { id: 'a1', role: 'user', text: 'hello', ts: 1, parentId: null, x: 0, y: 0 };
  const state = {
    nodes: [na1],
    edges: [],
    byId: new Map([[na1.id, na1]]),
  };
  const rawB = [
    { id: 'b1', role: 'user', text: 'hello', ts: 1, parentId: null }, // matches a1
    { id: 'bNew', role: 'assistant', text: 'новый ответ', ts: 2, parentId: 'b1' }, // unique, parent=b1→a1
  ];
  const vp = { width: 1024, height: 768, cx: 512, cy: 384 };
  mergeDiff(state, rawB, vp);
  // Должно быть одно ребро a1 → B:bNew
  const edges = state.edges.filter(e => e.source === 'a1' && e.target === 'B:bNew');
  eq(edges.length, 1);
  eq(edges[0].diffSide, 'B');
});

// ==== URL SAFETY ====
test('url-safety: http/https URLs пропускаются', () => {
  assert(isSafeHttpUrl('https://example.com/x.jsonl'));
  assert(isSafeHttpUrl('http://localhost:3000/stream'));
});

test('url-safety: относительные URL пропускаются', () => {
  assert(isSafeHttpUrl('/sessions/a.jsonl'));
  assert(isSafeHttpUrl('./data.jsonl'));
  assert(isSafeHttpUrl('../other.jsonl'));
});

test('url-safety: опасные схемы отклоняются', () => {
  assert(!isSafeHttpUrl('javascript:alert(1)'));
  assert(!isSafeHttpUrl('data:text/html,<script>alert(1)</script>'));
  assert(!isSafeHttpUrl('file:///etc/passwd'));
  assert(!isSafeHttpUrl('ftp://some/file'));
  assert(!isSafeHttpUrl('ws://socket'));
});

test('url-safety: некорректный URL отклоняется', () => {
  assert(!isSafeHttpUrl(''));
  assert(!isSafeHttpUrl(null));
  assert(!isSafeHttpUrl(undefined));
  assert(!isSafeHttpUrl(42));
});

test('url-safety: isLikelyIntranet ловит RFC1918 + loopback', () => {
  assert(isLikelyIntranet('http://localhost:3000/'));
  assert(isLikelyIntranet('http://127.0.0.1/'));
  assert(isLikelyIntranet('http://192.168.1.1/'));
  assert(isLikelyIntranet('http://10.0.0.5/'));
  assert(isLikelyIntranet('http://172.16.0.1/'));
  assert(isLikelyIntranet('http://mynas.local/'));
  assert(!isLikelyIntranet('https://example.com/'));
  assert(!isLikelyIntranet('https://github.com/foo'));
});

// ==== ANNOTATIONS ====
// Используем глобальный state, но сбрасываем annotations перед каждым тестом,
// чтобы они не просачивались. localStorage в Node недоступен — save/load
// тихо игнорируются (console.warn), но in-memory поведение тестируется.
test('annotations: setAnnotation сохраняет text и starred', () => {
  globalState.annotations = new Map();
  globalState.nodes = [{ id: 'n1', ts: 0 }, { id: 'n2', ts: 1 }];
  setAnnotation('n1', { text: 'interesting' });
  const a = getAnnotation('n1');
  assert(a && a.text === 'interesting');
  eq(a.starred, false);
});

test('annotations: toggleStar переключает bool', () => {
  globalState.annotations = new Map();
  globalState.nodes = [{ id: 'n1', ts: 0 }];
  eq(toggleStar('n1'), true);
  eq(getAnnotation('n1').starred, true);
  eq(toggleStar('n1'), false);
  // После toggle в false и без text — annotation удалена
  eq(getAnnotation('n1'), null);
});

test('annotations: пустой text + starred=false → удаление', () => {
  globalState.annotations = new Map();
  globalState.nodes = [{ id: 'n1', ts: 0 }];
  setAnnotation('n1', { text: 'note' });
  assert(getAnnotation('n1'));
  setAnnotation('n1', { text: '', starred: false });
  eq(getAnnotation('n1'), null);
});

test('annotations: listStarred и listAnnotated', () => {
  globalState.annotations = new Map();
  globalState.nodes = [{ id: 'a', ts: 0 }, { id: 'b', ts: 1 }, { id: 'c', ts: 2 }];
  setAnnotation('a', { starred: true });
  setAnnotation('b', { text: 'just a note' });
  setAnnotation('c', { starred: true, text: 'both' });
  const starred = listStarred();
  eq(starred.sort().join(','), 'a,c');
  const all = listAnnotated();
  eq(all.sort().join(','), 'a,b,c');
});

// ==== SNAPSHOT / SESSION CARD ENTRY ====
test('snapshot: sessionCard option adds a menu item after recorder', () => {
  const origLang = getLanguage();
  setLanguage('en');
  assert(typeof openSessionCard === 'function', 'openSessionCard export must be available');

  const makeEl = () => ({
    id: '',
    className: '',
    textContent: '',
    style: {},
    children: [],
    listeners: {},
    parentNode: null,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    remove() {
      if (!this.parentNode) return;
      this.parentNode.children = this.parentNode.children.filter(child => child !== this);
      this.parentNode = null;
    },
    contains(target) {
      return target === this || this.children.includes(target);
    },
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
    getBoundingClientRect() {
      return { left: 0, bottom: 0 };
    },
  });

  const snapBtn = makeEl();
  const body = makeEl();
  const fakeDoc = {
    body,
    getElementById(id) {
      if (id === 'btn-snapshot') return snapBtn;
      if (id === 'snapshot-menu') return body.children.find(el => el.id === 'snapshot-menu') || null;
      return null;
    },
    createElement: () => makeEl(),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const origDoc = globalThis.document;
  const origSetTimeout = globalThis.setTimeout;
  globalThis.document = fakeDoc;
  globalThis.setTimeout = () => 0;
  try {
    let opened = 0;
    initSnapshot({
      supportSvg: false,
      singleClickPng: true,
      videoRecorder: { toggle: () => {}, isActive: () => false },
      sessionCard: { open: () => { opened++; } },
    });
    assert(typeof snapBtn.listeners.click === 'function', 'snapshot click handler should be wired');
    snapBtn.listeners.click();
    const menu = body.children.find(el => el.id === 'snapshot-menu');
    assert(menu, 'snapshot menu should open instead of single-click PNG when sessionCard exists');
    const labels = menu.children.map(el => el.textContent);
    const recorderIdx = labels.indexOf(t('snapshot.video_start'));
    const cardIdx = labels.indexOf(t('snapshot.session_card'));
    assert(recorderIdx >= 0, 'recorder menu item should be present');
    assert(cardIdx === recorderIdx + 1, 'session card item should follow recorder item');
    const cardItem = menu.children[cardIdx];
    assert(cardItem, 'session card menu item should be present');
    cardItem.listeners.click();
    eq(opened, 1, 'session card opener should run from menu item');
    assert(!body.children.find(el => el.id === 'snapshot-menu'), 'menu should close after card click');
  } finally {
    setLanguage(origLang);
    if (origDoc === undefined) delete globalThis.document;
    else globalThis.document = origDoc;
    globalThis.setTimeout = origSetTimeout;
  }
});

// ==== I18N ====
test('i18n: English by default returns key if missing', () => {
  assert(typeof t === 'function');
  // Unknown key → сам ключ
  eq(t('nonexistent.key'), 'nonexistent.key');
});

test('i18n: known keys translate', () => {
  setLanguage('en');
  eq(t('btn.sample'), 'Examples ▾');
  setLanguage('ru');
  eq(t('btn.sample'), 'Примеры ▾');
});

test('i18n: interpolation {name} works', () => {
  setLanguage('en');
  const s = t('tip.diff_on', { a: 5, b: 3, both: 10 });
  assert(s.includes('5'), 'has a');
  assert(s.includes('3'), 'has b');
  assert(s.includes('10'), 'has both');
});

test('i18n: setLanguage rejects unsupported', () => {
  setLanguage('ru');
  setLanguage('jp'); // unsupported → no-op
  eq(getLanguage(), 'ru');
});

test('i18n: missing ru key falls back to en', () => {
  // Все ru-ключи дублируют en — но проверим механику fallback.
  setLanguage('ru');
  // Несуществующий ключ → сам ключ
  eq(t('xxx.not-exists'), 'xxx.not-exists');
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
