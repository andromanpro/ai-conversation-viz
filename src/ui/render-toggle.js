// Toggle между Canvas 2D и WebGL рендерерами. Сохраняет выбор в
// localStorage, чтобы после перезагрузки остаться в выбранном режиме.
// Если WebGL недоступен — кнопка прячется.

import { state } from '../view/state.js';
import { isWebglSupported, initWebglRenderer, resizeWebgl } from '../view/renderer-webgl.js';
import { t } from '../core/i18n.js';

const LS_KEY = 'viz:render-backend';
let _btn = null;
let _webglInited = false;
let _webglCanvas = null;
let _canvas2d = null;

export function initRenderToggle() {
  _btn = document.getElementById('btn-render');
  _webglCanvas = document.getElementById('graph-webgl');
  _canvas2d = document.getElementById('graph');

  if (!isWebglSupported() || !_webglCanvas) {
    // WebGL не доступен — форсим canvas2d и прячем кнопку
    state.renderBackend = 'canvas2d';
    if (_webglCanvas) _webglCanvas.style.display = 'none';
    if (_canvas2d) _canvas2d.style.display = 'block';
    if (_btn) _btn.style.display = 'none';
    return;
  }

  // Восстановить выбор из localStorage. Если ничего не сохранено — WebGL
  // как дефолт (он красивее + быстрее; canvas2d остаётся как fallback).
  let saved = null;
  try { saved = localStorage.getItem(LS_KEY); } catch {}
  const initialBackend = saved === 'canvas2d' ? 'canvas2d' : 'webgl';
  setBackend(initialBackend, { silent: true });
  state.useCanvas2D = (state.renderBackend === 'canvas2d');

  if (_btn) _btn.addEventListener('click', () => {
    setBackend(state.renderBackend === 'webgl' ? 'canvas2d' : 'webgl');
  });
  window.addEventListener('resize', () => {
    if (_webglInited && _webglCanvas) resizeWebgl(_webglCanvas);
  });
  updateBtn();
}

export function toggleRenderBackend() {
  setBackend(state.renderBackend === 'webgl' ? 'canvas2d' : 'webgl');
}

/** Программное переключение backend'а — для Settings modal toggle.
 * В 3D-режиме canvas-elements не существуют, попытка init'а WebGL
 * упадёт — поэтому tihely no-op если canvas DOM не подключен. */
export function setRenderBackend(backend) {
  if (backend !== 'webgl' && backend !== 'canvas2d') return;
  if (state.renderBackend === backend) return;
  if (!_canvas2d || !_webglCanvas) return; // 3D-режим — toggle no-op
  setBackend(backend);
}

function setBackend(backend, opts) {
  const silent = opts && opts.silent;
  if (backend === 'webgl') {
    if (!_webglInited) {
      try {
        initWebglRenderer(_webglCanvas);
        _webglInited = true;
      } catch (e) {
        console.error('[render-toggle] WebGL init failed:', e.message);
        if (!silent) toast('WebGL недоступен: ' + e.message);
        return;
      }
    }
    state.renderBackend = 'webgl';
    state.useCanvas2D = false;
    if (_webglCanvas) _webglCanvas.style.display = 'block';
    if (_canvas2d) _canvas2d.style.display = 'none';
    if (_webglCanvas) resizeWebgl(_webglCanvas);
    if (!silent) toast('WebGL режим включён');
  } else {
    state.renderBackend = 'canvas2d';
    state.useCanvas2D = true;
    if (_webglCanvas) _webglCanvas.style.display = 'none';
    if (_canvas2d) _canvas2d.style.display = 'block';
    if (!silent) toast('Canvas 2D режим');
  }
  try { localStorage.setItem(LS_KEY, state.renderBackend); } catch {}
  updateBtn();
}

function updateBtn() {
  if (!_btn) return;
  if (state.renderBackend === 'webgl') {
    _btn.textContent = '🎨';
    _btn.title = t('tip.render_webgl');
    _btn.classList.add('active-render');
  } else {
    _btn.textContent = '🖼';
    _btn.title = t('tip.render_canvas');
    _btn.classList.remove('active-render');
  }
}

if (typeof window !== 'undefined') window.addEventListener('languagechange', updateBtn);

function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}
