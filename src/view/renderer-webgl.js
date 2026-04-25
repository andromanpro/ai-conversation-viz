// WebGL-рендерер v2 — красивая альтернатива Canvas 2D.
//
// 4 passes на кадр (все — один draw call каждый, GPU-heavy):
//   1. Starfield (статичные точки на фоне)
//   2. Edge bezier segments (gl.LINES, градиент к середине)
//   3. Edge particles (gl.POINTS, бегут вдоль рёбер, питаются от u_time)
//   4. Nodes (gl.POINTS, multi-layer glow + pulse + white core)
//   5. Hub rings (gl.POINTS, вложенный fragment shader рисует annulus)
//
// Все цвета/размеры пересчитываются CPU'ом каждый кадр (buffer upload)
// — для 10k нод это ~500KB/frame, тянет 60 fps. Вершинные трансформации
// и все shading-эффекты — на GPU через uniforms.

import { CFG } from '../core/config.js';

// ==== GLSL shaders ====

// --- Points (nodes) ---
const POINT_VS = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_size;
  attribute float a_phase;    // для пульса (0..2π)
  attribute float a_flags;    // bit0 = search match, bit1 = selected
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  uniform float u_time;
  varying vec4 v_color;
  varying float v_pulse;
  varying float v_highlight;

  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);

    // Пульс ноды — ядро «дышит»
    float pulse = 0.5 + 0.5 * sin(u_time * 1.8 + a_phase);
    v_pulse = pulse;

    // Флаги: 1.0 = search match (ярче + больше), 2.0 = selected
    v_highlight = a_flags;

    float sizeMul = 1.0 + 0.08 * pulse;
    if (mod(a_flags, 2.0) >= 1.0) {
      // match — заметное «биение»
      sizeMul *= 1.15 + 0.1 * sin(u_time * 4.2 + a_phase);
    }
    gl_PointSize = max(1.0, a_size * u_dpr * sizeMul);
    v_color = a_color;
  }
`;

// Multi-layer glow: плотное белое ядро → насыщенный цветной middle →
// мягкий halo. Даёт бёрн-эффект как у реальных светящихся орбов.
const POINT_FS = `
  precision mediump float;
  varying vec4 v_color;
  varying float v_pulse;
  varying float v_highlight;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Три слоя:
    //   core   — плотная яркая сердцевина (белая, нормализованная цветом)
    //   mid    — основной тон ноды
    //   halo   — мягкое свечение до края
    float core = smoothstep(0.25, 0.0, dist);
    float mid  = smoothstep(0.5, 0.15, dist);
    float halo = smoothstep(0.5, 0.0, dist) * 0.45;

    // Белая сердцевина: цвет стремится к белому в центре.
    vec3 whiteCore = mix(v_color.rgb, vec3(1.0, 1.0, 1.0), core * (0.65 + 0.25 * v_pulse));

    // Композиция (additive-friendly)
    vec3 rgb = whiteCore * (mid + halo * 0.35);
    float alpha = (mid + halo) * v_color.a;

    // Search-match — подсветка белым поверх
    if (mod(v_highlight, 2.0) >= 1.0) {
      float flash = smoothstep(0.5, 0.2, dist) * (0.5 + 0.5 * v_pulse);
      rgb += vec3(1.0, 1.0, 0.85) * flash * 0.6;
    }

    gl_FragColor = vec4(rgb, alpha);
  }
`;

// --- Hub rings ---
// Отдельный fragment shader рисует annulus (кольцо) в gl_PointCoord.
const HUB_VS = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_size;
  attribute float a_phase;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  uniform float u_time;
  varying vec4 v_color;
  varying float v_rotation;

  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    float sizeMul = 1.0 + 0.1 * sin(u_time * 1.2 + a_phase);
    gl_PointSize = max(2.0, a_size * u_dpr * sizeMul);
    v_color = a_color;
    v_rotation = u_time * 0.8 + a_phase;
  }
`;
const HUB_FS = `
  precision mediump float;
  varying vec4 v_color;
  varying float v_rotation;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    // Annulus: кольцо между 0.38 и 0.47 радиуса (от центра point-size)
    float ring = smoothstep(0.38, 0.42, dist) * smoothstep(0.49, 0.44, dist);
    // Разрывы по углу — даёт эффект «3 дуги, вращающихся»
    float angle = atan(coord.y, coord.x) + v_rotation;
    float arcs = 0.5 + 0.5 * sin(angle * 3.0);
    arcs = smoothstep(0.35, 0.65, arcs);
    float alpha = ring * (0.55 + 0.45 * arcs) * v_color.a;
    gl_FragColor = vec4(v_color.rgb * 1.2, alpha);
  }
`;

// --- Edges (bezier lines) ---
const LINE_VS = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  varying vec4 v_color;

  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    v_color = a_color;
  }
`;
const LINE_FS = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    gl_FragColor = v_color;
  }
`;

// --- Pair edges (tool_use ↔ tool_result, dotted lemon-yellow) ---
// Координаты идут как gl.LINES сегменты; для dotted-effect используем
// varying, который меняется вдоль линии (в каждой паре вершин t=0 и t=1),
// и в fragment отрезаем по mod(длина_от_старта).

