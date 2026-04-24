// Generative ambient в стиле Brian Eno: drone pad + случайные ноты
// пентатоники с медленным fade + delay/echo feedback + lowpass.
// Плюс pitched chirp при рождении ноды.

let audioCtx = null;
let ambientMaster = null;
let ambientNodes = [];
let arpeggioTimer = null;
let delayIn = null;
let enabled = false;
let _audioBtnEl;

// Pad: C3 + G3 + C4 — открытая квинта с октавой (major key fundamental)
const PAD_VOICES = [
  { freq: 130.81, detune: -5, type: 'sine' },      // C3
  { freq: 196.00, detune: +4, type: 'sine' },      // G3
  { freq: 261.63, detune: -2, type: 'triangle' },  // C4 (triangle добавляет обертоны)
];

// Пентатоника C major — используется для arpeggio-нот
const PENTATONIC = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
  1046.50,// C6
];

// Чирп при рождении ноды (отдельно от ambient)
const FREQ_BY_ROLE = {
  user: 440,        // A4
  assistant: 554.37,// C#5
  tool_use: 659.25, // E5
};

const AMBIENT_PAD_GAIN = 0.018;
const AMBIENT_ARP_GAIN = 0.035;
const CHIRP_GAIN = 0.06;
const CHIRP_DURATION = 0.32;

export function initAudio() {
  _audioBtnEl = document.getElementById('btn-audio');
  if (_audioBtnEl) _audioBtnEl.addEventListener('click', toggleAudio);
  updateBtn();
}

function ensureCtx() {
  if (audioCtx) return audioCtx;
  const Cls = window.AudioContext || window.webkitAudioContext;
  if (!Cls) return null;
  audioCtx = new Cls();
  return audioCtx;
}

function buildDelayNetwork(ctx, destination) {
  // Input → wet (delay + feedback loop) + dry → output
  const input = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 1.0;
  wet.gain.value = 0.55;

  const delay = ctx.createDelay(3.0);
  delay.delayTime.value = 0.45;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.4;

  // delay loop: delay -> feedback -> delay
  delay.connect(feedback).connect(delay);

  input.connect(dry).connect(destination);
  input.connect(delay);
  delay.connect(wet).connect(destination);

  return input;
}

function startAmbient() {
  const ctx = ensureCtx();
  if (!ctx || ambientNodes.length) return;
  const now = ctx.currentTime;

  // Master
  ambientMaster = ctx.createGain();
  ambientMaster.gain.value = 0;
  ambientMaster.connect(ctx.destination);

  // Lowpass — убирает резкие верха
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1600;
  filter.Q.value = 0.6;
  filter.connect(ambientMaster);

  // Delay network перед фильтром: arpeggio-ноты идут через него для эха
  delayIn = buildDelayNetwork(ctx, filter);

  // Медленный LFO для filter cutoff — плавное «дыхание»
  const fLfo = ctx.createOscillator();
  fLfo.frequency.value = 0.06;
  const fLfoGain = ctx.createGain();
  fLfoGain.gain.value = 400;
  fLfo.connect(fLfoGain).connect(filter.frequency);
  fLfo.start(now);
  ambientNodes.push(fLfo);

  // PAD — голоса подключаются прямо к filter (без delay, drone без эха)
  for (const v of PAD_VOICES) {
    const osc = ctx.createOscillator();
    osc.type = v.type;
    osc.frequency.value = v.freq;
    osc.detune.value = v.detune;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = AMBIENT_PAD_GAIN;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + Math.random() * 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain).connect(voiceGain.gain);
    osc.connect(voiceGain).connect(filter);
    osc.start(now);
    lfo.start(now);
    ambientNodes.push(osc, lfo);
  }

  // Плавный fade-in pad'а за 3 сек
  ambientMaster.gain.linearRampToValueAtTime(1.0, now + 3.0);

  // Запускаем цикл arpeggio
  scheduleNextArp(400);
}

function playArpeggioNote() {
  if (!enabled || !audioCtx || !delayIn) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
  // Иногда октавой ниже для разнообразия
  const freq = Math.random() < 0.3 ? note / 2 : note;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = ctx.createGain();
  const dur = 3.5 + Math.random() * 2;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(AMBIENT_ARP_GAIN, now + 0.7);
  g.gain.exponentialRampToValueAtTime(0.0006, now + dur);
  osc.connect(g).connect(delayIn);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

function scheduleNextArp(ms) {
  clearTimeout(arpeggioTimer);
  arpeggioTimer = setTimeout(() => {
    if (!enabled) return;
    playArpeggioNote();
    // следующая нота через 2.5–6 сек
    scheduleNextArp(2500 + Math.random() * 3500);
  }, ms);
}

function stopAmbient() {
  if (!audioCtx || !ambientMaster) return;
  const now = audioCtx.currentTime;
  ambientMaster.gain.cancelScheduledValues(now);
  ambientMaster.gain.linearRampToValueAtTime(0, now + 1.0);
  clearTimeout(arpeggioTimer);
  arpeggioTimer = null;
  const toKill = ambientNodes.slice();
  ambientNodes = [];
  const master = ambientMaster;
  ambientMaster = null;
  delayIn = null;
  setTimeout(() => {
    for (const n of toKill) { try { n.stop(); } catch {} }
    try { master && master.disconnect(); } catch {}
  }, 1100);
}

function toggleAudio() {
  enabled = !enabled;
  if (enabled) startAmbient();
  else stopAmbient();
  updateBtn();
}

function updateBtn() {
  if (!_audioBtnEl) return;
  _audioBtnEl.textContent = enabled ? '♫' : '♪';
  _audioBtnEl.setAttribute('aria-label', enabled ? 'Sound on' : 'Sound off');
  _audioBtnEl.classList.toggle('active-audio', enabled);
}

export function chirpFor(node) {
  if (!enabled || !audioCtx || !node) return;
  const freq = FREQ_BY_ROLE[node.role] || 440;
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(CHIRP_GAIN, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + CHIRP_DURATION);
  // Чирпы тоже через delay — звучат "в пространстве"
  const dest = delayIn || ctx.destination;
  osc.connect(gain).connect(dest);
  osc.start(now);
  osc.stop(now + CHIRP_DURATION + 0.02);
}

export function isAudioEnabled() { return enabled; }
