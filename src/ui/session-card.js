import { t } from '../core/i18n.js';
import { buildCardModel } from '../core/session-archetype.js';
import { state } from '../view/state.js';
import { toolIcon } from '../view/tool-icons.js';
import { computeStats, formatDuration, formatTokens } from './stats-hud.js';
import { buildShareUrl } from './share.js';
import { canvasToPngBlob, downloadCanvasPng, snapshotTimestamp } from './snapshot.js';

const ASPECTS = {
  og: { width: 1200, height: 630, labelKey: 'session_card.aspect_og' },
  square: { width: 1080, height: 1080, labelKey: 'session_card.aspect_square' },
};

const ROLE_COLORS = {
  user: '#7BAAF0',
  assistant: '#50D4B5',
  tool_use: '#ECA040',
  tool_result: '#C89150',
  subagent_input: '#8CA5C8',
  thinking: '#B58CFF',
};

let btnEl;
let modalEl;
let previewWrapEl;
let includeSnippetsEl;
let aspectKey = 'og';
let currentCanvas = null;
let dirty = true;
let _getState = () => state;
let _getShareUrl = () => buildShareUrl();

/**
 * Wire the redacted session-card export button.
 *
 * @param {{getState?:Function,getShareUrl?:Function}=} opts Initialization options.
 */
export function initSessionCard(opts = {}) {
  if (typeof opts.getState === 'function') _getState = opts.getState;
  if (typeof opts.getShareUrl === 'function') _getShareUrl = opts.getShareUrl;
  btnEl = document.getElementById('btn-session-card');
  if (!btnEl) return;
  btnEl.addEventListener('click', openSessionCard);
}

/**
 * Open the redacted session-card dialog.
 *
 * @returns {void}
 */
export function openSessionCard() {
  if (modalEl) { closeDialog(); return; }
  aspectKey = 'og';
  currentCanvas = null;
  dirty = true;

  modalEl = document.createElement('div');
  modalEl.id = 'session-card-modal';
  modalEl.className = 'session-card-modal';

  const body = document.createElement('div');
  body.className = 'session-card-body';
  modalEl.appendChild(body);

  const header = document.createElement('div');
  header.className = 'session-card-header';
  const title = document.createElement('span');
  title.textContent = t('session_card.title');
  header.appendChild(title);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'session-card-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t('aria.close'));
  closeBtn.addEventListener('click', closeDialog);
  header.appendChild(closeBtn);
  body.appendChild(header);

  const controls = document.createElement('div');
  controls.className = 'session-card-controls';
  controls.appendChild(buildAspectControl());
  controls.appendChild(buildSnippetToggle());
  body.appendChild(controls);

  previewWrapEl = document.createElement('div');
  previewWrapEl.className = 'session-card-preview';
  body.appendChild(previewWrapEl);

  const actions = document.createElement('div');
  actions.className = 'session-card-actions';
  actions.appendChild(makeActionButton(t('session_card.generate'), generatePreview));
  actions.appendChild(makeActionButton(t('session_card.copy'), copyCurrent));
  const downloadBtn = makeActionButton(t('session_card.download'), downloadCurrent);
  downloadBtn.classList.add('accent');
  actions.appendChild(downloadBtn);
  body.appendChild(actions);

  modalEl.addEventListener('click', ev => { if (ev.target === modalEl) closeDialog(); });
  document.body.appendChild(modalEl);
  generatePreview({ silent: true });
}

