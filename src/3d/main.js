// 3D-рендерер, переиспользующий 2D state/core/ui модули.
// Three.js заменяет только визуальный слой — физика, timeline, story-mode,
// speed, phone и пр. работают ровно как в 2D.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CFG } from '../core/config.js';
import { state } from '../view/state.js';
import { parseJSONL } from '../core/parser.js';
import { buildGraph } from '../core/graph.js';
import { prewarm3D, stepPhysics3D, createSim } from '../core/layout.js';
import { SAMPLE_JSONL } from '../core/sample.js';
import { MULTI_AGENT_ORCHESTRATION_JSONL, DEEP_ORCHESTRATION_JSONL } from '../core/samples-embedded.js';
import { normalizeToClaudeJsonl } from '../core/adapters.js';
import { toolIcon } from '../view/tool-icons.js';
import { birthFactor, easeOutCubic } from '../view/renderer.js';
import { saveSessionForHandoff, loadSessionForHandoff, clearSessionForHandoff } from '../core/session-bridge.js';
import { safeFetch } from '../core/url-safety.js';
import { initI18n } from '../core/i18n.js';
import { initLangToggle } from '../ui/lang-toggle.js';

import { initStory, tickStory, resetStory } from '../ui/story-mode.js';
import { initTimeline, tickPlay, isPlaying } from '../ui/timeline.js';
import { initSpeedControl } from '../ui/speed-control.js';
import { initFreezeToggle } from '../ui/freeze-toggle.js';
import { initFilter } from '../ui/filter.js';
import { initStats, tickStats, recomputeStats } from '../ui/stats-hud.js';
import { initSearch, matchNodes } from '../ui/search.js';
import { initTopicsToggle } from '../ui/topics-toggle.js';
import { initOrphansToggle } from '../ui/orphans-toggle.js';
import { hueToRgbaString } from '../view/topics.js';
import { compute3DRadialLayout, compute3DSwimLanes } from './layouts3d.js';
import { initSettingsModal } from '../ui/settings-modal.js';

const ROLE_COLORS = {
  user: 0x7baaf0,
  assistant: 0x50d4b5,
  tool_use: 0xeca040,
  thinking: 0xb58cff,
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
scene.background = new THREE.Color(0x0a0e1a);
scene.fog = new THREE.Fog(0x0a0e1a, 1800, 8000);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 8000);
camera.position.set(0, -300, 1200);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85; // снижено с 1.1 — общая яркость поскромнее
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
// Auto-rotate intro: первые 4 секунды камера медленно вращается чтобы
// сразу было видно что это 3D, а не плоский граф.
controls.autoRotate = true;
controls.autoRotateSpeed = 1.6;
let _introRotateTimer = null;

// Post-processing — EffectComposer с RenderPass + UnrealBloomPass.
// Bloom даёт естественное свечение вокруг ярких объектов (орбов + колец),
// но с умеренными параметрами — иначе сцена «выгорает» и теряются детали.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.45,   // strength — насыщенность bloom (было 0.85)
  0.40,   // radius — размер ореола (было 0.55)
  0.30    // threshold — bloom только для очень ярких объектов (было 0.15)
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// Освещение — минимальное. Орбы сами светятся через custom shader
// (fresnel + пульсирующее ядро), поэтому Lambert/PBR лайтинг не нужен
// и даже мешает — он заливает всё ровным цветом, убивая объём.
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

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
const starsObj = new THREE.Points(starGeo, new THREE.PointsMaterial({
  color: 0xc8dcff, size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.5, fog: false,
}));
scene.add(starsObj);

const nodesGroup = new THREE.Group();
const edgesGroup = new THREE.Group();
const reverseSignalGroup = new THREE.Group();
scene.add(nodesGroup);
scene.add(edgesGroup);
scene.add(reverseSignalGroup);

// Reverse-signal particles: один THREE.Points per state.pairEdges, обновляем
// positions каждый кадр (bezier point по time + seed). Lemon-yellow halo
// через PointsMaterial (sizeAttenuation: true, additive blending).
let reverseSignalPoints = null;
let reverseSignalPositions = null; // Float32Array — pos для каждой частицы

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
const sphereGeoLarge = new THREE.SphereGeometry(1, 28, 28);
// Более тонкий halo — большая прозрачная sphere с additive blending
const sphereGeoHalo = new THREE.SphereGeometry(1, 16, 16);
const hubRingGeoA = new THREE.TorusGeometry(1.5, 0.08, 8, 40);
const hubRingGeoB = new THREE.TorusGeometry(1.5, 0.08, 8, 40);
const orphanRingGeo = new THREE.TorusGeometry(2.0, 0.06, 6, 28);

