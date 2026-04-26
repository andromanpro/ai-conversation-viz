import { state } from '../view/state.js';

const ROLES = ['user', 'assistant', 'tool_use'];

// Связанные роли: при toggle ключевой роли скрываются/показываются вместе.
//   user → subagent_input — оба «вход для агента» (живой / машинный)
//   tool_use → tool_result — pair tool-цепочки (вызов / ответ)
const LINKED_ROLES = {
  user: ['subagent_input'],
  tool_use: ['tool_result'],
};

export function initFilter() {
  for (const role of ROLES) {
    const btn = document.querySelector(`.btn-role[data-role="${role}"]`);
    if (!btn) continue;
    btn.addEventListener('click', () => toggleRole(role, btn));
    btn.classList.add('active');
  }
}

function toggleRole(role, btn) {
  const linked = LINKED_ROLES[role] || [];
  if (state.hiddenRoles.has(role)) {
    state.hiddenRoles.delete(role);
    for (const r of linked) state.hiddenRoles.delete(r);
    btn.classList.add('active');
  } else {
    state.hiddenRoles.add(role);
    for (const r of linked) state.hiddenRoles.add(r);
    btn.classList.remove('active');
  }
}

export function isRoleVisible(role) {
  return !state.hiddenRoles.has(role);
}
