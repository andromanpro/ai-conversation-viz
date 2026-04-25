// Stress benchmark for v5 physics. Запускается через `npm run bench`.
//
// Цель:
//   1. Сгенерировать tree из 2000 нод (branching=3, depth=7)
//   2. Прогнать 600 кадров stepPhysics(nodes, edges, vp, sim)
//   3. Зафиксировать p95 frame, sim.alpha trajectory, max velocity, bbox stability
//
// Acceptance:
//   • p95 frame ≤ 8 ms (на budget 16 ms при 60 fps)
//   • sim.alpha < 0.01 после 300 итераций
//   • max(|vx|,|vy|) никогда не превышает CFG.maxVelocity (с epsilon)
//   • |bbox(300) − bbox(600)| < 2 px (граф не "плывёт" после settle)
//
// Bench не падает с non-zero exit code если acceptance не выполнен —
// печатает PASS/FAIL по каждому критерию + общий summary. Это нужно
// чтобы можно было запустить `npm run bench` для performance-снепшота
// без ломания CI.

import { CFG } from '../src/core/config.js';
import { createSim, stepPhysics, computeBBox, seedJitter } from '../src/core/layout.js';
import { buildGraph } from '../src/core/graph.js';

// ---------- генератор синтетического tree ----------

function generateTree(branching, depth) {
  // Полное дерево: branching^depth узлов в листьях.
  // Для branching=3, depth=7: 3^7 = 2187 leaves; всего ≈ 3279 нод.
  // Возьмём depth=6 для ~1093 leaf + 364 inner = 1457 нод; или
  // branching=3, depth=7 даёт 3279 — много. Для 2000 берём
  // branching=4, depth=5: 4^5 = 1024 leaf + 341 inner ≈ 1365.
  // Для round 2000: branching=3, depth=7 + cut last layer наполовину.
  // Простейший подход — собрать BFS до достижения 2000.
  const TARGET = 2000;
  const nodes = [];
  let nextId = 0;
  const root = { id: 'n' + nextId++, parentId: null, role: 'user', ts: 0, text: 'root message goes here', textLen: 22 };
  nodes.push(root);
  let frontier = [root];
  let curDepth = 0;
  while (nodes.length < TARGET && curDepth < depth) {
    const nextFrontier = [];
    for (const parent of frontier) {
      for (let i = 0; i < branching; i++) {
        if (nodes.length >= TARGET) break;
        const role = (curDepth % 2 === 0) ? 'assistant' : 'user';
        const text = role + ' message at depth ' + (curDepth + 1) + ' index ' + i;
        const node = {
          id: 'n' + nextId++,
          parentId: parent.id,
          role,
          ts: nodes.length, // монотонно
          text,
          textLen: text.length,
        };
        nodes.push(node);
        nextFrontier.push(node);
        if (nodes.length >= TARGET) break;
      }
      if (nodes.length >= TARGET) break;
    }
    frontier = nextFrontier;
    curDepth++;
  }
  return nodes;
}

// ---------- benchmark runner ----------

