import { state } from '../view/state.js';
import { freeze, unfreeze } from '../core/layout.js';

let btn;

export function initFreezeToggle() {
  btn = document.getElementById('btn-freeze');
  if (btn) btn.addEventListener('click', toggle);
  update();
}

export function toggleFreeze() { toggle(); }

function toggle() {
  if (!state.sim) return;
  if (state.sim.manualFrozen) unfreeze(state.sim);
  else freeze(state.sim);
  update();
}

function update() {
  if (!btn) return;
  const frozen = state.sim && state.sim.manualFrozen;
  btn.textContent = frozen ? '▶ Unfreeze' : '❄ Freeze';
  btn.classList.toggle('active-freeze', !!frozen);
}

// Периодически обновляем label (если auto-unfreeze через drag в interaction.js)
setInterval(update, 400);