function buildAspectControl() {
  const wrap = document.createElement('div');
  wrap.className = 'session-card-field';
  const label = document.createElement('span');
  label.className = 'session-card-label';
  label.textContent = t('session_card.aspect');
  wrap.appendChild(label);

  const group = document.createElement('div');
  group.className = 'session-card-segmented';
  for (const key of Object.keys(ASPECTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t(ASPECTS[key].labelKey);
    b.className = key === aspectKey ? 'active' : '';
    b.addEventListener('click', () => {
      aspectKey = key;
      dirty = true;
      for (const item of group.querySelectorAll('button')) item.classList.toggle('active', item === b);
      generatePreview({ silent: true });
    });
    group.appendChild(b);
  }
  wrap.appendChild(group);
  return wrap;
}

function buildSnippetToggle() {
  const box = document.createElement('div');
  box.className = 'session-card-snippet';
  const wrap = document.createElement('label');
  wrap.className = 'session-card-check';
  includeSnippetsEl = document.createElement('input');
  includeSnippetsEl.type = 'checkbox';
  includeSnippetsEl.checked = false;
  const warn = document.createElement('p');
  warn.className = 'session-card-warn';
  warn.textContent = t('session_card.snippet_warn');
  // Always visible but emphasised only while snippets are on — the user
  // must see the best-effort caveat BEFORE opting in (public-share safety).
  warn.style.cssText = 'margin:6px 0 0;font-size:11px;line-height:1.4;color:#e0a040;opacity:0.7;';
  const syncWarn = () => { warn.style.opacity = includeSnippetsEl.checked ? '1' : '0.7'; };
  includeSnippetsEl.addEventListener('change', () => {
    syncWarn();
    dirty = true;
    generatePreview({ silent: true });
  });
  const text = document.createElement('span');
  text.textContent = t('session_card.include_snippets');
  wrap.appendChild(includeSnippetsEl);
  wrap.appendChild(text);
  box.appendChild(wrap);
  box.appendChild(warn);
  return box;
}

function makeActionButton(label, handler) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = label;
  b.addEventListener('click', handler);
  return b;
}

function closeDialog() {
  if (!modalEl) return;
  modalEl.remove();
  modalEl = null;
  previewWrapEl = null;
  includeSnippetsEl = null;
  currentCanvas = null;
}

function buildCurrentModel() {
  const s = _getState();
  if (!s || !Array.isArray(s.nodes) || !s.nodes.length) return null;
  let shareUrl = '';
  try { shareUrl = _getShareUrl(); } catch {}
  return buildCardModel(s, {
    stats: computeStats(s.nodes),
    includeSnippets: !!(includeSnippetsEl && includeSnippetsEl.checked),
    shareUrl,
  });
}

function generatePreview(opts = {}) {
  const model = buildCurrentModel();
  if (!model) {
    showToast(t('session_card.empty'));
    return null;
  }
  const size = ASPECTS[aspectKey] || ASPECTS.og;
  currentCanvas = renderSessionCardCanvas(model, size);
  currentCanvas.className = 'session-card-preview-canvas';
  if (previewWrapEl) {
    previewWrapEl.innerHTML = '';
    previewWrapEl.appendChild(currentCanvas);
  }
  dirty = false;
  if (!opts.silent) showToast(t('session_card.generated'));
  return currentCanvas;
}

function ensureCanvas() {
  if (!currentCanvas || dirty) return generatePreview({ silent: true });
  return currentCanvas;
}

async function copyCurrent() {
  const canvas = ensureCanvas();
  if (!canvas) return;
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
    showToast(t('session_card.copy_unsupported'));
    return;
  }
  const blob = await canvasToPngBlob(canvas, 1);
  if (!blob) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast(t('session_card.copied'));
  } catch {
    showToast(t('session_card.copy_unsupported'));
  }
}

async function downloadCurrent() {
  const canvas = ensureCanvas();
  if (!canvas) return;
  await downloadCanvasPng(canvas, `conversation-card-${snapshotTimestamp()}.png`, 1);
}

/**
 * Render a redacted session-card PNG canvas from a structured, sanitized model.
 *
 * @param {object} model Redaction-safe card model.
 * @param {{width:number,height:number}} size Output size.
 * @returns {HTMLCanvasElement} Rendered canvas.
 */
export function renderSessionCardCanvas(model, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const W = size.width;
  const H = size.height;

  drawBackground(ctx, W, H);
  const panelW = W > H ? Math.min(410, Math.round(W * 0.35)) : Math.min(390, Math.round(W * 0.36));
  const panel = { x: W - panelW - 36, y: 40, w: panelW, h: H - 80 };
  const graph = { x: 42, y: 72, w: panel.x - 74, h: H - 132 };

  drawHeader(ctx, model, graph.x, 36);
  drawGraph(ctx, model, graph);
  drawPanel(ctx, model, panel);
  drawWatermark(ctx, W, H);
  return canvas;
}

function drawBackground(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#08101f');
  grad.addColorStop(0.46, '#0b1328');
  grad.addColorStop(1, '#050812');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = 'rgba(123, 170, 240, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeader(ctx, model, x, y) {
  ctx.save();
  ctx.font = '700 28px ui-monospace, Consolas, monospace';
  ctx.fillStyle = '#e8f7ff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('AI CONVERSATION VIZ', x, y);
  ctx.font = '12px ui-monospace, Consolas, monospace';
  ctx.fillStyle = 'rgba(123, 170, 240, 0.84)';
  ctx.fillText(t('session_card.redacted_topology'), x, y + 24);
  ctx.strokeStyle = 'rgba(80, 212, 181, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 34);
  ctx.lineTo(x + 260, y + 34);
  ctx.stroke();
  // The share URL is intentionally NOT drawn on the card: it is almost
  // always redacted to non-clickable noise ("https://[path]?t=..."), and
  // the image itself is what gets shared, not a link. (model.shareUrl is
  // still produced/sanitized for any non-card consumer.)
  ctx.restore();
}