// ---- Custom orb shader ----
// Фрагментный шейдер делает волюметричный «орб»:
//   • Fresnel rim — край сферы светится ярче, чем центр (силуэт
//     вокруг сферы). Это главный трюк, дающий 3D-объём без
//     реального PBR-освещения.
//   • Hot core — центр сферы смещён к белому, имитируя раскалённое
//     ядро, которое просвечивает наружу.
//   • Breath pulse — ядро слегка пульсирует по sin(time + phase),
//     каждый орб живёт в своём ритме.
// Вместе с UnrealBloomPass это даёт настоящее 3D-свечение.
const ORB_VS = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 pos = modelViewMatrix * vec4(position, 1.0);
    vView = -normalize(pos.xyz);
    gl_Position = projectionMatrix * pos;
  }
`;
const ORB_FS = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPhase;
  uniform float uAlpha;
  uniform float uSelected;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    float ndv = abs(dot(N, V));

    // Fresnel: 1 на силуэте, 0 в центре
    float fresnel = pow(1.0 - ndv, 2.0);
    // «Lambert-центр»: ярко там где surface смотрит в камеру
    float center = pow(ndv, 1.3);

    // Пульс — два слоя: основной (faster) + slow modulation для «дыхания»
    float pulse = 0.5 + 0.5 * sin(uTime * 2.4 + uPhase);
    float slow = 0.5 + 0.5 * sin(uTime * 0.7 + uPhase * 1.3);
    float breath = 0.55 + 0.45 * pulse * (0.7 + 0.3 * slow);

    // Цветовые слои
    vec3 coreCol = mix(uColor, vec3(1.0), 0.55 + 0.3 * pulse);
    vec3 rimCol = uColor * 2.0;

    // Slight rim shimmer — добавляет «живость» силуэту
    float shimmer = 0.85 + 0.15 * sin(uTime * 3.0 + uPhase * 2.0 + N.x * 4.0);
    vec3 finalCol = coreCol * center * breath + rimCol * fresnel * 1.1 * shimmer;

    // Selected — повышенная яркость + добавка золотого
    if (uSelected > 0.5) {
      finalCol *= 1.5 + 0.5 * pulse;
      finalCol += vec3(1.0, 0.85, 0.4) * fresnel * 0.6;
    }

    gl_FragColor = vec4(finalCol, uAlpha);
  }
`;

function makeOrbMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uPhase: { value: Math.random() * Math.PI * 2 },
      uAlpha: { value: 1.0 },
      uSelected: { value: 0 },
    },
    vertexShader: ORB_VS,
    fragmentShader: ORB_FS,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: true, // у ядра — честный z-buffer, чтобы ближние орбы перекрывали дальние
  });
}

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

  // z уже задан в applySphericalScatter() при load — оставляем его как есть.
  // Если по какой-то причине z отсутствует (например, nodes пришли из
  // другого пути) — fallback на depth-based, но это backup.
  for (const n of state.nodes) {
    if (typeof n.z !== 'number' || !isFinite(n.z)) {
      n.z = ((n._seedDx || 0) - 0.5) * 200;
    }
  }

  // Nodes — sphere + halo + (hub/orphan rings)
  for (const n of state.nodes) {
    const { color } = colorForNode(n);
    const mat = makeOrbMaterial(color);
    mat.uniforms.uPhase.value = n.phase || 0;
    const mesh = new THREE.Mesh(sphereGeoLarge, mat);
    mesh.position.set(n.x, -n.y, n.z || 0);
    const baseR = n.r * 1.25;
    mesh.scale.set(baseR, baseR, baseR);
    mesh.userData.node = n;
    nodesGroup.add(mesh);
    n._mesh = mesh;

    // Halo — большая полупрозрачная sphere с additive blending: даёт
    // «свечение» вокруг каждой ноды (имитация bloom без post-processing).
    // Стартует СКРЫТЫМ — включится в tick() когда нода родится (bornAt != null).
    const haloMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    const halo = new THREE.Mesh(sphereGeoHalo, haloMat);
    halo.position.copy(mesh.position);
    halo.scale.set(baseR * 2.4, baseR * 2.4, baseR * 2.4);
    halo.visible = false;
    halo.userData.haloOwner = n;
    nodesGroup.add(halo);
    n._halo = halo;

    // Ноды тоже стартуют скрытыми, чтобы не было «вспышки всех сразу» при
    // открытии файла до первого tick()-а. Первый tick включит те, что
    // прошли через timeline-cutoff.
    mesh.visible = false;

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
      hubGroup.visible = false;
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
      orphRing.visible = false;
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

  // Reverse-signal points — одна частица на pair-edge, обновляется в tick
  while (reverseSignalGroup.children.length) {
    const m = reverseSignalGroup.children.pop();
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
  }
  reverseSignalPoints = null;
  reverseSignalPositions = null;
  const pairCount = (state.pairEdges || []).length;
  if (pairCount > 0) {
    reverseSignalPositions = new Float32Array(pairCount * 3);
    const rsGeom = new THREE.BufferGeometry();
    rsGeom.setAttribute('position', new THREE.BufferAttribute(reverseSignalPositions, 3));
    const rsMat = new THREE.PointsMaterial({
      color: 0xfff05c,             // lemon yellow
      size: 14,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    reverseSignalPoints = new THREE.Points(rsGeom, rsMat);
    reverseSignalPoints.frustumCulled = false;
    reverseSignalGroup.add(reverseSignalPoints);
  }

  // Инициализируем buffer первым кадром
  updateEdgeBuffer();

  // Fit camera по bounding box нод. Это намного надёжнее maxD-from-origin
  // потому что graph может быть offset'нут от центра после physics.
  // Изометрический ракурс ~30° сверху-сбоку.
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const n of state.nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    const ny = -n.y; // в three.js y инвертирован относительно state
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
    const nz = n.z || 0;
    if (nz < minZ) minZ = nz;
    if (nz > maxZ) maxZ = nz;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const size = Math.max(sizeX, sizeY, sizeZ, 400);
  // Расстояние камеры от bbox центра. fov=55° → tan(27.5°)≈0.52,
  // dist = (size/2) / tan(fov/2) → но запас 1.7× для красивого fit
  const dist = (size * 0.5) / Math.tan((55 * Math.PI / 180) / 2) * 1.7;
  camera.position.set(cx + dist * 0.55, cy - dist * 0.45, cz + dist * 0.75);
  controls.target.set(cx, cy, cz);
  controls.update();
  // Запускаем intro auto-rotate; через 4с — выключим
  controls.autoRotate = true;
  if (_introRotateTimer) clearTimeout(_introRotateTimer);
  _introRotateTimer = setTimeout(() => { controls.autoRotate = false; }, 4000);
  updateStats();
}

// Цвет ребра: учитываем diff-режим (edge.diffSide), tool_use, adopted, role
const _edgeColor = new THREE.Color();
function edgeColorHex(e) {
  if (state.diffMode && e.diffSide === 'B') return 0x5ad2ff;
  if (e.adopted) return 0xc8b478;
  if (e.b && e.b.role === 'tool_use') return 0xeca040;
  if (e.b && e.b.role === 'thinking') return 0xb58cff;
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

// Обновляет позиции reverse-signal частиц. Каждая частица движется по
// quadratic Bezier от tool_use (a) к tool_result (b) с фазой
// `(t * 0.6 + seed) % 1`. Если pair невидим (одна из нод не родилась
// или скрыта role-фильтром) — частица прячется за камеру (-1e6).
function updateReverseSignalBuffer(tSec) {
  if (!reverseSignalPoints || !reverseSignalPositions) return;
  if (state.showReverseSignal === false) {
    reverseSignalPoints.visible = false;
    return;
  }
  reverseSignalPoints.visible = true;
  const pairs = state.pairEdges || [];
  const pos = reverseSignalPositions;
  const hidden = state.hiddenRoles;
  const collapsed = state.collapsed;
  const FAR = -1e6;
  let i = 0;
  for (const p of pairs) {
    const a = p.a, b = p.b;
    const off = i * 3;
    i++;
    const invisible = !a || !b
      || a.bornAt == null || b.bornAt == null
      || (hidden && (hidden.has(a.role) || hidden.has(b.role)))
      || (a.role === 'tool_use' && a.parentId && collapsed && collapsed.has(a.parentId))
      || (b.role === 'tool_use' && b.parentId && collapsed && collapsed.has(b.parentId));
    if (invisible) {
      pos[off] = FAR; pos[off + 1] = FAR; pos[off + 2] = FAR;
      continue;
    }
    // Фаза t — каждая комета имеет собственный seed (по phase), движется
    // со скоростью ~0.6 цикла/сек
    const seed = ((a.phase || 0) + (b.phase || 0)) * 0.15;
    const tt = ((tSec * 0.6 + seed) % 1.0 + 1.0) % 1.0;
    // Bezier: A → B с control point чуть отнесён ортогонально для arc
    const ax = a.x, ay = -a.y, az = a.z || 0;
    const bx = b.x, by = -b.y, bz = b.z || 0;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1;
    // Control point — лёгкий arc вверх по Y (in three.js Y up)
    const cx = (ax + bx) / 2;
    const cy = (ay + by) / 2 + len * 0.12;
    const cz = (az + bz) / 2;
    const u = 1 - tt;
    pos[off]     = u * u * ax + 2 * u * tt * cx + tt * tt * bx;
    pos[off + 1] = u * u * ay + 2 * u * tt * cy + tt * tt * by;
    pos[off + 2] = u * u * az + 2 * u * tt * cz + tt * tt * bz;
  }
  reverseSignalPoints.geometry.attributes.position.needsUpdate = true;
}

// === Explode intro ===
//
// При первой загрузке (или новом sample) ноды стартуют коллапсированными
// в центре сцены, потом «взрываются» — анимированно разлетаются на свои
// final positions за ~1500 мс с easeOutCubic. Дает яркий wow-эффект и
// сразу демонстрирует объёмность 3D-сцены.
let _explodeStart = null;
const _explodeDuration = 1500;
const _explodeFrom = new Map(); // nodeId → {x, y, z}
const _explodeTo = new Map();   // nodeId → {x, y, z}

function startExplodeIntro(nodes) {
  _explodeFrom.clear();
  _explodeTo.clear();
  for (const n of nodes) {
    // final position уже в n.x/y/z (после prewarm)
    _explodeTo.set(n.id, { x: n.x, y: n.y, z: n.z || 0 });
    // start position — около (0,0,0) с маленьким seeded jitter (нода не
    // должна быть в нулевой точке абсолютно, иначе все начинают с одной
    // координаты и repulsion сразу выкидывает каждую в случайную сторону)
    const jx = ((n._seedDx || 0.5) - 0.5) * 30;
    const jy = ((n._seedDy || 0.5) - 0.5) * 30;
    const jz = ((n._seedDx || 0.5) - 0.5) * 30 * (n._seedDy != null ? -1 : 1);
    n.x = jx;
    n.y = jy;
    n.z = jz;
    n.vx = 0; n.vy = 0; n.vz = 0;
    _explodeFrom.set(n.id, { x: jx, y: jy, z: jz });
  }
  _explodeStart = performance.now();
  // Замораживаем physics на время explode чтобы repulsion не дёргал ноды
  // одновременно с интерполяцией
  if (state.sim) state.sim.frozen = true;
}

function tickExplode(nowMs) {
  if (_explodeStart == null) return;
  const t = Math.min(1, (nowMs - _explodeStart) / _explodeDuration);
  // easeOutCubic — быстрый старт, плавное приземление
  const e = 1 - Math.pow(1 - t, 3);
  for (const n of state.nodes) {
    const from = _explodeFrom.get(n.id);
    const to = _explodeTo.get(n.id);
    if (!from || !to) continue;
    n.x = from.x + (to.x - from.x) * e;
    n.y = from.y + (to.y - from.y) * e;
    n.z = from.z + (to.z - from.z) * e;
  }
  if (t >= 1) {
    _explodeStart = null;
    // Размораживаем physics — она дойдёт до settled state самостоятельно
    if (state.sim) state.sim.frozen = false;
  }
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

// Initial scatter — ноды на сферической Fibonacci-spirale. Это даёт
// устойчивое 3D-распределение для z (физика z не трогает, так что
// z после physics остаётся как initial). x/y physics будет раздвигать,
// но это нормально — главное чтобы nodes стартовали неперекрытыми.
function applySphericalScatter(nodes) {
  const N = nodes.length;
  if (!N) return;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const radius = Math.max(120, Math.sqrt(N) * 30);
  for (let i = 0; i < N; i++) {
    const n = nodes[i];
    const idx = i + 0.5;
    const y = 1 - (idx / N) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i + (n._seedDx || 0) * 0.5;
    n.x = Math.cos(theta) * r * radius;
    n.y = y * radius;
    n.z = Math.sin(theta) * r * radius;
    n.vx = 0; n.vy = 0;
  }
}

// ---- Loader ----
function loadText(text) {
  const norm = normalizeToClaudeJsonl(text);
  const parsed = parseJSONL(norm.text);
  if (!parsed.nodes.length) return;
  const vp = { width: window.innerWidth, height: window.innerHeight, cx: 0, cy: 0 };
  const g = buildGraph(parsed, vp);
  // В 3D по умолчанию подключаем orphan-edges к физике — иначе на
  // линейных графах ноды вытягиваются в «верёвку», sibling-orphan'ы
  // не имеют притяжения друг к другу. Это та самая разница которую
  // юзер наблюдал при ручном клике "🔗 соединить сиротки".
  state.connectOrphans = true;
  state.sim = createSim({ connectOrphans: true });
  // Spherical Fibonacci scatter для initial positions — даёт нодам
  // начальные неперекрытые координаты в 3D
  applySphericalScatter(g.nodes);
  // Полное 3D physics — vx, vy, vz, fxAcc/fyAcc/fzAcc, repulsion и
  // spring в 3D-distance. Куб, не плоскость.
  prewarm3D(g.nodes, g.edges, { safeW: 2000 }, state.sim, CFG.prewarmIterations);
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
  // Сохраним для возможного возврата в 2D. Sample-ы не передаём —
  // 2D при первом открытии пусть показывает свой default sample.
  const isSample = text === SAMPLE_JSONL || text === MULTI_AGENT_ORCHESTRATION_JSONL || text === DEEP_ORCHESTRATION_JSONL;
  if (!isSample) saveSessionForHandoff(text);
  // Если активный layout не 'force' — мгновенно применяем target-координаты
  if (state.layoutMode === 'radial' || state.layoutMode === 'swim') {
    applyLayoutTargets3D(state.layoutMode, /*animate=*/ false);
  }
  // Explode intro — ноды коллапсируются в центр и взрываются на target за 1.5s.
  // Вызывается ПОСЛЕ финальных positions (prewarm + опц. layout3D apply),
  // запоминает их как target и переставляет current в (0,0,0)+jitter.
  startExplodeIntro(state.nodes);
  // Mesh positions обновятся в animation tick (через mesh.position.set)
  for (const n of state.nodes) {
    if (n._mesh) n._mesh.position.set(n.x, -n.y, n.z || 0);
  }
}

// ---- UI ----

// Examples ▾ dropdown — портим из ui/loader.js, поскольку 3D не использует
// loader. Одинаковый список из трёх sample'ов.
const SAMPLE_OPTIONS_3D = [
  { id: 'basic', i18nKey: 'sample.basic', text: () => SAMPLE_JSONL },
  { id: 'orchestration', i18nKey: 'sample.orchestration', text: () => MULTI_AGENT_ORCHESTRATION_JSONL },
  { id: 'deep_orchestration', i18nKey: 'sample.deep_orchestration', text: () => DEEP_ORCHESTRATION_JSONL },
];

import('../core/i18n.js').then(({ t }) => {
  // Превратим btn-sample в dropdown trigger; при клике строим меню по тем же
  // CSS-правилам что и в 2D (.samples-menu).
  function toggleSamplesMenu(anchor) {
    const existing = document.getElementById('samples-menu-3d');
    if (existing) { existing.remove(); anchor.setAttribute('aria-expanded', 'false'); return; }
    const menu = document.createElement('div');
    menu.id = 'samples-menu-3d';
    menu.className = 'samples-menu';
    menu.setAttribute('role', 'menu');
    const rect = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.zIndex = '100';
    let outsideHandler = null;
    const escHandler = (ev) => { if (ev.key === 'Escape') closeMenu(); };
    const closeMenu = () => {
      menu.remove();
      anchor.setAttribute('aria-expanded', 'false');
      if (outsideHandler) {
        document.removeEventListener('click', outsideHandler);
        document.removeEventListener('keydown', escHandler);
      }
    };
    for (const opt of SAMPLE_OPTIONS_3D) {
      const item = document.createElement('button');
      item.className = 'samples-menu-item';
      item.setAttribute('role', 'menuitem');
      item.textContent = t(opt.i18nKey);
      item.addEventListener('click', () => {
        closeMenu();
        clearSessionForHandoff();
        loadText(opt.text());
      });
      menu.appendChild(item);
    }
    document.body.appendChild(menu);
    anchor.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      outsideHandler = (ev) => {
        if (!menu.contains(ev.target) && ev.target !== anchor) closeMenu();
      };
      document.addEventListener('click', outsideHandler);
      document.addEventListener('keydown', escHandler);
    }, 0);
  }
  if (btnSample) {
    btnSample.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleSamplesMenu(btnSample);
    });
  }
});
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

