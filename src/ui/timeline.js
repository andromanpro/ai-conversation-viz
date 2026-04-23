import { state } from '../view/state.js';

let sliderEl, labelEl, playBtn;
let playing = false;
let lastPlayTime = 0;
const PLAY_DURATION_SEC = 20;

export function initTimeline() {
  sliderEl = document.getElementById('timeline');
  labelEl = document.getElementById('timeline-label');
  playBtn = document.getElementById('btn-play');
  sliderEl.addEventListener('input', onSliderInput);
  playBtn.addEventListener('click', togglePlay);
  updateLabel();
  updatePlayBtn();
}

function onSliderInput() {
  state.timelineMax = parseFloat(sliderEl.value) / 100;
  if (playing) stopPlay();
  updateLabel();
}

export function togglePlay() {
  if (playing) stopPlay(); else startPlay();
}

function startPlay() {
  if (!state.nodes.length) return;
  if (state.timelineMax >= 1) state.timelineMax = 0;
  syncSlider();
  playing = true;
  lastPlayTime = performance.now() / 1000;
  updatePlayBtn();
  updateLabel();
}

function stopPlay() {
  playing = false;
  updatePlayBtn();
}

export function tickPlay() {
  if (!playing) return;
  const now = performance.now() / 1000;
  const dt = now - lastPlayTime;
  lastPlayTime = now;
  const step = advanceTimeline(state.timelineMax, dt, PLAY_DURATION_SEC);
  state.timelineMax = step.value;
  syncSlider();
  updateLabel();
  if (step.finished) stopPlay();
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
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  const t = tsMin + (tsMax - tsMin) * state.timelineMax;
  const visible = state.nodes.filter(n => n.ts <= t).length;
  labelEl.innerHTML = `<b>${visible}</b> / ${state.nodes.length} &middot; <span>${new Date(t).toISOString().replace('T', ' ').slice(0, 19)}</span>`;
}

export function resetTimeline() {
  stopPlay();
  if (sliderEl) sliderEl.value = 100;
  state.timelineMax = 1;
  updateLabel();
}
