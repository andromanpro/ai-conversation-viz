import { state } from '../view/state.js';
import { loadText } from './loader.js';
import { safeFetch, isSafeHttpUrl } from '../core/url-safety.js';

let toastEl, btnShare;

export function initShare() {
  btnShare = document.getElementById('btn-share');
  toastEl = document.getElementById('toast');
  if (btnShare) btnShare.addEventListener('click', shareCurrent);
}

export function buildShareUrl() {
  const params = new URLSearchParams();
  params.set('t', String(Math.round(state.timelineMax * 100)));
  if (state.selected && state.selected.id) params.set('n', state.selected.id);
  const hidden = [...state.hiddenRoles];
  if (hidden.length) params.set('hide', hidden.join(','));
  return window.location.origin + window.location.pathname + '?' + params.toString();
}

export function parseUrlParams(search) {
  const out = {};
  const p = new URLSearchParams(search || '');
  if (p.has('jsonl')) out.jsonl = p.get('jsonl');
  if (p.has('t')) {
    const t = parseFloat(p.get('t'));
    if (!isNaN(t)) out.t = Math.max(0, Math.min(1, t / 100));
  }
  if (p.has('n')) out.nodeId = p.get('n');
  if (p.has('hide')) {
    out.hide = p.get('hide').split(',').map(r => r.trim()).filter(Boolean);
  }
  return out;
}

async function shareCurrent() {
  const url = buildShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard');
  } catch {
    prompt('Copy URL:', url);
  }
}

function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

export async function applyUrlParamsLate() {
  const params = parseUrlParams(window.location.search);

  if (params.jsonl) {
    try {
      if (!isSafeHttpUrl(params.jsonl)) {
        console.warn('[share] отклонён небезопасный URL:', params.jsonl);
        return;
      }
      const resp = await safeFetch(params.jsonl, { cache: 'no-store' });
      if (resp.ok) {
        const text = await resp.text();
        loadText(text);
      }
    } catch (e) {
      console.warn('[share] failed to fetch jsonl param:', e.message);
    }
  }

  if (params.t != null) {
    state.timelineMax = params.t;
    const slider = document.getElementById('timeline');
    if (slider) {
      slider.value = String(Math.round(state.timelineMax * 100));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Whitelist ролей — не принимаем произвольный текст из ?hide=
  const KNOWN_ROLES = new Set(['user', 'assistant', 'tool_use']);
  if (Array.isArray(params.hide)) {
    for (const r of params.hide) {
      if (!KNOWN_ROLES.has(r)) continue;
      state.hiddenRoles.add(r);
      const btn = document.querySelector(`.btn-role[data-role="${r}"]`);
      if (btn) btn.classList.remove('active');
    }
  }

  if (params.nodeId && state.byId) {
    const node = state.byId.get(params.nodeId);
    if (node) state.selected = node;
  }
}
