import { CFG, COLORS } from '../core/config.js';
import { worldToScreen } from './camera.js';
import { controlPoint, bezierPoint } from './particles.js';
import { toolIcon } from './tool-icons.js';
import { hueToRgbaString } from './topics.js';

function timelineCutoff(state) {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

// Diff palette
//   A-only: розовато-фуксиевый (теряется в A)
//   B-only: бирюзовый (добавлено в B)
//   both  : нейтрально-тёплый серый
function diffGlowRgba(origin, alpha) {
  if (origin === 'A') return `rgba(255, 96, 175, ${alpha})`;
  if (origin === 'B') return `rgba(90, 210, 255, ${alpha})`;
  return `rgba(200, 200, 210, ${alpha * 0.75})`;
}
function diffCoreRgba(origin, alpha) {
  if (origin === 'A') return `rgba(255, 130, 190, ${alpha})`;
  if (origin === 'B') return `rgba(120, 220, 255, ${alpha})`;
  return `rgba(220, 220, 230, ${alpha})`;
}
function diffCoreDark(origin, alpha) {
  if (origin === 'A') return `rgba(140, 30, 90, ${alpha})`;
  if (origin === 'B') return `rgba(20, 100, 140, ${alpha})`;
  return `rgba(120, 120, 130, ${alpha})`;
}

function glowRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffGlowRgba(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.7, 0.6, alpha);
  }
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  if (role === 'thinking') return `rgba(181, 140, 255, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffCoreRgba(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.75, 0.62, alpha);
  }
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  if (role === 'thinking') return `rgba(181, 140, 255, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreDarkRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffCoreDark(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.8, 0.35, alpha);
  }
  if (role === 'user') return `rgba(60, 100, 170, ${alpha})`;
  if (role === 'tool_use') return `rgba(140, 80, 30, ${alpha})`;
  if (role === 'thinking') return `rgba(95, 70, 160, ${alpha})`;
  return `rgba(30, 110, 95, ${alpha})`;
}

