// WebGL-рендерер — альтернатива Canvas 2D для больших графов (10k+ нод).
// Работает на отдельном canvas-элементе (#graph-webgl). Переключение
// между canvas2d / webgl через state.renderBackend — без пересоздания
// данных, только другое отображение.
//
// Stack:
//   • gl.POINTS для нод — один draw call на все точки. Форма (круг) и
//     мягкое свечение через fragment shader на основе gl_PointCoord.
//   • gl.LINES для рёбер — каждое ребро разбито на EDGE_SEGMENTS
//     сегментов по quadratic Bezier, получается единый buffer LINES.
//   • Additive blending — чтобы свечение складывалось красиво.
//   • Camera (x, y, scale) передаётся как uniform, трансформация
//     world→clip делается в vertex shader (CPU ничего не считает для
//     позиций).
//
// Features v1:
//   ✓ Role / topic / diff / search / hub / orphan цвета (через
//     подготовленный a_color в VBO — перекрашивается per-frame, но
//     для 10k это ок)
//   ✓ Birth-animation (scale + alpha как в 2D)
//   ✓ Hidden roles через hiddenRoles (просто не добавляем в VBO)
//   ✓ Theme (фон берётся из CSS переменной --bg)
//   ✗ Tool-icons (Unicode-символы) — убраны в WebGL-режиме, можно
//     добавить в v2 через sprite-sheet.
//   ✗ Particles вдоль рёбер — упрощение v1.
//   ✗ Heartbeat-scale и vignette — v1 не рисует.
//
// API:
//   initWebglRenderer(canvas) → { gl, ... } или throws если WebGL нет
//   drawWebgl(state, tSec, viewport) — рисует кадр. API симметричен
//     Canvas 2D draw() — чтобы main.js мог просто выбрать роут.
//   resizeWebgl(canvas) — при resize окна / изменении dpr.

import { CFG } from '../core/config.js';
import { hueToRgbaString } from './topics.js';

// ==== GLSL ====

const POINT_VS = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_size;
  uniform vec2 u_camera;     // cam.x, cam.y (world-space offset)
  uniform float u_scale;     // cam.scale
  uniform vec2 u_viewport;   // width, height (CSS px)
  uniform float u_dpr;       // devicePixelRatio
  varying vec4 v_color;
  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    // screen (CSS px) → clip (-1..1)
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y; // браузерная ось Y направлена вниз
    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = max(1.0, a_size * u_dpr);
    v_color = a_color;
  }
`;

// Fragment shader рисует круг в квадратном gl_PointCoord (-0.5..0.5
// после центрирования). Внутренняя «ядерная» часть — полная прозрачность,
// внешняя — мягкий falloff к 0 → даёт glow.
const POINT_FS = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    // Плотный центр + мягкий edge
    float core = smoothstep(0.5, 0.35, dist);
    float halo = smoothstep(0.5, 0.0, dist) * 0.35;
    float a = (core + halo) * v_color.a;
    gl_FragColor = vec4(v_color.rgb * (core + halo), a);
  }
`;

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

// ==== Shader compile helpers ====

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

// ==== State ====

let gl = null;
let canvasEl = null;
let pointProg = null, lineProg = null;
let pointBuf = null, lineBuf = null;

// Point layout per vertex: [x, y, r, g, b, a, size] = 7 floats
const POINT_STRIDE = 7;
// Line layout per vertex: [x, y, r, g, b, a] = 6 floats
const LINE_STRIDE = 6;

let pointArr = null; // Float32Array
let lineArr = null;  // Float32Array
let pointCapacity = 0;
let lineCapacity = 0;

const EDGE_SEGMENTS = 8;

// Uniform locations cache
let uPoint = {};
let uLine = {};
let aPoint = {};
let aLine = {};

// ==== Init ====

export function initWebglRenderer(canvas) {
  canvasEl = canvas;
  gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false, alpha: false })
    || canvas.getContext('experimental-webgl', { antialias: true, premultipliedAlpha: false, alpha: false });
  if (!gl) throw new Error('WebGL не поддерживается браузером');

  pointProg = compileProgram(gl, POINT_VS, POINT_FS);
  lineProg = compileProgram(gl, LINE_VS, LINE_FS);

  aPoint.position = gl.getAttribLocation(pointProg, 'a_position');
  aPoint.color = gl.getAttribLocation(pointProg, 'a_color');
  aPoint.size = gl.getAttribLocation(pointProg, 'a_size');
  uPoint.camera = gl.getUniformLocation(pointProg, 'u_camera');
  uPoint.scale = gl.getUniformLocation(pointProg, 'u_scale');
  uPoint.viewport = gl.getUniformLocation(pointProg, 'u_viewport');
  uPoint.dpr = gl.getUniformLocation(pointProg, 'u_dpr');

  aLine.position = gl.getAttribLocation(lineProg, 'a_position');
  aLine.color = gl.getAttribLocation(lineProg, 'a_color');
  uLine.camera = gl.getUniformLocation(lineProg, 'u_camera');
  uLine.scale = gl.getUniformLocation(lineProg, 'u_scale');
  uLine.viewport = gl.getUniformLocation(lineProg, 'u_viewport');

  pointBuf = gl.createBuffer();
  lineBuf = gl.createBuffer();

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive — glow складывается

  resizeWebgl(canvas);
  return { gl };
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

