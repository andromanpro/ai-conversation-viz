// PNG/SVG-снимок текущего view. PNG через canvas.toBlob, SVG через
// ручную сериализацию (без html2canvas — zero deps принцип).

import { t } from '../core/i18n.js';

let _snapBtn;
// Function returning the canvas to snapshot. По умолчанию — 2D `#graph`.
// В 3D — Three.js renderer.domElement (требует preserveDrawingBuffer:true
// в WebGLRenderer чтобы toBlob не вернул пустоту).
let _getCanvas = () => document.getElementById('graph');
// SVG-snapshot имеет смысл только для 2D (где есть state.nodes/edges с
// плоскими x/y координатами). В 3D — отключаем пункт меню.
let _supportSvg = true;

export function initSnapshot(opts) {
  if (opts && typeof opts.getCanvas === 'function') _getCanvas = opts.getCanvas;
  if (opts && typeof opts.supportSvg === 'boolean') _supportSvg = opts.supportSvg;
  _snapBtn = document.getElementById('btn-snapshot');
  if (!_snapBtn) return;
  _snapBtn.addEventListener('click', showMenu);
}

function showMenu() {
  const existing = document.getElementById('snapshot-menu');
  if (existing) { existing.remove(); return; }
  const menu = document.createElement('div');
  menu.id = 'snapshot-menu';
  menu.className = 'snapshot-menu';
  const rect = _snapBtn.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top = (rect.bottom + 4) + 'px';

  // Один handler закрытия меню, используется и для click-outside и для
  // выбора пункта — гарантирует снятие global listener'а в любом случае.
  let outsideHandler = null;
  const closeMenu = () => {
    menu.remove();
    if (outsideHandler) {
      document.removeEventListener('click', outsideHandler);
      outsideHandler = null;
    }
  };

  const mkBtn = (label, fn) => {
    const b = document.createElement('button');
    b.className = 'snapshot-menu-item';
    b.textContent = label;
    b.addEventListener('click', () => { closeMenu(); fn(); });
    menu.appendChild(b);
  };
  mkBtn(t('snapshot.png_1x'), () => savePng(1));
  mkBtn(t('snapshot.png_2x'), () => savePng(2));
  if (_supportSvg) mkBtn(t('snapshot.svg'), () => saveSvg());
  document.body.appendChild(menu);

  // Закрытие при клике вне меню (с задержкой чтобы не поймать current click)
  setTimeout(() => {
    outsideHandler = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== _snapBtn) closeMenu();
    };
    document.addEventListener('click', outsideHandler);
  }, 0);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast(`Saved ${filename}`);
}

function savePng(scale) {
  const canvas = _getCanvas();
  if (!canvas) return;
  if (scale === 1) {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `conversation-viz-${ts()}.png`);
    }, 'image/png');
    return;
  }
  // 2× — пересэмплируем через off-screen canvas
  const off = document.createElement('canvas');
  off.width = canvas.width * scale;
  off.height = canvas.height * scale;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(canvas, 0, 0, off.width, off.height);
  off.toBlob((blob) => {
    if (blob) downloadBlob(blob, `conversation-viz-${ts()}@${scale}x.png`);
  }, 'image/png');
}

function saveSvg() {
  const s = window.__viz && window.__viz.state;
  if (!s || !s.nodes.length) return;
  const cam = s.camera;
  const W = window.innerWidth;
  const H = window.innerHeight;

  // Палитра ролей для SVG snapshot. Должна совпадать с Canvas/WebGL/3D
  // палитрами в renderer.js / renderer-webgl.js / 3d/main.js.
  const ROLE_HEX = {
    user: '#7BAAF0',
    subagent_input: '#8CA5C8',
    tool_use: '#ECA040',
    tool_result: '#C89150',
    thinking: '#B58CFF',
    // assistant (и любая другая) → дефолтный teal
  };
  const roleColor = (role) => ROLE_HEX[role] || '#50D4B5';

  const w2s = (x, y) => ({ x: (x - cam.x) * cam.scale, y: (y - cam.y) * cam.scale });

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#0a0e1a">`);
  // edges
  lines.push(`<g id="edges" stroke-width="0.8" fill="none">`);
  for (const e of s.edges) {
    if (!e.a || !e.b) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    if (e.adopted && !s.connectOrphans) continue;
    const a = w2s(e.a.x, e.a.y);
    const b = w2s(e.b.x, e.b.y);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = len * 0.18;
    const cpx = mx - (dy / len) * off;
    const cpy = my + (dx / len) * off;
    const stroke = e.adopted ? '#c8b478' : (e.b.role === 'tool_use' ? '#eca040' : '#00d4ff');
    const opacity = e.adopted ? 0.22 : 0.35;
    const dash = e.adopted ? ' stroke-dasharray="4,4"' : '';
    lines.push(`<path d="M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke="${stroke}" opacity="${opacity}"${dash}/>`);
  }
  lines.push(`</g>`);
  // nodes
  lines.push(`<g id="nodes">`);
  for (const n of s.nodes) {
    if (n.bornAt == null) continue;
    if (n.role === 'tool_use' && n.parentId && s.collapsed && s.collapsed.has(n.parentId)) continue;
    const p = w2s(n.x, n.y);
    if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
    const r = n.r * cam.scale;
    lines.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${roleColor(n.role)}"/>`);
    if (n.isHub) {
      lines.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r + 3).toFixed(1)}" fill="none" stroke="rgba(255,215,120,0.7)" stroke-width="1.4"/>`);
    }
    if (n._isOrphanRoot) {
      lines.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(r + 6).toFixed(1)}" fill="none" stroke="rgba(236,160,64,0.7)" stroke-width="1.2" stroke-dasharray="3,3"/>`);
    }
  }
  lines.push(`</g>`);
  lines.push(`</svg>`);
  const blob = new Blob([lines.join('\n')], { type: 'image/svg+xml' });
  downloadBlob(blob, `conversation-viz-${ts()}.svg`);
}

function ts() {
  const d = new Date();
  return d.toISOString().replace(/[:T]/g, '-').slice(0, 19);
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}