// ==== Mouse pick + drag ====
//
// Клик без движения → select ноды; drag с mousedown на ноде → тянем её
// в плоскости, параллельной камере (constant depth) и применяя reheat
// к физике (как в 2D). OrbitControls получает pointerdown только когда
// не попали в ноду — чтобы не конфликтовало с dragging.

let _draggedNode = null;
let _dragStart = null;
let _dragMoved = false;
let _dragPlane = new THREE.Plane();
const _dragPoint = new THREE.Vector3();

function pickNodeMesh(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  // Пересечение только с нодами (userData.node), не с halo/hub/orphan
  const candidates = nodesGroup.children.filter(c => c.userData && c.userData.node);
  const hits = raycaster.intersectObjects(candidates, false);
  return hits.length ? hits[0] : null;
}

renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0) return;
  const hit = pickNodeMesh(ev);
  if (!hit) return;
  _draggedNode = hit.object.userData.node;
  _dragStart = { x: ev.clientX, y: ev.clientY };
  _dragMoved = false;
  // Плоскость drag — параллельна viewing plane, проходит через hit-точку
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  _dragPlane.setFromNormalAndCoplanarPoint(camDir, hit.point.clone());
  // Пока тащим — OrbitControls не должен вращать камеру
  controls.enabled = false;
  try { renderer.domElement.setPointerCapture(ev.pointerId); } catch {}
  ev.preventDefault();
});

