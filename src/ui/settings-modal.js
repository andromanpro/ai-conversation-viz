// Settings modal — live-update для основных CFG параметров.
// Сохранение в localStorage. Все labels — через t() для i18n.

import { CFG } from '../core/config.js';
import { state } from '../view/state.js';
import { reheat } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { setRenderBackend } from './render-toggle.js';

const KEY = 'viz-settings';

// Range params: [groupKey, key, min, max, step]. Label берётся через
// labelOf(key) из i18n. Group title — t('settings.group.<groupKey>').
const PARAMS = [
  // Physics
  ['physics', 'repulsion',       500,  30000, 100],
  ['physics', 'spring',          0.01, 0.3,   0.01],
  ['physics', 'springLen',       30,   300,   5],
  ['physics', 'centerPull',      0.0,  0.02,  0.0005],
  ['physics', 'velocityDecay',   0.1,  0.9,   0.02],
  ['physics', 'maxVelocity',     5,    200,   1],
  ['physics', 'alphaDecay',      0.005, 0.2,  0.002],
  ['physics', 'repulsionCutoff', 500,  6000,  100],
  // Visual
  ['visual',  'particlesPerEdge', 0,    3,    1],
  ['visual',  'particleSpeed',   0.1,  2,     0.05],
  ['visual',  'particleJitterPx',0,    6,     0.1],
  ['visual',  'starfieldCount',  0,    1000,  50],
  ['visual',  'nodeGlowRadiusMul', 1,  4,     0.1],
  ['visual',  'nodeGlowAlphaBase', 0,  0.3,   0.01],
  // Playback
  ['playback','storyDwellMs',    400,  5000,  100],
  ['playback','storyCharMs',     5,    80,    1],
  ['playback','storyMaxChars',   80,   1200,  20],
  ['playback','storyPostGapMs',  200,  3000,  50],
  // Birth
  ['birth',   'birthDurationMs', 100,  2500,  50],
];

// Map from PARAMS key → i18n label key. Большинство один-в-один по
// settings.<key>, но `particlesPerEdge` сокращается до `particles`,
// `particleJitterPx` → `particleJitter`, `storyDwellMs` → `stepMs`,
// `storyCharMs` → `charMs`, `storyMaxChars` → `maxChars`,
// `storyPostGapMs` → `postGapMs`, `birthDurationMs` → `birthMs`.
const LABEL_KEY = {
  particlesPerEdge: 'settings.particles',
  particleJitterPx: 'settings.particleJitter',
  storyDwellMs:     'settings.stepMs',
  storyCharMs:      'settings.charMs',
  storyMaxChars:    'settings.maxChars',
  storyPostGapMs:   'settings.postGapMs',
  birthDurationMs:  'settings.birthMs',
};
function labelOf(key) {
  return t(LABEL_KEY[key] || ('settings.' + key));
}

// Boolean toggles [groupKey, key, scope, customApply?]. scope='state' →
// state.<key>, 'CFG' → CFG.<key>. customApply вызывается после set value.
const TOGGLES = [
  ['display', 'showReverseSignal', 'state'],
  ['display', 'showErrorRings',    'state'],
  ['display', 'showThinking',      'state'],
  ['metrics', 'showMetrics',       'state'],
  // useCanvas2D — boolean fallback вместо WebGL (продвинутая опция)
  ['advanced', 'useCanvas2D',      'state', (val) => setRenderBackend(val ? 'canvas2d' : 'webgl')],
];

// Группы в порядке отображения. Если в группе нет параметров — пропускается.
const GROUP_ORDER = ['physics', 'visual', 'display', 'metrics', 'playback', 'birth', 'advanced'];

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
  const titleEl = document.createElement('span');
  titleEl.textContent = t('settings.header');
  header.appendChild(titleEl);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'settings-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t('aria.close'));
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);
  inner.appendChild(header);

  // Группируем range-параметры и toggle'ы по группам
  const groups = new Map();
  for (const g of GROUP_ORDER) groups.set(g, { ranges: [], toggles: [] });
  for (const p of PARAMS) {
    if (!groups.has(p[0])) groups.set(p[0], { ranges: [], toggles: [] });
    groups.get(p[0]).ranges.push(p);
  }
  for (const tg of TOGGLES) {
    if (!groups.has(tg[0])) groups.set(tg[0], { ranges: [], toggles: [] });
    groups.get(tg[0]).toggles.push(tg);
  }

  for (const [groupKey, items] of groups) {
    if (!items.ranges.length && !items.toggles.length) continue;
    const gTitle = document.createElement('div');
    gTitle.className = 'settings-group-title';
    gTitle.textContent = t('settings.group.' + groupKey).toUpperCase();
    inner.appendChild(gTitle);

    // Toggles идут первыми (компактные чекбоксы наверху группы)
    for (const tg of items.toggles) {
      const key = tg[1];
      const scope = tg[2];
      const customApply = tg[3];
      const row = document.createElement('div');
      row.className = 'settings-row settings-row-toggle';
      const lbl = document.createElement('label');
      lbl.textContent = labelOf(key);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.key = key;
      input.dataset.scope = scope;
      const target = scope === 'state' ? state : CFG;
      // Для useCanvas2D default = false (WebGL по умолчанию). Для остальных
      // toggle'ов — default ON (если поле не задано — считаем true).
      input.checked = key === 'useCanvas2D' ? !!target[key] : target[key] !== false;
      input.addEventListener('change', () => {
        target[key] = !!input.checked;
        save();
        if (customApply) customApply(target[key]);
      });
      row.appendChild(lbl);
      row.appendChild(input);
      inner.appendChild(row);
    }

    for (const p of items.ranges) {
      const key = p[1], min = p[2], max = p[3], step = p[4];
      const row = document.createElement('div');
      row.className = 'settings-row';
      const lbl = document.createElement('label');
      lbl.textContent = labelOf(key);
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
  resetBtn.textContent = t('btn.reset_defaults');
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
  for (const p of PARAMS) obj[p[1]] = CFG[p[1]];
  for (const tg of TOGGLES) {
    const key = tg[1], scope = tg[2];
    obj[key] = (scope === 'state' ? state : CFG)[key];
  }
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    for (const p of PARAMS) {
      const key = p[1];
      if (typeof obj[key] === 'number' && isFinite(obj[key])) CFG[key] = obj[key];
    }
    for (const tg of TOGGLES) {
      const key = tg[1], scope = tg[2];
      if (typeof obj[key] === 'boolean') {
        (scope === 'state' ? state : CFG)[key] = obj[key];
      }
    }
  } catch {}
}
