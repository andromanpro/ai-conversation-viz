import { state } from '../view/state.js';
import { CFG } from '../core/config.js';
import { setSpeed as timelineSetSpeed } from './timeline.js';

let buttons = [];

export function initSpeedControl() {
  const container = document.getElementById('speed-control');
  if (!container) return;
  const speeds = CFG.playSpeedOptions || [0.5, 1, 2, 5];
  container.innerHTML = '';
  for (const s of speeds) {
    const b = document.createElement('button');
    b.className = 'btn btn-speed';
    b.dataset.speed = String(s);
    b.textContent = s === 1 ? '1×' : `${s}×`;
    if (s === 1) b.classList.add('active');
    b.addEventListener('click', () => setSpeed(s));
    container.appendChild(b);
    buttons.push(b);
  }
}

export function setSpeed(mult) {
  state.playSpeed = mult;
  timelineSetSpeed(mult);
  for (const b of buttons) b.classList.toggle('active', parseFloat(b.dataset.speed) === mult);
}
