// MediaRecorder-запись canvas графа в WebM.
// Phone-mockup сам не попадает в запись (DOM-элемент не пишется в canvas-stream),
// но пользователь может записать весь экран внешним screen-recording'ом для полной картины.

let recorder = null;
let chunks = [];
let startedAt = 0;
let _recBtnEl;
let timerId = null;
// Function returning the canvas to record. По умолчанию — 2D `#graph`,
// в 3D пробрасываем Three.js renderer.domElement.
let _getCanvas = () => document.getElementById('graph');

export function initRecorder(getCanvas) {
  if (typeof getCanvas === 'function') _getCanvas = getCanvas;
  _recBtnEl = document.getElementById('btn-record');
  if (_recBtnEl) _recBtnEl.addEventListener('click', toggle);
}

function getSupportedMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {}
  }
  return 'video/webm';
}

function toggle() {
  if (recorder && recorder.state === 'recording') stop();
  else start();
}

// Public API для внешних UI-контролов (например объединённого
// snapshot-menu в 3D). Позволяет вызывать запись из других мест без
// собственной кнопки `#btn-record`.
export function toggleRecord() { toggle(); }
export function isRecording() { return !!(recorder && recorder.state === 'recording'); }

function start() {
  const canvas = _getCanvas();
  if (!canvas) {
    console.warn('[recorder] canvas not found');
    showToast('Recording: canvas not found', 5000);
    return;
  }
  if (!canvas.captureStream) {
    console.warn('[recorder] canvas.captureStream not supported');
    showToast('Recording not supported in this browser', 5000);
    return;
  }
  const mime = getSupportedMime();
  if (!mime) {
    console.warn('[recorder] no supported MediaRecorder mime');
    showToast('MediaRecorder not available', 5000);
    return;
  }
  let stream;
  try {
    stream = canvas.captureStream(30);
    console.log('[recorder] stream OK, tracks:', stream.getTracks().length, 'mime:', mime);
  } catch (e) {
    console.error('[recorder] captureStream failed', e);
    showToast('captureStream failed: ' + e.message, 5000);
    return;
  }
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime });
  } catch (e) {
    console.error('[recorder] MediaRecorder init failed', e);
    showToast('Recorder init failed: ' + e.message, 5000);
    return;
  }
  chunks = [];
  recorder.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
  recorder.onstop = download;
  recorder.onerror = (e) => {
    console.error('[recorder] runtime error', e);
    showToast('Recording error', 5000);
  };
  recorder.start(250); // chunks of 250ms
  startedAt = Date.now();
  updateBtn(true);
  timerId = setInterval(updateTimer, 250);
  showToast('Recording started — click ● again to stop', 2000);
}

function stop() {
  if (!recorder) return;
  try { recorder.stop(); } catch {}
  clearInterval(timerId);
  timerId = null;
  updateBtn(false);
}

function download() {
  if (!chunks.length) return;
  const type = chunks[0].type || 'video/webm';
  const blob = new Blob(chunks, { type });
  const url = URL.createObjectURL(blob);
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation-viz-${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  const size = (blob.size / (1024 * 1024)).toFixed(1);
  showToast(`Saved ${a.download} (${size} MB)`);
  recorder = null;
  chunks = [];
}

function updateBtn(recording) {
  if (_recBtnEl) {
    _recBtnEl.textContent = recording ? '● REC 0s' : '●';
    _recBtnEl.classList.toggle('recording', recording);
  } else {
    // Нет dedicated btn — показываем sticky toast с таймером (для 3D
    // где запись запускается из меню snapshot'а)
    if (recording) updateStickyToast('● REC 0s');
    else clearStickyToast();
  }
}

function updateTimer() {
  if (!recorder) return;
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const text = m > 0 ? `● REC ${m}m${s.toString().padStart(2,'0')}s` : `● REC ${s}s`;
  if (_recBtnEl) _recBtnEl.textContent = text;
  else updateStickyToast(text);
}

function updateStickyToast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  el.dataset.sticky = '1';
}

function clearStickyToast() {
  const el = document.getElementById('toast');
  if (!el) return;
  if (el.dataset.sticky === '1') {
    delete el.dataset.sticky;
    el.classList.remove('show');
  }
}

function showToast(msg, ms) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), ms || 2500);
}
