import { state } from '../view/state.js';
import { freeze, unfreeze } from '../core/layout.js';

let btn;

export function initFreezeToggle() {
  btn = document.getElementById('btn-freeze');
  if (btn) btn.addEventListener('click', toggle);
  updateFreezeBtn();
}

export function toggleFreeze() { toggle(); }

function toggle() {
  if (!state.sim) return;
  if (state.sim.manualFrozen) unfreeze(state.sim);
  else freeze(state.sim);
  updateFreezeBtn();
}

/** Вызывается из interaction.js когда drag авто-размораживает, и при init. */
export function updateFreezeBtn() {
  if (!btn) return;
  const frozen = state.sim && state.sim.manualFrozen;
  btn.textContent = frozen ? '▶ Unfreeze' : '❄ Freeze';
  btn.classList.toggle('active-freeze', !!frozen);
}
