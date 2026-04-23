import { CFG } from '../core/config.js';
import { isPlaying } from './timeline.js';
import { toolIcon } from '../view/tool-icons.js';

let streamEl, phoneEl;

const seen = new Set();
let activeNodeId = null;

export function initStory() {
  streamEl = document.getElementById('chat-stream');
  phoneEl = document.getElementById('phone');
}

function buildBubble(node) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-row role-' + node.role;

  const msg = document.createElement('div');
  msg.className = 'chat-msg role-' + node.role;

  const roleEl = document.createElement('div');
  roleEl.className = 'chat-role ' + node.role;
  if (node.role === 'tool_use') {
    const icon = document.createElement('span');
    icon.className = 'chat-tool-icon';
    icon.textContent = toolIcon(node.toolName);
    roleEl.appendChild(icon);
    roleEl.appendChild(document.createTextNode(' ' + (node.toolName || 'tool')));
  } else {
    roleEl.textContent = node.role;
  }

  const textEl = document.createElement('div');
  textEl.className = 'chat-text typing';

  const raw = node.text || '';
  const trimmed = raw.length > CFG.storyMaxChars ? raw.slice(0, CFG.storyMaxChars) + '…' : (raw || '(no text)');

  msg.appendChild(roleEl);
  msg.appendChild(textEl);
  wrap.appendChild(msg);
  return { wrap, textEl, fullText: trimmed };
}

function typeOut(textEl, fullText) {
  const total = fullText.length;
  if (total === 0) { textEl.classList.remove('typing'); return; }
  const charMs = CFG.storyCharMs;
  const estimatedMs = total * charMs;
  const stepPerTick = estimatedMs > CFG.storyMaxTypeMs
    ? Math.ceil(total / (CFG.storyMaxTypeMs / charMs))
    : 1;
  let i = 0;
  const tick = () => {
    i = Math.min(total, i + stepPerTick);
    textEl.textContent = fullText.slice(0, i);
    if (streamEl) streamEl.scrollTop = streamEl.scrollHeight;
    if (i < total) {
      textEl._typeTimer = setTimeout(tick, charMs);
    } else {
      textEl._typeTimer = null;
      textEl.classList.remove('typing');
    }
  };
  tick();
}

function collectNew(state) {
  const newly = [];
  for (const n of state.nodes) {
    if (n.bornAt == null) continue;
    if (seen.has(n.id)) continue;
    newly.push(n);
    seen.add(n.id);
  }
  newly.sort((a, b) => a.ts - b.ts);
  return newly;
}

function postBubble(node) {
  if (!streamEl) return;
  const { wrap, textEl, fullText } = buildBubble(node);
  wrap.dataset.nodeId = node.id;
  streamEl.appendChild(wrap);
  requestAnimationFrame(() => {
    wrap.classList.add('show');
    streamEl.scrollTop = streamEl.scrollHeight;
    typeOut(textEl, fullText);
  });
  while (streamEl.children.length > CFG.storyMaxHistory) {
    const removed = streamEl.firstChild;
    seen.delete(removed?.dataset?.nodeId);
    streamEl.removeChild(removed);
  }
  seen.add(node.id);
  activeNodeId = node.id;
  if (phoneEl) phoneEl.classList.add('active');
}

function postBubbleInstant(node) {
  if (!streamEl) return;
  const { wrap, textEl, fullText } = buildBubble(node);
  wrap.dataset.nodeId = node.id;
  wrap.classList.add('show');
  textEl.textContent = fullText;
  textEl.classList.remove('typing');
  streamEl.appendChild(wrap);
  seen.add(node.id);
  activeNodeId = node.id;
  if (phoneEl) phoneEl.classList.add('active');
}

function cutoffTs(state) {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

export function syncChatToTimeline(state) {
  if (!streamEl) return;
  const cutoff = cutoffTs(state);
  // Определяем целевой набор id (все ноды с ts <= cutoff)
  const targetIds = new Set();
  for (const n of state.nodes) {
    if (n.ts <= cutoff) targetIds.add(n.id);
  }
  // Удаляем те bubble которые больше не должны быть
  for (const child of [...streamEl.children]) {
    const id = child.dataset.nodeId;
    if (!targetIds.has(id)) {
      child.remove();
      seen.delete(id);
    }
  }
  // Добавляем недостающие — мгновенно, без typewriter
  const toAdd = [];
  for (const n of state.nodes) {
    if (!targetIds.has(n.id)) continue;
    if (seen.has(n.id)) continue;
    toAdd.push(n);
  }
  toAdd.sort((a, b) => a.ts - b.ts);
  for (const n of toAdd) postBubbleInstant(n);
  // Обрезка по лимиту
  while (streamEl.children.length > CFG.storyMaxHistory) {
    const removed = streamEl.firstChild;
    seen.delete(removed?.dataset?.nodeId);
    streamEl.removeChild(removed);
  }
  // Скролл вниз чтобы видно было новейшие
  streamEl.scrollTop = streamEl.scrollHeight;
  if (phoneEl) {
    if (streamEl.children.length > 0) phoneEl.classList.add('active');
    else phoneEl.classList.remove('active');
  }
}

export function tickStory(nowMs, state) {
  const active = isPlaying() && state.nodes.length > 0;
  if (!active) return;
  const newly = collectNew(state);
  for (const n of newly) postBubble(n);
}

export function getFrontierNodeId() { return activeNodeId; }

export function resetStory() {
  seen.clear();
  activeNodeId = null;
  if (streamEl) streamEl.innerHTML = '';
  if (phoneEl) phoneEl.classList.remove('active');
}
