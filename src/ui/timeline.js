import { CFG } from '../core/config.js';
import { state } from '../view/state.js';
import { resetStory, syncChatToTimeline, rebuildSeen } from './story-mode.js';
import { reheat } from '../core/layout.js';

function centerRootsInViewport() {
  // Помещаем все "root"-ноды (без parent) в центр текущего viewport камеры,
  // чтобы при рестарте play первая нода появлялась в поле зрения.
  const cam = state.camera;
  const vp = { w: window.innerWidth, h: window.innerHeight };
  const cx = cam.x + (vp.w / 2) / cam.scale;
  const cy = cam.y + (vp.h / 2) / cam.scale;
  const roots = state.nodes.filter(n => !n.parentId || !state.byId.has(n.parentId));
  if (!roots.length) return;
  if (roots.length === 1) {
    roots[0].x = cx;
    roots[0].y = cy;
    roots[0].vx = 0;
    roots[0].vy = 0;
  } else {
    // Несколько корней — по небольшому кольцу вокруг центра
    const R = 40;
    for (let i = 0; i < roots.length; i++) {
      const a = (i / roots.length) * Math.PI * 2;
      roots[i].x = cx + Math.cos(a) * R;
      roots[i].y = cy + Math.sin(a) * R;
      roots[i].vx = 0;
      roots[i].vy = 0;
    }
  }
}

let sliderEl, labelEl, playBtn;
let playing = false;
// Зеркалим в state чтобы story-mode мог прочитать без циклического импорта
function setPlaying(v) { playing = v; state.isPlaying = v; }
let lastStepMs = 0;
let sortedIds = [];
let stepIndex = 0;

export function initTimeline() {
  sliderEl = document.getElementById('timeline');
  labelEl = document.getElementById('timeline-label');
  playBtn = document.getElementById('btn-play');
  sliderEl.addEventListener('input', onSliderInput);
  playBtn.addEventListener('click', togglePlay);
  updateLabel();
  updatePlayBtn();
}

function currentStepInterval() {
  return CFG.storyDwellMs / Math.max(0.1, state.playSpeed || 1);
}

export function setSpeed(mult) {
  state.playSpeed = mult;
  // при изменении speed пересчитываем lastStepMs, чтобы не произошло instant advance
  lastStepMs = performance.now();
}

function onSliderInput() {
  state.timelineMax = parseFloat(sliderEl.value) / 100;
  if (playing) stopPlay();
  updateLabel();
  syncChatToTimeline(state);
  rebuildSeen(state);
}

export function togglePlay() {
  if (playing) stopPlay(); else startPlay();
}

export function isPlaying() { return playing; }

function computeTsBounds() {
  if (!state.nodes.length) return { tsMin: 0, tsMax: 1 };
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return { tsMin, tsMax };
}

function startPlay() {
  if (!state.nodes.length) return;
  sortedIds = [...state.nodes].sort((a, b) => a.ts - b.ts).map(n => n.id);
  const atEnd = state.timelineMax >= 0.9999;
  if (atEnd) {
    resetStory();
    state.timelineMax = 0;
    stepIndex = 0;
    // Ставим корни в центр viewport + полный reheat, чтобы первая нода появилась в поле зрения
    centerRootsInViewport();
    if (state.sim) reheat(state.sim, 0.8);
  } else {
    const { tsMin, tsMax } = computeTsBounds();
    const range = Math.max(1, tsMax - tsMin);
    const cutoff = tsMin + range * state.timelineMax;
    stepIndex = 0;
    for (let i = 0; i < sortedIds.length; i++) {
      const node = state.byId.get(sortedIds[i]);
      if (node && node.ts <= cutoff) stepIndex = i + 1;
      else break;
    }
    // rebuild seen from DOM после manual drag
    rebuildSeen(state);
  }
  setPlaying(true);
  lastStepMs = performance.now();
  updatePlayBtn();
  updateLabel();
  if (atEnd) advanceStep();
}

function stopPlay() {
  setPlaying(false);
  updatePlayBtn();
}

function advanceStep() {
  if (stepIndex >= sortedIds.length) {
    state.timelineMax = 1;
    syncSlider();
    updateLabel();
    stopPlay();
    return;
  }
  const id = sortedIds[stepIndex++];
  const node = state.byId.get(id);
  if (!node) return advanceStep();
  // Two semantics:
  //   timelineByCount=true  → slider растёт равномерно, шаг = 1/N (визуально
  //     ровный прогресс вне зависимости от ts-разрывов)
  //   timelineByCount=false → slider = (node.ts - tsMin) / range (default,
  //     отражает реальное время — большой gap = большой прыжок)
  let desired;
  if (state.timelineByCount) {
    desired = stepIndex / sortedIds.length; // stepIndex уже инкрементирован
  } else {
    const { tsMin, tsMax } = computeTsBounds();
    const range = Math.max(1, tsMax - tsMin);
    desired = (node.ts - tsMin) / range;
  }
  state.timelineMax = Math.min(1, desired + 0.0001);
  // небольшой re-heat чтобы новорождённая нода могла устаканиться
  if (state.sim && state.sim.alpha < 0.12) reheat(state.sim, 0.15);
  syncSlider();
  updateLabel();
}

export function tickPlay() {
  if (!playing) return;
  const now = performance.now();
  const interval = currentStepInterval();
  // строго 1 advance на кадр; если отстали — просто догоняем по 1 на кадр
  if (now - lastStepMs >= interval) {
    lastStepMs = now;
    advanceStep();
  }
}

export function advanceTimeline(current, dt, duration) {
  const next = current + dt / duration;
  if (next >= 1) return { value: 1, finished: true };
  return { value: next, finished: false };
}

function syncSlider() {
  if (sliderEl) sliderEl.value = String(Math.round(state.timelineMax * 100));
}

function updatePlayBtn() {
  if (!playBtn) return;
  playBtn.textContent = playing ? '⏸' : '▶';
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  playBtn.classList.toggle('playing', playing);
}

function updateLabel() {
  if (!labelEl) return;
  if (!state.nodes.length) { labelEl.textContent = '—'; return; }
  const { tsMin, tsMax } = computeTsBounds();
  const t = tsMin + (tsMax - tsMin) * state.timelineMax;
  const visible = state.nodes.filter(n => n.ts <= t).length;
  labelEl.innerHTML = `<b>${visible}</b> / ${state.nodes.length} &middot; <span>${new Date(t).toISOString().replace('T', ' ').slice(0, 19)}</span>`;
}

export function resetTimeline() {
  stopPlay();
  if (sliderEl) sliderEl.value = 100;
  state.timelineMax = 1;
  sortedIds = [];
  stepIndex = 0;
  updateLabel();
}