window.addEventListener('pointermove', (ev) => {
  if (!_draggedNode) return;
  const dx = ev.clientX - _dragStart.x;
  const dy = ev.clientY - _dragStart.y;
  if (!_dragMoved && Math.hypot(dx, dy) > 3) _dragMoved = true;
  if (!_dragMoved) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.ray.intersectPlane(_dragPlane, _dragPoint)) {
    _draggedNode.x = _dragPoint.x;
    _draggedNode.y = -_dragPoint.y; // y в world flip'нут
    _draggedNode.z = _dragPoint.z;
    _draggedNode.vx = 0; _draggedNode.vy = 0;
    if (_draggedNode._mesh) _draggedNode._mesh.position.set(_draggedNode.x, -_draggedNode.y, _draggedNode.z || 0);
    if (state.sim) {
      // reheat + unfreeze + alphaTarget как в 2D, чтобы сеть подстроилась
      if (state.sim.manualFrozen) state.sim.manualFrozen = false;
      state.sim.alpha = Math.max(state.sim.alpha, 0.3);
      state.sim.frozen = false;
      state.sim.alphaTarget = 0.3;
    }
  }
});

window.addEventListener('pointerup', (ev) => {
  if (!_draggedNode) return;
  const node = _draggedNode;
  const wasMove = _dragMoved;
  try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch {}
  _draggedNode = null;
  _dragStart = null;
  controls.enabled = true;
  if (state.sim) state.sim.alphaTarget = 0;
  // Если не было движения — это click → select + info
  if (!wasMove) {
    state.selected = node;
    const role = node.role === 'tool_use' ? (node.toolName || 'tool') : node.role;
    const preview = (node.text || '').slice(0, 200);
    if (infoEl) infoEl.textContent = `[${role}] ${preview}${node.text && node.text.length > 200 ? '…' : ''}`;
  }
});

