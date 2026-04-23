import { state } from '../view/state.js';
import { CFG } from '../core/config.js';
import { computeRadialLayout, easeInOutQuad, fitToView } from '../core/layout.js';

let btn;
let transition = null;
let getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

export function initLayoutToggle(getViewportFn) {
  if (getViewportFn) getViewport = getViewportFn;
  btn = document.getElementById('btn-layout');
  if (btn) btn.addEventListener('click', toggleLayout);
  updateBtnLabel();
}

function toggleLayout() {
  if (transition) return;
  const toMode = state.layoutMode === 'radial' ? 'force' : 'radial';
  const from = new Map();
  for (const n of state.nodes) from.set(n.id, { x: n.x, y: n.y });
  let to;
  if (toMode === 'radial') {
    to = computeRadialLayout(state.nodes, state.byId, getViewport());
  } else {
    // В force — возвращаем в текущие (физика потом расставит органично),
    // но лёгкий jitter чтобы оторваться от идеальных окружностей
    to = new Map();
    for (const n of state.nodes) {
      to.set(n.id, { x: n.x + (Math.random() - 0.5) * 20, y: n.y + (Math.random() - 0.5) * 20 });
    }
  }
  transition = { from, to, startTime: performance.now(), duration: CFG.layoutTransitionMs, toMode };
  // Фитим камеру под новую раскладку
  setTimeout(() => {
    if (state.nodes.length) {
      const cam = fitToView(state.nodes, getViewport());
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
    transition = null;
    updateBtnLabel();
  }
}

export function isRadialActive() {
  return state.layoutMode === 'radial' || (transition && transition.toMode === 'radial');
}

function updateBtnLabel() {
  if (!btn) return;
  btn.textContent = state.layoutMode === 'radial' ? 'Force' : 'Radial';
  btn.classList.toggle('accent', state.layoutMode === 'radial');
}
