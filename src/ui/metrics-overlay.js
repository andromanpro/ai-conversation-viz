// Metrics overlay — HTML/CSS bubble badges поверх WebGL canvas.
//
// Зачем: WebGL не умеет рисовать AA-текст «из коробки». В Canvas 2D мы
// рисуем `drawMetricsBadges` через ctx.fillText, в WebGL же используем
// DOM-overlay: <div id="metrics-overlay"> с position:fixed, inside —
// маленькие <div class="metrics-badge"> с tokens / ⏱latency, transform
// перенастраивается каждый кадр под экранные координаты ноды.
//
// Cost: на 200 ассистент-нод = ~400 DOM элементов. Обновление через
// transform: translate (compositor-friendly). Профилировано — < 1 ms на
// кадр на средней плотности.

import { state } from '../view/state.js';
import { worldToScreen } from '../view/camera.js';

let overlayEl = null;
const cache = new Map(); // nodeId → { wrap, tokenEl, latencyEl, lastTokens, lastLatency }

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

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.id = 'metrics-overlay';
  overlayEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:ui-monospace,Consolas,monospace;font-size:10px;';
  document.body.appendChild(overlayEl);
  // Inject CSS только один раз
  if (!document.getElementById('metrics-overlay-style')) {
    const style = document.createElement('style');
    style.id = 'metrics-overlay-style';
    style.textContent = `
      .metrics-wrap { position: absolute; left: 0; top: 0; transform: translate(-9999px,-9999px); display: flex; gap: 3px; will-change: transform; white-space: nowrap; }
      .metrics-badge { background: rgba(20, 30, 60, 0.82); color: rgba(220,235,255,0.95); padding: 1px 5px; border-radius: 3px; font-variant-numeric: tabular-nums; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); }
      :root[data-theme="light"] .metrics-badge { background: rgba(50, 60, 90, 0.9); color: rgba(245, 250, 255, 0.98); }
      .metrics-badge.long { background: rgba(180, 80, 30, 0.88); color: rgba(255, 230, 200, 1); }
      :root[data-theme="light"] .metrics-badge.long { background: rgba(165, 70, 25, 0.95); color: rgba(255, 240, 220, 1); }
    `;
    document.head.appendChild(style);
  }
  return overlayEl;
}

function getOrCreateBadge(node) {
  let entry = cache.get(node.id);
  if (entry) return entry;
  const wrap = document.createElement('div');
  wrap.className = 'metrics-wrap';
  const latencyEl = document.createElement('div');
  latencyEl.className = 'metrics-badge';
  const tokenEl = document.createElement('div');
  tokenEl.className = 'metrics-badge';
  // latency слева, tokens справа — порядок в DOM = порядок отображения
  wrap.appendChild(latencyEl);
  wrap.appendChild(tokenEl);
  overlayEl.appendChild(wrap);
  entry = { wrap, tokenEl, latencyEl, lastTokens: -1, lastLatency: -1, lastVisible: false };
  cache.set(node.id, entry);
  return entry;
}

function hideEntry(entry) {
  if (!entry.lastVisible) return;
  entry.wrap.style.transform = 'translate(-9999px,-9999px)';
  entry.lastVisible = false;
}

function isVisibleNode(n, cutoff) {
  if (n.bornAt == null) return false;
  if (n.ts > cutoff) return false;
  if (state.hiddenRoles && state.hiddenRoles.has(n.role)) return false;
  return true;
}

function timelineCutoff() {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

/**
 * Вызывается каждый кадр из main.js (только в WebGL-режиме). Update'ит
 * positions всех бейджей под текущую камеру; добавляет/удаляет элементы
 * по необходимости.
 */
export function updateMetricsOverlay(viewport) {
  if (!state.showMetrics) {
    if (overlayEl && overlayEl.children.length) {
      overlayEl.innerHTML = '';
      cache.clear();
    }
    return;
  }
  ensureOverlay();
  const cam = state.camera;
  const cutoff = timelineCutoff();
  const seen = new Set();

  for (const n of state.nodes) {
    if (n.role !== 'assistant') continue;
    const tokens = n.tokensOut || 0;
    const latency = n.responseLatencyMs || 0;
    if (!tokens && latency < 1500) continue;
    if (!isVisibleNode(n, cutoff)) continue;
    seen.add(n.id);

    const entry = getOrCreateBadge(n);
    // Сборка/обновление текстов (только если изменилось — экономит paint)
    if (entry.lastTokens !== tokens) {
      entry.tokenEl.textContent = tokens > 0 ? formatTokensCompact(tokens) : '';
      entry.tokenEl.style.display = tokens > 0 ? '' : 'none';
      entry.lastTokens = tokens;
    }
    if (entry.lastLatency !== latency) {
      if (latency >= 1500) {
        entry.latencyEl.textContent = '⏱' + formatLatencyCompact(latency);
        entry.latencyEl.style.display = '';
        entry.latencyEl.classList.toggle('long', latency > 10000);
      } else {
        entry.latencyEl.style.display = 'none';
      }
      entry.lastLatency = latency;
    }

    // Position: под нодой по центру (transform CSS = compositor-only)
    const s = worldToScreen(n.x, n.y, cam);
    const r = (n.r || 5) * cam.scale;
    const x = Math.round(s.x);
    const y = Math.round(s.y + r + 3);
    entry.wrap.style.transform = `translate(calc(${x}px - 50%), ${y}px)`;
    entry.lastVisible = true;
  }

  // Скрываем (но не удаляем) бейджи нод, которых нет в видимом наборе.
  // Удаление приведёт к дёрганью при play (нода скрылась → удалили DOM).
  for (const [id, entry] of cache) {
    if (!seen.has(id)) hideEntry(entry);
  }
}

export function clearMetricsOverlay() {
  if (overlayEl) overlayEl.innerHTML = '';
  cache.clear();
}
