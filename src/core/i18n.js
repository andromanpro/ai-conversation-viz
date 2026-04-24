// i18n — простой механизм локализации для RU/EN.
//
// API:
//   initI18n()            — определяет начальный язык (localStorage →
//                           navigator.language → 'en'), применяет к DOM.
//   t(key, params)        — возвращает перевод; params — объект для
//                           интерполяции {name} → params.name.
//   setLanguage('ru'|'en')— меняет язык, сохраняет в localStorage,
//                           перерисовывает все [data-i18n*] элементы,
//                           dispatch'ит window 'languagechange' чтобы
//                           динамические модули могли обновить UI.
//   getLanguage()         — текущий язык.
//
// DOM-атрибуты (обрабатываются при applyTranslations):
//   data-i18n="key"          → element.textContent = t(key)
//   data-i18n-title="key"    → element.title = t(key)
//   data-i18n-aria="key"     → element.setAttribute('aria-label', t(key))
//   data-i18n-placeholder=k  → element.placeholder = t(k)
//   data-i18n-html="key"     → element.innerHTML = t(key) — ТОЛЬКО для
//                               безопасных строк (keyboard hint с <kbd>).
//
// Если ключ не найден — возвращается сам ключ (видно что забыли).

const LS_KEY = 'viz:lang';
const SUPPORTED = ['en', 'ru'];
const DEFAULT_LANG = 'en';

let _lang = DEFAULT_LANG;

// ==== Dictionary ====
// Ключи группированы через точку: controls.sample, detail.note_hint и т.п.
// Плейсхолдеры: {name}. Для HTML (data-i18n-html) разрешены теги.

