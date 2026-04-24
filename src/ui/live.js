import { state } from '../view/state.js';
import { CFG } from '../core/config.js';
import { parseLine } from '../core/parser.js';
import { appendRawNodes } from '../core/graph.js';
import { reheat } from '../core/layout.js';
import { ensureParticles } from '../view/particles.js';
import { safeFetch } from '../core/url-safety.js';

let urlInput, btnStart, btnStop, statusEl;
let pollingId = null;
let lastByteLen = 0;
let lastUrl = '';
let _liveGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

export function initLive(_liveGetViewportFn) {
  if (_liveGetViewportFn) _liveGetViewport = _liveGetViewportFn;
  urlInput = document.getElementById('live-url');
  btnStart = document.getElementById('btn-live-start');
  btnStop = document.getElementById('btn-live-stop');
  statusEl = document.getElementById('live-status');
  if (!btnStart) return;
  btnStart.addEventListener('click', startWatching);
  btnStop.addEventListener('click', stopWatching);
  urlInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); startWatching(); }
  });
  setStatus('idle');
}

function startWatching() {
  const url = urlInput.value.trim();
  if (!url) return;
  lastUrl = url;
  lastByteLen = 0;
  setStatus('connecting…');
  pullOnce();
  if (pollingId) clearInterval(pollingId);
  pollingId = setInterval(pullOnce, CFG.livePollMs);
  btnStart.style.display = 'none';
  btnStop.style.display = '';
}

function stopWatching() {
  if (pollingId) clearInterval(pollingId);
  pollingId = null;
  setStatus('stopped');
  if (btnStart) btnStart.style.display = '';
  if (btnStop) btnStop.style.display = 'none';
}

async function pullOnce() {
  if (!lastUrl) return;
  try {
    const sep = lastUrl.includes('?') ? '&' : '?';
    const resp = await safeFetch(lastUrl + sep + '_t=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) { setStatus('http ' + resp.status); return; }
    const text = await resp.text();
    const byteLen = text.length;
    if (byteLen < lastByteLen) {
      // файл был обрезан/пересоздан — начинаем заново
      lastByteLen = 0;
    }
    const newText = text.slice(lastByteLen);
    lastByteLen = byteLen;

    const lines = newText.split(/\r?\n/);
    const newRaw = [];
    let counter = state.nodes.length;
    for (const line of lines) {
      const parsed = parseLine(line, counter++);
      for (const p of parsed) newRaw.push(p);
    }
    if (newRaw.length) {
      const added = appendRawNodes(state, newRaw, _liveGetViewport());
      // Cap суммарного количества нод в live-режиме. При переполнении отрезаем
      // самые старые (по ts) — граф остаётся актуальным, но не съедает RAM.
      const MAX_LIVE_NODES = CFG.liveMaxNodes || 5000;
      if (state.nodes.length > MAX_LIVE_NODES) {
        const drop = state.nodes.length - MAX_LIVE_NODES;
        const sorted = [...state.nodes].sort((a, b) => a.ts - b.ts);
        const toRemove = new Set(sorted.slice(0, drop).map(n => n.id));
        state.nodes = state.nodes.filter(n => !toRemove.has(n.id));
        state.edges = state.edges.filter(e => !toRemove.has(e.source) && !toRemove.has(e.target));
        for (const id of toRemove) state.byId.delete(id);
      }
      ensureParticles(state.edges);
      if (state.sim) reheat(state.sim, 0.2);
      state.timelineMax = 1; // показываем актуальное
      updateStatsHUD();
      setStatus(`+${added.length} @ ${timeNow()} (${state.nodes.length} total)`);
    } else {
      setStatus(`up-to-date · ${byteLen}b`);
    }
  } catch (e) {
    setStatus('err: ' + e.message);
  }
}

function updateStatsHUD() {
  const el = document.getElementById('stats');
  if (el) {
    el.innerHTML = `<b>${state.nodes.length}</b> nodes &middot; <b>${state.edges.length}</b> edges &middot; <span>live</span>`;
  }
}

function timeNow() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
}

function setStatus(s) {
  if (statusEl) statusEl.textContent = s;
}
