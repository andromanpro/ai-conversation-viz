import { state } from '../view/state.js';
import { reheat } from '../core/layout.js';

let _orphBtn;

export function initOrphansToggle() {
  _orphBtn = document.getElementById('btn-orphans');
  if (_orphBtn) _orphBtn.addEventListener('click', toggle);
  update();
}

export function toggleOrphans() { toggle(); }

function toggle() {
  state.connectOrphans = !state.connectOrphans;
  if (state.sim) reheat(state.sim, 0.5);
  update();
}

function update() {
  if (!_orphBtn) return;
  _orphBtn.textContent = state.connectOrphans ? '🔗 Disconnect' : '🔗 Connect orphans';
  _orphBtn.classList.toggle('active-orphans', state.connectOrphans);
}
