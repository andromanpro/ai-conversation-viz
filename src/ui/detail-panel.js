import { CFG } from '../core/config.js';
import { state } from '../view/state.js';

let detailEl, detailRoleEl, detailTsEl, detailBodyEl;

export function initDetail() {
  detailEl = document.getElementById('detail');
  detailRoleEl = document.getElementById('detail-role');
  detailTsEl = document.getElementById('detail-ts');
  detailBodyEl = document.getElementById('detail-body');
  document.getElementById('detail-close').addEventListener('click', () => {
    state.selected = null;
    hideDetail();
  });
}

export function showDetail(n) {
  detailRoleEl.textContent = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
  detailRoleEl.className = 'role ' + n.role;
  detailTsEl.textContent = new Date(n.ts).toISOString().replace('T', ' ').slice(0, 19);
  const txt = n.text || '(empty)';
  detailBodyEl.textContent = txt.length > CFG.excerptChars ? txt.slice(0, CFG.excerptChars) + '…' : txt;
  detailEl.classList.add('show');
}

export function hideDetail() {
  if (detailEl) detailEl.classList.remove('show');
}
