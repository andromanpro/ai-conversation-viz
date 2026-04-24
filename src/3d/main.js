// 3D-рендерер, переиспользующий 2D state/core/ui модули.
// Three.js заменяет только визуальный слой — физика, timeline, story-mode,
// speed, phone и пр. работают ровно как в 2D.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { CFG } from '../core/config.js';
import { state } from '../view/state.js';
import { parseJSONL } from '../core/parser.js';
import { buildGraph } from '../core/graph.js';
import { prewarm, stepPhysics, createSim } from '../core/layout.js';
import { SAMPLE_JSONL } from '../core/sample.js';
import { normalizeToClaudeJsonl } from '../core/adapters.js';
import { computeDepths } from '../core/tree.js';
import { toolIcon } from '../view/tool-icons.js';
import { birthFactor, easeOutCubic } from '../view/renderer.js';

import { initStory, tickStory, resetStory } from '../ui/story-mode.js';
import { initTimeline, tickPlay, isPlaying } from '../ui/timeline.js';
import { initSpeedControl } from '../ui/speed-control.js';
import { initFreezeToggle } from '../ui/freeze-toggle.js';
import { initFilter } from '../ui/filter.js';
import { initStats, tickStats, recomputeStats } from '../ui/stats-hud.js';
import { initSearch, matchNodes } from '../ui/search.js';
import { initTopicsToggle } from '../ui/topics-toggle.js';
import { initThemeToggle } from '../ui/theme-toggle.js';
import { initOrphansToggle } from '../ui/orphans-toggle.js';
import { hueToRgbaString } from '../view/topics.js';

const ROLE_COLORS = {
  user: 0x7baaf0,
  assistant: 0x50d4b5,
  tool_use: 0xeca040,
};

// Diff-режим: те же цвета, что и в 2D renderer (A=pink, B=cyan, both=gray)
const DIFF_COLORS = {
  A: 0xff60af,
  B: 0x5ad2ff,
  both: 0xc8c8d6,
};

// Возвращает {color, emissive} для ноды с учётом topics/diff-режима.
const _tmpColor = new THREE.Color();
function colorForNode(n) {
  if (state.diffMode && n._diffOrigin) {
    const c = DIFF_COLORS[n._diffOrigin] || 0x888888;
    return { color: c, emissive: c };
  }
  if (state.topicsMode && n._topicHue != null) {
    _tmpColor.setHSL(n._topicHue, 0.7, 0.55);
    const hex = _tmpColor.getHex();
    return { color: hex, emissive: hex };
  }
  const c = ROLE_COLORS[n.role] || 0x888888;
  return { color: c, emissive: c };
}

// ---- Scene ----
const container = document.getElementById('three-container');
const infoEl = document.getElementById('info');
const statsEl = document.getElementById('stats');
const fileInput = document.getElementById('file-input');
const btnFile = document.getElementById('btn-file');
const btnSample = document.getElementById('btn-sample');

const scene = new THREE.Scene();
const DARK_BG = 0x0a0e1a;
const LIGHT_BG = 0xeef2f7;
scene.background = new THREE.Color(DARK_BG);
scene.fog = new THREE.Fog(DARK_BG, 1800, 8000);

function applyThemeToScene() {
  const theme = document.documentElement.dataset.theme || 'dark';
  const bg = theme === 'light' ? LIGHT_BG : DARK_BG;
  scene.background.setHex(bg);
  scene.fog.color.setHex(bg);
}
// Наблюдаем за изменениями атрибута (theme-toggle пишет data-theme)
const _themeObserver = new MutationObserver(applyThemeToScene);
_themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 8000);
camera.position.set(0, -300, 1200);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Освещение: ambient → hemi → key + rim. Hemi даёт мягкую градацию сверху-снизу
// (синий небесный / тёплый пол), что добавляет объём без резких бликов.
scene.add(new THREE.AmbientLight(0x4a5a8a, 0.5));
const hemiLight = new THREE.HemisphereLight(0x9ab8ff, 0x2a1a10, 0.55);
scene.add(hemiLight);
const keyLight = new THREE.PointLight(0x9ac0ff, 2.2, 5000);
keyLight.position.set(600, 600, 1000);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x50d4b5, 1.2, 3500);
rimLight.position.set(-600, -400, 500);
scene.add(rimLight);