const DICT = {
  en: {
    // Header / subtitle
    'header.title': 'AI Conversation Viz',
    'header.subtitle_force': 'v1.0 · force-directed',
    'header.subtitle_standalone': 'v1.0 · standalone bundle',
    'header.subtitle_3d': 'Three.js · glowing orbs',

    // Primary buttons
    'btn.sample': 'Load sample',
    'btn.demo_orchestration': '🤖 Multi-agent demo',
    'tip.demo_orchestration': 'Load multi-agent orchestration sample (security audit across 4 microservices)',
    'btn.file': 'Open JSONL…',
    'btn.reset': 'Reset view',
    'btn.share': '🔗 Share',
    'btn.3d': '🌐 3D →',
    'btn.back_2d': '← 2D mode',
    'btn.watch': 'Watch',
    'btn.stop': 'Stop',
    'btn.open_file': 'Open file…',
    'btn.cancel': 'Cancel',
    'btn.reset_defaults': 'Reset to defaults',

    // Button tooltips
    'tip.3d': 'Open 3D visualization',
    'tip.back_2d': 'Back to 2D visualization',
    'tip.share': 'Copy URL with current state',
    'tip.layout': 'Layout mode',
    'tip.audio': 'Ambient sound',
    'tip.record': 'Record canvas to WebM',
    'tip.snapshot': 'PNG / SVG snapshot',
    'tip.freeze_on': 'Freeze physics (F)',
    'tip.freeze_off': 'Unfreeze physics (F)',
    'tip.orphans_off': 'Connect orphans (O) — currently disconnected',
    'tip.orphans_on': 'Disconnect orphans (O) — currently linked',
    'tip.topics_off': 'Topics — cluster nodes by TF-IDF keywords',
    'tip.topics_on': 'Topics on — topic clustering active',
    'tip.diff_off': 'Compare with another session (Diff)',
    'tip.diff_on': 'Diff active — A:{a} / B:{b} / common:{both}. Click to turn off.',
    'tip.sessions_empty': 'Sessions — drop several JSONL files',
    'tip.sessions_loaded': 'Sessions: {n} loaded',
    'tip.bookmarks_empty': 'Bookmarks (B). Select a node and press S to mark.',
    'tip.bookmarks_count': 'Bookmarks: {n} saved. Click to open list.',
    'tip.render_webgl': 'WebGL renderer — click to switch to Canvas 2D',
    'tip.render_canvas': 'Canvas 2D renderer — click to switch to WebGL',
    'tip.settings': 'Settings (,)',
    'tip.lang': 'Language / язык',
    'aria.sample': 'Load sample session',
    'aria.file': 'Open JSONL file',
    'aria.reset': 'Reset camera to fit all nodes',
    'aria.share': 'Copy URL with current view state',
    'aria.audio': 'Toggle ambient sound',
    'aria.record': 'Start or stop WebM recording',
    'aria.snapshot': 'Save PNG or SVG snapshot',
    'aria.freeze': 'Freeze or unfreeze graph physics',
    'aria.orphans': 'Toggle orphan connectivity',
    'aria.topics': 'Toggle TF-IDF topic coloring',
    'aria.diff': 'Compare with another session',
    'aria.sessions': 'Open sessions list',
    'aria.bookmarks': 'Open bookmarks panel',
    'aria.render': 'Switch rendering backend',
    'aria.settings': 'Open settings',
    'aria.lang': 'Switch language',
    'aria.3d': 'Open 3D visualization',
    'aria.close': 'Close',
    'tip.role_user': 'Toggle user',
    'tip.role_assistant': 'Toggle assistant',
    'tip.role_tool_use': 'Toggle tool_use',
    'tip.star': 'Mark (S)',
    'tip.remove_session': 'Remove from list',
    'tip.topic_filter': 'Click to keep only this topic (click again to clear)',

    // Placeholders
    'placeholder.live_url': 'Live JSONL URL…',
    'placeholder.search': 'Search messages…',
    'placeholder.note': 'Your note on this node…',

    // Hints / help
    'hint.kbd': '<kbd>wheel</kbd> zoom · <kbd>drag</kbd> pan/node · <kbd>dbl-click</kbd> collapse · <kbd>Space</kbd> play · <kbd>←/→</kbd> step · <kbd>F</kbd> freeze · <kbd>O</kbd> orphans · <kbd>Ctrl+F</kbd> search · <kbd>S</kbd> star · <kbd>B</kbd> bookmarks · <kbd>Esc</kbd> close',
    'hint.kbd_3d': '<kbd>drag</kbd> orbit · <kbd>wheel</kbd> zoom · <kbd>right-drag</kbd> pan · <kbd>click</kbd> node · <kbd>Space</kbd> play · <kbd>←/→</kbd> step',
    'hint.drop_jsonl': 'drop jsonl to visualize',
    'hint.topic_legend_title': 'Top topics (TF × log df)',
    'hint.topic_legend_empty': '(no recurring words — dialogue too short)',
    'hint.topic_legend_footer': 'Click a topic to filter the graph. Esc — clear.',
    'hint.bookmarks_footer': 'Select a node and press S or ☆ Star in the detail panel. Click here to focus the node.',
    'hint.sessions_drop': 'Drop multiple JSONL files into the window — they will appear here. Or append ?sessions=<url> to the link for a remote index.',
    'hint.detail_note': 'Note (saved in localStorage):',

    // Diff panel
    'diff.title': '🔀 Compare sessions',
    'diff.hint': 'Drop a second JSONL / ChatGPT export / Anthropic messages',
    'diff.drop_here': 'Drop file here',
    'diff.explain': 'Matching messages become common, unique ones — A / B.',
    'diff.legend_a': 'only A',
    'diff.legend_b': 'only B',
    'diff.legend_both': 'common',

    // Sessions panel
    'sessions.title': 'Sessions',

    // Stats HUD
    'stats.tokens': 'tokens',
    'stats.duration': 'duration',
    'stats.top_tools': 'top tools',
    'stats.hubs': 'hubs',
    'stats.longest': 'longest',
    'stats.timeline': 'timeline',

    // Detail panel
    'detail.empty': '(empty)',
    'detail.star': '☆ Star',
    'detail.starred': '★ Starred',

    // Bookmarks panel
    'bookmarks.header': '⭐ Bookmarks',
    'bookmarks.empty': 'No bookmarks in this session.',

    // Settings modal — group titles
    'settings.group.physics': 'Physics',
    'settings.group.visual': 'Visual',
    'settings.group.playback': 'Playback',
    'settings.group.birth': 'Birth animation',
    'settings.header': '⚙ Settings',
    // Settings keys
    'settings.repulsion': 'Repulsion strength',
    'settings.spring': 'Spring strength',
    'settings.springLen': 'Spring rest length',
    'settings.centerPull': 'Center pull',
    'settings.velocityDecay': 'Velocity decay (friction)',
    'settings.maxVelocity': 'Max velocity',
    'settings.alphaDecay': 'Alpha decay rate',
    'settings.repulsionCutoff': 'Repulsion cutoff (px)',
    'settings.particles': 'Particles per edge (0 = off)',
    'settings.particleSpeed': 'Particle speed',
    'settings.particleJitter': 'Particle jitter',
    'settings.starfield': 'Starfield density',
    'settings.nodeGlowRadiusMul': 'Node glow radius',
    'settings.nodeGlowAlphaBase': 'Node glow alpha',
    'settings.stepMs': 'Play step interval (ms)',
    'settings.charMs': 'Typewriter speed (ms/char)',
    'settings.maxChars': 'Max chars per bubble',
    'settings.postGapMs': 'Min gap between bubbles',
    'settings.birthMs': 'Birth animation (ms)',

    // Live status
    'live.idle': 'idle',
    'live.connecting': 'connecting…',
    'live.stopped': 'stopped',
    'live.error': 'error: {msg}',
    'live.updated': '+{n} @ {time} (total {total})',
    'live.uptodate': 'up-to-date · {bytes}b',

    // Search / timeline / story
    'search.none': '0 matches',
    'search.count': '{i} / {n}',
    'timeline.play': 'Play',
    'timeline.pause': 'Pause',
    'story.no_text': '(no text)',

    // Layout chips
    'layout.force': 'Force',
    'layout.radial': 'Radial',
    'layout.swim': '🌊 Swim',

    // Snapshot menu
    'snapshot.png_1x': '⬇ PNG (1×)',
    'snapshot.png_2x': '⬇ PNG (2× — retina)',
    'snapshot.svg': '⬇ SVG (nodes + edges)',

    // Toasts / errors
    'toast.link_copied': 'Link copied to clipboard',
    'toast.webgl_on': 'WebGL mode enabled',
    'toast.canvas2d_on': 'Canvas 2D mode',
    'toast.webgl_fail': 'WebGL unavailable: {msg}',
    'toast.saved': 'Saved {filename}',
    'toast.saved_size': 'Saved {filename} ({size} MB)',
    'err.no_messages': 'No user/assistant messages found.',
    'err.parse': 'Parse error: {msg}',
    'err.read': 'Read error: {msg}',
    'err.load_first': 'Load the first session first.',
    'err.no_messages_b': 'No messages in the second file.',
    'err.record_not_supported': 'Recording not supported in this browser',
  },
  ru: {
    'header.title': 'AI Conversation Viz',
    'header.subtitle_force': 'v1.0 · force-directed',
    'header.subtitle_standalone': 'v1.0 · standalone-сборка',
    'header.subtitle_3d': 'Three.js · светящиеся орбы',

    'btn.sample': 'Загрузить пример',
    'btn.demo_orchestration': '🤖 Multi-agent',
    'tip.demo_orchestration': 'Загрузить пример оркестрации — security-audit 4 микросервисов через параллельные subagent-ы',
    'btn.file': 'Открыть JSONL…',
    'btn.reset': 'Сбросить вид',
    'btn.share': '🔗 Поделиться',
    'btn.3d': '🌐 3D →',
    'btn.back_2d': '← 2D режим',
    'btn.watch': 'Следить',
    'btn.stop': 'Стоп',
    'btn.open_file': 'Открыть файл…',
    'btn.cancel': 'Отмена',
    'btn.reset_defaults': 'Сбросить к умолчаниям',

    'tip.3d': 'Открыть 3D-визуализацию',
    'tip.back_2d': 'Вернуться к 2D',
    'tip.share': 'Скопировать URL с текущим состоянием',
    'tip.layout': 'Режим раскладки',
    'tip.audio': 'Фоновый звук',
    'tip.record': 'Запись canvas в WebM',
    'tip.snapshot': 'Снимок PNG / SVG',
    'tip.freeze_on': 'Заморозить физику (F)',
    'tip.freeze_off': 'Разморозить физику (F)',
    'tip.orphans_off': 'Соединить сиротки (O) — сейчас разрознены',
    'tip.orphans_on': 'Разъединить сиротки (O) — сейчас связаны',
    'tip.topics_off': 'Темы — кластеризация по TF-IDF ключевым словам',
    'tip.topics_on': 'Темы включены — кластеризация активна',
    'tip.diff_off': 'Сравнить с другой сессией (Diff)',
    'tip.diff_on': 'Diff активен — A:{a} / B:{b} / общих:{both}. Клик чтобы выключить.',
    'tip.sessions_empty': 'Sessions — перетащите несколько JSONL',
    'tip.sessions_loaded': 'Sessions: {n} загружено',
    'tip.bookmarks_empty': 'Закладки (B). Выдели ноду и нажми S.',
    'tip.bookmarks_count': 'Закладок: {n}. Клик — открыть список.',
    'tip.render_webgl': 'WebGL рендерер — клик для Canvas 2D',
    'tip.render_canvas': 'Canvas 2D рендерер — клик для WebGL',
    'tip.settings': 'Настройки (,)',
    'tip.lang': 'Language / язык',
    'aria.sample': 'Загрузить демо-сессию',
    'aria.file': 'Открыть JSONL-файл',
    'aria.reset': 'Сбросить камеру, уместить все ноды',
    'aria.share': 'Скопировать URL с текущим состоянием',
    'aria.audio': 'Переключить фоновый звук',
    'aria.record': 'Начать/остановить запись WebM',
    'aria.snapshot': 'Сохранить снимок PNG или SVG',
    'aria.freeze': 'Заморозить или разморозить физику',
    'aria.orphans': 'Переключить связь сиротских нод',
    'aria.topics': 'Переключить кластеризацию тем',
    'aria.diff': 'Сравнить с другой сессией',
    'aria.sessions': 'Открыть список сессий',
    'aria.bookmarks': 'Открыть панель закладок',
    'aria.render': 'Переключить рендерер',
    'aria.settings': 'Открыть настройки',
    'aria.lang': 'Переключить язык',
    'aria.3d': 'Открыть 3D-визуализацию',
    'aria.close': 'Закрыть',
    'tip.role_user': 'Скрыть/показать user',
    'tip.role_assistant': 'Скрыть/показать assistant',
    'tip.role_tool_use': 'Скрыть/показать tool_use',
    'tip.star': 'Отметить (S)',
    'tip.remove_session': 'Удалить из списка',
    'tip.topic_filter': 'Клик — оставить только эту тему (повтор снимет)',

    'placeholder.live_url': 'Живой URL JSONL…',
    'placeholder.search': 'Поиск по сообщениям…',
    'placeholder.note': 'Ваша заметка к этой ноде…',

    'hint.kbd': '<kbd>wheel</kbd> масштаб · <kbd>drag</kbd> пан/нода · <kbd>dbl-click</kbd> свернуть · <kbd>Space</kbd> play · <kbd>←/→</kbd> шаг · <kbd>F</kbd> заморозка · <kbd>O</kbd> сиротки · <kbd>Ctrl+F</kbd> поиск · <kbd>S</kbd> звезда · <kbd>B</kbd> закладки · <kbd>Esc</kbd> закрыть',
    'hint.kbd_3d': '<kbd>drag</kbd> орбита · <kbd>wheel</kbd> масштаб · <kbd>right-drag</kbd> пан · <kbd>click</kbd> нода · <kbd>Space</kbd> play · <kbd>←/→</kbd> шаг',
    'hint.drop_jsonl': 'перетащите jsonl для визуализации',
    'hint.topic_legend_title': 'Топ темы (TF × log df)',
    'hint.topic_legend_empty': '(не нашлось повторяющихся слов — слишком короткий диалог)',
    'hint.topic_legend_footer': 'Клик на тему — отфильтровать граф. Esc — снять.',
    'hint.bookmarks_footer': 'Выдели ноду и нажми S или ☆ Star в панели детали. Клик здесь — фокус на ноде.',
    'hint.sessions_drop': 'Перетащите несколько JSONL-файлов в окно — они появятся здесь. Или добавьте ?sessions=<url> к ссылке для удалённого индекса.',
    'hint.detail_note': 'Заметка (в localStorage):',

    'diff.title': '🔀 Сравнить сессии',
    'diff.hint': 'Перетащите второй JSONL / ChatGPT-export / Anthropic messages',
    'diff.drop_here': 'Перетащите файл сюда',
    'diff.explain': 'Одинаковые сообщения станут общими, уникальные — A / B.',
    'diff.legend_a': 'только A',
    'diff.legend_b': 'только B',
    'diff.legend_both': 'общие',

    'sessions.title': 'Сессии',

    'stats.tokens': 'токены',
    'stats.duration': 'длительность',
    'stats.top_tools': 'топ-инструменты',
    'stats.hubs': 'hubs',
    'stats.longest': 'самое длинное',
    'stats.timeline': 'шкала',

    'detail.empty': '(пусто)',
    'detail.star': '☆ Звезда',
    'detail.starred': '★ Отмечено',

    'bookmarks.header': '⭐ Закладки',
    'bookmarks.empty': 'В этой сессии нет закладок.',

    'settings.group.physics': 'Физика',
    'settings.group.visual': 'Визуал',
    'settings.group.playback': 'Воспроизведение',
    'settings.group.birth': 'Анимация рождения',
    'settings.header': '⚙ Настройки',
    'settings.repulsion': 'Сила отталкивания',
    'settings.spring': 'Жёсткость пружины',
    'settings.springLen': 'Длина покоя пружины',
    'settings.centerPull': 'Сила к центру',
    'settings.velocityDecay': 'Затухание скорости (трение)',
    'settings.maxVelocity': 'Макс. скорость',
    'settings.alphaDecay': 'Скорость затухания alpha',
    'settings.repulsionCutoff': 'Порог отталкивания (px)',
    'settings.particles': 'Частиц на ребро (0 — выкл.)',
    'settings.particleSpeed': 'Скорость частиц',
    'settings.particleJitter': 'Дрожание частиц',
    'settings.starfield': 'Плотность звёздного поля',
    'settings.nodeGlowRadiusMul': 'Радиус свечения ноды',
    'settings.nodeGlowAlphaBase': 'Прозрачность свечения',
    'settings.stepMs': 'Интервал шага play (мс)',
    'settings.charMs': 'Скорость печати (мс/символ)',
    'settings.maxChars': 'Макс. символов в пузыре',
    'settings.postGapMs': 'Мин. пауза между пузырями',
    'settings.birthMs': 'Анимация рождения (мс)',

    'live.idle': 'ожидание',
    'live.connecting': 'подключение…',
    'live.stopped': 'остановлено',
    'live.error': 'ошибка: {msg}',
    'live.updated': '+{n} @ {time} (всего {total})',
    'live.uptodate': 'актуально · {bytes}b',

    'search.none': '0 совпадений',
    'search.count': '{i} / {n}',
    'timeline.play': 'Воспроизведение',
    'timeline.pause': 'Пауза',
    'story.no_text': '(нет текста)',

    'layout.force': 'Силовая',
    'layout.radial': 'Радиальная',
    'layout.swim': '🌊 Дорожки',

    'snapshot.png_1x': '⬇ PNG (1×)',
    'snapshot.png_2x': '⬇ PNG (2× — retina)',
    'snapshot.svg': '⬇ SVG (ноды + рёбра)',

    'toast.link_copied': 'Ссылка скопирована',
    'toast.webgl_on': 'WebGL режим включён',
    'toast.canvas2d_on': 'Canvas 2D режим',
    'toast.webgl_fail': 'WebGL недоступен: {msg}',
    'toast.saved': 'Сохранено {filename}',
    'toast.saved_size': 'Сохранено {filename} ({size} MB)',
    'err.no_messages': 'Не найдено сообщений user/assistant.',
    'err.parse': 'Ошибка парсинга: {msg}',
    'err.read': 'Ошибка чтения: {msg}',
    'err.load_first': 'Сначала загрузите первую сессию.',
    'err.no_messages_b': 'Во втором файле нет сообщений.',
    'err.record_not_supported': 'Запись не поддерживается в этом браузере',
  },
};