// --- Error ring (красная пунктирная окружность вокруг assistant с tool error) ---
const ERR_VS = `
  precision mediump float;
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_phase;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  uniform float u_time;
  varying float v_phase;
  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    float pulse = 0.5 + 0.5 * sin(u_time * 3.5 + a_phase);
    gl_PointSize = max(8.0, a_size * u_dpr * (1.05 + 0.15 * pulse));
    v_phase = a_phase;
  }
`;
const ERR_FS = `
  precision mediump float;
  varying float v_phase;
  uniform float u_time;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    // Annulus 0.42..0.49
    float ring = smoothstep(0.42, 0.45, dist) * smoothstep(0.495, 0.46, dist);
    // Пунктирные сегменты по углу
    float angle = atan(coord.y, coord.x) + u_time * 1.2 + v_phase;
    float dash = 0.5 + 0.5 * sin(angle * 8.0);
    dash = smoothstep(0.4, 0.6, dash);
    float pulse = 0.55 + 0.45 * sin(u_time * 3.5 + v_phase);
    float alpha = ring * dash * pulse;
    // Красный с лёгким оранжевым оттенком
    gl_FragColor = vec4(1.0, 0.32, 0.28, alpha * 0.95);
  }
`;

// --- Edge particles ---
// Position вычисляется per-vertex как bezier(u_time*speed + offset).
const PARTICLE_VS = `
  attribute vec2 a_start;       // A
  attribute vec2 a_end;         // B
  attribute vec2 a_ctrl;        // control point
  attribute vec4 a_color;
  attribute float a_offset;     // фаза вдоль ребра (0..1)
  attribute float a_speed;      // коэф скорости
  uniform float u_time;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  varying vec4 v_color;

  void main() {
    // t перемещается по кривой, петляет 0→1→0→1…
    float t = fract(u_time * a_speed * 0.35 + a_offset);
    // Quadratic Bezier
    float u = 1.0 - t;
    vec2 world = u*u*a_start + 2.0*u*t*a_ctrl + t*t*a_end;
    vec2 screen = (world - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    // Размер пульсирует вдоль пути
    float head = smoothstep(0.0, 0.3, t) * smoothstep(1.0, 0.3, t);
    gl_PointSize = (2.5 + 2.5 * head) * u_dpr;
    v_color = vec4(a_color.rgb, a_color.a * (0.6 + 0.4 * head));
  }
`;
const PARTICLE_FS = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(v_color.rgb, v_color.a * core);
  }
`;

// --- Starfield ---
const STAR_VS = `
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_depth;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  varying float v_alpha;

  void main() {
    // Parallax: глубина влияет на сдвиг от камеры — дальние звёзды
    // двигаются медленнее, создают объём.
    vec2 world = a_position - u_camera * a_depth;
    vec2 screen = world * (0.6 + 0.4 * a_depth);
    // Оборачиваем внутри viewport (бесконечное поле)
    screen = mod(screen, u_viewport) - u_viewport * 0.5;
    vec2 clip = screen / (u_viewport * 0.5);
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    gl_PointSize = a_size * u_dpr * a_depth;
    v_alpha = 0.3 + 0.7 * a_depth;
  }
`;
const STAR_FS = `
  precision mediump float;
  varying float v_alpha;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(0.82, 0.88, 1.0, core * v_alpha);
  }