// Пустой click — снятие выделения
renderer.domElement.addEventListener('click', (ev) => {
  if (_dragMoved) return; // уже обработано pointerup
  const hit = pickNodeMesh(ev);
  if (!hit) {
    state.selected = null;
    if (state.stats && infoEl) infoEl.textContent = `${state.nodes.length} nodes · ${state.edges.length} edges`;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
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
  }
});

// === 3D Layout switch (Force / Radial / Swim) ===
// state.layoutMode используется как и в 2D. В 3D-режиме 'force' даёт текущее
// поведение (physics в плоскости + depth z). 'radial' и 'swim' выставляют
// target-координаты из layouts3d.js и анимируют переход в течение
// CFG.layoutTransitionMs миллисекунд. Во время не-force layout physics
// отключается (n.x/y фиксированы layout'ом).
//
// Декларации идут ДО init-блока — иначе init3DLayoutSwitch() из init попадёт
// в TDZ для _layoutBtns / _layoutTransition (let не hoisted).

let _layoutTransition = null;  // { from: Map<id,{x,y,z}>, to: Map, t0, dur, toMode }
let _layoutBtns = [];

// ---- Init UI modules ----
window.__viz = { state, CFG };
initI18n();
initLangToggle();
initTimeline();
initStory();
initSpeedControl();
initFreezeToggle();
initFilter();
initStats();
initSearch(() => ({ width: window.innerWidth, height: window.innerHeight, cx: 0, cy: 0 }));
initTopicsToggle();
initOrphansToggle();
initSettingsModal();
init3DLayoutSwitch();

