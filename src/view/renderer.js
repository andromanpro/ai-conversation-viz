import { CFG, COLORS } from '../core/config.js';
import { worldToScreen } from './camera.js';

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

function coreColor(role) {
  if (role === 'user') return COLORS.user;
  if (role === 'tool_use') return COLORS.tool;
  return COLORS.assistant;
}

export function draw(ctx, state, tSec, viewport) {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  const cam = state.camera;
  const scale = cam.scale;
  const cutoff = timelineCutoff(state);
  const visible = n => n.ts <= cutoff;

  ctx.lineWidth = 0.8;
  for (const e of state.edges) {
    if (!visible(e.a) || !visible(e.b)) continue;
    const a = worldToScreen(e.a.x, e.a.y, cam);
    const b = worldToScreen(e.b.x, e.b.y, cam);
    ctx.strokeStyle = e.b.role === 'tool_use' ? COLORS.toolEdge : COLORS.edge;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (const n of state.nodes) {
    if (!visible(n)) continue;
    const s = worldToScreen(n.x, n.y, cam);
    const boost = 0.3 + 0.7 * n.recency;
    const pulse = (Math.sin(tSec * CFG.pulseFreq + n.phase) + 1) * 0.5;
    const r = (n.r + pulse * 0.8 * boost) * scale;

    ctx.fillStyle = glowRgba(n.role, 0.18 + 0.12 * pulse * boost);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = coreColor(n.role);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.hover && visible(state.hover)) {
    const s = worldToScreen(state.hover.x, state.hover.y, cam);
    const r = state.hover.r * scale + 4;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.selected && visible(state.selected)) {
    const s = worldToScreen(state.selected.x, state.selected.y, cam);
    const r = state.selected.r * scale + 7;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}
