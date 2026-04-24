import { state } from '../view/state.js';
import { togglePlay } from './timeline.js';
import { fitToView } from '../core/layout.js';
import { syncChatToTimeline } from './story-mode.js';
import { hideDetail, toggleStarOnCurrent } from './detail-panel.js';
import { toggleFreeze } from './freeze-toggle.js';
import { setSpeed } from './speed-control.js';
import { toggleOrphans } from './orphans-toggle.js';
import { toggleTheme } from './theme-toggle.js';
import { toggleSettings } from './settings-modal.js';
import { toggleTopics, clearTopicFilter } from './topics-toggle.js';
import { toggleBookmarks } from './bookmarks.js';
import { toggleStar } from './annotations.js';
import { updateBadge as updateBookmarksBadge } from './bookmarks.js';

let _kbdGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

export function initKeyboard(_kbdGetViewportFn) {
  if (_kbdGetViewportFn) _kbdGetViewport = _kbdGetViewportFn;
  window.addEventListener('keydown', onKey);
  // Чтобы Space/Enter на наших кнопках не триггерил shortcut повторно — blur после click
  document.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => { try { b.blur(); } catch {} });
  });
}

function isInputFocused() {
  const a = document.activeElement;
  if (!a) return false;
  const tag = a.tagName && a.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || a.isContentEditable;
}

function onKey(ev) {
  if (isInputFocused()) return;
  if (ev.key === ' ') {
    ev.preventDefault();
    togglePlay();
  } else if (ev.key === 'ArrowRight') {
    ev.preventDefault();
    stepTimeline(1);
  } else if (ev.key === 'ArrowLeft') {
    ev.preventDefault();
    stepTimeline(-1);
  } else if (ev.key === 'Home' || ev.key === 'r' || ev.key === 'R') {
    ev.preventDefault();
    resetView();
  } else if (ev.key === 'Escape') {
    let handled = false;
    if (state.topicFilter) { clearTopicFilter(); handled = true; }
    if (!handled && (state.selected || state.cameraTarget)) {
      state.selected = null;
      state.cameraTarget = null;
      hideDetail();
    }
  } else if (ev.key === 'f' || ev.key === 'F') {
    ev.preventDefault();
    toggleFreeze();
  } else if (ev.key === 'o' || ev.key === 'O') {
    ev.preventDefault();
    toggleOrphans();
  } else if (ev.key === 't' || ev.key === 'T') {
    ev.preventDefault();
    toggleTheme();
  } else if (ev.key === ',') {
    ev.preventDefault();
    toggleSettings();
  } else if (ev.key === 'b' || ev.key === 'B') {
    ev.preventDefault();
    toggleBookmarks();
  } else if (ev.key === 's' || ev.key === 'S') {
    // Star на текущую selected-ноду. Если detail-panel открыт — он сам
    // обновит UI. Если нет — переключим через state.selected.
    if (toggleStarOnCurrent()) {
      updateBookmarksBadge();
      ev.preventDefault();
    } else if (state.selected) {
      toggleStar(state.selected.id);
      updateBookmarksBadge();
      ev.preventDefault();
    }
  } else if (ev.key === '1') { ev.preventDefault(); setSpeed(0.5); }
  else if (ev.key === '2') { ev.preventDefault(); setSpeed(1); }
  else if (ev.key === '3') { ev.preventDefault(); setSpeed(2); }
  else if (ev.key === '5') { ev.preventDefault(); setSpeed(5); }
}

function stepTimeline(dir) {
  if (!state.nodes.length) return;
  const sorted = [...state.nodes].sort((a, b) => a.ts - b.ts);
  const tsMin = sorted[0].ts;
  const tsMax = sorted[sorted.length - 1].ts;
  const range = Math.max(1, tsMax - tsMin);
  const cutoff = tsMin + range * state.timelineMax;
  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].ts <= cutoff) currentIdx = i;
    else break;
  }
  const newIdx = Math.max(0, Math.min(sorted.length - 1, currentIdx + dir));
  state.timelineMax = Math.min(1, (sorted[newIdx].ts - tsMin) / range + 0.0001);
  const slider = document.getElementById('timeline');
  if (slider) {
    slider.value = String(Math.round(state.timelineMax * 100));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    syncChatToTimeline(state);
  }
}

function resetView() {
  if (!state.nodes.length) return;
  const cam = fitToView(state.nodes, _kbdGetViewport());
  state.cameraTarget = { x: cam.x, y: cam.y, scale: cam.scale };
}
