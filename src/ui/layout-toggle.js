import { state } from '../view/state.js';
import { CFG } from '../core/config.js';
import { computeRadialLayout, computeSwimLanes, easeInOutQuad, fitToView, reheat } from '../core/layout.js';

let btns = []; // {mode, el}
let transition = null;
let _ltGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

export function initLayoutToggle(_ltGetViewportFn) {
  if (_ltGetViewportFn) _ltGetViewport = _ltGetViewportFn;
  const host = document.getElementById('layout-switch');
  if (!host) return;
  host.innerHTML = '';
  const modes = [
    { id: 'force',  label: 'Force'     },
    { id: 'radial', label: 'Radial'    },
    { id: 'swim',   label: '🌊 Swim'   },
  ];
  btns = [];
  for (const m of modes) {
    const el = document.createElement('button');
    el.className = 'btn btn-layout-chip';
    el.dataset.mode = m.id;
    el.textContent = m.label;
    el.addEventListener('click', () => switchTo(m.id));
    host.appendChild(el);
    btns.push({ mode: m.id, el });
  }
  updateActive();
}

function switchTo(toMode) {
  if (transition) return;
  if (toMode === state.layoutMode) return;
  const from = new Map();
  for (const n of state.nodes) from.set(n.id, { x: n.x, y: n.y });
  let to;
  if (toMode === 'radial') {
    to = computeRadialLayout(state.nodes, state.byId, _ltGetViewport());
  } else if (toMode === 'swim') {
    to = computeSwimLanes(state.nodes, _ltGetViewport());
  } else {
    to = new Map();
    for (const n of state.nodes) {
      to.set(n.id, { x: n.x + (Math.random() - 0.5) * 20, y: n.y + (Math.random() - 0.5) * 20 });
    }
  }
  transition = { from, to, startTime: performance.now(), duration: CFG.layoutTransitionMs, toMode };
  // Автофит камеры под новую раскладку после transition
  setTimeout(() => {
    if (state.nodes.length) {
      const cam = fitToView(state.nodes, _ltGetViewport());
      state.cameraTarget = { x: cam.x, y: cam.y, scale: cam.scale };
    }
  }, CFG.layoutTransitionMs + 50);
}

export function tickLayoutTransition() {
  if (!transition) return;
  const now = performance.now();
  const t = Math.min(1, (now - transition.startTime) / transition.duration);
  const e = easeInOutQuad(t);
  for (const n of state.nodes) {
    const from = transition.from.get(n.id);
    const to = transition.to.get(n.id);
    if (!from || !to) continue;
    n.x = from.x + (to.x - from.x) * e;
    n.y = from.y + (to.y - from.y) * e;
    n.vx = 0;
    n.vy = 0;
  }
  if (t >= 1) {
    state.layoutMode = transition.toMode;
    if (transition.toMode === 'force' && state.sim) reheat(state.sim, 0.5);
    transition = null;
    updateActive();
  }
}

export function isRadialActive() {
  const m = (transition && transition.toMode) || state.layoutMode;
  return m === 'radial' || m === 'swim';
}

function updateActive() {
  for (const b of btns) b.el.classList.toggle('active', b.mode === state.layoutMode);
}
