import { CFG } from '../core/config.js';
import { state } from '../view/state.js';
import { resetStory, syncChatToTimeline, rebuildSeen } from './story-mode.js';
import { reheat } from '../core/layout.js';

let sliderEl, labelEl, playBtn;
let playing = false;
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
  playing = true;
  lastStepMs = performance.now();
  updatePlayBtn();
  updateLabel();
  if (atEnd) advanceStep();
}

function stopPlay() {
  playing = false;
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
  const { tsMin, tsMax } = computeTsBounds();
  const range = Math.max(1, tsMax - tsMin);
  const desired = (node.ts - tsMin) / range;
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