export function initI18n() {
  let lang = null;
  try { lang = localStorage.getItem(LS_KEY); } catch {}
  if (!SUPPORTED.includes(lang)) {
    const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
    lang = nav.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  }
  _lang = lang;
  applyTranslations();
  return _lang;
}

export function getLanguage() { return _lang; }

export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return false;
  if (_lang === lang) return false;
  _lang = lang;
  try { localStorage.setItem(LS_KEY, lang); } catch {}
  applyTranslations();
  try {
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
  } catch {}
  return true;
}

/** Получить перевод по ключу. Поддерживает интерполяцию {foo}. */
export function t(key, params) {
  const dict = DICT[_lang] || DICT[DEFAULT_LANG];
  let str = dict[key];
  if (str == null) {
    // Fallback на английский, иначе — сам ключ (видно что забыли)
    str = (DICT[DEFAULT_LANG] && DICT[DEFAULT_LANG][key]) || key;
  }
  if (params) {
    str = str.replace(/\{(\w+)\}/g, (_, name) => (params[name] != null ? String(params[name]) : `{${name}}`));
  }
  return str;
}

/** Найти все элементы с data-i18n* и применить переводы. */
export function applyTranslations(root) {
  const scope = root || (typeof document !== 'undefined' ? document : null);
  if (!scope || !scope.querySelectorAll) return;
  scope.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  scope.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  scope.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
  scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  scope.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
}
