// Settings modal — live-update для основных CFG параметров.
// Сохранение в localStorage.

import { CFG } from '../core/config.js';
import { state } from '../view/state.js';
import { reheat } from '../core/layout.js';

const KEY = 'viz-settings';

// Описание регулируемых параметров (group, key, min, max, step, label)
const PARAMS = [
  // Physics
  ['Physics', 'repulsion',       500,  30000, 100,  'Repulsion strength'],
  ['Physics', 'spring',          0.01, 0.3,   0.01, 'Spring strength'],
  ['Physics', 'springLen',       30,   300,   5,    'Spring rest length'],
  ['Physics', 'centerPull',      0.0,  0.02,  0.0005, 'Center pull'],
  ['Physics', 'velocityDecay',   0.1,  0.9,   0.02, 'Velocity decay (friction)'],
  ['Physics', 'maxVelocity',     5,    200,   1,    'Max velocity clamp'],
  ['Physics', 'alphaDecay',      0.005, 0.2,  0.002, 'Alpha decay rate'],
  ['Physics', 'repulsionCutoff', 500,  6000,  100,  'Repulsion cutoff (px)'],
  // Visual
  ['Visual',  'particlesPerEdge', 0,    3,    1,   'Particles per edge (0 = off)'],
  ['Visual',  'particleSpeed',   0.1,  2,     0.05, 'Particle speed'],
  ['Visual',  'particleJitterPx',0,    6,     0.1, 'Particle jitter'],
  ['Visual',  'starfieldCount',  0,    1000,  50,  'Starfield density'],
  ['Visual',  'nodeGlowRadiusMul', 1,  4,     0.1, 'Node glow radius'],
  ['Visual',  'nodeGlowAlphaBase', 0,  0.3,   0.01, 'Node glow alpha'],
  // Playback
  ['Playback','storyDwellMs',    400,  5000,  100, 'Play step interval (ms)'],
  ['Playback','storyCharMs',     5,    80,    1,   'Typewriter speed (ms/char)'],
  ['Playback','storyMaxChars',   80,   1200,  20,  'Max chars per bubble'],
  ['Playback','storyPostGapMs',  200,  3000,  50,  'Min gap between bubbles'],
  // Birth
  ['Birth',   'birthDurationMs', 100,  2500,  50,  'Birth animation (ms)'],
];

// Boolean toggles (group, key, label, scope) — scope='state' читает/пишет
// в state.<key>, scope='CFG' — в CFG.<key>
const TOGGLES = [
  ['Display', 'showPairEdges',  'Pair edges (tool_use ↔ result)', 'state'],
  ['Display', 'showErrorRings', 'Error rings (red dashed)',       'state'],
];

let modalEl, btn;

export function initSettingsModal() {
  btn = document.getElementById('btn-settings');
  if (btn) btn.addEventListener('click', toggle);
  // Применяем saved settings
  loadSaved();
}

export function toggleSettings() { toggle(); }

function toggle() {
  if (modalEl) { close(); return; }
  open();
}

function open() {
  modalEl = document.createElement('div');
  modalEl.id = 'settings-modal';
  modalEl.className = 'settings-modal';

  const inner = document.createElement('div');
  inner.className = 'settings-body';
  modalEl.appendChild(inner);

  const header = document.createElement('div');
  header.className = 'settings-header';
  header.innerHTML = `<span>⚙ Settings</span>`;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'settings-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);
  inner.appendChild(header);

  // Группируем range-параметры и toggle'ы вместе по группам, сохраняя порядок
  const groups = new Map();
  for (const [group] of PARAMS) if (!groups.has(group)) groups.set(group, { ranges: [], toggles: [] });
  for (const [group] of TOGGLES) if (!groups.has(group)) groups.set(group, { ranges: [], toggles: [] });
  for (const p of PARAMS) groups.get(p[0]).ranges.push(p);
  for (const t of TOGGLES) groups.get(t[0]).toggles.push(t);

  for (const [groupName, items] of groups) {
    const gTitle = document.createElement('div');
    gTitle.className = 'settings-group-title';
    gTitle.textContent = groupName.toUpperCase();
    inner.appendChild(gTitle);
    // Toggles идут первыми (компактные чекбоксы наверху группы)
    for (const [, key, label, scope] of items.toggles) {
      const row = document.createElement('div');
      row.className = 'settings-row settings-row-toggle';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.key = key;
      input.dataset.scope = scope;
      const target = scope === 'state' ? state : CFG;
      input.checked = target[key] !== false; // default ON если не задано
      input.addEventListener('change', () => {
        target[key] = !!input.checked;
        save();
      });
      row.appendChild(lbl);
      row.appendChild(input);
      inner.appendChild(row);
    }
    for (const [, key, min, max, step, label] of items.ranges) {
      const row = document.createElement('div');
      row.className = 'settings-row';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'settings-val';
      val.textContent = formatValue(CFG[key]);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(CFG[key]);
      input.dataset.key = key;
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        CFG[key] = v;
        val.textContent = formatValue(v);
        save();
        if (state.sim) reheat(state.sim, 0.3);
      });
      row.appendChild(lbl);
      row.appendChild(input);
      row.appendChild(val);
      inner.appendChild(row);
    }
  }

  const footer = document.createElement('div');
  footer.className = 'settings-footer';
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = 'Reset to defaults';
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(KEY);
    location.reload();
  });
  footer.appendChild(resetBtn);
  inner.appendChild(footer);

  document.body.appendChild(modalEl);
  // Click outside to close
  modalEl.addEventListener('click', (ev) => { if (ev.target === modalEl) close(); });
}

function close() {
  if (modalEl) { modalEl.remove(); modalEl = null; }
}

function formatValue(v) {
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return String(v);
  const abs = Math.abs(v);
  if (abs < 0.001) return v.toFixed(5);
  if (abs < 0.1) return v.toFixed(3);
  if (abs < 10) return v.toFixed(2);
  return v.toFixed(0);
}

function save() {
  const obj = {};
  for (const [, key] of PARAMS) obj[key] = CFG[key];
  for (const [, key, , scope] of TOGGLES) {
    obj[key] = (scope === 'state' ? state : CFG)[key];
  }
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    for (const [, key] of PARAMS) {
      if (typeof obj[key] === 'number' && isFinite(obj[key])) CFG[key] = obj[key];
    }
    for (const [, key, , scope] of TOGGLES) {
      if (typeof obj[key] === 'boolean') {
        (scope === 'state' ? state : CFG)[key] = obj[key];
      }
    }
  } catch {}
}
