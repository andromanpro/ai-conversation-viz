import { state } from '../view/state.js';

const ROLES = ['user', 'assistant', 'tool_use'];

export function initFilter() {
  for (const role of ROLES) {
    const btn = document.querySelector(`.btn-role[data-role="${role}"]`);
    if (!btn) continue;
    btn.addEventListener('click', () => toggleRole(role, btn));
    btn.classList.add('active');
  }
}

function toggleRole(role, btn) {
  if (state.hiddenRoles.has(role)) {
    state.hiddenRoles.delete(role);
    btn.classList.add('active');
  } else {
    state.hiddenRoles.add(role);
    btn.classList.remove('active');
  }
}

export function isRoleVisible(role) {
  return !state.hiddenRoles.has(role);
}
