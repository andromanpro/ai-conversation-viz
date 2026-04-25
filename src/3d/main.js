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
import { initI18n, t as _t } from '../core/i18n.js';
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
import { initAudio } from '../ui/audio.js';
import { initFpsCounter, tickFps } from '../ui/fps-counter.js';
import { hueToRgbaString } from '../view/topics.js';
import { compute3DRadialLayout, compute3DSwimLanes } from './layouts3d.js';
import { applySphericalScatter } from './scatter.js';
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
renderer.toneMappingExposure = 0.85;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
// Auto-rotate intro: первые 4 секунды камера медленно вращается чтобы
// сразу было видно что это 3D, а не плоский граф.
controls.autoRotate = true;
controls.autoRotateSpeed = CFG.cameraRotateSpeed;
let _introRotateTimer = null;

// Флаг: пользователь руками двигал камеру → fitCameraToBBox не должна
// перезаписывать его ракурс при click 🎥. OrbitControls 'start' срабатывает
// только при pointerdown пользователя, не при programmatic .set().
let _userMovedCamera = false;
controls.addEventListener('start', () => { _userMovedCamera = true; });

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

// Адаптивное качество рендера — при включённом autoRotate снижаем
// bloomPass strength/radius (UnrealBloomPass scaling ≈ radius², поэтому
// 0.40 → 0.30 даёт ~1.5× ускорение) и pixelRatio (1.5 вместо 2 на retina —
// в движении разница не видна). При выкл — возвращаем wow-настройки.
function applyRenderQuality(autoRotateActive) {
  if (autoRotateActive) {
    bloomPass.strength = 0.25;
    bloomPass.radius = 0.30;
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  } else {
    bloomPass.strength = 0.45;
    bloomPass.radius = 0.40;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  }
}

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

// Birth-comet particles: для каждой ноды у которой идёт birth-animation,
// рисуется яркая «комета» бегущая от parent.position к target.position
// вдоль bezier. Когда комета достигает target, она исчезает и на её
// месте начинает расцветать орб ноды. Один THREE.Points на все ноды.
let birthCometPoints = null;
let birthCometPositions = null; // Float32Array — позиция кометы каждой ноды
let birthCometColors = null;    // Float32Array — RGB кометы (color per node)

// Forward signal particles — частицы вдоль обычных edges (parent → child).
// Аналог 2D edge-particles. Цвет = edge color. Каждое ребро имеет PARTICLES_PER_EDGE
// частиц, разнесённых по фазе.
let forwardSignalPoints = null;
let forwardSignalPositions = null;
let forwardSignalColors = null;
const FWD_PARTICLES_PER_EDGE = 1;

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

    // Specular highlight — белый «зеркальный» блик где normal направлен
    // в камеру (head-light setup). pow(ndv, 24) даёт компактное пятно
    // близко к видимому центру; pulse'ом «дышит» как живой блеск.
    // Это превращает плоский светящийся диск в 3D-сферу с поверхностью.
    float spec = pow(max(0.0, ndv), 24.0);
    finalCol += vec3(1.0, 1.0, 1.0) * spec * 0.45 * (0.7 + 0.3 * pulse);

    // Selected — повышенная яркость + добавка золотого
    if (uSelected > 0.5) {
      finalCol *= 1.5 + 0.5 * pulse;
      finalCol += vec3(1.0, 0.85, 0.4) * fresnel * 0.6;
    }

    gl_FragColor = vec4(finalCol, uAlpha);
  }
`;

// Halo: вокруг каждой ноды soft-glow «облачко». Fragment shader:
//   • Fresnel falloff (силуэт ярче чем центр) — даёт мягкий ободок
//     наружу, без жёсткой границы sphere
//   • Slow pulsation amplitude (0.7→1.0)
//   • Альфа экспоненциально падает к центру → нода в halo читается
const HALO_VS = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 pos = modelViewMatrix * vec4(position, 1.0);
    vView = -normalize(pos.xyz);
    gl_Position = projectionMatrix * pos;
  }
`;
const HALO_FS = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPhase;
  uniform float uAlpha;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float ndv = abs(dot(normalize(vNormal), normalize(vView)));
    // Fresnel — soft outer glow, центр прозрачный, силуэт ярче
    float fresnel = pow(1.0 - ndv, 2.5);
    float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + uPhase);
    float a = fresnel * (0.7 + 0.3 * pulse) * uAlpha;
    gl_FragColor = vec4(uColor * (1.4 + 0.3 * pulse), a * 0.45);
  }
