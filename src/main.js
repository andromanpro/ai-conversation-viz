import { state } from './view/state.js';
import { CFG } from './core/config.js';
import { stepPhysics } from './core/layout.js';
import { draw } from './view/renderer.js';
import { generateStarfield, drawStarfield } from './view/starfield.js';
import { ensureParticles, tickParticles, drawParticles } from './view/particles.js';
import { initInteraction, isPanning, isDraggingNode } from './ui/interaction.js';
import { initLoader } from './ui/loader.js';
import { initDetail } from './ui/detail-panel.js';
import { initTooltip } from './ui/tooltip.js';
import { initTimeline, tickPlay, isPlaying } from './ui/timeline.js';
import { initStory, tickStory, getFrontierNodeId, resetStory } from './ui/story-mode.js';
import { initSearch } from './ui/search.js';
import { initLive } from './ui/live.js';
import { initKeyboard } from './ui/keyboard.js';
import { initFilter } from './ui/filter.js';
import { initMinimap, tickMinimap } from './ui/minimap.js';
import { initStats, tickStats, recomputeStats } from './ui/stats-hud.js';
import { initShare, applyUrlParamsLate } from './ui/share.js';

const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');

const SAFE_INSETS = { top: 130, bottom: 80, left: 16, right: 16 };

function getViewport() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const safeW = Math.max(100, w - SAFE_INSETS.left - SAFE_INSETS.right);
  const safeH = Math.max(100, h - SAFE_INSETS.top - SAFE_INSETS.bottom);
  return {
    width: w,
    height: h,
    safeW,
    safeH,
    cx: SAFE_INSETS.left + safeW / 2,
    cy: SAFE_INSETS.top + safeH / 2,
  };
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
initStory();
initSearch(getViewport);
initLive(getViewport);
initFilter();
initMinimap(getViewport);
initStats();
initShare();
initInteraction(canvas, getViewport);
initLoader(getViewport, onGraphReady);
initKeyboard(getViewport);

state.stars = generateStarfield(CFG.starfieldCount);

let urlParamsApplied = false;
function onGraphReady() {
  ensureParticles(state.edges);
  resetStory();
  recomputeStats();
  if (!urlParamsApplied) {
    urlParamsApplied = true;
    applyUrlParamsLate();
  }
}

let lastMs = performance.now();
function frame(tms) {
  const tSec = tms / 1000;
  const dt = Math.min(0.1, (tms - lastMs) / 1000);
  lastMs = tms;
  const vp = getViewport();

  tickPlay();
  if (state.running) stepPhysics(state.nodes, state.edges, vp);
  tickParticles(state.edges, dt);

  // Camera auto-follow при play (если пользователь ничего не тащит)
  if (isPlaying() && !isPanning() && !isDraggingNode()) {
    const fid = getFrontierNodeId();
    if (fid) {
      const target = state.byId.get(fid);
      if (target) {
        const desiredX = target.x - vp.cx / state.camera.scale;
        const desiredY = target.y - vp.cy / state.camera.scale;
        state.camera.x += (desiredX - state.camera.x) * CFG.cameraFollowLerp;
        state.camera.y += (desiredY - state.camera.y) * CFG.cameraFollowLerp;
      }
    }
  }

  // Camera target (zoom-to-node)
  if (state.cameraTarget) {
    const t = state.cameraTarget;
    const dx = t.x - state.camera.x;
    const dy = t.y - state.camera.y;
    const ds = t.scale - state.camera.scale;
    state.camera.x += dx * CFG.cameraTargetLerp;
    state.camera.y += dy * CFG.cameraTargetLerp;
    state.camera.scale += ds * CFG.cameraTargetLerp;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(ds) < 0.001) {
      state.cameraTarget = null;
    }
  }

  const allowHeartbeat = !isDraggingNode() && !isPanning();

  draw(ctx, state, tSec, vp, {
    allowHeartbeat,
    starfield: (c, t) => drawStarfield(c, state.stars, state.camera, vp, t),
    particles: (c, alphaOf) => drawParticles(c, state.edges, state.camera, alphaOf),
  });

  // Story mode должен читать bornAt после того как draw()/updateBirths его обновил
  tickStory(tms, state);
  tickMinimap();
  tickStats();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__viz = { state, CFG };
