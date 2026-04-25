// FPS counter — moving average по последним 60 кадрам.
// Цвет адаптивный: зелёный ≥50, жёлтый 30-50, красный <30.
//
// API:
//   initFpsCounter(elementId)  — привязывает к DOM-элементу
//   tickFps(nowMs)             — вызывается на каждом кадре

const WINDOW = 60;
const _times = []; // ring buffer of frame timestamps
let _idx = 0;
let _el = null;
let _lastDisplayed = -1;
let _lastUpdateMs = 0;

export function initFpsCounter(elementId) {
  _el = document.getElementById(elementId || 'fps-counter');
}

export function tickFps(nowMs) {
  if (!_el) return;
  _times[_idx % WINDOW] = nowMs;
  _idx++;
  // Обновляем display раз в ~250 ms — иначе цифра дёргается слишком быстро
  if (nowMs - _lastUpdateMs < 250) return;
  _lastUpdateMs = nowMs;
  const filled = Math.min(_idx, WINDOW);
  if (filled < 2) return;
  // Берём диапазон последних `filled` timestamps
  const oldestIdx = (_idx - filled + WINDOW) % WINDOW;
  const newestIdx = (_idx - 1 + WINDOW) % WINDOW;
  const span = _times[newestIdx] - _times[oldestIdx];
  if (span <= 0) return;
  const fps = ((filled - 1) * 1000) / span;
  const rounded = Math.round(fps);
  if (rounded === _lastDisplayed) return;
  _lastDisplayed = rounded;
  _el.textContent = rounded + ' fps';
  // Цвет: зелёный/жёлтый/красный по threshold'ам
  let color;
  if (rounded >= 50) color = 'rgba(120, 230, 160, 0.8)';
  else if (rounded >= 30) color = 'rgba(240, 210, 110, 0.8)';
  else color = 'rgba(255, 130, 130, 0.85)';
  _el.style.color = color;
}

export function resetFps() {
  _times.length = 0;
  _idx = 0;
  _lastDisplayed = -1;
  _lastUpdateMs = 0;
}
