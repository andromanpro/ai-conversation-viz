import { state } from '../view/state.js';
import { applyTopicsToNodes } from '../view/topics.js';

let btn;

export function initTopicsToggle() {
  btn = document.getElementById('btn-topics');
  if (btn) btn.addEventListener('click', toggle);
  updateBtn();
}

export function toggleTopics() { toggle(); }

function toggle() {
  state.topicsMode = !state.topicsMode;
  if (state.topicsMode && state.nodes.length) {
    const top = applyTopicsToNodes(state.nodes);
    console.log('[topics] top words:', top);
  }
  updateBtn();
}

function updateBtn() {
  if (!btn) return;
  btn.textContent = state.topicsMode ? '🧬 Topics: on' : '🧬 Topics';
  btn.classList.toggle('active-topics', !!state.topicsMode);
}