`;
function makeHaloMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uPhase: { value: Math.random() * Math.PI * 2 },
      uAlpha: { value: 1.0 },
    },
    vertexShader: HALO_VS,
    fragmentShader: HALO_FS,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide, // снаружи view → fresnel правильный
  });
}

// Round particle material — Canvas-generated radial-gradient texture.
// Three.js PointsMaterial с map+vertexColors надёжно работает (в отличие
// от ShaderMaterial с custom attribute, которая ломалась в некоторых
// браузерах). Texture даёт soft round shape вместо квадратов.
let _roundParticleTex = null;
function getRoundParticleTexture() {
  if (_roundParticleTex) return _roundParticleTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _roundParticleTex = new THREE.CanvasTexture(c);
  _roundParticleTex.minFilter = THREE.LinearFilter;
  return _roundParticleTex;
}
function makeRoundParticleMaterial(size, opacity) {
  return new THREE.PointsMaterial({
    size: size,
    sizeAttenuation: true,
    map: getRoundParticleTexture(),
    vertexColors: true,
    transparent: true,
    opacity: opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    alphaTest: 0.01,
  });
}

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
  // GPU MEMORY LEAK FIX: reverseSignalGroup не очищался при повторных
  // loadText. Каждая загрузка добавляла +3 Points (reverseSignal,
  // birthComet, forwardSignal) с своими geometry+material, старые
  // оставались в сцене → GPU usage rose.
  while (reverseSignalGroup.children.length) {
    const m = reverseSignalGroup.children.pop();
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

    // Halo — soft-glow shader (fresnel-based exponential falloff +
    // pulsation), additive blending. Естественнее чем плоский opacity.
    const haloMat = makeHaloMaterial(color);
    const halo = new THREE.Mesh(sphereGeoHalo, haloMat);
    halo.position.copy(mesh.position);
    halo.scale.set(baseR * 2.6, baseR * 2.6, baseR * 2.6);
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

  // Reverse-signal points — одна частица на pair-edge, обновляется в tick.
  // Также birth-comet points — одна частица на ноду (показывается только
  // во время birth-animation на конце растущего ребра).
  while (reverseSignalGroup.children.length) {
    const m = reverseSignalGroup.children.pop();
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
  }
  reverseSignalPoints = null;
  reverseSignalPositions = null;
  birthCometPoints = null;
  birthCometPositions = null;
  birthCometColors = null;
  forwardSignalPoints = null;
  forwardSignalPositions = null;
  forwardSignalColors = null;
  const pairCount = (state.pairEdges || []).length;
  if (pairCount > 0) {
    reverseSignalPositions = new Float32Array(pairCount * 3);
    // Все reverse-signal частицы лимонно-жёлтые — заполняем colors сразу
    const rsColors = new Float32Array(pairCount * 3);
    for (let i = 0; i < pairCount; i++) {
      rsColors[i * 3]     = 1.0;
      rsColors[i * 3 + 1] = 0.94;
      rsColors[i * 3 + 2] = 0.36;
    }
    const rsGeom = new THREE.BufferGeometry();
    rsGeom.setAttribute('position', new THREE.BufferAttribute(reverseSignalPositions, 3));
    rsGeom.setAttribute('color', new THREE.BufferAttribute(rsColors, 3));
    reverseSignalPoints = new THREE.Points(rsGeom, makeRoundParticleMaterial(14, 0.95));
    reverseSignalPoints.frustumCulled = false;
    reverseSignalGroup.add(reverseSignalPoints);
  }

  // Birth-comets — один Points на все ноды, vertex colors per node
  // (комета окрашивается в цвет ноды, чтобы было видно «куда бежит»).
  if (state.nodes.length > 0) {
    birthCometPositions = new Float32Array(state.nodes.length * 3);
    birthCometColors = new Float32Array(state.nodes.length * 3);
    const bcGeom = new THREE.BufferGeometry();
    bcGeom.setAttribute('position', new THREE.BufferAttribute(birthCometPositions, 3));
    bcGeom.setAttribute('color', new THREE.BufferAttribute(birthCometColors, 3));
    birthCometPoints = new THREE.Points(bcGeom, makeRoundParticleMaterial(22, 1.0));
    birthCometPoints.frustumCulled = false;
    reverseSignalGroup.add(birthCometPoints);
  }

  // Forward signal particles — частицы вдоль обычных edges. Каждое
  // ребро имеет FWD_PARTICLES_PER_EDGE частиц с разной фазой.
  const fwdCount = state.edges.length * FWD_PARTICLES_PER_EDGE;
  if (fwdCount > 0) {
    forwardSignalPositions = new Float32Array(fwdCount * 3);
    forwardSignalColors = new Float32Array(fwdCount * 3);
    const fGeom = new THREE.BufferGeometry();
    fGeom.setAttribute('position', new THREE.BufferAttribute(forwardSignalPositions, 3));
    fGeom.setAttribute('color', new THREE.BufferAttribute(forwardSignalColors, 3));
    forwardSignalPoints = new THREE.Points(fGeom, makeRoundParticleMaterial(10, 0.85));
    forwardSignalPoints.frustumCulled = false;
    reverseSignalGroup.add(forwardSignalPoints);
  }

  // Инициализируем buffer первым кадром
  updateEdgeBuffer();

  // Fit camera по bbox + intro auto-rotate
  fitCameraToBBox();
  controls.autoRotate = true;
  if (_introRotateTimer) clearTimeout(_introRotateTimer);
  _introRotateTimer = setTimeout(() => {
    if (!_cameraRotateUserOn) controls.autoRotate = false;
    _introRotateTimer = null;
  }, 4000);
  updateStats();
}

// Bounding box fit камеры. Изометрический ракурс ~30° сверху-сбоку.
// opts.onlyVisible=true — берём только ноды с bornAt != null (для play
// mode, где остальные ноды пред-размещены prewarm3D но ещё не видны).
// Если onlyVisible не нашёл ни одной → fallback на все.
//
// После programmatic camera.set() сбрасывается _userMovedCamera, чтобы
// последующие auto-fit'ы продолжали работать пока пользователь не начнёт
// pan вручную.
function fitCameraToBBox(opts) {
  if (!state.nodes.length) return;
  const onlyVisible = !!(opts && opts.onlyVisible);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let count = 0;
  for (const n of state.nodes) {
    if (onlyVisible && n.bornAt == null) continue;
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    const ny = -n.y;
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
    const nz = n.z || 0;
    if (nz < minZ) minZ = nz;
    if (nz > maxZ) maxZ = nz;
    count++;
  }
  // Fallback на все ноды если onlyVisible не нашёл ничего (очень в начале play)
  if (count === 0) return fitCameraToBBox({ onlyVisible: false });

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const size = Math.max(sizeX, sizeY, sizeZ, 400);
  const dist = (size * 0.5) / Math.tan((55 * Math.PI / 180) / 2) * 1.7;
  camera.position.set(cx + dist * 0.55, cy - dist * 0.45, cz + dist * 0.75);
  controls.target.set(cx, cy, cz);
  controls.update();
  // Программный fit — сбрасываем флаг manual pan
  _userMovedCamera = false;
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

    // Edge growth: ребро растёт от parent к target по мере birth-фактора.
    // К bf=0.7 (BIRTH_COMET_END) ребро на 100% — это момент когда комета
    // достигает target и mesh ноды начинает расцветать.
    const childBf = birthFactor(b.bornAt, performance.now(), CFG.birthDurationMs);
    const growT = Math.min(1, childBf / 0.7); // полный edge к bf=0.7

    const hex = edgeColorHex(e);
    _edgeColor.setHex(hex);
    const r = _edgeColor.r, g = _edgeColor.g, bl = _edgeColor.b;
    const tf = state.topicFilter;
    const topicDim = tf ? ((a._topicWord === tf && b._topicWord === tf) ? 1 : 0.2) : 1;
    const alpha = (e.adopted ? 0.4 : 0.85) * topicDim;
    // Рисуем EDGE_SEGMENTS отрезков; если growT < 1, ребро доходит только
    // до t = growT, оставшиеся сегменты схлопываются в endpoint.
    for (let s = 0; s < EDGE_SEGMENTS; s++) {
      const t0raw = s / EDGE_SEGMENTS;
      const t1raw = (s + 1) / EDGE_SEGMENTS;
      const t0 = Math.min(growT, t0raw);
      const t1 = Math.min(growT, t1raw);
      bezierPoint3(_tmpA, _tmpM, _tmpB, t0, _p0);
      bezierPoint3(_tmpA, _tmpM, _tmpB, t1, _p1);
      pos[pIdx++] = _p0.x; pos[pIdx++] = _p0.y; pos[pIdx++] = _p0.z;
      pos[pIdx++] = _p1.x; pos[pIdx++] = _p1.y; pos[pIdx++] = _p1.z;
      const fade = Math.min(1, 1 - Math.abs((s + 0.5) / EDGE_SEGMENTS - 0.5) * 0.6);
      // Скрываем сегменты которые дальше growT: alpha=0
      const segVisible = (t1raw <= growT + 1e-3) ? 1 : 0;
      const a2 = alpha * fade * segVisible;
      col[cIdx++] = r * a2; col[cIdx++] = g * a2; col[cIdx++] = bl * a2;
      col[cIdx++] = r * a2; col[cIdx++] = g * a2; col[cIdx++] = bl * a2;
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

// Обновляет позиции birth-комет. Каждая нода во время birth-animation
// (bf < BIRTH_COMET_END) показывает «комету» бегущую от parent к target
// вдоль bezier. После BIRTH_COMET_END комета исчезает (-1e6) и на её
// месте начинает расцветать сама нода (см. update node meshes ниже).
const BIRTH_COMET_END = 0.7; // bf threshold: до 0.7 ребро + комета, 0.7→1.0 нода появляется
const _bcA = new THREE.Vector3();
const _bcB = new THREE.Vector3();
const _bcM = new THREE.Vector3();
const _bcOut = new THREE.Vector3();
function updateBirthComets(nowMs) {
  if (!birthCometPoints || !birthCometPositions || !birthCometColors) return;
  const FAR = -1e6;
  let i = 0;
  for (const n of state.nodes) {
    const off3 = i * 3;
    i++;
    if (n.bornAt == null || !n.parentId) {
      birthCometPositions[off3] = FAR;
      birthCometPositions[off3 + 1] = FAR;
      birthCometPositions[off3 + 2] = FAR;
      continue;
    }
    const bf = birthFactor(n.bornAt, nowMs, CFG.birthDurationMs);
    if (bf >= BIRTH_COMET_END) {
      birthCometPositions[off3] = FAR;
      birthCometPositions[off3 + 1] = FAR;
      birthCometPositions[off3 + 2] = FAR;
      continue;
    }
    const parent = state.byId.get(n.parentId);
    if (!parent || parent.bornAt == null) {
      birthCometPositions[off3] = FAR;
      birthCometPositions[off3 + 1] = FAR;
      birthCometPositions[off3 + 2] = FAR;
      continue;
    }
    // Bezier от parent (a) к target (b) с control point чуть отнесённым
    const ax = parent.x, ay = -parent.y, az = parent.z || 0;
    const bx = n.x, by = -n.y, bz = n.z || 0;
    const mx = (ax + bx) / 2 + ((n._seedDx || 0) - 0.5) * 30;
    const my = -((parent.y + n.y) / 2) + ((n._seedDy || 0) - 0.5) * 30;
    const mz = (az + bz) / 2 + 35;
    _bcA.set(ax, ay, az);
    _bcB.set(bx, by, bz);
    _bcM.set(mx, my, mz);
    const tt = bf / BIRTH_COMET_END; // 0..1 от parent к target
    const u = 1 - tt;
    birthCometPositions[off3]     = u * u * ax + 2 * u * tt * mx + tt * tt * bx;
    birthCometPositions[off3 + 1] = u * u * ay + 2 * u * tt * my + tt * tt * by;
    birthCometPositions[off3 + 2] = u * u * az + 2 * u * tt * mz + tt * tt * bz;
    // Цвет = цвет ноды (node color), чтобы комета явно «несла» цвет
    const { color } = colorForNode(n);
    _edgeColor.setHex(color);
    birthCometColors[off3]     = _edgeColor.r * 1.5; // brighten
    birthCometColors[off3 + 1] = _edgeColor.g * 1.5;
    birthCometColors[off3 + 2] = _edgeColor.b * 1.5;
  }
  birthCometPoints.geometry.attributes.position.needsUpdate = true;
  birthCometPoints.geometry.attributes.color.needsUpdate = true;
}

// Forward signal particles — частицы движутся вдоль обычных parent→child
// edges (как в 2D edge-particles). Цвет = edge color. Phase = (t × ω + seed) % 1.
// Если ребро невидимо (одна из нод не родилась / hidden / collapsed / adopted
// без connectOrphans) — частица скрыта за -1e6.
const _fwdEdgeColor = new THREE.Color();
function updateForwardSignalBuffer(tSec) {
  if (!forwardSignalPoints || !forwardSignalPositions || !forwardSignalColors) return;
  if (state.showForwardSignal === false) {
    forwardSignalPoints.visible = false;
    return;
  }
  forwardSignalPoints.visible = true;
  const FAR = -1e6;
  const hidden = state.hiddenRoles;
  const collapsed = state.collapsed;
  const connectOrphans = !!state.connectOrphans;
  let i = 0;
  for (const e of state.edges) {
    for (let p = 0; p < FWD_PARTICLES_PER_EDGE; p++) {
      const off3 = i * 3;
      i++;
      const a = e.a, b = e.b;
      const invisible = !a || !b
        || a.bornAt == null || b.bornAt == null
        || (hidden && (hidden.has(a.role) || hidden.has(b.role)))
        || (e.adopted && !connectOrphans)
        || (a.role === 'tool_use' && a.parentId && collapsed && collapsed.has(a.parentId))
        || (b.role === 'tool_use' && b.parentId && collapsed && collapsed.has(b.parentId));
      if (invisible) {
        forwardSignalPositions[off3] = FAR;
        forwardSignalPositions[off3 + 1] = FAR;
        forwardSignalPositions[off3 + 2] = FAR;
        continue;
      }
      const ax = a.x, ay = -a.y, az = a.z || 0;
      const bx = b.x, by = -b.y, bz = b.z || 0;
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const len = Math.hypot(dx, dy, dz) || 1;
      // Control point чуть отнесён по +Y для arc'a (как edges)
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2 + len * 0.10;
      const cz = (az + bz) / 2;
      // Phase: уникальная для каждой частицы (по edge index + p)
      const seed = ((a.phase || 0) + (b.phase || 0)) * 0.13 + p * 0.5;
      const tt = ((tSec * 0.55 + seed) % 1.0 + 1.0) % 1.0;
      const u = 1 - tt;
      forwardSignalPositions[off3]     = u * u * ax + 2 * u * tt * cx + tt * tt * bx;
      forwardSignalPositions[off3 + 1] = u * u * ay + 2 * u * tt * cy + tt * tt * by;
      forwardSignalPositions[off3 + 2] = u * u * az + 2 * u * tt * cz + tt * tt * bz;
      // Цвет — color of edge (edgeColorHex даёт hex)
      _fwdEdgeColor.setHex(edgeColorHex(e));
      forwardSignalColors[off3]     = _fwdEdgeColor.r;
      forwardSignalColors[off3 + 1] = _fwdEdgeColor.g;
      forwardSignalColors[off3 + 2] = _fwdEdgeColor.b;
    }
  }
  forwardSignalPoints.geometry.attributes.position.needsUpdate = true;
  forwardSignalPoints.geometry.attributes.color.needsUpdate = true;
}

// === Drift mode ===
//
// Лёгкое sinusoidal-движение каждой ноды вокруг своей settled-позиции.
// Включается кнопкой 🌊 в HUD. Когда drift on:
//   1. Запоминаем _driftCenterX/Y/Z = текущие x/y/z (settled position)
//   2. sim.frozen = true (физика не работает параллельно с drift)
//   3. Каждый кадр в tickDrift(): n.x = _driftCenterX + sin(t × ω + φ × k) × A
//      разные frequencies/phases на разных осях → 3D-blob-like дыхание
//   4. При выкл — восстанавливаем positions = _driftCenterX/Y/Z, размораживаем sim
//
// Edges и meshes автоматически следуют за n.x/y/z (они обновляются в общем
// tick'е), поэтому drift работает консистентно с остальной сценой.
const DRIFT_AMP = 8;          // px max offset вокруг settled-позиции
const DRIFT_FREQ = 0.30;      // основная частота движения rad/sec
let _driftActive = false;
let _btnDrift = null;

function setDrift(on) {
  if (on === _driftActive) return;
  if (on) {
    for (const n of state.nodes) {
      n._driftCenterX = n.x;
      n._driftCenterY = n.y;
      n._driftCenterZ = n.z || 0;
    }
    if (state.sim) state.sim.frozen = true;
  } else {
    for (const n of state.nodes) {
      if (n._driftCenterX != null) {
        n.x = n._driftCenterX;
        n.y = n._driftCenterY;
        n.z = n._driftCenterZ;
        delete n._driftCenterX;
        delete n._driftCenterY;
        delete n._driftCenterZ;
      }
    }
    // physics НЕ unfreezeим — пользователь явно её frozen или на drift
  }
  _driftActive = on;
  state.drift = on;
  try { localStorage.setItem('viz:drift-3d', on ? '1' : '0'); } catch {}
  updateDriftBtn();
}

function tickDrift(tSec) {
  if (!_driftActive) return;
  for (const n of state.nodes) {
    if (n._driftCenterX == null) continue;
    n.x = n._driftCenterX + Math.sin(tSec * DRIFT_FREQ + n.phase * 1.7) * DRIFT_AMP;
    n.y = n._driftCenterY + Math.sin(tSec * DRIFT_FREQ * 1.13 + n.phase * 2.3) * DRIFT_AMP;
    n.z = n._driftCenterZ + Math.sin(tSec * DRIFT_FREQ * 0.91 + n.phase * 3.1) * DRIFT_AMP;
  }
}

function updateDriftBtn() {
  if (!_btnDrift) return;
  _btnDrift.classList.toggle('active-drift', _driftActive);
  _btnDrift.title = _driftActive ? _t('tip.drift_off') : _t('tip.drift_on');
}

// === Camera auto-rotate toggle (постоянное вращение, не intro) ===
let _btnCameraRotate = null;
let _cameraRotateUserOn = false;

function setCameraRotate(on) {
  _cameraRotateUserOn = on;
  controls.autoRotate = on;
  if (on && _introRotateTimer) {
    clearTimeout(_introRotateTimer);
    _introRotateTimer = null;
  }
  // При включении rotate — центруем НА видимые ноды если пользователь
  // не настраивал камеру вручную. Если настраивал — сохраняем его ракурс.
  if (on && !_userMovedCamera) fitCameraToBBox({ onlyVisible: true });
  // Уровень пост-обработки — при autoRotate уменьшаем bloom для FPS.
  applyRenderQuality(on);
  try { localStorage.setItem('viz:camera-rotate-3d', on ? '1' : '0'); } catch {}
  updateCameraRotateBtn();
}

// Ручное центрирование камеры — кнопка 🎯. Всегда фит на видимые ноды
// (или все, если play не запущен). Явно сбрасывает manual-pan флаг —
// пользователь хочет «начать заново», что бы он там ни делал.
function resetCamera3D() {
  _userMovedCamera = false;
  fitCameraToBBox({ onlyVisible: true });
}

function updateCameraRotateBtn() {
  if (!_btnCameraRotate) return;
  _btnCameraRotate.classList.toggle('active-camera', _cameraRotateUserOn);
  _btnCameraRotate.title = _cameraRotateUserOn ? _t('tip.camera_rotate_off') : _t('tip.camera_rotate_on');
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

// applySphericalScatter — вынесен в src/3d/scatter.js для тестирования
// (pure JS, без Three.js dep).

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
  // При initial load (timeline в конце = все ноды должны быть видны)
  // выставляем bornAt далеко в прошлое — birth animation не запускается,
  // ноды и edges сразу полные. Birth animation останется только для
  // play-mode когда ноды рождаются по таймлайну.
  // Иначе все 60 нод стартуют birth-анимацию синхронно — и одновременный
  // рост 60 отростков выглядит хаотично.
  if (state.timelineMax >= 0.999) {
    const longAgo = performance.now() - CFG.birthDurationMs * 3;
    for (const n of state.nodes) n.bornAt = longAgo;
  }
  // Explode intro — ноды коллапсируются в центр и взрываются на target за 1.5s.
  // Это INDEPENDENT от birth animation — позиция animateётся, scale полный.
  startExplodeIntro(state.nodes);
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
initAudio();
initFpsCounter('fps-counter');
init3DLayoutSwitch();
init3DDriftAndCameraButtons();

function init3DDriftAndCameraButtons() {
  _btnDrift = document.getElementById('btn-drift');
  _btnCameraRotate = document.getElementById('btn-camera-rotate');
  const btnCameraReset = document.getElementById('btn-camera-reset');
  if (_btnDrift) _btnDrift.addEventListener('click', () => setDrift(!_driftActive));
  if (_btnCameraRotate) _btnCameraRotate.addEventListener('click', () => setCameraRotate(!_cameraRotateUserOn));
  if (btnCameraReset) btnCameraReset.addEventListener('click', resetCamera3D);
  // Restore persisted settings
  try {
    if (localStorage.getItem('viz:camera-rotate-3d') === '1') setCameraRotate(true);
    if (localStorage.getItem('viz:drift-3d') === '1') {
      // Drift включаем после explode intro (1500ms) + запас (~1000ms на
      // settle physics после unfreeze) — иначе _driftCenter записался бы
      // на промежуточные positions посреди анимации explode'а.
      const driftDelay = _explodeDuration + 1000;
      setTimeout(() => setDrift(true), driftDelay);
    }
  } catch {}
  updateDriftBtn();
  updateCameraRotateBtn();
}

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
  // Drift замораживает sim и переписывает n.x/y/z в каждом кадре —
  // несовместим с layout switch. Выключаем перед применением target'ов.
  if (_driftActive) setDrift(false);
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
      // Если parent отсутствует (root) или ещё не родился — комета
      // лететь неоткуда. Пропускаем birth-animation: ставим bornAt
      // далеко в прошлое, нода появляется мгновенно на target.
      // Иначе классическая 2-фазная birth animation (комета 0→0.7,
      // расцветание орба 0.7→1.0).
      const parent = n.parentId ? state.byId.get(n.parentId) : null;
      if (!parent || parent.bornAt == null) {
        n.bornAt = nowMs - CFG.birthDurationMs * 3;
      } else {
        n.bornAt = nowMs;
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
  // Подхватываем cameraRotateSpeed из CFG (Settings modal может поменять)
  controls.autoRotateSpeed = CFG.cameraRotateSpeed;
  controls.update();

  tickPlay();
  updateBirths3D(nowMs);
  tickLayoutTransition3D();
  tickExplode(nowMs);  // intro animation — приоритет над physics
  tickDrift(nowMs / 1000);  // лёгкое sin-movement (если drift on)

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
    // Halo показывается ТОЛЬКО в phase 2 birth animation (после bf>=0.7),
    // когда комета достигла target и сама нода появилась. Раньше halo
    // зажигался при bornAt!=null — то есть до того как mesh появился.
    if (n._halo) n._halo.visible = visible && bf >= BIRTH_COMET_END;
    // Hub/orphan rings — как halo, появляются только в phase 2 (после
    // того как комета прилетела и mesh ноды начал расцветать). Раньше
    // загорались сразу при bornAt → кольца висели в воздухе пока орб
    // ещё не появился.
    const inPhase2 = bf >= BIRTH_COMET_END;
    if (n._hubRing) n._hubRing.visible = visible && inPhase2;
    if (n._orphRing) n._orphRing.visible = visible && inPhase2 && (!n._adoptedParentId || !!state.connectOrphans || n._isOrphanRoot);
    if (!visible) continue;
    // Birth animation: яркая комета бежит от parent к target по bezier.
    // 0.0 → 0.7 (BIRTH_COMET_END): комета видна, ребро растёт за ней.
    //   Нода-mesh ещё невидима (scale 0, alpha 0) — на target виден ТОЛЬКО
    //   яркий «летящий шарик» (THREE.Points в updateBirthComets).
    // 0.7 → 1.0: комета исчезает, mesh начинает расцветать (scale 0→1,
    //   alpha 0→1) на target-позиции. Edge уже full length.
    // Edge growth обрабатывается отдельно в updateEdgeBuffer.
    const bfRaw = bf;
    const nodeBf = Math.max(0, (bfRaw - 0.7) / 0.3); // 0..1 после bf=0.7
    const ag = easeOutCubic(nodeBf);
    mesh.position.set(n.x, -n.y, n.z || 0);
    const baseR = n.r * 1.25;
    const hubPulse = n.isHub ? (1 + 0.3 * Math.sin(t * 1.8 + n.phase)) : 1;
    const breathPulse = 1 + 0.06 * Math.sin(t * 1.6 + n.phase * 1.7);
    // Scale 0 → 1 (а не 0.5 → 1) — чтобы появление было плавным
    const scale = baseR * ag * hubPulse * breathPulse;
    mesh.scale.set(scale, scale, scale);
    // Dim при активном search/path если не матч
    let dimMul = 1;
    if (hasSearch) dimMul = state.searchMatches.has(n.id) ? 1 : 0.22;
    else if (topicFilter) dimMul = n._topicWord === topicFilter ? 1 : 0.22;
    else if (hasPath) dimMul = state.pathSet.has(n.id) ? 1 : 0.3;
    if (mesh.material && mesh.material.uniforms) {
      const u = mesh.material.uniforms;
      u.uTime.value = t;
      // alpha от 0 (невидимо) до 1.0 пропорционально nodeBf
      u.uAlpha.value = ag * dimMul;
      // Динамический цвет (topics/diff/role переключаются на лету)
      const { color } = colorForNode(n);
      u.uColor.value.setHex(color);
      u.uSelected.value = (state.selected === n) ? 1 : 0;
    }
    // Halo — soft-glow shader (см. HALO_FS), пульсирует и растёт вместе с ag.
    if (n._halo && n._halo.visible) {
      n._halo.position.copy(mesh.position);
      const haloR = baseR * (2.4 + 0.25 * Math.sin(t * 1.0 + n.phase)) * (0.6 + 0.4 * ag);
      n._halo.scale.set(haloR, haloR, haloR);
      if (n._halo.material && n._halo.material.uniforms) {
        const u = n._halo.material.uniforms;
        u.uTime.value = t;
        u.uAlpha.value = ag * dimMul * (hasSearch && state.searchMatches.has(n.id) ? 1.6 : 1.0);
        if (topicsMode || diffMode) {
          const { color } = colorForNode(n);
          u.uColor.value.setHex(color);
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
  updateBirthComets(nowMs);
  updateForwardSignalBuffer(t);

  tickStory(nowMs, state);
  tickStats();
  tickFps(nowMs);

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
