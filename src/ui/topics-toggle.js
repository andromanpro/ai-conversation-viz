import { state } from '../view/state.js';
import { applyTopicsToNodes } from '../view/topics.js';

let _topicBtn;

export function initTopicsToggle() {
  _topicBtn = document.getElementById('btn-topics');
  if (_topicBtn) _topicBtn.addEventListener('click', toggle);
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
  if (!_topicBtn) return;
  _topicBtn.textContent = state.topicsMode ? '🧬 Topics: on' : '🧬 Topics';
  _topicBtn.classList.toggle('active-topics', !!state.topicsMode);
}