function drawGraph(ctx, model, rect) {
  const nodes = model.graph.nodes || [];
  const edges = model.graph.edges || [];
  ctx.save();
  roundedFill(ctx, rect.x, rect.y, rect.w, rect.h, 10, 'rgba(5, 8, 16, 0.28)');
  ctx.strokeStyle = 'rgba(80, 212, 181, 0.16)';
  ctx.lineWidth = 1;
  roundedPath(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.stroke();

  if (!nodes.length) {
    ctx.fillStyle = 'rgba(207, 230, 255, 0.55)';
    ctx.font = '16px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t('session_card.empty'), rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
    return;
  }

  const tx = graphTransform(nodes, rect);
  const byId = new Map(nodes.map(n => [n.id, n]));
  ctx.lineCap = 'round';
  for (const e of edges) {
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (!a || !b) continue;
    const as = project(a, tx);
    const bs = project(b, tx);
    const alpha = e.adopted ? 0.18 : 0.34;
    ctx.strokeStyle = colorForRole(b.role, alpha);
    ctx.lineWidth = e.adopted ? 1.1 : 1.4;
    if (e.adopted) ctx.setLineDash([5, 5]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    const mx = (as.x + bs.x) / 2;
    const my = (as.y + bs.y) / 2;
    const dx = bs.x - as.x;
    const dy = bs.y - as.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = Math.min(38, len * 0.16);
    ctx.moveTo(as.x, as.y);
    ctx.quadraticCurveTo(mx - (dy / len) * off, my + (dx / len) * off, bs.x, bs.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const n of nodes) {
    const p = project(n, tx);
    const r = Math.max(3.5, Math.min(17, (n.r || 5) * tx.scale));
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.4);
    glow.addColorStop(0, colorForRole(n.role, 0.34));
    glow.addColorStop(1, colorForRole(n.role, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colorForRole(n.role, 0.95);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (n.isHub || n.hasError) {
      ctx.strokeStyle = n.hasError ? 'rgba(255, 90, 90, 0.88)' : 'rgba(255, 215, 120, 0.72)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (n.role === 'tool_use' && n.toolName && r >= 5) {
      ctx.fillStyle = 'rgba(18, 11, 4, 0.92)';
      ctx.font = `700 ${Math.max(10, Math.round(r * 1.05))}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toolIcon(n.toolName), p.x, p.y + 0.5);
    }
  }

  drawGraphLabels(ctx, nodes, tx, rect, model.includeSnippets);
  ctx.restore();
}

function drawGraphLabels(ctx, nodes, tx, rect, includeSnippets) {
  let drawn = 0;
  const maxLabels = includeSnippets ? 14 : 18;
  const candidates = nodes
    .filter(n => includeSnippets ? n.snippet : (n.role === 'tool_use' && n.toolName))
    .sort((a, b) => (b.isHub === true) - (a.isHub === true) || (b.textLen || 0) - (a.textLen || 0));
  for (const n of candidates) {
    if (drawn >= maxLabels) break;
    const p = project(n, tx);
    if (p.x < rect.x + 8 || p.x > rect.x + rect.w - 8 || p.y < rect.y + 8 || p.y > rect.y + rect.h - 8) continue;
    const text = includeSnippets ? n.snippet : n.toolName;
    if (!text) continue;
    const label = includeSnippets ? clipToWidth(ctx, text, 190) : clipToWidth(ctx, text, 86);
    ctx.font = includeSnippets ? '10px ui-monospace, Consolas, monospace' : '700 9px ui-monospace, Consolas, monospace';
    const padX = 7;
    const w = Math.min(includeSnippets ? 214 : 106, ctx.measureText(label).width + padX * 2);
    const h = includeSnippets ? 22 : 18;
    const x = Math.min(rect.x + rect.w - w - 8, Math.max(rect.x + 8, p.x + 10));
    const y = Math.min(rect.y + rect.h - h - 8, Math.max(rect.y + 8, p.y - h / 2));
    roundedFill(ctx, x, y, w, h, 5, includeSnippets ? 'rgba(8, 12, 24, 0.84)' : 'rgba(236, 160, 64, 0.16)');
    ctx.strokeStyle = includeSnippets ? 'rgba(123, 170, 240, 0.28)' : 'rgba(236, 160, 64, 0.36)';
    ctx.lineWidth = 1;
    roundedPath(ctx, x, y, w, h, 5);
    ctx.stroke();
    ctx.fillStyle = includeSnippets ? 'rgba(207, 230, 255, 0.82)' : 'rgba(255, 221, 170, 0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + padX, y + h / 2 + 0.5);
    drawn++;
  }
}

function drawPanel(ctx, model, rect) {
  ctx.save();
  const panelGrad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  panelGrad.addColorStop(0, 'rgba(12, 18, 36, 0.92)');
  panelGrad.addColorStop(1, 'rgba(7, 10, 22, 0.92)');
  roundedFill(ctx, rect.x, rect.y, rect.w, rect.h, 12, panelGrad);
  ctx.strokeStyle = 'rgba(123, 170, 240, 0.28)';
  ctx.lineWidth = 1.4;
  roundedPath(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.stroke();

  let y = rect.y + 32;
  y = drawArchetype(ctx, model, rect.x + 24, y, rect.w - 48);
  y += 22;
  y = drawMetricGrid(ctx, model, rect.x + 24, y, rect.w - 48);
  y += 18;
  y = drawRoleBreakdown(ctx, model, rect.x + 24, y, rect.w - 48);
  y += 18;
  y = drawToolList(ctx, model, rect.x + 24, y, rect.w - 48);
  if (model.models.length) {
    y += 16;
    drawModelLine(ctx, model, rect.x + 24, y, rect.w - 48);
  }
  ctx.restore();
}

function drawArchetype(ctx, model, x, y, w) {
  ctx.font = '10px ui-monospace, Consolas, monospace';
  ctx.fillStyle = 'rgba(123, 170, 240, 0.82)';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(t('session_card.archetype').toUpperCase(), x, y);
  const label = t(model.archetype.labelKey).toUpperCase();
  const badgeH = 40;
  const badgeY = y + 11;
  const badgeGrad = ctx.createLinearGradient(x, badgeY, x + w, badgeY);
  badgeGrad.addColorStop(0, 'rgba(80, 212, 181, 0.22)');
  badgeGrad.addColorStop(1, 'rgba(236, 160, 64, 0.18)');
  roundedFill(ctx, x, badgeY, w, badgeH, 8, badgeGrad);
  ctx.strokeStyle = 'rgba(80, 212, 181, 0.5)';
  ctx.lineWidth = 1;
  roundedPath(ctx, x, badgeY, w, badgeH, 8);
  ctx.stroke();
  ctx.font = '700 20px ui-monospace, Consolas, monospace';
  ctx.fillStyle = '#f4fbff';
  ctx.fillText(clipToWidth(ctx, label, w - 24), x + 12, badgeY + 27);
  return badgeY + badgeH;
}

function drawMetricGrid(ctx, model, x, y, w) {
  const c = model.counts;
  const metrics = [
    [t('session_card.events'), formatNumber(c.events)],
    [t('session_card.duration'), formatDuration(c.durationSec || 0)],
    [t('session_card.tokens'), '~' + formatTokens(c.tokens || 0)],
    [t('session_card.tool_use'), formatNumber(c.toolUseTotal)],
    [t('session_card.subagents'), formatNumber(c.subagentCount)],
    [t('session_card.hubs'), formatNumber(c.hubs)],
  ];
  const colW = (w - 12) / 2;
  const rowH = 45;
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < metrics.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = x + col * (colW + 12);
    const by = y + row * rowH;
    roundedFill(ctx, bx, by, colW, 36, 6, 'rgba(123, 170, 240, 0.06)');
    ctx.font = '9px ui-monospace, Consolas, monospace';
    ctx.fillStyle = 'rgba(123, 170, 240, 0.7)';
    ctx.fillText(metrics[i][0].toUpperCase(), bx + 9, by + 13);
    ctx.font = '700 17px ui-monospace, Consolas, monospace';
    ctx.fillStyle = '#e8f7ff';
    ctx.fillText(clipToWidth(ctx, metrics[i][1], colW - 18), bx + 9, by + 30);
  }
  return y + Math.ceil(metrics.length / 2) * rowH - 9;
}

function drawRoleBreakdown(ctx, model, x, y, w) {
  ctx.font = '10px ui-monospace, Consolas, monospace';
  ctx.fillStyle = 'rgba(123, 170, 240, 0.82)';
  ctx.fillText(t('session_card.roles').toUpperCase(), x, y);
  const roles = model.roles.slice(0, 6);
  const max = Math.max(1, ...roles.map(r => r.count));
  let yy = y + 18;
  for (const item of roles) {
    const labelW = 106;
    ctx.font = '10px ui-monospace, Consolas, monospace';
    ctx.fillStyle = colorForRole(item.role, 0.92);
    ctx.fillText(item.role, x, yy + 10);
    ctx.fillStyle = 'rgba(207, 230, 255, 0.82)';
    ctx.textAlign = 'right';
    ctx.fillText(String(item.count), x + labelW - 8, yy + 10);
    ctx.textAlign = 'left';
    roundedFill(ctx, x + labelW, yy + 1, w - labelW, 9, 4, 'rgba(123, 170, 240, 0.08)');
    roundedFill(ctx, x + labelW, yy + 1, (w - labelW) * item.count / max, 9, 4, colorForRole(item.role, 0.62));
    yy += 18;
  }
  return yy;
}

function drawToolList(ctx, model, x, y, w) {
  ctx.font = '10px ui-monospace, Consolas, monospace';
  ctx.fillStyle = 'rgba(123, 170, 240, 0.82)';
  ctx.fillText(t('session_card.top_tools').toUpperCase(), x, y);
  let yy = y + 18;
  const tools = model.topTools.length ? model.topTools : [{ name: t('session_card.no_tools'), count: 0 }];
  for (const tool of tools.slice(0, 5)) {
    const label = tool.count ? `${toolIcon(tool.name)} ${tool.name}` : tool.name;
    const count = tool.count ? '×' + tool.count : '';
    roundedFill(ctx, x, yy - 2, w, 24, 6, 'rgba(236, 160, 64, 0.08)');
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.fillStyle = 'rgba(255, 221, 170, 0.92)';
    ctx.fillText(clipToWidth(ctx, label, w - 54), x + 9, yy + 14);
    if (count) {
      ctx.fillStyle = 'rgba(207, 230, 255, 0.72)';
      ctx.textAlign = 'right';
      ctx.fillText(count, x + w - 9, yy + 14);
      ctx.textAlign = 'left';
    }
    yy += 30;
  }
  return yy;
}

function drawModelLine(ctx, model, x, y, w) {
  ctx.font = '10px ui-monospace, Consolas, monospace';
  ctx.fillStyle = 'rgba(123, 170, 240, 0.82)';
  ctx.fillText(t('session_card.models').toUpperCase(), x, y);
  ctx.font = '12px ui-monospace, Consolas, monospace';
  ctx.fillStyle = 'rgba(207, 230, 255, 0.86)';
  ctx.fillText(clipToWidth(ctx, model.models.join(', '), w), x, y + 19);
}

function drawWatermark(ctx, W, H) {
  ctx.save();
  ctx.font = '11px ui-monospace, Consolas, monospace';
  ctx.fillStyle = 'rgba(207, 230, 255, 0.52)';
  ctx.textAlign = 'right';
  ctx.fillText('ai-conversation-viz · andromanpro', W - 34, H - 22);
  ctx.restore();
}

function graphTransform(nodes, rect) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const r = n.r || 5;
    minX = Math.min(minX, n.x - r);
    minY = Math.min(minY, n.y - r);
    maxX = Math.max(maxX, n.x + r);
    maxY = Math.max(maxY, n.y + r);
  }
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const scale = Math.min(rect.w / bw, rect.h / bh) * 0.84;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    scale,
    x: rect.x + rect.w / 2 - cx * scale,
    y: rect.y + rect.h / 2 - cy * scale,
  };
}

function project(n, tx) {
  return { x: n.x * tx.scale + tx.x, y: n.y * tx.scale + tx.y };
}

function colorForRole(role, alpha) {
  const hex = ROLE_COLORS[role] || '#50D4B5';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function roundedFill(ctx, x, y, w, h, r, fillStyle) {
  ctx.fillStyle = fillStyle;
  roundedPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function clipToWidth(ctx, value, maxWidth) {
  const text = String(value || '');
  if (!text || ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + '...').width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + '...';
}

function formatNumber(n) {
  return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2200);
}
