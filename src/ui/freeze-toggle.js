import { state } from '../view/state.js';
import { freeze, unfreeze } from '../core/layout.js';
import { t } from '../core/i18n.js';

let _frzBtn;

export function initFreezeToggle() {
  _frzBtn = document.getElementById('btn-freeze');
  if (_frzBtn) _frzBtn.addEventListener('click', toggle);
  window.addEventListener('languagechange', updateFreezeBtn);
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
  if (!_frzBtn) return;
  const frozen = state.sim && state.sim.manualFrozen;
  _frzBtn.textContent = frozen ? '▶' : '❄';
  _frzBtn.title = frozen ? t('tip.freeze_off') : t('tip.freeze_on');
  _frzBtn.classList.toggle('active-freeze', !!frozen);
}
