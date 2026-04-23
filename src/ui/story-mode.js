import { CFG } from '../core/config.js';
import { isPlaying } from './timeline.js';

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
  roleEl.textContent = node.role === 'tool_use' ? (node.toolName || 'tool') : node.role;

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
  streamEl.appendChild(wrap);
  requestAnimationFrame(() => {
    wrap.classList.add('show');
    streamEl.scrollTop = streamEl.scrollHeight;
    typeOut(textEl, fullText);
  });
  while (streamEl.children.length > CFG.storyMaxHistory) {
    streamEl.removeChild(streamEl.firstChild);
  }
  activeNodeId = node.id;
  if (phoneEl) phoneEl.classList.add('active');
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
