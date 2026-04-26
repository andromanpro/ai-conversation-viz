import { CFG } from '../core/config.js';
import { state } from '../view/state.js';

let canvasEl, ctx, dpr = 1;
let tf = null; // сохранённая трансформация для click->world
let frameCounter = 0;
let _mmGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

export function initMinimap(_mmGetViewportFn) {
  if (_mmGetViewportFn) _mmGetViewport = _mmGetViewportFn;
  canvasEl = document.getElementById('minimap');
  if (!canvasEl) return;
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvasEl.width = CFG.minimapW * dpr;
  canvasEl.height = CFG.minimapH * dpr;
  canvasEl.style.width = CFG.minimapW + 'px';
  canvasEl.style.height = CFG.minimapH + 'px';
  ctx = canvasEl.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvasEl.addEventListener('click', onClick);
}

function colorFor(role) {
  if (role === 'user') return '#7BAAF0';
  if (role === 'subagent_input') return '#8CA5C8';
  if (role === 'tool_use') return '#ECA040';
  if (role === 'tool_result') return '#C89150';
  if (role === 'thinking') return '#B58CFF';
  return '#50D4B5';
}

export function tickMinimap() {
  if (!canvasEl || !ctx) return;
  if ((frameCounter++) % CFG.minimapEveryNFrames !== 0) return;
  const W = CFG.minimapW, H = CFG.minimapH;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10, 14, 26, 0.55)';
  ctx.fillRect(0, 0, W, H);

  if (!state.nodes.length) {
    tf = null;
    return;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of state.nodes) {
    if (state.hiddenRoles.has(n.role)) continue;
    if (n.bornAt == null) continue;
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  if (!isFinite(minX)) { tf = null; return; }
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const pad = CFG.minimapPadding;
  const s = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
  const ox = pad + ((W - pad * 2) - bw * s) / 2;
  const oy = pad + ((H - pad * 2) - bh * s) / 2;
  const w2m = (wx, wy) => ({ x: ox + (wx - minX) * s, y: oy + (wy - minY) * s });

  // edges
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.22)';
  ctx.lineWidth = 0.5;
  for (const e of state.edges) {
    if (state.hiddenRoles.has(e.a.role) || state.hiddenRoles.has(e.b.role)) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    const a = w2m(e.a.x, e.a.y);
    const b = w2m(e.b.x, e.b.y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // nodes
  for (const n of state.nodes) {
    if (state.hiddenRoles.has(n.role)) continue;
    if (n.bornAt == null) continue;
    const p = w2m(n.x, n.y);
    ctx.fillStyle = colorFor(n.role);
    ctx.beginPath();
    ctx.arc(p.x, p.y, CFG.minimapNodeR, 0, Math.PI * 2);
    ctx.fill();
  }

  // viewport rectangle
  const cam = state.camera;
  const vp = _mmGetViewport();
  const vw = vp.width / cam.scale;
  const vh = vp.height / cam.scale;
  const tl = w2m(cam.x, cam.y);
  const br = w2m(cam.x + vw, cam.y + vh);
  ctx.strokeStyle = 'rgba(236, 160, 64, 0.75)';
  ctx.lineWidth = 1;
  const rx = Math.max(0, Math.min(W, tl.x));
  const ry = Math.max(0, Math.min(H, tl.y));
  const rw = Math.max(1, Math.min(W - rx, br.x - tl.x));
  const rh = Math.max(1, Math.min(H - ry, br.y - tl.y));
  ctx.strokeRect(rx, ry, rw, rh);

  tf = { ox, oy, s, minX, minY };
}

function onClick(ev) {
  if (!tf) return;
  const rect = canvasEl.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const my = ev.clientY - rect.top;
  const wx = (mx - tf.ox) / tf.s + tf.minX;
  const wy = (my - tf.oy) / tf.s + tf.minY;
  const vp = _mmGetViewport();
  const cx = vp.cx != null ? vp.cx : vp.width / 2;
  const cy = vp.cy != null ? vp.cy : vp.height / 2;
  state.cameraTarget = {
    x: wx - cx / state.camera.scale,
    y: wy - cy / state.camera.scale,
    scale: state.camera.scale,
  };
}