// Starfield
const STAR_COUNT = 2000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  starPos[3*i]   = (Math.random() - 0.5) * 5000;
  starPos[3*i+1] = (Math.random() - 0.5) * 5000;
  starPos[3*i+2] = (Math.random() - 0.5) * 5000;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0xc8dcff, size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.5, fog: false,
})));

const nodesGroup = new THREE.Group();
const edgesGroup = new THREE.Group();
scene.add(nodesGroup);
scene.add(edgesGroup);

// Глобальный LineSegments для всех рёбер — один draw call, обновляемый
// каждый кадр из текущих позиций нод. Гарантирует что рёбра не «отрываются»
// от нод при физическом движении.
let edgesMesh = null;
let edgesPositions = null; // Float32Array
let edgesColors = null;    // Float32Array
let edgesVisibility = null; // per-segment alpha (мультипликативный)

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ---- Geometry pools (reuse) ----
const sphereGeoLarge = new THREE.SphereGeometry(1, 20, 20);
// Более тонкий halo — большая прозрачная sphere с additive blending
const sphereGeoHalo = new THREE.SphereGeometry(1, 16, 16);
const hubRingGeoA = new THREE.TorusGeometry(1.5, 0.08, 8, 40);
const hubRingGeoB = new THREE.TorusGeometry(1.5, 0.08, 8, 40);
const orphanRingGeo = new THREE.TorusGeometry(2.0, 0.06, 6, 28);

// Сегментов на curve ребра — делим ребро на N чтобы получить плавную дугу
const EDGE_SEGMENTS = 10;
// Кэш промежуточных Vector3 для расчёта curve (не аллоцировать в tick)
const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpM = new THREE.Vector3();

// ---- Build scene from state ----
function clearGroups() {
  while (nodesGroup.children.length) {
    const m = nodesGroup.children.pop();
    // Halo/hub-group: рекурсивно освобождаем material
    m.traverse?.((child) => {
      if (child.material && child.material !== m.material) child.material.dispose();
    });
    if (m.material) m.material.dispose();
  }
  while (edgesGroup.children.length) {
    const m = edgesGroup.children.pop();
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
  }
  edgesMesh = null;
  edgesPositions = null;
  edgesColors = null;
}