function edgeRgba(childRole, alpha, edge, diffMode) {
  if (diffMode && edge && edge.diffSide === 'B') return `rgba(90, 210, 255, ${alpha * 1.1})`;
  if (childRole === 'tool_use') return `rgba(236, 160, 64, ${alpha * 1.28})`;
  if (childRole === 'thinking') return `rgba(181, 140, 255, ${alpha * 1.05})`;
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

function updateBirths(state, cutoff, nowMs, onBirth) {
  const mode = state.layoutMode;
  for (const n of state.nodes) {
    const alive = n.ts <= cutoff;
    if (alive && n.bornAt == null) {
      n.bornAt = nowMs;
      // В нестандартных раскладках (swim/radial) рождаем сразу на target-координатах
      if (mode === 'swim' && n._swimX != null) {
        n.x = n._swimX;
        n.y = n._swimY;
        n.vx = 0; n.vy = 0;
      } else if (mode === 'radial' && n._radialX != null) {
        n.x = n._radialX;
        n.y = n._radialY;
        n.vx = 0; n.vy = 0;
      } else {
        // force — у parent с jitter (органичная birth-animation)
        const parent = n.parentId ? state.byId.get(n.parentId) : null;
        if (parent && parent.bornAt != null) {
          const angle = Math.random() * Math.PI * 2;
          const dist = CFG.springLen * (CFG.birthSpreadMin + Math.random() * (CFG.birthSpreadMax - CFG.birthSpreadMin));
          n.x = parent.x + Math.cos(angle) * dist;
          n.y = parent.y + Math.sin(angle) * dist;
          n.vx = 0;
          n.vy = 0;
        }
      }
      if (onBirth) onBirth(n);
    } else if (!alive && n.bornAt != null) {
      n.bornAt = null;
    }
  }
}

// Метрики: компактный бейдж "1.2k" (output tokens) и "⏱3s" (latency) под нодой.
// Цвета адаптивные (light/dark theme). На больших latencies (>10s) — оранжевый.
function formatTokensCompact(n) {
  if (n >= 10000) return Math.round(n / 1000) + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
function formatLatencyCompact(ms) {
  if (ms < 1000) return ms + 'ms';
  const sec = ms / 1000;
  if (sec < 60) return sec.toFixed(sec < 10 ? 1 : 0) + 's';
  const m = Math.floor(sec / 60);
  return m + 'm' + Math.round(sec - m * 60) + 's';
}
function drawMetricsBadges(ctx, n, s, r, ag) {
  const tokens = n.tokensOut || 0;
  const latency = n.responseLatencyMs || 0;
  if (!tokens && latency < 1500) return;

  const fs = 10;
  ctx.save();
  ctx.font = `${fs}px ui-monospace, Consolas, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const padH = 4, padV = 2;
  const bgFill = `rgba(20, 30, 60, ${0.82 * ag})`;
  const fgText = `rgba(220, 235, 255, ${Math.min(1, ag * 0.95)})`;

  // Tokens — справа-снизу
  if (tokens > 0) {
    const label = formatTokensCompact(tokens);
    const w = ctx.measureText(label).width + padH * 2;
    const h = fs + padV * 2;
    const bx = s.x + r * 0.6;
    const by = s.y + r + 1;
    ctx.fillStyle = bgFill;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, w, h, 3); ctx.fill(); }
    else ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = fgText;
    ctx.fillText(label, bx + padH, by + h / 2);
  }

  // Latency — слева-снизу. Только если ≥ 1.5s (мелочь не показываем).
  if (latency >= 1500) {
    const label = '⏱' + formatLatencyCompact(latency);
    const w = ctx.measureText(label).width + padH * 2;
    const h = fs + padV * 2;
    const bx = s.x - r * 0.6 - w;
    const by = s.y + r + 1;
    const isLong = latency > 10000;
    ctx.fillStyle = isLong
      ? `rgba(180, 80, 30, ${0.85 * ag})`
      : bgFill;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, w, h, 3); ctx.fill(); }
    else ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = isLong ? `rgba(255, 230, 200, ${Math.min(1, ag)})` : fgText;
    ctx.fillText(label, bx + padH, by + h / 2);
  }
  ctx.restore();
}

function drawEdgeCurve(ctx, aScreen, bScreen, cpScreen) {
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();
}

/**
 * Для WebGL-режима: вычисляем cutoff и вызываем updateBirths.
 * В Canvas 2D это происходит внутри draw(), но в WebGL мы не вызываем
 * Canvas 2D draw — birth-логика должна работать независимо.
 */
export function updateBirthsForWebgl(state, tSec, viewport) {
  const nowMs = tSec * 1000;
  const cutoff = timelineCutoff(state);
  updateBirths(state, cutoff, nowMs, null);
}

// Вспомогательная: 5-лучевая звезда для annotation star-marker
function drawStar(ctx, cx, cy, outerR, innerR, points) {
  ctx.beginPath();
  const step = Math.PI / points;
  let angle = -Math.PI / 2;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    angle += step;
  }
  ctx.closePath();
}

export function draw(ctx, state, tSec, viewport, extras) {
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  // Radial vignette — тёмный cyberpunk-фон
  const W = viewport.width, H = viewport.height;
  const vcx = viewport.cx != null ? viewport.cx : W / 2;
  const vcy = viewport.cy != null ? viewport.cy : H / 2;
  const grad = ctx.createRadialGradient(vcx, vcy, 0, vcx, vcy, Math.max(W, H) * 0.8);
  grad.addColorStop(0, 'rgba(14, 22, 44, 1)');
  grad.addColorStop(0.6, 'rgba(10, 14, 26, 1)');
  grad.addColorStop(1, 'rgba(5, 8, 16, 1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const cam = state.camera;
  const cutoff = timelineCutoff(state);
  const nowMs = tSec * 1000;
  updateBirths(state, cutoff, nowMs, extras && extras.onBirth);
  const perfMode = (extras && extras.perfMode) || 'normal';

  // Swim-mode guide lines (в world) + sticky labels вверху (screen-space)
  if (state.layoutMode === 'swim') {
    const laneSpacingWorld = (viewport.safeH != null ? viewport.safeH : viewport.height) * 0.32;
    const vcx_world = viewport.cx != null ? viewport.cx : viewport.width / 2;
    const vcy_world = viewport.cy != null ? viewport.cy : viewport.height / 2;
    const lanes = [
      { y: vcy_world - laneSpacingWorld, label: 'USER',      color: 'rgba(123,170,240,' },
      { y: vcy_world,                    label: 'ASSISTANT', color: 'rgba(80,212,181,' },
      { y: vcy_world + laneSpacingWorld, label: 'TOOL_USE',  color: 'rgba(236,160,64,' },
    ];
    // Линии в world-space (ездят с камерой)
    ctx.save();
    ctx.lineWidth = 0.8;
    ctx.setLineDash([6, 8]);
    for (const ln of lanes) {
      const yS = (ln.y - cam.y) * cam.scale;
      if (yS < -4 || yS > viewport.height + 4) continue;
      ctx.strokeStyle = ln.color + '0.3)';
      ctx.beginPath();
      ctx.moveTo(0, yS);
      ctx.lineTo(viewport.width, yS);
      ctx.stroke();
    }
    ctx.restore();

    // Sticky labels в screen-space: фиксированная полоса сверху, лейблы
    // идут по вертикали возле соответствующего lane'а (с clamp чтобы всегда видно)
    ctx.save();
    ctx.font = 'bold 11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const sideX = 20;
    for (const ln of lanes) {
      const yWorld = ln.y;
      const yScreen = (yWorld - cam.y) * cam.scale;
      // clamp вертикально в видимый диапазон с padding
      const y = Math.max(22, Math.min(viewport.height - 22, yScreen));
      // Chip-бекграунд
      const txt = ln.label;
      const w = ctx.measureText(txt).width + 16;
      const h = 20;
      ctx.fillStyle = 'rgba(10,14,26,0.85)';
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(sideX, y - h / 2, w, h, 4); ctx.fill();
      } else {
        ctx.fillRect(sideX, y - h / 2, w, h);
      }
      ctx.strokeStyle = ln.color + '0.55)';
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(sideX, y - h / 2, w, h, 4); ctx.stroke();
      } else {
        ctx.strokeRect(sideX, y - h / 2, w, h);
      }
      ctx.fillStyle = ln.color + '1)';
      ctx.fillText(txt, sideX + 8, y + 1);
    }
    ctx.restore();
  }

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
  // Edge birth — длительнее ноды (чтобы линия не «вспыхивала», а росла)
  const edgeBirthMs = CFG.birthDurationMs * 1.6;
  const edgeBfOf = n => birthFactor(n.bornAt, nowMs, edgeBirthMs);
  const edgeAlphaOf = n => easeOutCubic(edgeBfOf(n)); // от 0 до 1, без начального birthAlphaStart
  const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && state.collapsed && state.collapsed.has(n.parentId);
  const thinkingHidden = state.showThinking === false;
  const visible = n => n.ts <= cutoff && n.bornAt != null
    && !(state.hiddenRoles && state.hiddenRoles.has(n.role))
    && !(thinkingHidden && n.role === 'thinking')
    && !isCollapsedChild(n);

  const hasPath = state.pathSet && state.pathSet.size > 0;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const topicFilter = state.topicFilter || null;
  const topicMatches = node => !topicFilter || node._topicWord === topicFilter;
  const dimMul = node => {
    if (hasSearch) return state.searchMatches.has(node.id) ? 1 : CFG.searchDimAlpha;
    if (topicFilter) return topicMatches(node) ? 1 : CFG.searchDimAlpha;
    if (!hasPath) return 1;
    return state.pathSet.has(node.id) ? 1 : CFG.focusDimAlpha;
  };
  const edgeDim = e => {
    if (hasSearch) {
      return (state.searchMatches.has(e.a.id) && state.searchMatches.has(e.b.id)) ? 1 : CFG.searchDimAlpha;
    }
    if (topicFilter) {
      return (topicMatches(e.a) && topicMatches(e.b)) ? 1 : CFG.searchDimAlpha;
    }
    if (!hasPath) return 1;
    return (state.pathSet.has(e.a.id) && state.pathSet.has(e.b.id)) ? 1 : CFG.focusDimAlpha;
  };

  // ---- EDGES (curved) + fog при большом N
  const N = state.nodes.length;
  const fogMul = N > 500 ? Math.max(0.25, 1 - (N - 500) / 2500) : 1;
  const connectOrphans = !!state.connectOrphans;
  ctx.lineWidth = 0.8;
  const edgeCPs = new Map();
  for (const e of state.edges) {
    if (!visible(e.a) || !visible(e.b)) continue;
    if (e.adopted && !connectOrphans) continue; // скрываем adopted-edges при forest mode
    // Edge alpha — растёт по самой младшей ноде с удлинённым duration
    const youngerEdgeAlpha = Math.min(edgeAlphaOf(e.a), edgeAlphaOf(e.b));
    const ag = youngerEdgeAlpha * edgeDim(e);
    const aS = worldToScreen(e.a.x, e.a.y, cam);
    const bS = worldToScreen(e.b.x, e.b.y, cam);
    const cpWorld = controlPoint({ x: e.a.x, y: e.a.y }, { x: e.b.x, y: e.b.y }, CFG.edgeCurveStrength);
    const cpS = worldToScreen(cpWorld.x, cpWorld.y, cam);
    edgeCPs.set(e, cpWorld);
    if (e.adopted) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = `rgba(200, 180, 120, ${0.22 * ag * fogMul})`;
      drawEdgeCurve(ctx, aS, bS, cpS);
      ctx.restore();
    } else {
      ctx.strokeStyle = edgeRgba(e.b.role, 0.35 * ag * fogMul, e, !!state.diffMode);
      drawEdgeCurve(ctx, aS, bS, cpS);
    }
  }

  // ---- REVERSE SIGNAL (tool_result → tool_use, animated lemon comet) ----
  // Аналог WebGL pass'а: «комета» бежит от tool_result обратно к tool_use,
  // визуализируя возврат ответа от инструмента к ассистенту.
  // На Canvas 2D рисуем 1 частицу на pair с pulsing position по quadratic
  // Bezier (B → A) и затухающим следом.
  if (state.showReverseSignal !== false && state.pairEdges && state.pairEdges.length) {
    ctx.save();
    for (const p of state.pairEdges) {
      if (!visible(p.a) || !visible(p.b)) continue;
      // SWAP направление: комета летит от B (tool_result) к A (tool_use)
      const ax = p.b.x, ay = p.b.y;
      const bx = p.a.x, by = p.a.y;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const off = len * 0.10;
      const ccx = mx - (dy / len) * off;
      const ccy = my + (dx / len) * off;
      // t — фаза кометы 0..1, бежит со скоростью ~1 цикл/сек, разный seed на pair
      const seed = ((p.a.phase || 0) + (p.b.phase || 0)) * 0.15;
      const tt = (tSec * 1.0 + seed) % 1.0;
      // Quadratic Bezier point
      const u = 1 - tt;
      const wx = u * u * ax + 2 * u * tt * ccx + tt * tt * bx;
      const wy = u * u * ay + 2 * u * tt * ccy + tt * tt * by;
      const sH = worldToScreen(wx, wy, cam);
      const ag = Math.min(alpha(p.a), alpha(p.b)) * edgeDim({ a: p.a, b: p.b }) * fogMul;
      // head — bell-curve размер вдоль пути (ярче в середине)
      const head = Math.sin(Math.PI * tt);
      const r = (3 + 3 * head) * Math.max(0.6, cam.scale);
      // Halo
      const halo = ctx.createRadialGradient(sH.x, sH.y, 0, sH.x, sH.y, r * 3);
      halo.addColorStop(0, `rgba(255, 235, 92, ${0.85 * ag * head})`);
      halo.addColorStop(1, `rgba(255, 235, 92, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sH.x, sH.y, r * 3, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = `rgba(255, 250, 200, ${0.95 * ag * head})`;
      ctx.beginPath();
      ctx.arc(sH.x, sH.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
    const isMatch = hasSearch && state.searchMatches.has(n.id);
    const ag = alpha(n) * dimMul(n);
    const ss = sizeScale(n);
    const s = worldToScreen(n.x, n.y, cam);
    const boost = 0.3 + 0.7 * n.recency;
    const pulse = (Math.sin(tSec * CFG.pulseFreq + n.phase) + 1) * 0.5;
    const searchPulse = isMatch ? (0.5 + 0.5 * Math.sin(tSec * CFG.searchPulseFreq + n.phase)) : 0;
    const hubMul = n.isHub ? (1 + 0.3 * Math.sin(tSec * 1.8 + n.phase)) : 1;
    // При больших графах — уменьшаем node radius чтобы не «сетка»
    const densityScale = N > 800 ? Math.max(0.55, 1 - (N - 800) / 4000) : 1;
    const r = (n.r * ss * (1 + searchPulse * 0.25) * hubMul * densityScale + pulse * 0.8 * boost * ss * densityScale) * cam.scale;
    if (r <= 0) continue;

    // Glow дорогой (radialGradient + extra arc) — пропускаем на больших графах
    const topicsMode = !!state.topicsMode;
    const diffMode = !!state.diffMode;
    if (perfMode !== 'minimal') {
      const glowR = r * CFG.nodeGlowRadiusMul;
      const innerA = (CFG.nodeGlowAlphaBase + CFG.nodeGlowAlphaPulse * pulse * boost) * ag;
      if (perfMode === 'degraded') {
        ctx.fillStyle = glowRgba(n.role, innerA * 0.7, n, topicsMode, diffMode);
      } else {
        const glowGrad = ctx.createRadialGradient(s.x, s.y, r * CFG.nodeGlowInnerStop, s.x, s.y, glowR);
        glowGrad.addColorStop(0, glowRgba(n.role, innerA, n, topicsMode, diffMode));
        glowGrad.addColorStop(1, glowRgba(n.role, 0, n, topicsMode, diffMode));
        ctx.fillStyle = glowGrad;
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (useGradient) {
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      grad.addColorStop(0, coreRgba(n.role, ag, n, topicsMode, diffMode));
      grad.addColorStop(1, coreDarkRgba(n.role, ag, n, topicsMode, diffMode));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = coreRgba(n.role, ag, n, topicsMode, diffMode);
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();


    // Hub ring (yellow-gold outline для нод с high degree)
    if (n.isHub && perfMode !== 'minimal') {
      ctx.strokeStyle = `rgba(255, 215, 120, ${0.55 * ag})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Error ring: красное пунктирное кольцо у нод с tool error (assistant
    // которая дала tool_use получивший is_error в matching tool_result, или
    // сама virtual tool_use нода).
    if (state.showErrorRings !== false && (n._hasErrorTool || n._isErrorToolUse) && perfMode !== 'minimal') {
      const errPulse = 0.55 + 0.25 * Math.sin(tSec * 2.2 + n.phase);
      ctx.save();
      const dashOff = -(tSec * 8) % 10;
      ctx.lineDashOffset = dashOff;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = `rgba(255, 90, 90, ${errPulse * ag})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Orphan-root marker: пунктирное кольцо
    if (n._isOrphanRoot && perfMode !== 'minimal') {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = `rgba(236, 160, 64, ${0.65 * ag})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // User annotations: золотая ★ для starred, маленький ✍ для заметки.
    // Рисуем поверх всего, но с учётом ag (fade-in при рождении).
    const ann = state.annotations && state.annotations.get(n.id);
    if (ann && perfMode !== 'minimal') {
      if (ann.starred) {
        const starSize = Math.max(8, r * 0.9);
        const sx = s.x + r + 1, sy = s.y - r - 1;
        ctx.save();
        ctx.fillStyle = `rgba(255, 215, 120, ${0.95 * ag})`;
        ctx.strokeStyle = `rgba(140, 90, 10, ${0.9 * ag})`;
        ctx.lineWidth = 0.8;
        drawStar(ctx, sx, sy, starSize * 0.55, starSize * 0.25, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (ann.text) {
        // Маленький «✍» индикатор на противоположной стороне от звезды
        const nx = s.x - r - 2, ny = s.y - r - 2;
        ctx.save();
        ctx.font = `${Math.max(9, Math.round(r * 0.75))}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(123, 170, 240, ${0.9 * ag})`;
        ctx.fillText('✍', nx, ny);
        ctx.restore();
      }
    }

    // Collapsed-marker: assistant нода с свёрнутыми tool_use детьми — бейдж "×N"
    if (n.role === 'assistant' && state.collapsed && state.collapsed.has(n.id)) {
      let count = 0;
      for (const m of state.nodes) {
        if (m.parentId === n.id && m.role === 'tool_use') count++;
      }
      if (count > 0) {
        const badgeFs = Math.max(9, Math.round(r * 0.9));
        ctx.font = `bold ${badgeFs}px ui-monospace, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // фон бейджа
        const label = '×' + count;
        const w = ctx.measureText(label).width + 6;
        const bx = s.x + r + 2, by = s.y - r - 2;
        ctx.fillStyle = `rgba(236, 160, 64, ${0.85 * ag})`;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx - w / 2, by - badgeFs * 0.7, w, badgeFs * 1.3, 4) : ctx.rect(bx - w / 2, by - badgeFs * 0.7, w, badgeFs * 1.3);
        ctx.fill();
        ctx.fillStyle = '#1a1204';
        ctx.fillText(label, bx, by);
      }
    }

    // Tool icon внутри tool_use ноды
    if (n.role === 'tool_use' && r >= CFG.toolIconMinR) {
      const fs = Math.max(CFG.toolIconMinFontPx, Math.round(r * CFG.toolIconFontMul));
      ctx.font = `${fs}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(20, 14, 4, ${Math.min(1, ag * 0.92)})`;
      ctx.fillText(toolIcon(n.toolName), s.x, s.y + fs * 0.05);
    }

    // Metrics badges (только для assistant-нод, под showMetrics toggle).
    // Размещаем под нодой: tokens справа-внизу, ⏱latency слева-внизу.
    if (state.showMetrics && n.role === 'assistant' && perfMode !== 'minimal') {
      drawMetricsBadges(ctx, n, s, r, ag);
    }

    // Thinking nodes: 💭 icon + soft pulsing dashed ring (как «облако мысли»)
    if (n.role === 'thinking' && perfMode !== 'minimal') {
      // Dashed cloud ring чуть дальше core
      const cloudPulse = 0.6 + 0.25 * Math.sin(tSec * 1.6 + n.phase);
      ctx.save();
      const dashOff = -(tSec * 4) % 8;
      ctx.lineDashOffset = dashOff;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = `rgba(181, 140, 255, ${cloudPulse * 0.5 * ag})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // 💭 icon если хватает места
      if (r >= 6) {
        const fs = Math.max(9, Math.round(r * 1.0));
        ctx.font = `${fs}px ui-monospace, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(245, 235, 255, ${Math.min(1, ag * 0.95)})`;
        ctx.fillText('💭', s.x, s.y + fs * 0.05);
      }
    }
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

  // Активный search-результат — подсветка
  if (state.searchActive) {
    const activeNode = state.byId.get(state.searchActive);
    if (activeNode && visible(activeNode)) {
      const s = worldToScreen(activeNode.x, activeNode.y, cam);
      const r = activeNode.r * cam.scale + 10;
      const pulse = (Math.sin(tSec * CFG.searchPulseFreq) + 1) * 0.5;
      ctx.strokeStyle = `rgba(236, 160, 64, ${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
