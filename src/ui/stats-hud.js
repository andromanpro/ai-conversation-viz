import { state } from '../view/state.js';
import { toolIcon } from '../view/tool-icons.js';

let panelEl, tokensEl, durationEl, topToolsEl, longestEl;
let tickCounter = 0;

export function initStats() {
  panelEl = document.getElementById('stats-panel');
  tokensEl = document.getElementById('stat-tokens');
  durationEl = document.getElementById('stat-duration');
  topToolsEl = document.getElementById('stat-top-tools');
  longestEl = document.getElementById('stat-longest');
}

export function computeStats(nodes) {
  if (!nodes || !nodes.length) return null;
  let totalChars = 0;
  let tsMin = Infinity, tsMax = -Infinity;
  let longest = null;
  let hubs = 0;
  const toolCounts = new Map();
  for (const n of nodes) {
    if (typeof n.textLen === 'number') totalChars += n.textLen;
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
    if (!longest || n.textLen > longest.textLen) longest = n;
    if (n.isHub) hubs++;
    if (n.role === 'tool_use' && n.toolName) {
      toolCounts.set(n.toolName, (toolCounts.get(n.toolName) || 0) + 1);
    }
  }
  return {
    tokens: Math.round(totalChars / 4),
    durationSec: (tsMax - tsMin) / 1000,
    longest,
    hubs,
    topTools: [...toolCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
}

export function formatDuration(sec) {
  if (sec < 0 || !isFinite(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const parts = [];
  if (h) parts.push(h + 'h');
  if (m || h) parts.push(m + 'm');
  parts.push(s + 's');
  return parts.join(' ');
}

export function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function recomputeStats() {
  if (!panelEl) return;
  const s = computeStats(state.nodes);
  if (!s) { panelEl.style.display = 'none'; return; }
  panelEl.style.display = '';
  tokensEl.textContent = '~' + formatTokens(s.tokens);
  durationEl.textContent = formatDuration(s.durationSec);
  if (s.topTools.length) {
    topToolsEl.innerHTML = s.topTools.map(([name, count]) =>
      `<span class="tool-chip"><span class="tool-chip-icon">${escapeHtml(toolIcon(name))}</span>${escapeHtml(name)} <b>×${count}</b></span>`
    ).join(' ');
  } else {
    topToolsEl.innerHTML = '<span class="muted">—</span>';
  }
  // Hubs
  const hubsLabel = document.getElementById('stat-hubs');
  if (hubsLabel) hubsLabel.textContent = s.hubs > 0 ? String(s.hubs) : '—';
  if (s.longest) {
    const preview = (s.longest.text || '').slice(0, 36).replace(/\n/g, ' ');
    const ellipsis = (s.longest.text || '').length > 36 ? '…' : '';
    longestEl.innerHTML = `<span class="longest-role ${s.longest.role}">${s.longest.role}</span> <span class="longest-len">${s.longest.textLen}</span> <span class="longest-preview">${escapeHtml(preview)}${ellipsis}</span>`;
  } else {
    longestEl.textContent = '—';
  }
}

export function tickStats() {
  if ((tickCounter++) % 180 !== 0) return;
  recomputeStats();
}