function ensureCapacity(which, count) {
  if (which === 'point') {
    const needed = count * POINT_STRIDE;
    if (!pointArr || pointArr.length < needed) {
      pointArr = new Float32Array(Math.max(needed, (pointArr?.length || 0) * 2 || 1024));
      pointCapacity = Math.floor(pointArr.length / POINT_STRIDE);
    }
  } else {
    const needed = count * LINE_STRIDE;
    if (!lineArr || lineArr.length < needed) {
      lineArr = new Float32Array(Math.max(needed, (lineArr?.length || 0) * 2 || 1024));
      lineCapacity = Math.floor(lineArr.length / LINE_STRIDE);
    }
  }
}

// ==== Color helpers (мимо Canvas 2D renderer.glowRgba et al) ====

// Все цвета — [r, g, b, a], 0..1.
const _tmpRgba = [0, 0, 0, 1];

const ROLE_RGB = {
  user: [0.482, 0.666, 0.941],        // #7BAAF0
  assistant: [0.313, 0.831, 0.709],   // #50D4B5
  tool_use: [0.925, 0.627, 0.250],    // #ECA040
};

const DIFF_RGB = {
  A: [1.0, 0.376, 0.686],  // #ff60af
  B: [0.352, 0.823, 1.0],  // #5ad2ff
  both: [0.784, 0.784, 0.839], // #c8c8d6
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
    [r, g, b] = hslToRgb(n._topicHue, 0.7, 0.55);
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
    r = 0.78; g = 0.71; b = 0.47; // #c8b478
  } else if (e.b && e.b.role === 'tool_use') {
    r = 0.925; g = 0.627; b = 0.250;
  } else {
    r = 0.0; g = 0.831; b = 1.0; // #00d4ff
  }
  out[0] = r; out[1] = g; out[2] = b;
  return out;
}

// ==== Birth helpers (совпадают с renderer.js) ====

function birthFactorLocal(bornAt, nowMs, duration) {
  if (bornAt == null) return 0;
  const t = (nowMs - bornAt) / duration;
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  return t;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// ==== Buffer fills ====

function fillPointBuffer(state, nowMs) {
  // Видимые ноды: bornAt != null, не скрытая роль, не collapsed child
  const nodes = state.nodes;
  const collapsed = state.collapsed;
  const hidden = state.hiddenRoles;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const hasPath = state.pathSet && state.pathSet.size > 0;
  const topicFilter = state.topicFilter || null;

  let count = 0;
  ensureCapacity('point', nodes.length);
  const arr = pointArr;
  const rgb = [0, 0, 0];

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.bornAt == null) continue;
    if (hidden && hidden.has(n.role)) continue;
    if (n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId)) continue;
    const bf = birthFactorLocal(n.bornAt, nowMs, CFG.birthDurationMs);
    const ag = CFG.birthAlphaStart + (1 - CFG.birthAlphaStart) * easeOutCubic(bf);
    const ss = CFG.birthRadiusStart + (1 - CFG.birthRadiusStart) * easeOutCubic(bf);
    // Dim по search/topic/path
    let dimMul = 1;
    if (hasSearch) dimMul = state.searchMatches.has(n.id) ? 1 : CFG.searchDimAlpha;
    else if (topicFilter) dimMul = n._topicWord === topicFilter ? 1 : CFG.searchDimAlpha;
    else if (hasPath) dimMul = state.pathSet.has(n.id) ? 1 : CFG.focusDimAlpha;
    const isMatch = hasSearch && state.searchMatches.has(n.id);
    const alpha = ag * dimMul;
    // Hub pulse + search pulse — упрощённо без phase (чтобы точно влезло в кадр без overhead)
    const hubMul = n.isHub ? 1.25 : 1;
    const matchMul = isMatch ? 1.35 : 1;
    // Point size — в CSS px. Домножается на dpr в vertex shader.
    // Плюс увеличим чтобы glow был виден (x3 от n.r)
    const size = Math.max(2, n.r * ss * hubMul * matchMul * 2.6 * state.camera.scale);

    nodeColor(n, state, rgb);
    const off = count * POINT_STRIDE;
    arr[off + 0] = n.x;
    arr[off + 1] = n.y;
    arr[off + 2] = rgb[0];
    arr[off + 3] = rgb[1];
    arr[off + 4] = rgb[2];
    arr[off + 5] = alpha;
    arr[off + 6] = size;
    count++;
  }
  return count;
}