function buildFromState() {
  clearGroups();
  if (!state.nodes.length) return;

  // Присваиваем z по глубине parent-tree + seed-jitter чтобы ноды на одном
  // уровне не попадали в одну плоскость (тогда граф плоский и не «3D»-шный).
  const depths = computeDepths(state.nodes, state.byId);
  const ringZ = 140;
  for (const n of state.nodes) {
    const d = depths.get(n.id) || 0;
    const jitter = ((n._seedDx || 0) - 0.5) * 100 + ((n._seedDy || 0) - 0.5) * 80;
    n.z = d * ringZ + jitter;
  }

  // Nodes — sphere + halo + (hub/orphan rings)
  for (const n of state.nodes) {
    const { color, emissive } = colorForNode(n);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive,
      emissiveIntensity: 0.65,
      metalness: 0.2, roughness: 0.35,
      transparent: true, opacity: 1,
    });
    const mesh = new THREE.Mesh(sphereGeoLarge, mat);
    mesh.position.set(n.x, -n.y, n.z || 0);
    const baseR = n.r * 1.25;
    mesh.scale.set(baseR, baseR, baseR);
    mesh.userData.node = n;
    nodesGroup.add(mesh);
    n._mesh = mesh;

    // Halo — большая полупрозрачная sphere с additive blending: даёт
    // «свечение» вокруг каждой ноды (имитация bloom без post-processing)
    const haloMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    const halo = new THREE.Mesh(sphereGeoHalo, haloMat);
    halo.position.copy(mesh.position);
    halo.scale.set(baseR * 2.4, baseR * 2.4, baseR * 2.4);
    halo.userData.haloOwner = n;
    nodesGroup.add(halo);
    n._halo = halo;

    // Hub ring — два скрещенных торических кольца («атомная модель»)
    if (n.isHub) {
      const hubGroup = new THREE.Group();
      const hubMat = new THREE.MeshBasicMaterial({
        color: 0xffd778, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      });
      const ringA = new THREE.Mesh(hubRingGeoA, hubMat);
      const ringB = new THREE.Mesh(hubRingGeoB, hubMat);
      ringB.rotation.x = Math.PI / 2; // перпендикулярное кольцо
      hubGroup.add(ringA);
      hubGroup.add(ringB);
      hubGroup.position.copy(mesh.position);
      hubGroup.scale.set(baseR, baseR, baseR);
      hubGroup.userData.hubOwner = n;
      nodesGroup.add(hubGroup);
      n._hubRing = hubGroup;
    }

    // Orphan marker — оранжевое кольцо
    if (n._isOrphanRoot) {
      const orphMat = new THREE.MeshBasicMaterial({
        color: 0xeca040, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      });
      const orphRing = new THREE.Mesh(orphanRingGeo, orphMat);
      orphRing.position.copy(mesh.position);
      orphRing.scale.set(baseR, baseR, baseR);
      orphRing.userData.orphOwner = n;
      nodesGroup.add(orphRing);
      n._orphRing = orphRing;
    }
  }

  // Edges — единый LineSegments с curved-сегментами, обновляемыми каждый кадр.
  // Для каждого ребра выделяем EDGE_SEGMENTS сегментов (EDGE_SEGMENTS*2 точек).
  const segCount = state.edges.length * EDGE_SEGMENTS;
  edgesPositions = new Float32Array(segCount * 2 * 3);
  edgesColors = new Float32Array(segCount * 2 * 3);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(edgesPositions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(edgesColors, 3));
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  edgesMesh = new THREE.LineSegments(geom, mat);
  edgesMesh.frustumCulled = false;
  edgesGroup.add(edgesMesh);

  // Инициализируем buffer первым кадром
  updateEdgeBuffer();

  // Fit camera — ближе чем раньше, без большого offset
  let maxD = 0;
  for (const n of state.nodes) {
    const d = Math.hypot(n.x, n.y, n.z || 0);
    if (d > maxD) maxD = d;
  }
  camera.position.set(0, -maxD * 0.25, maxD * 1.25 + 250);
  controls.target.set(0, 0, 0);
  controls.update();
  updateStats();
}

// Цвет ребра: учитываем diff-режим (edge.diffSide), tool_use, adopted, role
const _edgeColor = new THREE.Color();
function edgeColorHex(e) {
  if (state.diffMode && e.diffSide === 'B') return 0x5ad2ff;
  if (e.adopted) return 0xc8b478;
  if (e.b && e.b.role === 'tool_use') return 0xeca040;
  return 0x00d4ff;
}

/**
 * Перестраивает positions/colors буфер для LineSegments из текущих
 * координат нод. Вызывается каждый кадр — N=edges.length * EDGE_SEGMENTS
 * сегментов, для 2000 нод ≈ 20k сегментов, что уверенно тянет 60 fps.
 */
