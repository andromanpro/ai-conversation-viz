import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { parseJSONL } from '../core/parser.js';
import { buildGraph } from '../core/graph.js';
import { prewarm } from '../core/layout.js';
import { SAMPLE_JSONL } from '../core/sample.js';
import { normalizeToClaudeJsonl } from '../core/adapters.js';
import { computeDepths } from '../core/tree.js';

const ROLE_COLORS = {
  user: 0x7baaf0,
  assistant: 0x50d4b5,
  tool_use: 0xeca040,
};

const container = document.getElementById('three-container');
const infoEl = document.getElementById('info');
const fileInput = document.getElementById('file-input');
const btnFile = document.getElementById('btn-file');
const btnSample = document.getElementById('btn-sample');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);
// Лёгкий туман для глубины, но без «стены» близко — начинается далеко,
// полностью растворяется только на огромных расстояниях.
scene.fog = new THREE.Fog(0x0a0e1a, 1800, 8000);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 5000);
camera.position.set(0, -200, 900);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.AmbientLight(0x3a4a7a, 0.5));
const keyLight = new THREE.PointLight(0x7baaf0, 1.6, 3000);
keyLight.position.set(400, 400, 800);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x50d4b5, 0.8, 2000);
rimLight.position.set(-400, -300, 400);
scene.add(rimLight);

// Starfield через Points
const starCount = 2000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[3*i]   = (Math.random() - 0.5) * 4000;
  starPos[3*i+1] = (Math.random() - 0.5) * 4000;
  starPos[3*i+2] = (Math.random() - 0.5) * 4000;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xc8dcff, size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.55 });
scene.add(new THREE.Points(starGeo, starMat));

const nodesGroup = new THREE.Group();
const edgesGroup = new THREE.Group();
scene.add(nodesGroup);
scene.add(edgesGroup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null;
let selected = null;

let graph = null;

function clearGroups() {
  while (nodesGroup.children.length) {
    const m = nodesGroup.children.pop();
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
  }
  while (edgesGroup.children.length) {
    const m = edgesGroup.children.pop();
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
  }
}

function buildScene(text) {
  clearGroups();
  const norm = normalizeToClaudeJsonl(text);
  const parsed = parseJSONL(norm.text);
  if (!parsed.nodes.length) { setInfo('No messages'); return; }

  const vp = { width: 1200, height: 900, cx: 0, cy: 0, safeW: 1200, safeH: 900 };
  const g = buildGraph(parsed, vp);
  prewarm(g.nodes, g.edges, vp);

  const depths = computeDepths(g.nodes, g.byId);
  const ringZ = 120;
  for (const n of g.nodes) {
    n.z = (depths.get(n.id) || 0) * ringZ;
  }

  // Nodes
  for (const n of g.nodes) {
    const color = ROLE_COLORS[n.role] || 0x888888;
    const geo = new THREE.SphereGeometry(n.r * 1.25, 20, 20);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      metalness: 0.25,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(n.x, -n.y, n.z || 0);
    mesh.userData.node = n;
    mesh.userData.baseScale = 1;
    mesh.userData.phase = n.phase || Math.random() * Math.PI * 2;
    nodesGroup.add(mesh);
    n._mesh = mesh;
  }

  // Edges — glowing tubes
  for (const e of g.edges) {
    const a = e.a, b = e.b;
    const az = a.z || 0, bz = b.z || 0;
    const mid = new THREE.Vector3(
      (a.x + b.x) / 2 + (Math.random() - 0.5) * 40,
      -((a.y + b.y) / 2) + (Math.random() - 0.5) * 40,
      (az + bz) / 2 + 50
    );
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(a.x, -a.y, az),
      mid,
      new THREE.Vector3(b.x, -b.y, bz),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.7, 6, false);
    const color = e.b.role === 'tool_use' ? 0xeca040 : 0x00d4ff;
    const tubeMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
      fog: false, // tube'ы не затуманиваются — видно связи
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    edgesGroup.add(tube);
  }

  graph = g;
  setInfo(`${g.nodes.length} nodes · ${g.edges.length} edges · ${norm.format}`);
  // Центрируем камеру по bbox
  let maxD = 0;
  for (const n of g.nodes) {
    const d = Math.hypot(n.x, n.y, n.z || 0);
    if (d > maxD) maxD = d;
  }
  camera.position.set(0, -maxD * 0.4, maxD * 1.8 + 300);
  controls.target.set(0, 0, 0);
  controls.update();
}

function setInfo(text) {
  if (infoEl) infoEl.textContent = text;
}

// Click selection
renderer.domElement.addEventListener('click', (ev) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(nodesGroup.children, false);
  if (hits.length) {
    const n = hits[0].object.userData.node;
    selected = n;
    const role = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
    const preview = (n.text || '').slice(0, 160);
    setInfo(`[${role}] ${preview}${n.text.length > 160 ? '…' : ''}`);
  } else {
    selected = null;
    if (graph) setInfo(`${graph.nodes.length} nodes · ${graph.edges.length} edges`);
  }
});

// Animation
function tick() {
  requestAnimationFrame(tick);
  controls.update();
  const t = performance.now() / 1000;
  for (const mesh of nodesGroup.children) {
    const phase = mesh.userData.phase || 0;
    const s = 1 + 0.06 * Math.sin(t * 2 + phase);
    mesh.scale.set(s, s, s);
    if (mesh.material && mesh.material.emissiveIntensity != null) {
      const node = mesh.userData.node;
      const boost = node ? (0.3 + 0.7 * (node.recency || 0)) : 1;
      mesh.material.emissiveIntensity = 0.35 + 0.25 * boost * (0.5 + 0.5 * Math.sin(t * 1.6 + phase));
    }
  }
  if (selected && selected._mesh) {
    // выделенной ноды — сильнее свечение
    selected._mesh.material.emissiveIntensity = 1.2;
  }
  renderer.render(scene, camera);
}
tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loaders
btnSample.addEventListener('click', () => buildScene(SAMPLE_JSONL));
btnFile.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => buildScene(String(reader.result));
  reader.readAsText(f);
  fileInput.value = '';
});

// drag-drop
window.addEventListener('dragover', ev => ev.preventDefault());
window.addEventListener('drop', ev => {
  ev.preventDefault();
  const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => buildScene(String(reader.result));
  reader.readAsText(f);
});

// URL param
const qJsonl = new URLSearchParams(location.search).get('jsonl');
if (qJsonl) {
  fetch(qJsonl, { cache: 'no-store' })
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(buildScene)
    .catch(() => buildScene(SAMPLE_JSONL));
} else {
  buildScene(SAMPLE_JSONL);
}