`;

// ==== Compile helpers ====

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Shader compile error: ' + info);
  }
  return sh;
}
function compileProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    throw new Error('Link error: ' + info);
  }
  return prog;
}

// ==== Module state ====

let gl = null;
let canvasEl = null;

let pointProg, hubProg, lineProg, particleProg, starProg, errProg;
let pointBuf, hubBuf, lineBuf, particleBuf, starBuf, reverseBuf, errBuf;

// Layouts (floats per vertex)
const POINT_STRIDE = 9;    // x, y, r, g, b, a, size, phase, flags
const HUB_STRIDE = 8;      // x, y, r, g, b, a, size, phase
const LINE_STRIDE = 6;     // x, y, r, g, b, a
const PARTICLE_STRIDE = 10; // ax, ay, bx, by, cx, cy, r, g, b, a (offset/speed вычисляются из mod+index)
const STAR_STRIDE = 4;     // x, y, size, depth
const REVERSE_STRIDE = 10; // тот же layout что PARTICLE — переиспользуем particleProg
const ERR_STRIDE = 4;      // x, y, size, phase

let pointArr, hubArr, lineArr, particleArr, reverseArr, errArr;
let starsBuilt = null; // Float32Array, statиc

// Uniforms
const uPoint = {}, uHub = {}, uLine = {}, uParticle = {}, uStar = {}, uErr = {};
const aPoint = {}, aHub = {}, aLine = {}, aParticle = {}, aStar = {}, aErr = {};

const EDGE_SEGMENTS = 10;
const PARTICLES_PER_EDGE = 2;

// ==== Init ====

export function initWebglRenderer(canvas) {
  canvasEl = canvas;
  // alpha: true чтобы canvas мог быть прозрачным (для LavaBackgrounds).
  // premultipliedAlpha: false — наши shaders не предумножают alpha.
  gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false, alpha: true })
    || canvas.getContext('experimental-webgl', { antialias: true, premultipliedAlpha: false, alpha: false });
  if (!gl) throw new Error('WebGL не поддерживается браузером');

  // WebGL context может быть потерян (вкладка в фоне долго, или GPU переключается
  // между iGPU/dGPU). Предотвращаем default behavior (чтобы context можно было
  // восстановить) и сбрасываем наш ref, чтобы drawWebgl() стал no-op.
  canvas.addEventListener('webglcontextlost', (ev) => {
    ev.preventDefault();
    gl = null;
    pointProg = hubProg = lineProg = particleProg = starProg = null;
    pointBuf = hubBuf = lineBuf = particleBuf = starBuf = null;
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    // Рекомпилируем shaders и создаём buffers заново
    try { initWebglRenderer(canvas); } catch (e) { /* браузер не восстановил */ }
  }, false);

  pointProg = compileProgram(gl, POINT_VS, POINT_FS);
  hubProg = compileProgram(gl, HUB_VS, HUB_FS);
  lineProg = compileProgram(gl, LINE_VS, LINE_FS);
  particleProg = compileProgram(gl, PARTICLE_VS, PARTICLE_FS);
  starProg = compileProgram(gl, STAR_VS, STAR_FS);
  // Новые passes (v1.3) — компилируем отдельно, чтобы их падение не
  // ломало всё. При fail просто отключаем pass через null-program.
  try { errProg = compileProgram(gl, ERR_VS, ERR_FS); }
  catch (e) { errProg = null; if (typeof console !== 'undefined') console.warn('[webgl] errProg compile failed:', e.message); }

  cacheAttribs(pointProg, aPoint, uPoint, ['a_position', 'a_color', 'a_size', 'a_phase', 'a_flags'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr', 'u_time']);
  cacheAttribs(hubProg, aHub, uHub, ['a_position', 'a_color', 'a_size', 'a_phase'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr', 'u_time']);
  cacheAttribs(lineProg, aLine, uLine, ['a_position', 'a_color'],
    ['u_camera', 'u_scale', 'u_viewport']);
  cacheAttribs(particleProg, aParticle, uParticle, ['a_start', 'a_end', 'a_ctrl', 'a_color', 'a_offset', 'a_speed'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr', 'u_time']);
  cacheAttribs(starProg, aStar, uStar, ['a_position', 'a_size', 'a_depth'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr']);
  if (errProg) cacheAttribs(errProg, aErr, uErr, ['a_position', 'a_size', 'a_phase'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr', 'u_time']);

  pointBuf = gl.createBuffer();
  hubBuf = gl.createBuffer();
  lineBuf = gl.createBuffer();
  particleBuf = gl.createBuffer();
  starBuf = gl.createBuffer();
  reverseBuf = gl.createBuffer();
  errBuf = gl.createBuffer();

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive

  buildStars();
  resizeWebgl(canvas);
  return { gl };
}

function cacheAttribs(prog, aMap, uMap, aNames, uNames) {
  for (const n of aNames) aMap[n.replace(/^a_/, '')] = gl.getAttribLocation(prog, n);
  for (const n of uNames) uMap[n.replace(/^u_/, '')] = gl.getUniformLocation(prog, n);
}

export function resizeWebgl(canvas) {
  if (!gl) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  gl.viewport(0, 0, canvas.width, canvas.height);
}

// ==== Starfield build (один раз при init) ====

function buildStars() {
  const count = 500;
  const range = 3000;
  const arr = new Float32Array(count * STAR_STRIDE);
  // Детерминированный PRNG чтобы звёзды не прыгали при resize
  let seed = 0x13579;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 8) / 16777216;
  };
  for (let i = 0; i < count; i++) {
    const off = i * STAR_STRIDE;
    arr[off + 0] = (rnd() - 0.5) * range * 2;
    arr[off + 1] = (rnd() - 0.5) * range * 2;
    arr[off + 2] = 1.0 + rnd() * 1.5;     // size
    arr[off + 3] = 0.15 + rnd() * 0.35;   // depth (parallax)
  }
  starsBuilt = arr;
  gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
}

// ==== Color helpers ====

const ROLE_RGB = {
  user: [0.482, 0.666, 0.941],
  assistant: [0.313, 0.831, 0.709],
  tool_use: [0.925, 0.627, 0.250],
  thinking: [0.71, 0.55, 1.0],   // фиолетовый — «облако мысли»
};

const DIFF_RGB = {
  A: [1.0, 0.376, 0.686],
  B: [0.352, 0.823, 1.0],
  both: [0.784, 0.784, 0.839],
};

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h * 6;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh < 1) { r = c; g = x; }
  else if (hh < 2) { r = x; g = c; }
  else if (hh < 3) { g = c; b = x; }
  else if (hh < 4) { g = x; b = c; }
  else if (hh < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

function nodeColor(n, state, out) {
  let r, g, b;
  if (state.diffMode && n._diffOrigin) {
    [r, g, b] = DIFF_RGB[n._diffOrigin] || DIFF_RGB.both;
  } else if (state.topicsMode && n._topicHue != null) {
    [r, g, b] = hslToRgb(n._topicHue, 0.75, 0.58);
  } else {
    [r, g, b] = ROLE_RGB[n.role] || [0.5, 0.5, 0.5];
  }
  out[0] = r; out[1] = g; out[2] = b;
  return out;
}

function edgeColor(e, state, out) {
  let r, g, b;
  if (state.diffMode && e.diffSide === 'B') {
    [r, g, b] = DIFF_RGB.B;
  } else if (e.adopted) {
    r = 0.78; g = 0.71; b = 0.47;
  } else if (e.b && e.b.role === 'tool_use') {
    r = 0.925; g = 0.627; b = 0.250;
  } else if (e.b && e.b.role === 'thinking') {
    r = 0.71; g = 0.55; b = 1.0;
  } else {
    r = 0.0; g = 0.831; b = 1.0;
  }
  out[0] = r; out[1] = g; out[2] = b;
  return out;
}

// ==== Birth helpers ====

function birthFactorLocal(bornAt, nowMs, duration) {
  if (bornAt == null) return 0;
  const t = (nowMs - bornAt) / duration;
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  return t;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// ==== Capacity management ====

function ensureArr(name, neededFloats) {
  switch (name) {
    case 'point':
      if (!pointArr || pointArr.length < neededFloats) {
        pointArr = new Float32Array(Math.max(neededFloats, (pointArr?.length || 0) * 2 || 1024));
      }
      return pointArr;
    case 'hub':
      if (!hubArr || hubArr.length < neededFloats) {
        hubArr = new Float32Array(Math.max(neededFloats, (hubArr?.length || 0) * 2 || 256));
      }
      return hubArr;
    case 'line':
      if (!lineArr || lineArr.length < neededFloats) {
        lineArr = new Float32Array(Math.max(neededFloats, (lineArr?.length || 0) * 2 || 2048));
      }
      return lineArr;
    case 'particle':
      if (!particleArr || particleArr.length < neededFloats) {
        particleArr = new Float32Array(Math.max(neededFloats, (particleArr?.length || 0) * 2 || 1024));
      }
      return particleArr;
    case 'reverse':
      if (!reverseArr || reverseArr.length < neededFloats) {
        reverseArr = new Float32Array(Math.max(neededFloats, (reverseArr?.length || 0) * 2 || 1024));
      }
      return reverseArr;
    case 'err':
      if (!errArr || errArr.length < neededFloats) {
        errArr = new Float32Array(Math.max(neededFloats, (errArr?.length || 0) * 2 || 64));
      }
      return errArr;
  }
}

// ==== Fill buffers ====

function fillPointBuffer(state, nowMs) {
  const nodes = state.nodes;
  const collapsed = state.collapsed;
  const hidden = state.hiddenRoles;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const hasPath = state.pathSet && state.pathSet.size > 0;
  const topicFilter = state.topicFilter || null;

  ensureArr('point', nodes.length * POINT_STRIDE);
  const arr = pointArr;
  const rgb = [0, 0, 0];
  let count = 0;

  const thinkingHidden = state.showThinking === false;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.bornAt == null) continue;
    if (hidden && hidden.has(n.role)) continue;
    if (thinkingHidden && n.role === 'thinking') continue;
    if (n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId)) continue;
    const bf = birthFactorLocal(n.bornAt, nowMs, CFG.birthDurationMs);
    const ag = CFG.birthAlphaStart + (1 - CFG.birthAlphaStart) * easeOutCubic(bf);
    const ss = CFG.birthRadiusStart + (1 - CFG.birthRadiusStart) * easeOutCubic(bf);
    let dimMul = 1;
    const matchSearch = hasSearch && state.searchMatches.has(n.id);
    if (hasSearch) dimMul = matchSearch ? 1 : CFG.searchDimAlpha;
    else if (topicFilter) dimMul = n._topicWord === topicFilter ? 1 : CFG.searchDimAlpha;
    else if (hasPath) dimMul = state.pathSet.has(n.id) ? 1 : CFG.focusDimAlpha;
    const alpha = ag * dimMul;
    const hubMul = n.isHub ? 1.25 : 1;
    // size в CSS-px — x3 от node.r для glow bleed, плюс scale камеры
    const size = Math.max(3, n.r * ss * hubMul * 3.2 * state.camera.scale);

    nodeColor(n, state, rgb);
    const off = count * POINT_STRIDE;
    arr[off + 0] = n.x;
    arr[off + 1] = n.y;
    arr[off + 2] = rgb[0];
    arr[off + 3] = rgb[1];
    arr[off + 4] = rgb[2];
    arr[off + 5] = alpha;
    arr[off + 6] = size;
    arr[off + 7] = n.phase || 0;
    arr[off + 8] = matchSearch ? 1 : 0; // flags: bit0
    count++;
  }
  return count;
}

function fillHubBuffer(state, nowMs) {
  const nodes = state.nodes;
  const hidden = state.hiddenRoles;
  ensureArr('hub', nodes.length * HUB_STRIDE);
  const arr = hubArr;
  let count = 0;
  for (const n of nodes) {
    if (!n.isHub) continue;
    if (n.bornAt == null) continue;
    if (hidden && hidden.has(n.role)) continue;
    const bf = birthFactorLocal(n.bornAt, nowMs, CFG.birthDurationMs);
    const ag = CFG.birthAlphaStart + (1 - CFG.birthAlphaStart) * easeOutCubic(bf);
    const ss = CFG.birthRadiusStart + (1 - CFG.birthRadiusStart) * easeOutCubic(bf);
    // Кольцо крупнее ноды x2.2
    const size = Math.max(10, n.r * ss * 6.5 * state.camera.scale);
    const off = count * HUB_STRIDE;
    arr[off + 0] = n.x;
    arr[off + 1] = n.y;
    arr[off + 2] = 1.0;   // золотистый
    arr[off + 3] = 0.84;
    arr[off + 4] = 0.47;
    arr[off + 5] = 0.85 * ag;
    arr[off + 6] = size;
    arr[off + 7] = n.phase || 0;
    count++;
  }
  return count;
}

function quadBezier(ax, ay, bx, by, cx, cy, t, out) {
  const u = 1 - t;
  out[0] = u * u * ax + 2 * u * t * cx + t * t * bx;
  out[1] = u * u * ay + 2 * u * t * cy + t * t * by;
}

function fillLineBuffer(state, nowMs) {
  const edges = state.edges;
  const hidden = state.hiddenRoles;
  const connectOrphans = !!state.connectOrphans;
  const collapsed = state.collapsed;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const topicFilter = state.topicFilter || null;
  ensureArr('line', edges.length * EDGE_SEGMENTS * 2 * LINE_STRIDE);
  const arr = lineArr;
  const rgb = [0, 0, 0];
  const p0 = [0, 0], p1 = [0, 0];
  let count = 0;

  const thinkingHidden = state.showThinking === false;
  // Удлинённый birth для edges — чтобы росли плавнее обычной ноды
  // (нода 600ms, edge выпускает 1000ms = чуть длительнее)
  const edgeBirthMs = CFG.birthDurationMs * 1.6;
  for (const e of edges) {
    if (!e.a || !e.b) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    if (hidden && (hidden.has(e.a.role) || hidden.has(e.b.role))) continue;
    if (thinkingHidden && (e.a.role === 'thinking' || e.b.role === 'thinking')) continue;
    if (e.adopted && !connectOrphans) continue;
    const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId);
    if (isCollapsedChild(e.a) || isCollapsedChild(e.b)) continue;

    // Birth factor edge'а — берём по самой младшей ноде (b обычно).
    // Используем удлинённый edgeBirthMs + ease-out cubic для плавности.
    const youngerBornAt = Math.max(e.a.bornAt, e.b.bornAt);
    const bft = nowMs != null ? Math.min(1, Math.max(0, (nowMs - youngerBornAt) / edgeBirthMs)) : 1;
    const birthMul = 1 - Math.pow(1 - bft, 3); // easeOutCubic
    let edgeAlpha = (e.adopted ? 0.25 : 0.6) * birthMul;
    if (hasSearch) {
      edgeAlpha *= (state.searchMatches.has(e.a.id) && state.searchMatches.has(e.b.id)) ? 1 : CFG.searchDimAlpha;
    } else if (topicFilter) {
      edgeAlpha *= (e.a._topicWord === topicFilter && e.b._topicWord === topicFilter) ? 1 : CFG.searchDimAlpha;
    }
    edgeColor(e, state, rgb);

    const ax = e.a.x, ay = e.a.y;
    const bx = e.b.x, by = e.b.y;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const off = len * CFG.edgeCurveStrength;
    const cx = mx - (dy / len) * off;
    const cy = my + (dx / len) * off;

    for (let s = 0; s < EDGE_SEGMENTS; s++) {
      const t0 = s / EDGE_SEGMENTS;
      const t1 = (s + 1) / EDGE_SEGMENTS;
      quadBezier(ax, ay, bx, by, cx, cy, t0, p0);
      quadBezier(ax, ay, bx, by, cx, cy, t1, p1);
      // Fade: интенсивнее ближе к ноде-цели (чтобы "стрелка" читалась)
      const fade0 = 0.5 + 0.5 * t0;
      const fade1 = 0.5 + 0.5 * t1;
      let off0 = count * LINE_STRIDE;
      arr[off0++] = p0[0]; arr[off0++] = p0[1];
      arr[off0++] = rgb[0]; arr[off0++] = rgb[1]; arr[off0++] = rgb[2];
      arr[off0++] = edgeAlpha * fade0;
      count++;
      let off1 = count * LINE_STRIDE;
      arr[off1++] = p1[0]; arr[off1++] = p1[1];
      arr[off1++] = rgb[0]; arr[off1++] = rgb[1]; arr[off1++] = rgb[2];
      arr[off1++] = edgeAlpha * fade1;
      count++;
    }
  }
  return count;
}

function fillParticleBuffer(state) {
  const edges = state.edges;
  const hidden = state.hiddenRoles;
  const connectOrphans = !!state.connectOrphans;
  const collapsed = state.collapsed;
  const topicFilter = state.topicFilter || null;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  // PARTICLES_PER_EDGE частиц на ребро. Per-vertex: ax, ay, bx, by, cx, cy, r, g, b, a
  ensureArr('particle', edges.length * PARTICLES_PER_EDGE * PARTICLE_STRIDE);
  const arr = particleArr;
  const rgb = [0, 0, 0];
  let count = 0;

  for (let ei = 0; ei < edges.length; ei++) {
    const e = edges[ei];
    if (!e.a || !e.b) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    if (hidden && (hidden.has(e.a.role) || hidden.has(e.b.role))) continue;
    if (e.adopted) continue; // по adopted-рёбрам не гоняем частицы
    const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId);
    if (isCollapsedChild(e.a) || isCollapsedChild(e.b)) continue;

    // skip если edge dim'нут поиском/фильтром
    if (hasSearch && !(state.searchMatches.has(e.a.id) && state.searchMatches.has(e.b.id))) continue;
    if (topicFilter && !(e.a._topicWord === topicFilter && e.b._topicWord === topicFilter)) continue;

    edgeColor(e, state, rgb);
    const ax = e.a.x, ay = e.a.y;
    const bx = e.b.x, by = e.b.y;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const off = len * CFG.edgeCurveStrength;
    const cx = mx - (dy / len) * off;
    const cy = my + (dx / len) * off;

    for (let p = 0; p < PARTICLES_PER_EDGE; p++) {
      // offset per particle фиксирован — визуально равномерно распределены
      let o = count * PARTICLE_STRIDE;
      arr[o++] = ax; arr[o++] = ay;
      arr[o++] = bx; arr[o++] = by;
      arr[o++] = cx; arr[o++] = cy;
      arr[o++] = rgb[0]; arr[o++] = rgb[1]; arr[o++] = rgb[2];
      arr[o++] = 0.9;
      count++;
    }
  }
  return count;
}

// Заполняет буфер reverse-signal частиц.
//
// Идея: рисуем светящуюся «комету» по pair-связи tool_use ↔ tool_result.
// Семантически — это поток выполнения tool'а: ассистент вызвал tool_use →
// инструмент сделал работу → результат пришёл к user-tool_result. Поэтому
// частица летит ОТ tool_use (a) К tool_result (b) — в направлении дейст­вия.
//
// Переиспользуем существующий particleProg shader: тот же layout
// (a_start, a_end, a_ctrl, a_color, a_offset, a_speed). Цвет — лимонно-жёлтый.
const REVERSE_PARTICLES_PER_EDGE = 1;
const REVERSE_RGB = [1.0, 0.92, 0.36]; // lemon
function fillReverseSignalBuffer(state) {
  if (state.showReverseSignal === false) return 0;
  const pairs = state.pairEdges || [];
  if (!pairs.length) return 0;
  ensureArr('reverse', pairs.length * REVERSE_PARTICLES_PER_EDGE * REVERSE_STRIDE);
  const arr = reverseArr;
  let count = 0;
  const hidden = state.hiddenRoles;
  const collapsed = state.collapsed;
  for (const p of pairs) {
    const a = p.a, b = p.b;
    if (!a || !b) continue;
    if (a.bornAt == null || b.bornAt == null) continue;
    if (hidden && (hidden.has(a.role) || hidden.has(b.role))) continue;
    const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId);
    if (isCollapsedChild(a) || isCollapsedChild(b)) continue;

    // Forward направление: start = a (tool_use), end = b (tool_result)
    const ax = a.x, ay = a.y; // start
    const bx = b.x, by = b.y; // end
    // Control point — лёгкий arc, отнесён ортогонально от середины
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const off = len * 0.10;
    const cx = mx - (dy / len) * off;
    const cy = my + (dx / len) * off;
    for (let i = 0; i < REVERSE_PARTICLES_PER_EDGE; i++) {
      const o = count * REVERSE_STRIDE;
      arr[o + 0] = ax; arr[o + 1] = ay;
      arr[o + 2] = bx; arr[o + 3] = by;
      arr[o + 4] = cx; arr[o + 5] = cy;
      arr[o + 6] = REVERSE_RGB[0];
      arr[o + 7] = REVERSE_RGB[1];
      arr[o + 8] = REVERSE_RGB[2];
      arr[o + 9] = 1.0;
      count++;
    }
  }
  return count;
}

// Заполняет буфер для error-rings (assistant-ноды у которых tool_use получил error).
function fillErrBuffer(state) {
  if (state.showErrorRings === false) return 0;
  if (!state.nodes || !state.nodes.length) return 0;
  // Сначала посчитаем сколько нод с error — чтобы не аллоцировать на весь массив
  let errCount = 0;
  for (const n of state.nodes) {
    if ((n._hasErrorTool || n._isErrorToolUse) && n.bornAt != null) errCount++;
  }
  if (!errCount) return 0;
  ensureArr('err', errCount * ERR_STRIDE);
  const arr = errArr;
  let count = 0;
  const hidden = state.hiddenRoles;
  for (const n of state.nodes) {
    if (!n._hasErrorTool && !n._isErrorToolUse) continue;
    if (n.bornAt == null) continue;
    if (hidden && hidden.has(n.role)) continue;
    const r = (typeof n.r === 'number' && n.r > 0) ? n.r : 5;
    const size = Math.max(10, r * 4.5 * state.camera.scale);
    const off = count * ERR_STRIDE;
    arr[off + 0] = n.x || 0;
    arr[off + 1] = n.y || 0;
    arr[off + 2] = size;
    arr[off + 3] = n.phase || 0;
    count++;
  }
  return count;
}

// ==== Draw ====

export function drawWebgl(state, tSec, viewport) {
  if (!gl) return;
  const nowMs = tSec * 1000;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const vw = viewport.width;
  const vh = viewport.height;

  // Если активен LavaBackgrounds (state.bgMode != 'none') — clearColor
  // прозрачный, чтобы bg-canvas просвечивал через WebGL canvas. Иначе
  // непрозрачный body-bg цвет (как было).
  const useBgCanvas = state.bgMode && state.bgMode !== 'none';
  if (useBgCanvas) {
    gl.clearColor(0, 0, 0, 0);
  } else {
    const bg = readCssColor('--bg', [0.039, 0.055, 0.102]);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
  }
  gl.clear(gl.COLOR_BUFFER_BIT);

  // ---- 1. Starfield ----
  if (starsBuilt) {
    gl.useProgram(starProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    const stride = STAR_STRIDE * 4;
    gl.enableVertexAttribArray(aStar.position);
    gl.vertexAttribPointer(aStar.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aStar.size);
    gl.vertexAttribPointer(aStar.size, 1, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(aStar.depth);
    gl.vertexAttribPointer(aStar.depth, 1, gl.FLOAT, false, stride, 3 * 4);
    gl.uniform2f(uStar.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uStar.scale, state.camera.scale);
    gl.uniform2f(uStar.viewport, vw, vh);
    gl.uniform1f(uStar.dpr, dpr);
    gl.drawArrays(gl.POINTS, 0, starsBuilt.length / STAR_STRIDE);
  }

  // ---- 2. Edge lines (основа) ----
  const lineCount = fillLineBuffer(state, nowMs);
  if (lineCount > 0) {
    gl.useProgram(lineProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lineArr.subarray(0, lineCount * LINE_STRIDE), gl.DYNAMIC_DRAW);
    const stride = LINE_STRIDE * 4;
    gl.enableVertexAttribArray(aLine.position);
    gl.vertexAttribPointer(aLine.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aLine.color);
    gl.vertexAttribPointer(aLine.color, 4, gl.FLOAT, false, stride, 2 * 4);
    gl.uniform2f(uLine.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uLine.scale, state.camera.scale);
    gl.uniform2f(uLine.viewport, vw, vh);
    gl.drawArrays(gl.LINES, 0, lineCount);
  }

  // ---- 3. Edge particles ----
  const particleCount = fillParticleBuffer(state);
  if (particleCount > 0) {
    gl.useProgram(particleProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, particleArr.subarray(0, particleCount * PARTICLE_STRIDE), gl.DYNAMIC_DRAW);
    const stride = PARTICLE_STRIDE * 4;
    gl.enableVertexAttribArray(aParticle.start);
    gl.vertexAttribPointer(aParticle.start, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aParticle.end);
    gl.vertexAttribPointer(aParticle.end, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(aParticle.ctrl);
    gl.vertexAttribPointer(aParticle.ctrl, 2, gl.FLOAT, false, stride, 4 * 4);
    gl.enableVertexAttribArray(aParticle.color);
    gl.vertexAttribPointer(aParticle.color, 4, gl.FLOAT, false, stride, 6 * 4);
    // offset/speed через vertexAttrib1f — фиксированные per-draw для простоты.
    // Частицы чередуются — первая со сдвигом, вторая на противоположной фазе.
    if (aParticle.offset >= 0) gl.disableVertexAttribArray(aParticle.offset);
    if (aParticle.speed >= 0) gl.disableVertexAttribArray(aParticle.speed);
    // Рисуем по очереди: 0-я частица каждого ребра, потом 1-я
    for (let p = 0; p < PARTICLES_PER_EDGE; p++) {
      const offset = p / PARTICLES_PER_EDGE;
      const speed = 1.0 + p * 0.2;
      if (aParticle.offset >= 0) gl.vertexAttrib1f(aParticle.offset, offset);
      if (aParticle.speed >= 0) gl.vertexAttrib1f(aParticle.speed, speed);
      gl.uniform1f(uParticle.time, tSec);
      gl.uniform2f(uParticle.camera, state.camera.x, state.camera.y);
      gl.uniform1f(uParticle.scale, state.camera.scale);
      gl.uniform2f(uParticle.viewport, vw, vh);
      gl.uniform1f(uParticle.dpr, dpr);
      // рисуем каждую p-ю — все p=0 вершины через STRIDE offset
      // Проще: частицы идут подряд в buffer — по 1 на ребро на шаг p
      // Так как fillParticleBuffer кладёт их подряд, используем [p*edgeCount .. (p+1)*edgeCount]
      const countPerPhase = Math.floor(particleCount / PARTICLES_PER_EDGE);
      const start = p * countPerPhase;
      gl.drawArrays(gl.POINTS, start, countPerPhase);
    }
  }

  // ---- 4. Hub rings ----
  const hubCount = fillHubBuffer(state, nowMs);
  if (hubCount > 0) {
    gl.useProgram(hubProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, hubBuf);
    gl.bufferData(gl.ARRAY_BUFFER, hubArr.subarray(0, hubCount * HUB_STRIDE), gl.DYNAMIC_DRAW);
    const stride = HUB_STRIDE * 4;
    gl.enableVertexAttribArray(aHub.position);
    gl.vertexAttribPointer(aHub.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aHub.color);
    gl.vertexAttribPointer(aHub.color, 4, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(aHub.size);
    gl.vertexAttribPointer(aHub.size, 1, gl.FLOAT, false, stride, 6 * 4);
    gl.enableVertexAttribArray(aHub.phase);
    gl.vertexAttribPointer(aHub.phase, 1, gl.FLOAT, false, stride, 7 * 4);
    gl.uniform2f(uHub.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uHub.scale, state.camera.scale);
    gl.uniform2f(uHub.viewport, vw, vh);
    gl.uniform1f(uHub.dpr, dpr);
    gl.uniform1f(uHub.time, tSec);
    gl.drawArrays(gl.POINTS, 0, hubCount);
  }

  // ---- 5. Reverse signal particles (tool_result → tool_use, lemon comet) ----
  // Переиспользуем particleProg shader; в буфере a_start/a_end SWAPped
  // относительно обычных particles → частица движется в обратную сторону.
  try {
    const reverseCount = fillReverseSignalBuffer(state);
    if (reverseCount > 0) {
      gl.useProgram(particleProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, reverseBuf);
      gl.bufferData(gl.ARRAY_BUFFER, reverseArr.subarray(0, reverseCount * REVERSE_STRIDE), gl.DYNAMIC_DRAW);
      const stride = REVERSE_STRIDE * 4;
      gl.enableVertexAttribArray(aParticle.start);
      gl.vertexAttribPointer(aParticle.start, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(aParticle.end);
      gl.vertexAttribPointer(aParticle.end, 2, gl.FLOAT, false, stride, 2 * 4);
      gl.enableVertexAttribArray(aParticle.ctrl);
      gl.vertexAttribPointer(aParticle.ctrl, 2, gl.FLOAT, false, stride, 4 * 4);
      gl.enableVertexAttribArray(aParticle.color);
      gl.vertexAttribPointer(aParticle.color, 4, gl.FLOAT, false, stride, 6 * 4);
      // a_offset / a_speed считаем в JS-side (они в shader'е uniform-like
      // через vertex_id фактически, но удобнее вычислить из id частицы).
      // Пока — vertexAttrib1f задаёт constant-per-draw (упрощение): один
      // partic'l на pair → constant offset/speed одинаковые, а phase даём
      // per-draw через time. Чтобы не дёргать на каждую частицу отдельно,
      // используем a_offset = 0 (фаза по time только) и a_speed = 1.
      if (aParticle.offset != null && aParticle.offset >= 0) gl.vertexAttrib1f(aParticle.offset, 0);
      if (aParticle.speed != null && aParticle.speed >= 0) gl.vertexAttrib1f(aParticle.speed, 1.4);
      gl.uniform2f(uParticle.camera, state.camera.x, state.camera.y);
      gl.uniform1f(uParticle.scale, state.camera.scale);
      gl.uniform2f(uParticle.viewport, vw, vh);
      gl.uniform1f(uParticle.dpr, dpr);
      gl.uniform1f(uParticle.time, tSec);
      gl.drawArrays(gl.POINTS, 0, reverseCount);
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[webgl] reverse-signal pass failed:', e.message);
  }

  // ---- 6. Error rings (красные пунктирные кольца у нод с tool error) ----
  try {
    if (errProg) {
      const errCount = fillErrBuffer(state);
      if (errCount > 0) {
        gl.useProgram(errProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, errBuf);
        gl.bufferData(gl.ARRAY_BUFFER, errArr.subarray(0, errCount * ERR_STRIDE), gl.DYNAMIC_DRAW);
        const stride = ERR_STRIDE * 4;
        gl.enableVertexAttribArray(aErr.position);
        gl.vertexAttribPointer(aErr.position, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(aErr.size);
        gl.vertexAttribPointer(aErr.size, 1, gl.FLOAT, false, stride, 2 * 4);
        gl.enableVertexAttribArray(aErr.phase);
        gl.vertexAttribPointer(aErr.phase, 1, gl.FLOAT, false, stride, 3 * 4);
        gl.uniform2f(uErr.camera, state.camera.x, state.camera.y);
        gl.uniform1f(uErr.scale, state.camera.scale);
        gl.uniform2f(uErr.viewport, vw, vh);
        gl.uniform1f(uErr.dpr, dpr);
        gl.uniform1f(uErr.time, tSec);
        gl.drawArrays(gl.POINTS, 0, errCount);
      }
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[webgl] err-rings pass failed:', e.message);
    errProg = null;
  }

  // ---- 7. Nodes (поверх рёбер и колец) ----
  const pointCount = fillPointBuffer(state, nowMs);
  if (pointCount > 0) {
    gl.useProgram(pointProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pointArr.subarray(0, pointCount * POINT_STRIDE), gl.DYNAMIC_DRAW);
    const stride = POINT_STRIDE * 4;
    gl.enableVertexAttribArray(aPoint.position);
    gl.vertexAttribPointer(aPoint.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aPoint.color);
    gl.vertexAttribPointer(aPoint.color, 4, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(aPoint.size);
    gl.vertexAttribPointer(aPoint.size, 1, gl.FLOAT, false, stride, 6 * 4);
    gl.enableVertexAttribArray(aPoint.phase);
    gl.vertexAttribPointer(aPoint.phase, 1, gl.FLOAT, false, stride, 7 * 4);
    gl.enableVertexAttribArray(aPoint.flags);
    gl.vertexAttribPointer(aPoint.flags, 1, gl.FLOAT, false, stride, 8 * 4);
    gl.uniform2f(uPoint.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uPoint.scale, state.camera.scale);
    gl.uniform2f(uPoint.viewport, vw, vh);
    gl.uniform1f(uPoint.dpr, dpr);
    gl.uniform1f(uPoint.time, tSec);
    gl.drawArrays(gl.POINTS, 0, pointCount);
  }
}

function readCssColor(cssVar, fallback) {
  try {
    const s = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    if (!s) return fallback;
    if (s.startsWith('#')) {
      const hex = s.slice(1);
      const h = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      const r = parseInt(h.slice(0, 2), 16) / 255;
      const g = parseInt(h.slice(2, 4), 16) / 255;
      const b = parseInt(h.slice(4, 6), 16) / 255;
      return [r, g, b];
    }
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
    if (m) return [parseInt(m[1]) / 255, parseInt(m[2]) / 255, parseInt(m[3]) / 255];
    return fallback;
  } catch {
    return fallback;
  }
}

export function isWebglSupported() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}