function updateEdgeBuffer() {
  if (!edgesMesh || !edgesPositions) return;
  const pos = edgesPositions;
  const col = edgesColors;
  let pIdx = 0, cIdx = 0;
  for (const e of state.edges) {
    if (!e.a || !e.b) { skipEdge(pos, col, pIdx, cIdx); pIdx += EDGE_SEGMENTS * 6; cIdx += EDGE_SEGMENTS * 6; continue; }
    const a = e.a, b = e.b;
    const invisible = (a.bornAt == null || b.bornAt == null)
      || (state.hiddenRoles && (state.hiddenRoles.has(a.role) || state.hiddenRoles.has(b.role)))
      || (e.adopted && !state.connectOrphans);
    if (invisible) {
      // скрываем сегменты — ставим все точки в одну (невидимо)
      for (let s = 0; s < EDGE_SEGMENTS; s++) {
        pos[pIdx++] = 0; pos[pIdx++] = 0; pos[pIdx++] = 0;
        pos[pIdx++] = 0; pos[pIdx++] = 0; pos[pIdx++] = 0;
        col[cIdx++] = 0; col[cIdx++] = 0; col[cIdx++] = 0;
        col[cIdx++] = 0; col[cIdx++] = 0; col[cIdx++] = 0;
      }
      continue;
    }
    const az = a.z || 0, bz = b.z || 0;
    // Control point — немного вверх по z + лёгкий jitter для органики
    const mx = (a.x + b.x) / 2 + ((a._seedDx || 0.5) - 0.5) * 30;
    const my = -((a.y + b.y) / 2) + ((a._seedDy || 0.5) - 0.5) * 30;
    const mz = (az + bz) / 2 + 35;
    _tmpA.set(a.x, -a.y, az);
    _tmpB.set(b.x, -b.y, bz);
    _tmpM.set(mx, my, mz);

    const hex = edgeColorHex(e);
    _edgeColor.setHex(hex);
    const r = _edgeColor.r, g = _edgeColor.g, bl = _edgeColor.b;
    // Dim ребра если активен topic-filter и endpoint-ы ему не соответствуют
    const tf = state.topicFilter;
    const topicDim = tf ? ((a._topicWord === tf && b._topicWord === tf) ? 1 : 0.2) : 1;
    const alpha = (e.adopted ? 0.4 : 0.85) * topicDim;
    // Рисуем EDGE_SEGMENTS последовательных отрезков вдоль quadratic Bezier
    for (let s = 0; s < EDGE_SEGMENTS; s++) {
      const t0 = s / EDGE_SEGMENTS;
      const t1 = (s + 1) / EDGE_SEGMENTS;
      bezierPoint3(_tmpA, _tmpM, _tmpB, t0, _p0);
      bezierPoint3(_tmpA, _tmpM, _tmpB, t1, _p1);
      pos[pIdx++] = _p0.x; pos[pIdx++] = _p0.y; pos[pIdx++] = _p0.z;
      pos[pIdx++] = _p1.x; pos[pIdx++] = _p1.y; pos[pIdx++] = _p1.z;
      // Градиент опасности — крайние сегменты тусклее, середина ярче
      const fade = Math.min(1, 1 - Math.abs((s + 0.5) / EDGE_SEGMENTS - 0.5) * 0.6);
      col[cIdx++] = r * alpha * fade;
      col[cIdx++] = g * alpha * fade;
      col[cIdx++] = bl * alpha * fade;
      col[cIdx++] = r * alpha * fade;
      col[cIdx++] = g * alpha * fade;
      col[cIdx++] = bl * alpha * fade;
    }
  }
  edgesMesh.geometry.attributes.position.needsUpdate = true;
  edgesMesh.geometry.attributes.color.needsUpdate = true;
}

function skipEdge(pos, col, pIdx, cIdx) {
  for (let s = 0; s < EDGE_SEGMENTS * 2; s++) {
    pos[pIdx++] = 0; pos[pIdx++] = 0; pos[pIdx++] = 0;
    col[cIdx++] = 0; col[cIdx++] = 0; col[cIdx++] = 0;
  }
}

const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
function bezierPoint3(a, m, b, t, out) {
  const u = 1 - t;
  out.x = u * u * a.x + 2 * u * t * m.x + t * t * b.x;
  out.y = u * u * a.y + 2 * u * t * m.y + t * t * b.y;
  out.z = u * u * a.z + 2 * u * t * m.z + t * t * b.z;
  return out;
}

function updateStats() {
  if (!statsEl || !state.stats) return;
  const s = state.stats;
  statsEl.innerHTML = `<b>${state.nodes.length}</b> nodes &middot; <b>${state.edges.length}</b> edges &middot; ${s.parsed} lines`;
}

// ---- Loader ----
function loadText(text) {
  const norm = normalizeToClaudeJsonl(text);
  const parsed = parseJSONL(norm.text);
  if (!parsed.nodes.length) return;
  const vp = { width: window.innerWidth, height: window.innerHeight, cx: 0, cy: 0 };
  const g = buildGraph(parsed, vp);
  state.sim = createSim();
  prewarm(g.nodes, g.edges, vp, state.sim, CFG.prewarmIterations);
  state.nodes = g.nodes;
  state.edges = g.edges;
  state.byId = g.byId;
  state.stats = parsed.stats;
  state.timelineMax = 1;
  state.selected = null;
  // Сбрасываем тесно связанное состояние
  state.hiddenRoles = new Set();
  state.searchMatches = new Set();
  state.searchActive = null;
  buildFromState();
  resetStory();
  recomputeStats();
  // Сбросим slider и phone
  const slider = document.getElementById('timeline');
  if (slider) slider.value = 100;
  if (infoEl) infoEl.textContent = `${state.nodes.length} nodes · ${state.edges.length} edges · ${norm.format}`;
}

