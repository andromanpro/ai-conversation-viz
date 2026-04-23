import { CFG, COLORS } from '../core/config.js';
import { worldToScreen } from './camera.js';
import { controlPoint, bezierPoint } from './particles.js';

function timelineCutoff(state) {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

function glowRgba(role, alpha) {
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreRgba(role, alpha) {
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreDarkRgba(role, alpha) {
  if (role === 'user') return `rgba(60, 100, 170, ${alpha})`;
  if (role === 'tool_use') return `rgba(140, 80, 30, ${alpha})`;
  return `rgba(30, 110, 95, ${alpha})`;
}

function edgeRgba(childRole, alpha) {
  if (childRole === 'tool_use') return `rgba(236, 160, 64, ${alpha * 1.28})`;
  return `rgba(0, 212, 255, ${alpha})`;
}

export function birthFactor(bornAt, now, duration) {
  if (bornAt == null) return 0;
  const t = (now - bornAt) / duration;
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  return t;
}

export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function updateBirths(state, cutoff, nowMs) {
  for (const n of state.nodes) {
    const alive = n.ts <= cutoff;
    if (alive && n.bornAt == null) {
      n.bornAt = nowMs;
      const parent = n.parentId ? state.byId.get(n.parentId) : null;
      if (parent && parent.bornAt != null) {
        const angle = Math.random() * Math.PI * 2;
        const dist = CFG.springLen * (CFG.birthSpreadMin + Math.random() * (CFG.birthSpreadMax - CFG.birthSpreadMin));
        n.x = parent.x + Math.cos(angle) * dist;
        n.y = parent.y + Math.sin(angle) * dist;
        n.vx = 0;
        n.vy = 0;
      }
    } else if (!alive && n.bornAt != null) {
      n.bornAt = null;
    }
  }
}

function drawEdgeCurve(ctx, aScreen, bScreen, cpScreen) {
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();
}

export function draw(ctx, state, tSec, viewport, extras) {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  const cam = state.camera;
  const cutoff = timelineCutoff(state);
  const nowMs = tSec * 1000;
  updateBirths(state, cutoff, nowMs);

  const heartbeat = (extras && extras.allowHeartbeat !== false)
    ? 1 + Math.sin(tSec * CFG.heartbeatFreq) * CFG.heartbeatAmplitude
    : 1;

  // ---- STARFIELD (не подвержен heartbeat)
  if (extras && extras.starfield) {
    extras.starfield(ctx, tSec);
  }

  // ---- Применяем heartbeat на графе вокруг центра viewport
  const cxScreen = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cyScreen = viewport.cy != null ? viewport.cy : viewport.height / 2;
  ctx.save();
  if (heartbeat !== 1) {
    ctx.translate(cxScreen, cyScreen);
    ctx.scale(heartbeat, heartbeat);
    ctx.translate(-cxScreen, -cyScreen);
  }

  const bfOf = n => birthFactor(n.bornAt, nowMs, CFG.birthDurationMs);
  const alpha = n => CFG.birthAlphaStart + (1 - CFG.birthAlphaStart) * easeOutCubic(bfOf(n));
  const sizeScale = n => CFG.birthRadiusStart + (1 - CFG.birthRadiusStart) * easeOutCubic(bfOf(n));
  const visible = n => n.ts <= cutoff && n.bornAt != null;

  const hasPath = state.pathSet && state.pathSet.size > 0;
  const dimMul = node => {
    if (!hasPath) return 1;
    return state.pathSet.has(node.id) ? 1 : CFG.focusDimAlpha;
  };
  const edgeDim = e => hasPath
    ? (state.pathSet.has(e.a.id) && state.pathSet.has(e.b.id) ? 1 : CFG.focusDimAlpha)
    : 1;

  // ---- EDGES (curved)
  ctx.lineWidth = 0.8;
  const edgeCPs = new Map();
  for (const e of state.edges) {
    if (!visible(e.a) || !visible(e.b)) continue;
    const ag = alpha(e.b) * edgeDim(e);
    const aS = worldToScreen(e.a.x, e.a.y, cam);
    const bS = worldToScreen(e.b.x, e.b.y, cam);
    const cpWorld = controlPoint({ x: e.a.x, y: e.a.y }, { x: e.b.x, y: e.b.y }, CFG.edgeCurveStrength);
    const cpS = worldToScreen(cpWorld.x, cpWorld.y, cam);
    edgeCPs.set(e, cpWorld);
    ctx.strokeStyle = edgeRgba(e.b.role, 0.35 * ag);
    drawEdgeCurve(ctx, aS, bS, cpS);
  }

  // ---- PARTICLES (по кривым рёбер)
  if (extras && extras.particles) {
    extras.particles(ctx, (edge) => {
      if (!visible(edge.a) || !visible(edge.b)) return 0;
      return alpha(edge.b) * edgeDim(edge);
    });
  }

  // ---- NODES
  const useGradient = state.nodes.length < CFG.useGradientFillBelow;
  for (const n of state.nodes) {
    if (!visible(n)) continue;
    const ag = alpha(n) * dimMul(n);
    const ss = sizeScale(n);
    const s = worldToScreen(n.x, n.y, cam);
    const boost = 0.3 + 0.7 * n.recency;
    const pulse = (Math.sin(tSec * CFG.pulseFreq + n.phase) + 1) * 0.5;
    const r = (n.r * ss + pulse * 0.8 * boost * ss) * cam.scale;
    if (r <= 0) continue;

    ctx.fillStyle = glowRgba(n.role, (0.18 + 0.12 * pulse * boost) * ag);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    if (useGradient) {
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      grad.addColorStop(0, coreRgba(n.role, ag));
      grad.addColorStop(1, coreDarkRgba(n.role, ag));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = coreRgba(n.role, ag);
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- HOVER RING
  if (state.hover && visible(state.hover)) {
    const s = worldToScreen(state.hover.x, state.hover.y, cam);
    const r = state.hover.r * cam.scale + 4;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.selected && visible(state.selected)) {
    const s = worldToScreen(state.selected.x, state.selected.y, cam);
    const r = state.selected.r * cam.scale + 7;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
