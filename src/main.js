import { state } from './view/state.js';
import { stepPhysics } from './core/layout.js';
import { draw } from './view/renderer.js';
import { initInteraction } from './ui/interaction.js';
import { initLoader } from './ui/loader.js';
import { initDetail } from './ui/detail-panel.js';
import { initTooltip } from './ui/tooltip.js';
import { initTimeline, tickPlay } from './ui/timeline.js';

const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');

function getViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

initDetail();
initTooltip();
initTimeline();
initInteraction(canvas);
initLoader(getViewport);

function frame(tms) {
  const tSec = tms / 1000;
  const vp = getViewport();
  tickPlay();
  if (state.running) stepPhysics(state.nodes, state.edges, vp);
  draw(ctx, state, tSec, vp);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__viz = { state };
