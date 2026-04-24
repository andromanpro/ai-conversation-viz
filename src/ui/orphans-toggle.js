import { state } from '../view/state.js';
import { reheat } from '../core/layout.js';

let btn;

export function initOrphansToggle() {
  btn = document.getElementById('btn-orphans');
  if (btn) btn.addEventListener('click', toggle);
  update();
}

export function toggleOrphans() { toggle(); }

function toggle() {
  state.connectOrphans = !state.connectOrphans;
  if (state.sim) reheat(state.sim, 0.5);
  update();
}

function update() {
  if (!btn) return;
  btn.textContent = state.connectOrphans ? '🔗 Disconnect' : '🔗 Connect orphans';
  btn.classList.toggle('active-orphans', state.connectOrphans);
}
