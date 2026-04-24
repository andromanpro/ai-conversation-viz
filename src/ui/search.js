import { state } from '../view/state.js';

let barEl, inputEl, countEl, closeEl;
let matches = [];
let currentIndex = 0;
let _srchGetViewport = () => ({ cx: window.innerWidth / 2, cy: window.innerHeight / 2 });

export function initSearch(_srchGetViewportFn) {
  if (_srchGetViewportFn) _srchGetViewport = _srchGetViewportFn;
  barEl = document.getElementById('search-bar');
  inputEl = document.getElementById('search-input');
  countEl = document.getElementById('search-count');
  closeEl = document.getElementById('search-close');
  if (!barEl) return;
  inputEl.addEventListener('input', runSearch);
  inputEl.addEventListener('keydown', onInputKey);
  closeEl.addEventListener('click', closeSearch);
  window.addEventListener('keydown', onGlobalKey);
  updateCount();
}

function onGlobalKey(ev) {
  const typingInField = document.activeElement === inputEl;
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'f' || ev.key === 'F')) {
    ev.preventDefault();
    openSearch();
  } else if (ev.key === '/' && !typingInField) {
    ev.preventDefault();
    openSearch();
  } else if (ev.key === 'Escape' && barEl && barEl.classList.contains('show')) {
    closeSearch();
  }
}

function onInputKey(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    goto(ev.shiftKey ? -1 : 1);
  } else if (ev.key === 'Escape') {
    ev.preventDefault();
    closeSearch();
  }
}

function openSearch() {
  if (!barEl) return;
  barEl.classList.add('show');
  inputEl.focus();
  inputEl.select();
}

function closeSearch() {
  if (!barEl) return;
  barEl.classList.remove('show');
  inputEl.value = '';
  matches = [];
  currentIndex = 0;
  state.searchMatches = new Set();
  state.searchActive = null;
  updateCount();
}

export function matchNodes(q, nodes) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [];
  const out = [];
  for (const n of nodes) {
    const hay = ((n.text || '') + ' ' + (n.toolName || '')).toLowerCase();
    if (hay.includes(query)) out.push(n.id);
  }
  return out;
}

function runSearch() {
  matches = matchNodes(inputEl.value, state.nodes);
  state.searchMatches = new Set(matches);
  if (matches.length > 0) {
    currentIndex = 0;
    focusMatch();
  } else {
    state.searchActive = null;
  }
  updateCount();
}

function goto(dir) {
  if (!matches.length) return;
  currentIndex = (currentIndex + dir + matches.length) % matches.length;
  focusMatch();
  updateCount();
}

function focusMatch() {
  const id = matches[currentIndex];
  const node = state.byId.get(id);
  if (!node) return;
  state.searchActive = id;
  state.selected = node;
  const vp = _srchGetViewport();
  const cx = vp.cx != null ? vp.cx : window.innerWidth / 2;
  const cy = vp.cy != null ? vp.cy : window.innerHeight / 2;
  state.cameraTarget = {
    x: node.x - cx / state.camera.scale,
    y: node.y - cy / state.camera.scale,
    scale: state.camera.scale,
  };
}

function updateCount() {
  if (!countEl) return;
  if (!inputEl || !inputEl.value) {
    countEl.textContent = '—';
  } else if (!matches.length) {
    countEl.textContent = '0 matches';
  } else {
    countEl.textContent = `${currentIndex + 1} / ${matches.length}`;
  }
}