function init3DLayoutSwitch() {
  // Восстанавливаем сохранённый выбор из localStorage (отдельный ключ
  // для 3D — у 2D и 3D разные пространства). Default 'radial' — на 3D
  // сразу видна древовидная структура с ветвлением, для wow-эффекта
  // лучше force с physics (force показывает структуру не сразу).
  let saved = null;
  try { saved = localStorage.getItem('viz:layoutMode-3d'); } catch {}
  if (saved === 'force' || saved === 'radial' || saved === 'swim') {
    state.layoutMode = saved;
  } else {
    state.layoutMode = 'radial';
  }
  const host = document.getElementById('layout-switch-3d');
  if (!host) return;
  host.innerHTML = '';
  const modes = [
    { id: 'force',  label: 'FORCE'  },
    { id: 'radial', label: 'RADIAL' },
    { id: 'swim',   label: '🌊 SWIM' },
  ];
  for (const m of modes) {
    const el = document.createElement('button');
    el.className = 'btn btn-layout-chip';
    el.dataset.mode = m.id;
    el.textContent = m.label;
    el.addEventListener('click', () => switchLayout3D(m.id));
    host.appendChild(el);
    _layoutBtns.push({ mode: m.id, el });
  }
  updateLayoutBtns3D();
  // Если уже есть загруженные ноды и saved !== force — применим сразу
  if (state.nodes.length && state.layoutMode !== 'force') {
    applyLayoutTargets3D(state.layoutMode, /*animate=*/ false);
  }
}

function updateLayoutBtns3D() {
  for (const b of _layoutBtns) b.el.classList.toggle('active', b.mode === state.layoutMode);
}

function switchLayout3D(toMode) {
  if (_layoutTransition) return;
  if (toMode === state.layoutMode) return;
  try { localStorage.setItem('viz:layoutMode-3d', toMode); } catch {}
  applyLayoutTargets3D(toMode, /*animate=*/ true);
}

// Берёт target-координаты для toMode и либо анимирует transition, либо
// мгновенно проставляет позиции.
function applyLayoutTargets3D(toMode, animate) {
  const from = new Map();
  for (const n of state.nodes) from.set(n.id, { x: n.x, y: n.y, z: n.z || 0 });

  let to;
  if (toMode === 'radial') {
    to = compute3DRadialLayout(state.nodes, state.byId);
  } else if (toMode === 'swim') {
    to = compute3DSwimLanes(state.nodes);
  } else {
    // force — освобождаем физику. Цели = текущие позиции (без изменений)
    to = from;
  }

  if (!animate) {
    for (const [id, p] of to) {
      const n = state.byId.get(id);
      if (!n) continue;
      n.x = p.x;
      n.y = -p.y; // в нашей системе y инвертирован относительно three.js
      n.z = p.z;
      n.vx = 0; n.vy = 0;
      if (n._mesh) n._mesh.position.set(n.x, -n.y, n.z || 0);
    }
    state.layoutMode = toMode;
    if (state.sim) state.sim.frozen = (toMode !== 'force');
    updateLayoutBtns3D();
    return;
  }

  _layoutTransition = {
    from,
    to,
    t0: performance.now(),
    dur: CFG.layoutTransitionMs,
    toMode,
  };
  // На время transition'а замораживаем physics, чтобы он не дёргал ноды
  if (state.sim) state.sim.frozen = true;
}