function pct(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

function fmt(ms) {
  return ms.toFixed(2) + ' ms';
}

function maxAbsV(nodes) {
  let m = 0;
  for (const n of nodes) {
    if (Math.abs(n.vx) > m) m = Math.abs(n.vx);
    if (Math.abs(n.vy) > m) m = Math.abs(n.vy);
  }
  return m;
}

function bboxDelta(b1, b2) {
  return (
    Math.abs(b1.minX - b2.minX) +
    Math.abs(b1.minY - b2.minY) +
    Math.abs(b1.maxX - b2.maxX) +
    Math.abs(b1.maxY - b2.maxY)
  ) / 4;
}

async function main() {
  console.log('=== ai-conversation-viz bench (v5 physics) ===\n');

  const rawNodes = generateTree(3, 7);
  console.log('generated tree: ' + rawNodes.length + ' nodes');
  const parsed = { nodes: rawNodes, stats: {} };
  const vp = { width: 1920, height: 1080, safeW: 1700, safeH: 850, cx: 960, cy: 540 };
  const g = buildGraph(parsed, vp);
  console.log('built graph:    ' + g.nodes.length + ' nodes, ' + g.edges.length + ' edges');

  // Seed deterministic jitter (graph.js делает это в createPhysicsNode, но
  // подстрахуемся для bench-результатов).
  for (const n of g.nodes) {
    if (n._seedDx == null) {
      const s = seedJitter(n.id);
      n._seedDx = s.dx;
      n._seedDy = s.dy;
    }
  }

  const sim = createSim();
  const TOTAL_FRAMES = 600;
  const frameTimes = [];
  const alphaTrace = [];
  let maxV = 0;
  let bboxAt300 = null;
  let bboxAt600 = null;
  let alphaUnder001At = -1;
  let maxVelOverflow = false;

  console.log('\nrunning ' + TOTAL_FRAMES + ' frames...\n');
  const wall0 = performance.now();

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t0 = performance.now();
    stepPhysics(g.nodes, g.edges, vp, sim);
    const dt = performance.now() - t0;
    frameTimes.push(dt);
    alphaTrace.push(sim.alpha);

    const v = maxAbsV(g.nodes);
    if (v > maxV) maxV = v;
    if (v > CFG.maxVelocity + 1e-3) maxVelOverflow = true;

    if (alphaUnder001At < 0 && sim.alpha < 0.01) alphaUnder001At = i;
    if (i + 1 === 300) bboxAt300 = computeBBox(g.nodes);
    if (i + 1 === 600) bboxAt600 = computeBBox(g.nodes);
  }

  const wallTotal = performance.now() - wall0;

  // ---------- report ----------

  const p50 = pct(frameTimes, 0.5);
  const p95 = pct(frameTimes, 0.95);
  const p99 = pct(frameTimes, 0.99);
  const maxFrame = Math.max(...frameTimes);
  const sumFrame = frameTimes.reduce((a, b) => a + b, 0);

  console.log('=== timings ===');
  console.log('  total wall:    ' + fmt(wallTotal));
  console.log('  total physics: ' + fmt(sumFrame));
  console.log('  p50 frame:     ' + fmt(p50));
  console.log('  p95 frame:     ' + fmt(p95));
  console.log('  p99 frame:     ' + fmt(p99));
  console.log('  max frame:     ' + fmt(maxFrame));

  console.log('\n=== sim ===');
  console.log('  final alpha:           ' + sim.alpha.toExponential(3));
  console.log('  alpha < 0.01 after:    ' + (alphaUnder001At >= 0 ? alphaUnder001At + ' iter' : 'NEVER (within ' + TOTAL_FRAMES + ')'));
  console.log('  alpha[100]:            ' + alphaTrace[99].toExponential(3));
  console.log('  alpha[300]:            ' + alphaTrace[299].toExponential(3));
  console.log('  alpha[600]:            ' + alphaTrace[599].toExponential(3));
  console.log('  frozen?                ' + sim.frozen);

  console.log('\n=== motion ===');
  console.log('  max |v|:               ' + maxV.toFixed(3) + ' (cap = ' + CFG.maxVelocity + ')');
  console.log('  velocity overflow?     ' + maxVelOverflow);

  let stabDelta = -1;
  if (bboxAt300 && bboxAt600) {
    stabDelta = bboxDelta(bboxAt300, bboxAt600);
    console.log('\n=== stability ===');
    console.log('  bbox @300:             [' + bboxAt300.minX.toFixed(0) + ',' + bboxAt300.minY.toFixed(0) + ' .. ' + bboxAt300.maxX.toFixed(0) + ',' + bboxAt300.maxY.toFixed(0) + ']');
    console.log('  bbox @600:             [' + bboxAt600.minX.toFixed(0) + ',' + bboxAt600.minY.toFixed(0) + ' .. ' + bboxAt600.maxX.toFixed(0) + ',' + bboxAt600.maxY.toFixed(0) + ']');
    console.log('  avg edge delta:        ' + stabDelta.toFixed(3) + ' px');
  }

  // ---------- acceptance ----------

  console.log('\n=== acceptance ===');
  const checks = [
    { name: 'p95 frame ≤ 8 ms',           pass: p95 <= 8.0,                       got: fmt(p95) },
    { name: 'alpha < 0.01 after ≤ 300',   pass: alphaUnder001At >= 0 && alphaUnder001At <= 300, got: alphaUnder001At + ' iter' },
    { name: 'no velocity overflow',        pass: !maxVelOverflow,                  got: maxV.toFixed(2) + ' / ' + CFG.maxVelocity },
    { name: 'bbox stable (Δ < 2 px)',     pass: stabDelta >= 0 && stabDelta < 2,  got: stabDelta.toFixed(3) + ' px' },
  ];
  let allPass = true;
  for (const c of checks) {
    const sym = c.pass ? '✓' : '✗';
    if (!c.pass) allPass = false;
    console.log('  ' + sym + ' ' + c.name + ' — ' + c.got);
  }

  console.log('\n' + (allPass ? '✓ ALL ACCEPTANCE CHECKS PASS' : '✗ some checks failed (see above)'));
}

main().catch((e) => {
  console.error('bench crashed:', e);
  process.exit(1);
});