// ---- UI ----
btnSample.addEventListener('click', () => loadText(SAMPLE_JSONL));
btnFile.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => loadText(String(reader.result));
  reader.readAsText(f);
  fileInput.value = '';
});
window.addEventListener('dragover', ev => ev.preventDefault());
window.addEventListener('drop', ev => {
  ev.preventDefault();
  const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => loadText(String(reader.result));
  reader.readAsText(f);
});

// Click raycaster
renderer.domElement.addEventListener('click', (ev) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(nodesGroup.children, false);
  if (hits.length) {
    const n = hits[0].object.userData.node;
    state.selected = n;
    const role = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
    const preview = (n.text || '').slice(0, 200);
    if (infoEl) infoEl.textContent = `[${role}] ${preview}${n.text && n.text.length > 200 ? '…' : ''}`;
  } else {
    state.selected = null;
    if (state.stats && infoEl) infoEl.textContent = `${state.nodes.length} nodes · ${state.edges.length} edges`;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Keyboard shortcuts — делегируем на HUD-кнопки (Space/F/O/T/1..5 etc.)
window.addEventListener('keydown', (ev) => {
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
  const k = ev.key;
  if (k === ' ') {
    ev.preventDefault();
    document.getElementById('btn-play')?.click();
  } else if (k === 'f' || k === 'F') {
    ev.preventDefault();
    document.getElementById('btn-freeze')?.click();
  } else if (k === 'o' || k === 'O') {
    ev.preventDefault();
    document.getElementById('btn-orphans')?.click();
  } else if (k === 't' || k === 'T') {
    ev.preventDefault();
    document.getElementById('btn-theme')?.click();
  }
});

// ---- Init UI modules ----
window.__viz = { state, CFG };
initTimeline();
initStory();
initSpeedControl();
initFreezeToggle();
initFilter();
initStats();
initSearch(() => ({ width: window.innerWidth, height: window.innerHeight, cx: 0, cy: 0 }));
initTopicsToggle();
initThemeToggle();
initOrphansToggle();

// ---- Animation loop ----
function timelineCutoff() {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

function updateBirths3D(nowMs) {
  const cutoff = timelineCutoff();
  for (const n of state.nodes) {
    const alive = n.ts <= cutoff;
    if (alive && n.bornAt == null) {
      n.bornAt = nowMs;
      const parent = n.parentId ? state.byId.get(n.parentId) : null;
      if (parent && parent.bornAt != null) {
        n.x = parent.x + (Math.random() - 0.5) * 30;
        n.y = parent.y + (Math.random() - 0.5) * 30;
      }
      if (n._mesh) n._mesh.position.set(n.x, -n.y, n.z || 0);
    } else if (!alive && n.bornAt != null) {
      n.bornAt = null;
    }
  }
}

let prevMs = performance.now();
function tick() {
  requestAnimationFrame(tick);
  const nowMs = performance.now();
  const dt = Math.min(0.1, (nowMs - prevMs) / 1000);
  prevMs = nowMs;
  controls.update();

  tickPlay();
  updateBirths3D(nowMs);

  // Physics
  if (state.sim && !state.sim.frozen && state.nodes.length) {
    const vp = { width: window.innerWidth, height: window.innerHeight, cx: 0, cy: 0, safeW: 1600, safeH: 1000 };
    stepPhysics(state.nodes, state.edges, vp, state.sim);
  }

  const t = nowMs / 1000;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const hasPath = state.pathSet && state.pathSet.size > 0;
  const topicsMode = !!state.topicsMode;
  const diffMode = !!state.diffMode;
  const topicFilter = state.topicFilter || null;
  // Update node meshes
  for (const n of state.nodes) {
    const mesh = n._mesh;
    if (!mesh) continue;
    // Visibility через birth + cutoff
    const bf = birthFactor(n.bornAt, nowMs, CFG.birthDurationMs);
    const visible = n.bornAt != null && (!state.hiddenRoles || !state.hiddenRoles.has(n.role));
    mesh.visible = visible;
    if (n._hubRing) n._hubRing.visible = visible;
    if (n._orphRing) n._orphRing.visible = visible && (!n._adoptedParentId || !!state.connectOrphans || n._isOrphanRoot);
    if (!visible) continue;
    mesh.position.set(n.x, -n.y, n.z || 0);
    const ag = easeOutCubic(bf);
    const baseR = n.r * 1.25;
    const hubPulse = n.isHub ? (1 + 0.3 * Math.sin(t * 1.8 + n.phase)) : 1;
    const scale = baseR * (0.5 + 0.5 * ag) * hubPulse;
    mesh.scale.set(scale, scale, scale);
    // Dim при активном search/path если не матч
    let dimMul = 1;
    if (hasSearch) dimMul = state.searchMatches.has(n.id) ? 1 : 0.22;
    else if (topicFilter) dimMul = n._topicWord === topicFilter ? 1 : 0.22;
    else if (hasPath) dimMul = state.pathSet.has(n.id) ? 1 : 0.3;
    if (mesh.material) {
      mesh.material.opacity = (0.25 + 0.75 * ag) * dimMul;
      // Динамический цвет (topics/diff переключаются на лету)
      if (topicsMode || diffMode) {
        const { color, emissive } = colorForNode(n);
        mesh.material.color.setHex(color);
        mesh.material.emissive.setHex(emissive);
      } else if (mesh.material.color.getHex() !== (ROLE_COLORS[n.role] || 0x888888)) {
        // возврат к role-color когда оба режима выключены
        const c = ROLE_COLORS[n.role] || 0x888888;
        mesh.material.color.setHex(c);
        mesh.material.emissive.setHex(c);
      }
      const isSelected = state.selected === n;
      const isMatch = hasSearch && state.searchMatches.has(n.id);
      const pulseMul = 0.5 + 0.5 * Math.sin(t * 1.6 + n.phase);
      mesh.material.emissiveIntensity = isSelected ? 1.6
        : isMatch ? (1.2 + 0.4 * Math.sin(t * 3.5 + n.phase))
        : (0.4 + 0.25 * pulseMul);
    }
    // Halo — пульсирующая «атмосфера» вокруг ноды
    if (n._halo) {
      n._halo.position.copy(mesh.position);
      const haloR = baseR * (2.2 + 0.3 * Math.sin(t * 1.2 + n.phase));
      n._halo.scale.set(haloR, haloR, haloR);
      if (n._halo.material) {
        const isMatch = hasSearch && state.searchMatches.has(n.id);
        n._halo.material.opacity = isMatch ? 0.28 : (0.08 + 0.06 * (0.5 + 0.5 * Math.sin(t * 1.6 + n.phase))) * dimMul;
        if (topicsMode || diffMode) {
          const { color } = colorForNode(n);
          n._halo.material.color.setHex(color);
        }
      }
    }
    // Hub ring — два скрещенных кольца, вращающихся в разных осях
    if (n._hubRing) {
      n._hubRing.position.copy(mesh.position);
      const hr = baseR * (1.9 + 0.2 * Math.sin(t * 1.4 + n.phase));
      n._hubRing.scale.set(hr, hr, hr);
      n._hubRing.rotation.y = t * 0.35;
      n._hubRing.rotation.x = Math.sin(t * 0.5) * 0.3;
      n._hubRing.children.forEach((ch, i) => {
        if (ch.material) ch.material.opacity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + n.phase + i));
      });
    }
    // Orphan ring
    if (n._orphRing) {
      n._orphRing.position.copy(mesh.position);
      const or = baseR * 2.4;
      n._orphRing.scale.set(or, or, or);
      n._orphRing.rotation.x = t * 0.6;
      n._orphRing.rotation.z = t * 0.35;
    }
  }
  // Обновить positions/colors для LineSegments — ребра будут следовать за нодами
  updateEdgeBuffer();

  tickStory(nowMs, state);
  tickStats();

  renderer.render(scene, camera);
}
tick();

function pulseFor(n, t) {
  return 0.5 + 0.5 * Math.sin(t * 1.8 + n.phase);
}

// ---- Boot ----
const qJsonl = new URLSearchParams(location.search).get('jsonl');
if (qJsonl) {
  fetch(qJsonl, { cache: 'no-store' })
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(loadText)
    .catch(() => loadText(SAMPLE_JSONL));
} else {
  loadText(SAMPLE_JSONL);
}