function quadBezier(ax, ay, bx, by, cx, cy, t, out) {
  const u = 1 - t;
  out[0] = u * u * ax + 2 * u * t * cx + t * t * bx;
  out[1] = u * u * ay + 2 * u * t * cy + t * t * by;
}

function fillLineBuffer(state) {
  const edges = state.edges;
  const hidden = state.hiddenRoles;
  const connectOrphans = !!state.connectOrphans;
  const collapsed = state.collapsed;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const topicFilter = state.topicFilter || null;

  // 2 вершины per segment, EDGE_SEGMENTS сегментов per edge
  ensureCapacity('line', edges.length * EDGE_SEGMENTS * 2);
  const arr = lineArr;
  const rgb = [0, 0, 0];
  const p0 = [0, 0], p1 = [0, 0];
  let count = 0;

  for (let e of edges) {
    if (!e.a || !e.b) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    if (hidden && (hidden.has(e.a.role) || hidden.has(e.b.role))) continue;
    if (e.adopted && !connectOrphans) continue;
    // Skip edges to/from collapsed tool_use children
    const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId);
    if (isCollapsedChild(e.a) || isCollapsedChild(e.b)) continue;

    // Dim по search/topic filter
    let edgeAlpha = e.adopted ? 0.22 : 0.55;
    if (hasSearch) {
      edgeAlpha *= (state.searchMatches.has(e.a.id) && state.searchMatches.has(e.b.id)) ? 1 : CFG.searchDimAlpha;
    } else if (topicFilter) {
      edgeAlpha *= (e.a._topicWord === topicFilter && e.b._topicWord === topicFilter) ? 1 : CFG.searchDimAlpha;
    }

    edgeColor(e, state, rgb);
    // Control point — как в Canvas 2D (edgeCurveStrength)
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
      // Fade к середине (интенсивнее посредине, слабее по краям)
      const fade0 = 1 - Math.abs(t0 - 0.5) * 0.4;
      const fade1 = 1 - Math.abs(t1 - 0.5) * 0.4;
      const off0 = count * LINE_STRIDE;
      arr[off0 + 0] = p0[0]; arr[off0 + 1] = p0[1];
      arr[off0 + 2] = rgb[0]; arr[off0 + 3] = rgb[1]; arr[off0 + 4] = rgb[2];
      arr[off0 + 5] = edgeAlpha * fade0;
      count++;
      const off1 = count * LINE_STRIDE;
      arr[off1 + 0] = p1[0]; arr[off1 + 1] = p1[1];
      arr[off1 + 2] = rgb[0]; arr[off1 + 3] = rgb[1]; arr[off1 + 4] = rgb[2];
      arr[off1 + 5] = edgeAlpha * fade1;
      count++;
    }
  }
  return count;
}

// ==== Draw ====

export function drawWebgl(state, tSec, viewport) {
  if (!gl) return;
  const nowMs = tSec * 1000;

  // Фон — читаем CSS --bg, чтобы theme-toggle работал
  const bg = readCssColor('--bg', [0.039, 0.055, 0.102]);
  gl.clearColor(bg[0], bg[1], bg[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const vw = viewport.width;
  const vh = viewport.height;

  // ---- Edges (под точками) ----
  const lineCount = fillLineBuffer(state);
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

  // ---- Points (ноды) ----
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
    gl.uniform2f(uPoint.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uPoint.scale, state.camera.scale);
    gl.uniform2f(uPoint.viewport, vw, vh);
    gl.uniform1f(uPoint.dpr, dpr);
    gl.drawArrays(gl.POINTS, 0, pointCount);
  }
}

function readCssColor(cssVar, fallback) {
  try {
    const s = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    if (!s) return fallback;
    // Поддерживаем #rrggbb и rgb(r,g,b)
    if (s.startsWith('#')) {
      const hex = s.slice(1);
      const h = hex.length === 3
        ? hex.split('').map(c => c + c).join('')
        : hex;
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
