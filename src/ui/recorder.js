// MediaRecorder-запись canvas графа в WebM.
// Phone-mockup сам не попадает в запись (DOM-элемент не пишется в canvas-stream),
// но пользователь может записать весь экран внешним screen-recording'ом для полной картины.

let recorder = null;
let chunks = [];
let startedAt = 0;
let _recBtnEl;
let timerId = null;

export function initRecorder() {
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

function start() {
  const canvas = document.getElementById('graph');
  if (!canvas || !canvas.captureStream) {
    showToast('Recording not supported in this browser');
    return;
  }
  const mime = getSupportedMime();
  if (!mime) {
    showToast('MediaRecorder not available');
    return;
  }
  let stream;
  try { stream = canvas.captureStream(30); } catch (e) {
    showToast('captureStream failed');
    return;
  }
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime });
  } catch (e) {
    console.error('[recorder]', e);
    showToast('Recorder init failed');
    return;
  }
  chunks = [];
  recorder.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
  recorder.onstop = download;
  recorder.start(250); // chunks of 250ms
  startedAt = Date.now();
  updateBtn(true);
  timerId = setInterval(updateTimer, 250);
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
  if (!_recBtnEl) return;
  _recBtnEl.textContent = recording ? '● REC 0s' : 'Record';
  _recBtnEl.classList.toggle('recording', recording);
}

function updateTimer() {
  if (!_recBtnEl || !recorder) return;
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  _recBtnEl.textContent = m > 0 ? `● REC ${m}m${s.toString().padStart(2,'0')}s` : `● REC ${s}s`;
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
