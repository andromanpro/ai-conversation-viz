import { state } from '../view/state.js';
import { applyTopicsToNodes, hueToRgbaString } from '../view/topics.js';
import { t } from '../core/i18n.js';

let _topicBtn;
let _legendEl;

export function initTopicsToggle() {
  _topicBtn = document.getElementById('btn-topics');
  if (_topicBtn) _topicBtn.addEventListener('click', toggle);
  _legendEl = ensureLegend();
  updateBtn();
}

export function toggleTopics() { toggle(); }

function toggle() {
  state.topicsMode = !state.topicsMode;
  if (state.topicsMode && state.nodes.length) {
    const top = applyTopicsToNodes(state.nodes);
    renderLegend(top);
  } else {
    state.topicFilter = null; // при выключении режима убираем и фильтр
    if (_legendEl) _legendEl.classList.remove('show');
  }
  updateBtn();
}

/** Устанавливает/снимает topic-фильтр. Null — показать все. */
export function setTopicFilter(word) {
  if (state.topicFilter === word) {
    state.topicFilter = null;
  } else {
    state.topicFilter = word;
  }
  // Обновить active-класс на элементах легенды
  if (_legendEl) {
    _legendEl.querySelectorAll('.topics-legend-item').forEach(el => {
      el.classList.toggle('active', el.dataset.word === state.topicFilter);
    });
  }
}

export function clearTopicFilter() {
  state.topicFilter = null;
  if (_legendEl) {
    _legendEl.querySelectorAll('.topics-legend-item.active').forEach(el => el.classList.remove('active'));
  }
}

function ensureLegend() {
  let el = document.getElementById('topics-legend');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'topics-legend';
  el.className = 'topics-legend';
  el.innerHTML = '<div class="topics-legend-title">Top topics (TF × log df)</div><div class="topics-legend-items"></div>';
  // Inline CSS — чтобы модуль работал без правок HTML
  const css = document.createElement('style');
  css.textContent = `
    .topics-legend {
      position: fixed; bottom: 72px; right: 340px; z-index: 11;
      display: none; background: var(--panel, rgba(10,14,26,0.85));
      border: 1px solid var(--border, rgba(123,170,240,0.25));
      border-radius: 4px; padding: 8px 12px;
      font-size: 11px; letter-spacing: 0.04em; max-width: 260px;
    }
    .topics-legend.show { display: block; }
    .topics-legend-title { color: var(--muted, #6a7c95); font-size: 9px;
      letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
    .topics-legend-hint { color: var(--muted, #6a7c95); font-size: 9px;
      margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border, rgba(123,170,240,0.15)); font-style: italic; }
    .topics-legend-item { display: flex; align-items: center; gap: 7px; margin: 2px -4px;
      padding: 3px 6px; border-radius: 3px; cursor: pointer; transition: background .12s, border-color .12s;
      border: 1px solid transparent; }
    .topics-legend-item:hover { background: rgba(123,170,240,0.08); }
    .topics-legend-item.active { background: rgba(80,212,181,0.14); border-color: rgba(80,212,181,0.6); }
    .topics-legend-swatch { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .topics-legend-word { color: var(--text, #cfe6ff); font-family: ui-monospace, monospace; }
    .topics-legend-count { color: var(--muted, #6a7c95); margin-left: auto; font-variant-numeric: tabular-nums; }
  `;
  document.head.appendChild(css);
  document.body.appendChild(el);
  return el;
}

function renderLegend(topPairs) {
  if (!_legendEl) return;
  const items = _legendEl.querySelector('.topics-legend-items');
  if (!items) return;
  items.innerHTML = '';
  // Удалить старую hint-строку, если была
  _legendEl.querySelectorAll('.topics-legend-hint').forEach(el => el.remove());
  if (!topPairs || !topPairs.length) {
    items.innerHTML = '<div style="color:var(--muted);font-size:10px;">(не нашёл повторяющихся слов — слишком короткий диалог)</div>';
  } else {
    for (const [word, count] of topPairs) {
      const row = document.createElement('div');
      row.className = 'topics-legend-item';
      row.dataset.word = word;
      row.title = 'Клик — оставить только эту тему (повтор снимет)';
      const swatch = document.createElement('span');
      swatch.className = 'topics-legend-swatch';
      const hue = hashHueLocal(word);
      swatch.style.background = hueToRgbaString(hue, 0.7, 0.55, 1);
      swatch.style.boxShadow = '0 0 6px ' + hueToRgbaString(hue, 0.7, 0.55, 0.7);
      const w = document.createElement('span');
      w.className = 'topics-legend-word';
      w.textContent = word;
      const c = document.createElement('span');
      c.className = 'topics-legend-count';
      c.textContent = '×' + count;
      row.appendChild(swatch); row.appendChild(w); row.appendChild(c);
      row.addEventListener('click', () => setTopicFilter(word));
      if (state.topicFilter === word) row.classList.add('active');
      items.appendChild(row);
    }
    const hint = document.createElement('div');
    hint.className = 'topics-legend-hint';
    hint.textContent = 'Клик на тему — отфильтровать граф. Esc — снять.';
    _legendEl.appendChild(hint);
  }
  _legendEl.classList.add('show');
}

// Локальная копия хэша — избегаем циклического импорта через topics.js,
// который уже экспортирует hashHue, но нам удобнее держать это рядом с UI.
function hashHueLocal(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function updateBtn() {
  if (!_topicBtn) return;
  _topicBtn.textContent = '🧬';
  _topicBtn.title = state.topicsMode ? t('tip.topics_on') : t('tip.topics_off');
  _topicBtn.classList.toggle('active-topics', !!state.topicsMode);
}

if (typeof window !== 'undefined') window.addEventListener('languagechange', () => { updateBtn(); });