function tickLayoutTransition3D() {
  if (!_layoutTransition) return;
  const { from, to, t0, dur, toMode } = _layoutTransition;
  const t = Math.min(1, (performance.now() - t0) / dur);
  // ease-in-out quad
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  for (const n of state.nodes) {
    const f = from.get(n.id);
    const tg = to.get(n.id);
    if (!f || !tg) continue;
    // Внимание: tg.y «правильный» в 3D-pos системе (y вверх в three.js),
    // а наш n.y инвертирован (n.y = -mesh.y). Чтобы сохранить
    // совместимость, держим n.y в 2D-системе (mesh.position.y = -n.y).
    n.x = f.x + (tg.x - f.x) * e;
    n.y = f.y + ((-tg.y) - f.y) * e;
    n.z = (f.z || 0) + (tg.z - (f.z || 0)) * e;
    n.vx = 0; n.vy = 0;
    if (n._mesh) n._mesh.position.set(n.x, -n.y, n.z || 0);
  }
  if (t >= 1) {
    state.layoutMode = toMode;
    _layoutTransition = null;
    if (state.sim) state.sim.frozen = (toMode !== 'force');
    updateLayoutBtns3D();
  }
}

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
  tickLayoutTransition3D();
  tickExplode(nowMs);  // intro animation — приоритет над physics

  // Physics — только в force-layout. В radial/swim ноды стоят на target.
  // CRITICAL: используем stepPhysics3D (а не 2D-шный stepPhysics).
  // 2D-physics не двигал z, отчего graph скатывался в плоский pancake
  // на каждом кадре несмотря на правильный 3D-prewarm.
  // Explode-intro сам замораживает sim (sim.frozen=true) — physics ждёт.
  if (state.layoutMode === 'force' && state.sim && !state.sim.frozen && state.nodes.length) {
    stepPhysics3D(state.nodes, state.edges, { safeW: 2000 }, state.sim);
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
    if (n._halo) n._halo.visible = visible;
    if (n._hubRing) n._hubRing.visible = visible;
    if (n._orphRing) n._orphRing.visible = visible && (!n._adoptedParentId || !!state.connectOrphans || n._isOrphanRoot);
    if (!visible) continue;
    mesh.position.set(n.x, -n.y, n.z || 0);
    const ag = easeOutCubic(bf);
    const baseR = n.r * 1.25;
    const hubPulse = n.isHub ? (1 + 0.3 * Math.sin(t * 1.8 + n.phase)) : 1;
    // Все ноды лёгко «дышат» — небольшая пульсация размера, разная для каждой
    const breathPulse = 1 + 0.06 * Math.sin(t * 1.6 + n.phase * 1.7);
    const scale = baseR * (0.5 + 0.5 * ag) * hubPulse * breathPulse;
    mesh.scale.set(scale, scale, scale);
    // Dim при активном search/path если не матч
    let dimMul = 1;
    if (hasSearch) dimMul = state.searchMatches.has(n.id) ? 1 : 0.22;
    else if (topicFilter) dimMul = n._topicWord === topicFilter ? 1 : 0.22;
    else if (hasPath) dimMul = state.pathSet.has(n.id) ? 1 : 0.3;
    if (mesh.material && mesh.material.uniforms) {
      const u = mesh.material.uniforms;
      u.uTime.value = t;
      u.uAlpha.value = (0.3 + 0.7 * ag) * dimMul;
      // Динамический цвет (topics/diff/role переключаются на лету)
      const { color } = colorForNode(n);
      u.uColor.value.setHex(color);
      u.uSelected.value = (state.selected === n) ? 1 : 0;
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
  // Обновить reverse-signal частицы (lemon comets вдоль pair-edges)
  updateReverseSignalBuffer(t);

  tickStory(nowMs, state);
  tickStats();

  composer.render();
}
tick();

function pulseFor(n, t) {
  return 0.5 + 0.5 * Math.sin(t * 1.8 + n.phase);
}

// ---- Boot ----
// Default sample для первого открытия — deep orchestration: 60 нод,
// двухуровневый subagent spawn, реальное ветвление. На basic linear
// sample (40 нод) ни 3D-объёма, ни структуры графа не видно.
const DEFAULT_SAMPLE = DEEP_ORCHESTRATION_JSONL;

const qJsonl = new URLSearchParams(location.search).get('jsonl');
if (qJsonl) {
  safeFetch(qJsonl, { cache: 'no-store' })
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(loadText)
    .catch(() => loadText(DEFAULT_SAMPLE));
} else {
  // Если пришли из 2D с уже загруженным файлом — восстановим его
  const handoff = loadSessionForHandoff();
  if (handoff && handoff.text) {
    loadText(handoff.text);
  } else {
    loadText(DEFAULT_SAMPLE);
  }
}
