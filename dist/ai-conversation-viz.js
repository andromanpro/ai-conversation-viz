"use strict";
(function (window) {
  const __M = Object.create(null);

  // --- src/core/config.js ---
  __M["src/core/config.js"] = (function () {
const CFG = {
  maxMessages: 5000,
  excerptChars: 400,
  tooltipMaxChars: 80,
  // Tuned для лучшего разнесения (раньше графы 50+ нод схлопывались в кучу).
  // Увеличил repulsion + springLen, ослабил centerPull. Маленькие графы
  // (~30 нод) тоже становятся просторнее, но это к лучшему — больше воздуха.
  repulsion: 14000,
  spring: 0.04,
  springLen: 140,
  damping: 0.85,
  centerPull: 0.0012,
  minR: 3,
  maxR: 20,
  pulseFreq: 2.0,
  clickTolerancePx: 4,
  hitPad: 4,
  toolNodeScale: 0.6,
  fitPadding: 0.7,    // больше отступ от краёв при fitToView (было 0.85)
  prewarmIterations: 260,  // больше итераций prewarm чтобы успевало разойтись
  zoomStep: 1.1,
  zoomMin: 0.1,
  zoomMax: 8,
  birthDurationMs: 600,
  birthSpreadMin: 0.7,
  birthSpreadMax: 1.0,
  birthAlphaStart: 0.25,
  birthRadiusStart: 0.5,
  // Auto-degrade пороги — при большом графе отключаем дорогие эффекты
  perfDegradeThreshold: 400,   // выше — режим "performance"
  perfHeavyThreshold: 1500,    // выше — совсем минимализм
  perfMinimalParticles: 0,     // 0 = отключить частицы
  perfMinimalStarCount: 80,
  perfMinimalPrewarm: 40,
  perfMinimalTypewriter: false,
  perfMinimalPhysicsSkip: 2,   // в minimal — физика раз в 2 кадра
  perfMinimalAlphaDecay: 0.06, // быстрее остывает, меньше work до settle
  perfDegradedPhysicsSkip: 1,  // degraded — каждый кадр (как обычно)

  // v3 wow
  edgeCurveStrength: 0.18,
  particleSpeed: 0.5,
  particlesPerEdge: 1,
  particleSize: 1,
  particleTrailLen: 4,
  particleTrailGap: 0.02,
  particleJitterPx: 1.8,
  particleHaloMul: 2.2,
  particleMidMul: 1.4,
  particleFlashChance: 0.04,
  particleFlashMul: 1.4,
  edgeFlashChance: 0.0012,
  edgeFlashDurationMs: 100,
  edgeFlashLineWidth: 0.9,
  heartbeatAmplitude: 0.005,
  heartbeatFreq: 0.35,
  starfieldCount: 400,
  starDepthMin: 0.1,
  starDepthMax: 0.5,
  starWorldRange: 3000,
  storyFadeMs: 260,
  storyMaxChars: 360,
  storyDwellMs: 1600,
  storyMaxHistory: 40,
  storyCharMs: 22,
  storyMaxTypeMs: 1300,
  toolUseTsStepMs: 300,
  toolIconMinR: 6,
  toolIconMinFontPx: 9,
  toolIconFontMul: 1.25,
  nodeGlowRadiusMul: 1.9,
  nodeGlowAlphaBase: 0.08,
  nodeGlowAlphaPulse: 0.04,
  nodeGlowInnerStop: 0.4,
  searchDimAlpha: 0.22,
  searchPulseFreq: 3.5,
  livePollMs: 800,
  liveReconnectMs: 2500,
  liveMaxNodes: 5000,
  minimapW: 170,
  minimapH: 110,
  minimapEveryNFrames: 3,
  minimapNodeR: 1.3,
  minimapPadding: 8,
  radialRingGap: 130,
  layoutTransitionMs: 900,
  barnesHutThreshold: 300,
  barnesHutTheta: 0.9,
  bhLeafMinSize: 1.0,
  // Physics v5 — D3-style cooling + clamps
  alphaDecay: 0.0228,     // ≈ (1 − 0.001^(1/300)) — settles за ~300 iters
  alphaMin: 0.001,
  velocityDecay: 0.4,     // "friction": vx *= (1 − velocityDecay)
  reheatAlpha: 0.3,
  maxVelocity: 40,
  repulsionCutoff: 3500,       // выше — дальние кластеры всё ещё отталкиваются
  wallStiffness: 0.02,         // мягче — стена не формирует прямоугольник
  wallPaddingMul: 8,           // дальше — почти не виден bbox
  centerPullScaleN: 200,       // centerPull растёт как sqrt(N/200)
  leafSpringBoost: 2.5,        // spring для degree-1 edges в 2.5× сильнее (root/leaf не отрываются)
  playSpeedOptions: [0.5, 1, 2, 5],
  cameraRotateSpeed: 0.5,      // 3D auto-rotate (degrees per ~10ms на default)
  storyPostGapMs: 800,
  focusDimAlpha: 0.3,
  cameraFollowLerp: 0.05,
  cameraTargetLerp: 0.15,
  zoomOnClickFactor: 1.8,
  useGradientFillBelow: 250,
};

const COLORS = {
  bg: '#0a0e1a',
  user: '#7BAAF0',
  assistant: '#50D4B5',
  tool: '#ECA040',
  thinking: '#B58CFF',          // фиолетовый — «облако мысли»
  edge: 'rgba(0, 212, 255, 0.35)',
  toolEdge: 'rgba(236, 160, 64, 0.45)',
  thinkingEdge: 'rgba(181, 140, 255, 0.45)',
  accent: '#ECA040',
  text: '#cfe6ff',
  muted: '#6a7c95',
  particle: 'rgba(140, 230, 255, ',
  star: 'rgba(200, 220, 255, ',
};

    return { CFG, COLORS };
  })();

  // --- src/core/sample.js ---
  __M["src/core/sample.js"] = (function () {
// Развёрнутое демо — ~30 сообщений с разветвлениями, tool_use + tool_result,
// thinking-блоками, ошибкой от тула, изображением. Имитирует реальный debug-диалог.

const T0 = Date.parse('2026-04-24T10:00:00.000Z');
const step = (sec) => new Date(T0 + sec * 1000).toISOString();

function entry(obj) { return JSON.stringify(obj); }

const SAMPLE_JSONL = [
  // --- Служебные (должны быть отфильтрованы) ---
  entry({ type: 'queue-operation', operation: 'enqueue', timestamp: step(0) }),
  entry({ type: 'system', subtype: 'stop_hook_summary' }),
  entry({ type: 'custom-title', customTitle: 'Debug: force-directed visualizer' }),

  // --- Основная цепочка ---
  entry({ type: 'user', uuid: 'u1', parentUuid: null, timestamp: step(0),
    message: { role: 'user', content: 'Привет! Нужно разобраться почему force-directed layout разваливается на больших графах. Есть ~5000 нод, всё лагает и ноды убегают к краям.' } }),

  entry({ type: 'assistant', uuid: 'a1', parentUuid: 'u1', timestamp: step(5),
    message: { role: 'assistant', content: [
      { type: 'thinking', thinking: 'Типичный симптом O(n²) repulsion. Для 5000 нод это 25 млн пар каждого кадра — FPS точно упадёт до 1-2. Ноды улетают потому что центральная сила слабее чем кумулятивный repulsion. Барнс-Хут решит первое, нужно ещё поднять центральную силу.' },
      { type: 'text', text: 'Давай посмотрим на твоё stepPhysics и оценим вычислительную сложность.' },
      { type: 'tool_use', id: 'tu_a1_1', name: 'Read', input: { file_path: 'src/physics.js' } },
    ] } }),

  entry({ type: 'user', uuid: 'u2', parentUuid: 'a1', timestamp: step(7),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a1_1', content: 'function stepPhysics(nodes, edges) {\n  for (let i = 0; i < nodes.length; i++) {\n    for (let j = i+1; j < nodes.length; j++) {\n      // coulomb repulsion\n      const f = REPULSION / d2;\n      a.vx += (dx/d)*f; b.vx -= (dx/d)*f;\n    }\n  }\n  // ... springs ...\n}' },
    ] } }),

  entry({ type: 'assistant', uuid: 'a2', parentUuid: 'u2', timestamp: step(12),
    message: { role: 'assistant', content: [
      { type: 'text', text: 'Да, классический O(n²). Для 5000 нод это ~12 млн пар в каждом кадре. Нужен Barnes-Hut — строим квадро-дерево, далёкие кластеры аппроксимируем центром масс. Сложность падает до O(n log n).' },
    ] } }),

  entry({ type: 'user', uuid: 'u3', parentUuid: 'a2', timestamp: step(25),
    message: { role: 'user', content: 'Окей. А чтобы далеко не улетали?' } }),

  entry({ type: 'assistant', uuid: 'a3', parentUuid: 'u3', timestamp: step(31),
    message: { role: 'assistant', content: [
      { type: 'text', text: 'Центральная сила к центру viewport. Плюс для больших графов она должна расти с количеством нод пропорционально.' },
      { type: 'tool_use', id: 'tu_a3_1', name: 'Grep', input: { pattern: 'centerPull', path: 'src/' } },
    ] } }),

  entry({ type: 'user', uuid: 'u4', parentUuid: 'a3', timestamp: step(32),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a3_1', content: 'src/core/config.js: centerPull: 0.002\nsrc/core/layout.js:  n.vx += (cx - n.x) * CFG.centerPull;' },
    ] } }),

  entry({ type: 'assistant', uuid: 'a4', parentUuid: 'u4', timestamp: step(38),
    message: { role: 'assistant', content: [
      { type: 'text', text: '0.002 — норм для малых графов, для 5000 поднять до 0.006-0.008.' },
      { type: 'tool_use', id: 'tu_a4_1', name: 'Edit', input: { file_path: 'src/core/config.js', old: 'centerPull: 0.002', new: 'centerPull: 0.006' } },
    ] } }),

  entry({ type: 'user', uuid: 'u5', parentUuid: 'a4', timestamp: step(40),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a4_1', content: 'File updated successfully.' },
    ] } }),

  // --- Ветвление: параллельный вопрос от пользователя ---
  entry({ type: 'user', uuid: 'u6', parentUuid: 'a2', timestamp: step(50),
    message: { role: 'user', content: 'Ещё вопрос — как быть с 237 MB файлом сессии? FileReader зависает.' } }),

  entry({ type: 'assistant', uuid: 'a5', parentUuid: 'u6', timestamp: step(56),
    message: { role: 'assistant', content: [
      { type: 'thinking', thinking: 'Streaming JSONL через ReadableStream getReader + TextDecoder. Или простой — лимит maxMessages и stop на 5000.' },
      { type: 'text', text: 'Вариантов два: streaming через getReader, или просто лимит maxMessages=5000 — парсер останавливается и не читает больше.' },
    ] } }),

  entry({ type: 'user', uuid: 'u7', parentUuid: 'a5', timestamp: step(72),
    message: { role: 'user', content: 'Лимит проще. Но хочу увидеть конец сессии, не только начало.' } }),

  entry({ type: 'assistant', uuid: 'a6', parentUuid: 'u7', timestamp: step(80),
    message: { role: 'assistant', content: [
      { type: 'text', text: 'Тогда поменяем стратегию: читаем файл назад chunk-ами. Вот посмотрим как устроено чтение сейчас:' },
      { type: 'tool_use', id: 'tu_a6_1', name: 'Bash', input: { command: 'wc -l large-session.jsonl' } },
    ] } }),

  entry({ type: 'user', uuid: 'u8', parentUuid: 'a6', timestamp: step(82),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a6_1', content: '148203 large-session.jsonl', is_error: false },
    ] } }),

  entry({ type: 'assistant', uuid: 'a7', parentUuid: 'u8', timestamp: step(88),
    message: { role: 'assistant', content: [
      { type: 'text', text: '148k строк. Возьмём последние 5000. Но осторожно — tail может разорвать JSON если chunk cut посередине строки.' },
      { type: 'tool_use', id: 'tu_a7_1', name: 'Write', input: { file_path: 'src/core/stream-reader.js' } },
    ] } }),

  entry({ type: 'user', uuid: 'u9', parentUuid: 'a7', timestamp: step(90),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a7_1', content: 'File exists; use edit or force: true to overwrite.', is_error: true },
    ] } }),

  entry({ type: 'assistant', uuid: 'a8', parentUuid: 'u9', timestamp: step(95),
    message: { role: 'assistant', content: [
      { type: 'thinking', thinking: 'Сначала прочитаю существующий файл, а не перезапишу слепо.' },
      { type: 'text', text: 'Точно, сначала Read:' },
      { type: 'tool_use', id: 'tu_a8_1', name: 'Read', input: { file_path: 'src/core/stream-reader.js' } },
    ] } }),

  entry({ type: 'user', uuid: 'u10', parentUuid: 'a8', timestamp: step(97),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a8_1', content: '// placeholder\nexport function streamReader() { /* TODO */ }' },
    ] } }),

  entry({ type: 'assistant', uuid: 'a9', parentUuid: 'u10', timestamp: step(104),
    message: { role: 'assistant', content: [
      { type: 'text', text: 'Пустой TODO, можно дописывать. Реализую tail-чтение: slice файла с конца, ищем \\n чтобы не резать JSON, парсим.' },
      { type: 'tool_use', id: 'tu_a9_1', name: 'Edit', input: { file_path: 'src/core/stream-reader.js' } },
      { type: 'tool_use', id: 'tu_a9_2', name: 'TodoWrite', input: { todos: [{ content: 'Test tail-read' }, { content: 'Add benchmark' }] } },
    ] } }),

  entry({ type: 'user', uuid: 'u11', parentUuid: 'a9', timestamp: step(106),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a9_1', content: 'File updated.' },
      { type: 'tool_result', tool_use_id: 'tu_a9_2', content: 'Todos created: 2' },
    ] } }),

  // --- Третье ветвление: вопрос про визуал ---
  entry({ type: 'user', uuid: 'u12', parentUuid: 'a4', timestamp: step(130),
    message: { role: 'user', content: 'А про визуальный стиль — можешь помочь с киберпанк эстетикой? Хочу чтобы рёбра светились.' } }),

  entry({ type: 'assistant', uuid: 'a10', parentUuid: 'u12', timestamp: step(137),
    message: { role: 'assistant', content: [
      { type: 'text', text: 'Бегущие частицы по Bezier-рёбрам + additive blending + случайные вспышки = ощущение живых электрических разрядов. Сейчас найду пример из shared-backgrounds:' },
      { type: 'tool_use', id: 'tu_a10_1', name: 'Glob', input: { pattern: '**/particles*.js' } },
    ] } }),

  entry({ type: 'user', uuid: 'u13', parentUuid: 'a10', timestamp: step(138),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a10_1', content: 'visual/shared-backgrounds/particles-flow.js\nvisual/lava-orb/src/orb/fire-particles.js\nvisual/ai-conversation-viz/src/view/particles.js' },
    ] } }),

  entry({ type: 'assistant', uuid: 'a11', parentUuid: 'u13', timestamp: step(145),
    message: { role: 'assistant', content: [
      { type: 'text', text: 'Посмотрим particles-flow.js — там чистая реализация trail+glow:' },
      { type: 'tool_use', id: 'tu_a11_1', name: 'Read', input: { file_path: 'visual/shared-backgrounds/particles-flow.js', limit: 80 } },
    ] } }),

  entry({ type: 'user', uuid: 'u14', parentUuid: 'a11', timestamp: step(147),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a11_1', content: 'for (const p of particles) {\n  // trail 6 points with decreasing alpha\n  // additive blending via globalCompositeOperation = "lighter"\n  // jitter perpendicular to tangent\n}' },
    ] } }),

  entry({ type: 'assistant', uuid: 'a12', parentUuid: 'u14', timestamp: step(152),
    message: { role: 'assistant', content: [
      { type: 'text', text: 'Адаптируем под наш force-graph. Плюс добавим halo + случайные полноцепочные вспышки (раз в ~10 сек на ребро). Вот итоговый draw:' },
    ] } }),

  entry({ type: 'user', uuid: 'u15', parentUuid: 'a12', timestamp: step(170),
    message: { role: 'user', content: 'Супер. Закоммить всё и запушь в Gitea + GitHub.' } }),

  entry({ type: 'assistant', uuid: 'a13', parentUuid: 'u15', timestamp: step(178),
    message: { role: 'assistant', content: [
      { type: 'text', text: 'Коммичу и пушу в оба remote.' },
      { type: 'tool_use', id: 'tu_a13_1', name: 'Bash', input: { command: 'git add -A && git commit -m "Barnes-Hut + electric sparks" && git push origin main && git push github main' } },
    ] } }),

  entry({ type: 'user', uuid: 'u16', parentUuid: 'a13', timestamp: step(181),
    message: { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'tu_a13_1', content: '[main abc1234] Barnes-Hut + electric sparks\n 6 files changed, 412 insertions(+), 28 deletions(-)\nTo git@github.com:user/ai-conversation-viz.git\n   360158d..abc1234  main -> main' },
    ] } }),

  // Финальное служебное
  entry({ type: 'queue-operation', operation: 'dequeue', timestamp: step(200) }),
].join('\n');

    return { SAMPLE_JSONL };
  })();

  // --- src/core/samples-embedded.js ---
  __M["src/core/samples-embedded.js"] = (function () {
// Auto-generated from samples/*.jsonl by build.cjs — do not edit.
// Embeds sample JSONL content so the app works offline (file://) and in
// the npm package without runtime fetch.

const DEEP_ORCHESTRATION_JSONL = "{\"type\":\"user\",\"uuid\":\"u0\",\"parentUuid\":null,\"timestamp\":\"2026-04-25T09:00:00.000Z\",\"message\":{\"role\":\"user\",\"content\":\"Нужно отрефакторить наш монорепо: разделить services/ на 4 отдельных npm-пакета (auth, billing, notifications, api-gateway), сохранив shared utilities. План + миграция + тесты.\"}}\n{\"type\":\"assistant\",\"uuid\":\"a0\",\"parentUuid\":\"u0\",\"timestamp\":\"2026-04-25T09:00:08.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"Многоуровневая задача. Параллелю 3 направления через Task: Architect (план зависимостей и API), Migrator (механика разделения), Tester (intergration + regression). Каждый из них сам спавнит свои sub-subagent'ы под конкретные подзадачи. Дерево: Lead → 3 subagent → 8 sub-sub → tool chains.\"},{\"type\":\"text\",\"text\":\"Распределяю работу через 3 параллельных subagent'а. Каждый сам спавнит sub-sub-agent'ы по своим направлениям.\"},{\"type\":\"tool_use\",\"id\":\"tu_arch\",\"name\":\"Task\",\"input\":{\"description\":\"Architect\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Spawn dependency-graph-analyzer и public-api-extractor sub-subagent'ы. Собери карту зависимостей и извлеки public API.\"}},{\"type\":\"tool_use\",\"id\":\"tu_mig\",\"name\":\"Task\",\"input\":{\"description\":\"Migrator\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Спавни 4 sub-subagent'а по сервисам (auth/billing/notif/gw). Каждый делит код, переносит в свой package.\"}},{\"type\":\"tool_use\",\"id\":\"tu_test\",\"name\":\"Task\",\"input\":{\"description\":\"Tester\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Спавни integration-test-builder + regression-checker. Покрой границы пакетов тестами.\"}}]}}\n\n{\"type\":\"user\",\"uuid\":\"arch_u\",\"parentUuid\":\"a0#tu0\",\"timestamp\":\"2026-04-25T09:00:09.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[ARCHITECT subagent] Spawn dependency-graph-analyzer и public-api-extractor.\"}}\n{\"type\":\"assistant\",\"uuid\":\"arch_a1\",\"parentUuid\":\"arch_u\",\"timestamp\":\"2026-04-25T09:00:14.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Сразу спавню оба sub-subagent'а параллельно.\"},{\"type\":\"tool_use\",\"id\":\"tu_arch_dep\",\"name\":\"Task\",\"input\":{\"description\":\"dep-graph\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Построй граф зависимостей между сервисами в services/ через AST-анализ импортов.\"}},{\"type\":\"tool_use\",\"id\":\"tu_arch_api\",\"name\":\"Task\",\"input\":{\"description\":\"api-extractor\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Извлеки публичные API каждого сервиса (exported funcs/types).\"}}]}}\n\n{\"type\":\"user\",\"uuid\":\"dep_u\",\"parentUuid\":\"arch_a1#tu0\",\"timestamp\":\"2026-04-25T09:00:15.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[DEP-GRAPH sub-sub] Построй граф зависимостей.\"}}\n{\"type\":\"assistant\",\"uuid\":\"dep_a1\",\"parentUuid\":\"dep_u\",\"timestamp\":\"2026-04-25T09:00:20.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_dep_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/**/*.ts\"}}]}}\n{\"type\":\"user\",\"uuid\":\"dep_u2\",\"parentUuid\":\"dep_a1\",\"timestamp\":\"2026-04-25T09:00:21.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_dep_glob\",\"content\":\"127 files\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"dep_a2\",\"parentUuid\":\"dep_u2\",\"timestamp\":\"2026-04-25T09:00:27.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_dep_grep\",\"name\":\"Grep\",\"input\":{\"pattern\":\"^import.*from '\\\\.\\\\./\",\"path\":\"services\",\"output_mode\":\"count\"}}]}}\n{\"type\":\"user\",\"uuid\":\"dep_u3\",\"parentUuid\":\"dep_a2\",\"timestamp\":\"2026-04-25T09:00:28.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_dep_grep\",\"content\":\"auth → shared (24 imports)\\nbilling → shared (18), auth (6)\\nnotifications → shared (12)\\napi-gateway → auth (15), billing (8)\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"dep_a3\",\"parentUuid\":\"dep_u3\",\"timestamp\":\"2026-04-25T09:00:34.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[DEP-GRAPH report]** Цикла нет. Зависимости:\\n- shared: 0 deps (terminal)\\n- auth: shared\\n- billing: auth + shared (cross-package)\\n- notifications: shared\\n- api-gateway: auth + billing\\n\\nПорядок миграции: shared → auth/notif → billing → gateway.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"api_u\",\"parentUuid\":\"arch_a1#tu1\",\"timestamp\":\"2026-04-25T09:00:15.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[API-EXTRACTOR sub-sub] Извлеки публичные API.\"}}\n{\"type\":\"assistant\",\"uuid\":\"api_a1\",\"parentUuid\":\"api_u\",\"timestamp\":\"2026-04-25T09:00:20.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_api_grep\",\"name\":\"Grep\",\"input\":{\"pattern\":\"^export (function|class|interface|type|const)\",\"path\":\"services\",\"output_mode\":\"count\"}}]}}\n{\"type\":\"user\",\"uuid\":\"api_u2\",\"parentUuid\":\"api_a1\",\"timestamp\":\"2026-04-25T09:00:21.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_api_grep\",\"content\":\"auth: 12 exports\\nbilling: 8 exports\\nnotifications: 5 exports\\napi-gateway: 3 exports\\nshared: 24 exports\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"api_a2\",\"parentUuid\":\"api_u2\",\"timestamp\":\"2026-04-25T09:00:28.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_api_read\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/auth/src/index.ts\"}}]}}\n{\"type\":\"user\",\"uuid\":\"api_u3\",\"parentUuid\":\"api_a2\",\"timestamp\":\"2026-04-25T09:00:29.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_api_read\",\"content\":\"export { login, register, verifyToken, hashPassword } from './core'\\nexport type { User, Session, AuthError } from './types'\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"api_a3\",\"parentUuid\":\"api_u3\",\"timestamp\":\"2026-04-25T09:00:36.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[API-EXTRACTOR report]** 52 публичных export'а суммарно. Auth = main entry (login/register/verifyToken). Billing зависит от auth.User type — нужна реэкспорт-strategy. Все остальные пакеты только consume shared.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"arch_u2\",\"parentUuid\":\"arch_a1\",\"timestamp\":\"2026-04-25T09:00:38.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_arch_dep\",\"content\":\"DEP-GRAPH: linear chain shared → auth → billing → gateway\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_arch_api\",\"content\":\"API-EXTRACTOR: 52 exports, billing reuses auth.User\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"arch_a2\",\"parentUuid\":\"arch_u2\",\"timestamp\":\"2026-04-25T09:00:44.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[ARCHITECT final]** План разделения готов:\\n1. shared → @co/shared (foundation)\\n2. auth → @co/auth (depends shared)\\n3. notifications → @co/notifications (depends shared)\\n4. billing → @co/billing (depends auth + shared) — reexport User\\n5. api-gateway → @co/api-gateway (depends auth + billing)\\nПорядок миграции — снизу вверх по графу.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"mig_u\",\"parentUuid\":\"a0#tu1\",\"timestamp\":\"2026-04-25T09:00:09.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[MIGRATOR subagent] Спавни 4 sub-subagent'а по сервисам.\"}}\n{\"type\":\"assistant\",\"uuid\":\"mig_a1\",\"parentUuid\":\"mig_u\",\"timestamp\":\"2026-04-25T09:00:14.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"4 параллельных миграции, по одному sub-sub на сервис.\"},{\"type\":\"tool_use\",\"id\":\"tu_mig_a\",\"name\":\"Task\",\"input\":{\"description\":\"migrate-auth\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Создай packages/auth/ структуру, перенеси services/auth, обнови импорты.\"}},{\"type\":\"tool_use\",\"id\":\"tu_mig_b\",\"name\":\"Task\",\"input\":{\"description\":\"migrate-billing\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Создай packages/billing/, перенеси, обнови импорты на @co/auth.\"}},{\"type\":\"tool_use\",\"id\":\"tu_mig_n\",\"name\":\"Task\",\"input\":{\"description\":\"migrate-notif\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Перенеси notifications в packages/notifications/.\"}},{\"type\":\"tool_use\",\"id\":\"tu_mig_g\",\"name\":\"Task\",\"input\":{\"description\":\"migrate-gw\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Перенеси api-gateway в packages/api-gateway/.\"}}]}}\n\n{\"type\":\"user\",\"uuid\":\"miga_u\",\"parentUuid\":\"mig_a1#tu0\",\"timestamp\":\"2026-04-25T09:00:15.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[MIGRATE-AUTH sub-sub] Создай packages/auth/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"miga_a1\",\"parentUuid\":\"miga_u\",\"timestamp\":\"2026-04-25T09:00:21.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_miga_bash\",\"name\":\"Bash\",\"input\":{\"command\":\"mkdir -p packages/auth/src && mv services/auth/* packages/auth/\",\"description\":\"Move files\"}}]}}\n{\"type\":\"user\",\"uuid\":\"miga_u2\",\"parentUuid\":\"miga_a1\",\"timestamp\":\"2026-04-25T09:00:22.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_miga_bash\",\"content\":\"moved 12 files\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"miga_a2\",\"parentUuid\":\"miga_u2\",\"timestamp\":\"2026-04-25T09:00:28.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_miga_pkg\",\"name\":\"Write\",\"input\":{\"file_path\":\"packages/auth/package.json\",\"content\":\"{\\\"name\\\":\\\"@co/auth\\\",\\\"version\\\":\\\"1.0.0\\\",\\\"dependencies\\\":{\\\"@co/shared\\\":\\\"workspace:*\\\"}}\"}}]}}\n{\"type\":\"user\",\"uuid\":\"miga_u3\",\"parentUuid\":\"miga_a2\",\"timestamp\":\"2026-04-25T09:00:29.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_miga_pkg\",\"content\":\"File created\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"miga_a3\",\"parentUuid\":\"miga_u3\",\"timestamp\":\"2026-04-25T09:00:35.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[MIGRATE-AUTH done]** packages/auth/ готов. 12 файлов перенесено, package.json + tsconfig.json созданы.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"migb_u\",\"parentUuid\":\"mig_a1#tu1\",\"timestamp\":\"2026-04-25T09:00:15.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[MIGRATE-BILLING sub-sub] packages/billing/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"migb_a1\",\"parentUuid\":\"migb_u\",\"timestamp\":\"2026-04-25T09:00:21.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_migb_bash\",\"name\":\"Bash\",\"input\":{\"command\":\"mkdir -p packages/billing/src && mv services/billing/* packages/billing/\",\"description\":\"Move\"}}]}}\n{\"type\":\"user\",\"uuid\":\"migb_u2\",\"parentUuid\":\"migb_a1\",\"timestamp\":\"2026-04-25T09:00:22.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_migb_bash\",\"content\":\"moved 8 files\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"migb_a2\",\"parentUuid\":\"migb_u2\",\"timestamp\":\"2026-04-25T09:00:29.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_migb_sed\",\"name\":\"Bash\",\"input\":{\"command\":\"sed -i 's|from .\\\\./auth|from @co/auth|g' packages/billing/src/*.ts\",\"description\":\"Update imports\"}}]}}\n{\"type\":\"user\",\"uuid\":\"migb_u3\",\"parentUuid\":\"migb_a2\",\"timestamp\":\"2026-04-25T09:00:30.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_migb_sed\",\"content\":\"6 imports updated\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"migb_a3\",\"parentUuid\":\"migb_u3\",\"timestamp\":\"2026-04-25T09:00:36.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[MIGRATE-BILLING done]** packages/billing/ готов, 6 импортов обновлены на @co/auth.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"mign_u\",\"parentUuid\":\"mig_a1#tu2\",\"timestamp\":\"2026-04-25T09:00:16.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[MIGRATE-NOTIF sub-sub] packages/notifications/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"mign_a1\",\"parentUuid\":\"mign_u\",\"timestamp\":\"2026-04-25T09:00:22.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_mign_bash\",\"name\":\"Bash\",\"input\":{\"command\":\"mkdir -p packages/notifications/src && mv services/notifications/* packages/notifications/\",\"description\":\"Move\"}}]}}\n{\"type\":\"user\",\"uuid\":\"mign_u2\",\"parentUuid\":\"mign_a1\",\"timestamp\":\"2026-04-25T09:00:23.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_mign_bash\",\"content\":\"moved 5 Go files\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"mign_a2\",\"parentUuid\":\"mign_u2\",\"timestamp\":\"2026-04-25T09:00:29.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[MIGRATE-NOTIF done]** Go-сервис, отдельный go.mod в packages/notifications/.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"migg_u\",\"parentUuid\":\"mig_a1#tu3\",\"timestamp\":\"2026-04-25T09:00:16.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[MIGRATE-GATEWAY sub-sub] packages/api-gateway/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"migg_a1\",\"parentUuid\":\"migg_u\",\"timestamp\":\"2026-04-25T09:00:22.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_migg_bash\",\"name\":\"Bash\",\"input\":{\"command\":\"mkdir -p packages/api-gateway/src && mv services/api-gateway/* packages/api-gateway/\",\"description\":\"Move\"}}]}}\n{\"type\":\"user\",\"uuid\":\"migg_u2\",\"parentUuid\":\"migg_a1\",\"timestamp\":\"2026-04-25T09:00:23.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_migg_bash\",\"content\":\"moved 7 files\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"migg_a2\",\"parentUuid\":\"migg_u2\",\"timestamp\":\"2026-04-25T09:00:30.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_migg_grep\",\"name\":\"Grep\",\"input\":{\"pattern\":\"from '\\\\.\\\\./auth\\\\|from '\\\\.\\\\./billing\",\"path\":\"packages/api-gateway/src\"}}]}}\n{\"type\":\"user\",\"uuid\":\"migg_u3\",\"parentUuid\":\"migg_a2\",\"timestamp\":\"2026-04-25T09:00:31.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_migg_grep\",\"content\":\"15 imports from auth, 8 from billing\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"migg_a3\",\"parentUuid\":\"migg_u3\",\"timestamp\":\"2026-04-25T09:00:38.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[MIGRATE-GATEWAY done]** 23 импорта обновлены на @co/auth + @co/billing.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"mig_u2\",\"parentUuid\":\"mig_a1\",\"timestamp\":\"2026-04-25T09:00:40.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_mig_a\",\"content\":\"AUTH: 12 files, package.json\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_mig_b\",\"content\":\"BILLING: 8 files, 6 imports rewritten\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_mig_n\",\"content\":\"NOTIF: 5 files (Go)\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_mig_g\",\"content\":\"GW: 7 files, 23 imports rewritten\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"mig_a2\",\"parentUuid\":\"mig_u2\",\"timestamp\":\"2026-04-25T09:00:46.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[MIGRATOR final]** Все 4 миграции прошли. 32 файла перенесено, 29 импортов обновлены.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"test_u\",\"parentUuid\":\"a0#tu2\",\"timestamp\":\"2026-04-25T09:00:10.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[TESTER subagent] Спавни integration-test-builder + regression-checker.\"}}\n{\"type\":\"assistant\",\"uuid\":\"test_a1\",\"parentUuid\":\"test_u\",\"timestamp\":\"2026-04-25T09:00:14.500Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Параллельно: тесты границ + проверка регрессий.\"},{\"type\":\"tool_use\",\"id\":\"tu_test_int\",\"name\":\"Task\",\"input\":{\"description\":\"integration\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Напиши integration-тесты на границы между packages.\"}},{\"type\":\"tool_use\",\"id\":\"tu_test_reg\",\"name\":\"Task\",\"input\":{\"description\":\"regression\",\"subagent_type\":\"general-purpose\",\"prompt\":\"Прогони существующие unit-тесты после миграции.\"}}]}}\n\n{\"type\":\"user\",\"uuid\":\"int_u\",\"parentUuid\":\"test_a1#tu0\",\"timestamp\":\"2026-04-25T09:00:15.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[INTEGRATION-BUILDER sub-sub] Напиши тесты границ.\"}}\n{\"type\":\"assistant\",\"uuid\":\"int_a1\",\"parentUuid\":\"int_u\",\"timestamp\":\"2026-04-25T09:00:21.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_int_write\",\"name\":\"Write\",\"input\":{\"file_path\":\"tests/integration/auth-billing.test.ts\",\"content\":\"import { login } from '@co/auth';\\nimport { createInvoice } from '@co/billing';\\ntest('login → invoice flow', async () => { ... })\"}}]}}\n{\"type\":\"user\",\"uuid\":\"int_u2\",\"parentUuid\":\"int_a1\",\"timestamp\":\"2026-04-25T09:00:22.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_int_write\",\"content\":\"Created\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"int_a2\",\"parentUuid\":\"int_u2\",\"timestamp\":\"2026-04-25T09:00:29.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[INTEGRATION-BUILDER done]** 5 integration-тестов на границы пакетов.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"reg_u\",\"parentUuid\":\"test_a1#tu1\",\"timestamp\":\"2026-04-25T09:00:15.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[REGRESSION-CHECKER sub-sub] Прогони unit-тесты.\"}}\n{\"type\":\"assistant\",\"uuid\":\"reg_a1\",\"parentUuid\":\"reg_u\",\"timestamp\":\"2026-04-25T09:00:22.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_reg_run\",\"name\":\"Bash\",\"input\":{\"command\":\"pnpm -r test\",\"description\":\"Run all tests\"}}]}}\n{\"type\":\"user\",\"uuid\":\"reg_u2\",\"parentUuid\":\"reg_a1\",\"timestamp\":\"2026-04-25T09:00:25.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_reg_run\",\"content\":\"@co/shared: 24 passed\\n@co/auth: 18 passed, 2 failed (mock path)\\n@co/billing: 12 passed\\n@co/notifications: 8 passed\\n@co/api-gateway: 15 passed\",\"is_error\":false}]}}\n{\"type\":\"assistant\",\"uuid\":\"reg_a2\",\"parentUuid\":\"reg_u2\",\"timestamp\":\"2026-04-25T09:00:31.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_reg_fix\",\"name\":\"Edit\",\"input\":{\"file_path\":\"packages/auth/tests/jwt.test.ts\",\"old_string\":\"jest.mock('../../shared/jwt')\",\"new_string\":\"jest.mock('@co/shared/jwt')\"}}]}}\n{\"type\":\"user\",\"uuid\":\"reg_u3\",\"parentUuid\":\"reg_a2\",\"timestamp\":\"2026-04-25T09:00:32.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_reg_fix\",\"content\":\"Updated\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"reg_a3\",\"parentUuid\":\"reg_u3\",\"timestamp\":\"2026-04-25T09:00:38.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[REGRESSION-CHECKER done]** 2 fix mock paths → 77 tests passed, 0 failed.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"test_u2\",\"parentUuid\":\"test_a1\",\"timestamp\":\"2026-04-25T09:00:40.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_test_int\",\"content\":\"5 integration tests created\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_test_reg\",\"content\":\"77 unit tests passing после fix 2 mock paths\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"test_a2\",\"parentUuid\":\"test_u2\",\"timestamp\":\"2026-04-25T09:00:45.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[TESTER final]** 5 integration + 77 unit. Покрытие границ полное.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"u_final\",\"parentUuid\":\"a0\",\"timestamp\":\"2026-04-25T09:00:48.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_arch\",\"content\":\"ARCHITECT: план миграции linear graph\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_mig\",\"content\":\"MIGRATOR: 32 файла, 29 импортов\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_test\",\"content\":\"TESTER: 5 int + 77 unit, all green\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"a_final\",\"parentUuid\":\"u_final\",\"timestamp\":\"2026-04-25T09:00:55.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"Глубина дерева: lead → 3 subagent → 8 sub-sub → tool chains. 8 параллельных sub-sub'ов завершились за ~30 секунд против ~5 минут последовательно. Все assertions прошли.\"},{\"type\":\"text\",\"text\":\"**Refactor complete:**\\n\\n```\\nLead\\n├── Architect\\n│   ├── dep-graph (linear shared→auth→billing→gateway)\\n│   └── api-extractor (52 exports, billing reuses auth.User)\\n├── Migrator\\n│   ├── migrate-auth (12 files)\\n│   ├── migrate-billing (8 files, 6 imports)\\n│   ├── migrate-notif (5 Go files)\\n│   └── migrate-gateway (7 files, 23 imports)\\n└── Tester\\n    ├── integration-builder (5 tests)\\n    └── regression-checker (77 unit tests)\\n```\\n\\n**Итого:** 4 npm-пакета (`@co/auth`, `@co/billing`, `@co/notifications`, `@co/api-gateway`) + `@co/shared`. 32 файла перенесено, 29 импортов обновлены, 82 теста зелёные. Параллелизм через 2-уровневый Task spawn сэкономил ~4 минуты.\"}]}}\n";

const MULTI_AGENT_ORCHESTRATION_JSONL = "{\"type\":\"user\",\"uuid\":\"u1\",\"parentUuid\":null,\"timestamp\":\"2026-04-25T10:00:00.000Z\",\"message\":{\"role\":\"user\",\"content\":\"Нужен security-audit всех 4-х микросервисов перед релизом v3.0. Сервисы: auth, billing, notifications, api-gateway. Цель — найти critical/high уязвимости (SQL injection, XSS, secrets в коде, CVE в deps).\"}}\n{\"type\":\"assistant\",\"uuid\":\"a1\",\"parentUuid\":\"u1\",\"timestamp\":\"2026-04-25T10:00:06.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"Четыре сервиса × 4 класса уязвимостей = 16 проверок. Последовательно займёт ~40 минут. Распараллелю через Task — спавню сразу 4 subagent'а в одном сообщении (parallel execution в Claude Code), каждый делает все 4 проверки у себя. Это займёт ~10 минут.\"},{\"type\":\"text\",\"text\":\"Сначала бегло пройдусь по структуре монорепо чтобы понять где что.\"},{\"type\":\"tool_use\",\"id\":\"tu_a1_ls\",\"name\":\"Bash\",\"input\":{\"command\":\"ls services/\",\"description\":\"List microservices\"}}]}}\n{\"type\":\"user\",\"uuid\":\"u2\",\"parentUuid\":\"a1\",\"timestamp\":\"2026-04-25T10:00:07.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_a1_ls\",\"content\":\"auth/\\nbilling/\\nnotifications/\\napi-gateway/\\nshared/\\ndocker-compose.yml\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"a2\",\"parentUuid\":\"u2\",\"timestamp\":\"2026-04-25T10:00:12.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"4 сервиса + shared. Спавню 4 subagent'а ПАРАЛЛЕЛЬНО — все Task в одном message, чтобы Claude Code запустил их одновременно.\"},{\"type\":\"tool_use\",\"id\":\"tu_task_auth\",\"name\":\"Task\",\"input\":{\"description\":\"Audit auth service\",\"subagent_type\":\"security-audit\",\"prompt\":\"Проверь services/auth/ на SQL-injection, XSS, hardcoded secrets, CVE. Краткий отчёт.\"}},{\"type\":\"tool_use\",\"id\":\"tu_task_bill\",\"name\":\"Task\",\"input\":{\"description\":\"Audit billing service\",\"subagent_type\":\"security-audit\",\"prompt\":\"Проверь services/billing/.\"}},{\"type\":\"tool_use\",\"id\":\"tu_task_notif\",\"name\":\"Task\",\"input\":{\"description\":\"Audit notifications service\",\"subagent_type\":\"security-audit\",\"prompt\":\"Проверь services/notifications/.\"}},{\"type\":\"tool_use\",\"id\":\"tu_task_gw\",\"name\":\"Task\",\"input\":{\"description\":\"Audit api-gateway\",\"subagent_type\":\"security-audit\",\"prompt\":\"Проверь services/api-gateway/.\"}}]}}\n\n{\"type\":\"user\",\"uuid\":\"sa1_u1\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:13.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[AUTH subagent] Проверь services/auth/ на SQL-injection, XSS, hardcoded secrets, CVE.\"}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a1\",\"parentUuid\":\"sa1_u1\",\"timestamp\":\"2026-04-25T10:00:18.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sa1_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/auth/**/*.{js,ts}\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sa1_u2\",\"parentUuid\":\"sa1_a1\",\"timestamp\":\"2026-04-25T10:00:19.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sa1_glob\",\"content\":\"services/auth/src/index.ts\\nservices/auth/src/jwt.ts\\nservices/auth/src/db.ts\\nservices/auth/src/routes/login.ts\\nservices/auth/src/routes/register.ts\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a2\",\"parentUuid\":\"sa1_u2\",\"timestamp\":\"2026-04-25T10:00:24.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sa1_grep1\",\"name\":\"Grep\",\"input\":{\"pattern\":\"query\\\\(|\\\\.raw\\\\(|\\\\$\\\\{\",\"path\":\"services/auth/src\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sa1_u3\",\"parentUuid\":\"sa1_a2\",\"timestamp\":\"2026-04-25T10:00:25.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sa1_grep1\",\"content\":\"routes/login.ts:14: db.query(`SELECT * FROM users WHERE email='${email}'`)\\nroutes/register.ts:22: db.raw(`INSERT INTO users(email) VALUES('${input.email}')`)\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a3\",\"parentUuid\":\"sa1_u3\",\"timestamp\":\"2026-04-25T10:00:30.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"2 SQL-injection — critical.\"},{\"type\":\"text\",\"text\":\"🚨 2 SQL-injection в auth: login:14 и register:22.\"},{\"type\":\"tool_use\",\"id\":\"tu_sa1_grep2\",\"name\":\"Grep\",\"input\":{\"pattern\":\"SECRET|API_KEY\",\"path\":\"services/auth/src\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sa1_u4\",\"parentUuid\":\"sa1_a3\",\"timestamp\":\"2026-04-25T10:00:31.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sa1_grep2\",\"content\":\"jwt.ts:8: const SECRET = 'dev-secret-please-change-12345'\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a4\",\"parentUuid\":\"sa1_u4\",\"timestamp\":\"2026-04-25T10:00:36.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sa1_audit\",\"name\":\"Bash\",\"input\":{\"command\":\"cd services/auth && npm audit --json\",\"description\":\"CVE check\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sa1_u5\",\"parentUuid\":\"sa1_a4\",\"timestamp\":\"2026-04-25T10:00:42.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sa1_audit\",\"content\":\"high: lodash CVE-2019-10744, jsonwebtoken CVE-2022-23529\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a5\",\"parentUuid\":\"sa1_u5\",\"timestamp\":\"2026-04-25T10:00:48.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[AUTH report]** critical=2 (SQLi×2), high=3 (dev-secret + 2 CVE), medium=0.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"sb1_u1\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:13.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[BILLING subagent] Проверь services/billing/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a1\",\"parentUuid\":\"sb1_u1\",\"timestamp\":\"2026-04-25T10:00:18.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sb1_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/billing/**/*.py\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sb1_u2\",\"parentUuid\":\"sb1_a1\",\"timestamp\":\"2026-04-25T10:00:19.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sb1_glob\",\"content\":\"services/billing/main.py\\nservices/billing/models.py\\nservices/billing/stripe_webhook.py\\nservices/billing/invoices.py\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a2\",\"parentUuid\":\"sb1_u2\",\"timestamp\":\"2026-04-25T10:00:25.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sb1_grep\",\"name\":\"Grep\",\"input\":{\"pattern\":\"webhook_secret|verify\",\"path\":\"services/billing\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sb1_u3\",\"parentUuid\":\"sb1_a2\",\"timestamp\":\"2026-04-25T10:00:26.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sb1_grep\",\"content\":\"stripe_webhook.py:28: # TODO: verify signature properly\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a3\",\"parentUuid\":\"sb1_u3\",\"timestamp\":\"2026-04-25T10:00:32.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sb1_read\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/billing/stripe_webhook.py\",\"offset\":20,\"limit\":15}}]}}\n{\"type\":\"user\",\"uuid\":\"sb1_u4\",\"parentUuid\":\"sb1_a3\",\"timestamp\":\"2026-04-25T10:00:33.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sb1_read\",\"content\":\"@app.route('/webhook', methods=['POST'])\\ndef handle_webhook():\\n    payload = request.data\\n    # TODO: verify signature properly\\n    event = json.loads(payload)\\n    process_event(event)\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a4\",\"parentUuid\":\"sb1_u4\",\"timestamp\":\"2026-04-25T10:00:39.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"🚨 Stripe webhook не проверяет подпись — fake events → бесплатные подписки.\"},{\"type\":\"tool_use\",\"id\":\"tu_sb1_safety\",\"name\":\"Bash\",\"input\":{\"command\":\"safety check\",\"description\":\"CVE\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sb1_u5\",\"parentUuid\":\"sb1_a4\",\"timestamp\":\"2026-04-25T10:00:45.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sb1_safety\",\"content\":\"requests 2.25.0 — CVE-2023-32681 (medium)\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a5\",\"parentUuid\":\"sb1_u5\",\"timestamp\":\"2026-04-25T10:00:51.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[BILLING report]** critical=1 (unverified webhook), high=0, medium=1 (CVE). SQL чистый — ORM.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"sc1_u1\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:14.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[NOTIFICATIONS subagent] Проверь services/notifications/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a1\",\"parentUuid\":\"sc1_u1\",\"timestamp\":\"2026-04-25T10:00:19.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sc1_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/notifications/**/*.{go,tmpl}\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sc1_u2\",\"parentUuid\":\"sc1_a1\",\"timestamp\":\"2026-04-25T10:00:20.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sc1_glob\",\"content\":\"services/notifications/main.go\\nservices/notifications/mailer.go\\nservices/notifications/templates/welcome.tmpl\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a2\",\"parentUuid\":\"sc1_u2\",\"timestamp\":\"2026-04-25T10:00:26.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sc1_grep\",\"name\":\"Grep\",\"input\":{\"pattern\":\"text/template|html/template\",\"path\":\"services/notifications\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sc1_u3\",\"parentUuid\":\"sc1_a2\",\"timestamp\":\"2026-04-25T10:00:27.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sc1_grep\",\"content\":\"mailer.go:3: \\\"text/template\\\"\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a3\",\"parentUuid\":\"sc1_u3\",\"timestamp\":\"2026-04-25T10:00:33.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"text/template без auto-escape в HTML-emails — XSS vector через user-provided fields.\"},{\"type\":\"tool_use\",\"id\":\"tu_sc1_read\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/notifications/templates/welcome.tmpl\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sc1_u4\",\"parentUuid\":\"sc1_a3\",\"timestamp\":\"2026-04-25T10:00:34.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sc1_read\",\"content\":\"<html><body><h1>Welcome, {{.Name}}!</h1><p>Bio: {{.Bio}}</p></body></html>\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a4\",\"parentUuid\":\"sc1_u4\",\"timestamp\":\"2026-04-25T10:00:40.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"🚨 XSS: text/template + user Bio в HTML-email = можно внедрить <script>.\"},{\"type\":\"tool_use\",\"id\":\"tu_sc1_vuln\",\"name\":\"Bash\",\"input\":{\"command\":\"govulncheck ./...\",\"description\":\"CVE\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sc1_u5\",\"parentUuid\":\"sc1_a4\",\"timestamp\":\"2026-04-25T10:00:46.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sc1_vuln\",\"content\":\"No vulnerabilities found.\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a5\",\"parentUuid\":\"sc1_u5\",\"timestamp\":\"2026-04-25T10:00:52.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[NOTIFICATIONS report]** critical=1 (XSS в email templates), high=0, medium=0, CVE clean.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"sd1_u1\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:14.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[API-GATEWAY subagent] Проверь services/api-gateway/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a1\",\"parentUuid\":\"sd1_u1\",\"timestamp\":\"2026-04-25T10:00:19.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sd1_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/api-gateway/**/*.{ts,yml}\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sd1_u2\",\"parentUuid\":\"sd1_a1\",\"timestamp\":\"2026-04-25T10:00:20.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sd1_glob\",\"content\":\"services/api-gateway/src/server.ts\\nservices/api-gateway/src/rate-limit.ts\\nservices/api-gateway/cors.yml\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a2\",\"parentUuid\":\"sd1_u2\",\"timestamp\":\"2026-04-25T10:00:27.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sd1_cors\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/api-gateway/cors.yml\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sd1_u3\",\"parentUuid\":\"sd1_a2\",\"timestamp\":\"2026-04-25T10:00:28.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sd1_cors\",\"content\":\"cors:\\n  allow_origins: ['*']\\n  allow_credentials: true\\n  allow_methods: ['GET','POST','PUT','DELETE','PATCH']\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a3\",\"parentUuid\":\"sd1_u3\",\"timestamp\":\"2026-04-25T10:00:34.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"🚨 wildcard origins + credentials — куки утекают на любой origin.\"},{\"type\":\"tool_use\",\"id\":\"tu_sd1_rate\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/api-gateway/src/rate-limit.ts\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sd1_u4\",\"parentUuid\":\"sd1_a3\",\"timestamp\":\"2026-04-25T10:00:35.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sd1_rate\",\"content\":\"const limiter = rateLimit({ windowMs: 60000, max: 1000, skip: (req) => req.path.startsWith('/auth') });\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a4\",\"parentUuid\":\"sd1_u4\",\"timestamp\":\"2026-04-25T10:00:42.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"🚨 Login без rate-limit → brute-force forever.\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a5\",\"parentUuid\":\"sd1_a4\",\"timestamp\":\"2026-04-25T10:00:48.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[API-GATEWAY report]** critical=2 (CORS wildcard + no rate-limit на login), high=0, medium=0.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"u3\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:55.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_task_auth\",\"content\":\"AUTH: critical=2 high=3 medium=0\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_task_bill\",\"content\":\"BILLING: critical=1 high=0 medium=1\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_task_notif\",\"content\":\"NOTIFICATIONS: critical=1 high=0 medium=0\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_task_gw\",\"content\":\"API-GATEWAY: critical=2 high=0 medium=0\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"a3\",\"parentUuid\":\"u3\",\"timestamp\":\"2026-04-25T10:01:02.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"Все 4 subagent'а вернулись параллельно за ~1 минуту. Суммирую: 6 critical + 3 high + 1 medium. Релиз v3.0 блокируется до фиксов critical.\"},{\"type\":\"text\",\"text\":\"Все 4 subagent'а вернулись. Собираю сводку и пишу отчёт.\"},{\"type\":\"tool_use\",\"id\":\"tu_a3_write\",\"name\":\"Write\",\"input\":{\"file_path\":\"SECURITY-AUDIT-v3.0.md\",\"content\":\"# Security Audit v3.0\\n\\n| Service | critical | high | medium |\\n|---|---|---|---|\\n| auth | 2 | 3 | 0 |\\n| billing | 1 | 0 | 1 |\\n| notifications | 1 | 0 | 0 |\\n| api-gateway | 2 | 0 | 0 |\\n| **TOTAL** | **6** | **3** | **1** |\\n\\n## CRITICAL (блокируют релиз)\\n1. auth/routes/login.ts:14 — SQL-injection\\n2. auth/routes/register.ts:22 — SQL-injection\\n3. billing/stripe_webhook.py:28 — signature не проверяется\\n4. notifications/mailer.go — text/template → XSS\\n5. api-gateway/cors.yml — wildcard origins + credentials\\n6. api-gateway/rate-limit.ts:4 — login без rate-limit\"}}]}}\n{\"type\":\"user\",\"uuid\":\"u4\",\"parentUuid\":\"a3\",\"timestamp\":\"2026-04-25T10:01:03.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_a3_write\",\"content\":\"File created: SECURITY-AUDIT-v3.0.md\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"a4\",\"parentUuid\":\"u4\",\"timestamp\":\"2026-04-25T10:01:08.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**Audit complete.** 6 critical, 3 high, 1 medium. Релиз v3.0 откладываем минимум на неделю.\\n\\nПлан фиксов:\\n- День 1: SQL-injection (auth) + CORS (gateway) — 3 часа\\n- День 2: Stripe signature + rate-limit + text→html template — 4 часа\\n- День 3: CVE updates + regression tests — 4 часа\\n- День 4: pen-test, релиз в день 5\\n\\nПараллельный запуск 4 subagent'ов через Task занял ~50 секунд вместо ~12 минут последовательно.\"}]}}\n";


    return { DEEP_ORCHESTRATION_JSONL, MULTI_AGENT_ORCHESTRATION_JSONL };
  })();

  // --- src/core/parser.js ---
  __M["src/core/parser.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];

// Regex для CLI-meta тегов которые Claude Code CLI вставляет в user-message
// при slash-командах и system reminders. В публичных JSONL они обычно
// отсутствуют, но при работе через CLI или экспорте сырых сессий — могут
// пробрасываться и засорять отображаемый текст.
const CLI_META_REGEX = /<(system-reminder|command-name|command-message|command-args|local-command-stdout|local-command-caveat)>[\s\S]*?<\/\1>/g;
const CLI_META_DETECT = /<(system-reminder|command-name|command-message|command-args|local-command-stdout|local-command-caveat)>/;

/**
 * Удаляет CLI-meta теги из user-текста и схлопывает множественные пустые
 * строки оставшиеся после удаления. Возвращает очищенный текст.
 * Идемпотентна.
 */
function stripCliMeta(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(CLI_META_REGEX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractToolResultText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts = [];
  for (const b of content) {
    if (!b) continue;
    if (b.type === 'text' && typeof b.text === 'string') parts.push(b.text);
    else if (b.type === 'image') parts.push('[image]');
  }
  return parts.join('\n');
}

function classifyContent(content) {
  // blockCounts — сколько блоков каждого типа было в content (нужно чтобы
  // отличить "user-message с tool_result + текстом" от "pure tool_result").
  const emptyCounts = { text: 0, image: 0, toolUse: 0, toolResult: 0, thinking: 0 };
  if (typeof content === 'string') {
    const stripped = stripCliMeta(content);
    return {
      text: stripped,
      toolUses: [], toolResults: [], thinkings: [],
      blockCounts: { ...emptyCounts, text: stripped ? 1 : 0 },
      hasCliMeta: CLI_META_DETECT.test(content),
    };
  }
  if (!Array.isArray(content)) {
    return { text: '', toolUses: [], toolResults: [], thinkings: [], blockCounts: emptyCounts, hasCliMeta: false };
  }
  const textParts = [];
  const toolUses = [];
  // toolResults — массив объектов с полями toolUseId (string) и isError (bool)
  const toolResults = [];
  // thinkings — массив текстов для отдельных virtual thinking nodes
  const thinkings = [];
  const blockCounts = { ...emptyCounts };
  let hasCliMeta = false;
  for (const block of content) {
    if (!block) continue;
    switch (block.type) {
      case 'text':
        if (typeof block.text === 'string') {
          if (CLI_META_DETECT.test(block.text)) hasCliMeta = true;
          const cleaned = stripCliMeta(block.text);
          if (cleaned) {
            textParts.push(cleaned);
            blockCounts.text++;
          }
          // Если после strip остался пустой текст — блок был чисто meta,
          // не считаем его как text-блок (важно для pure tool_result detection).
        }
        break;
      case 'thinking':
        // Сохраняем текст для отдельной virtual thinking ноды.
        // В text родителя НЕ дублируем — иначе двойное отображение.
        if (typeof block.thinking === 'string' && block.thinking.trim()) {
          thinkings.push(block.thinking);
          blockCounts.thinking++;
        }
        break;
      case 'tool_use':
        toolUses.push({
          id: block.id || null,
          name: typeof block.name === 'string' ? block.name : 'tool',
          input: block.input || {},
        });
        blockCounts.toolUse++;
        break;
      case 'tool_result': {
        const rt = extractToolResultText(block.content);
        const prefix = block.is_error ? '⚠ ' : '↩ ';
        if (rt) textParts.push(prefix + rt);
        if (block.tool_use_id) {
          toolResults.push({
            toolUseId: block.tool_use_id,
            isError: !!block.is_error,
          });
        }
        blockCounts.toolResult++;
        break;
      }
      case 'image':
        textParts.push('[image]');
        blockCounts.image++;
        break;
      default:
        // неизвестный тип — пропускаем
        break;
    }
  }
  return { text: textParts.join('\n\n'), toolUses, toolResults, thinkings, blockCounts, hasCliMeta };
}

function extractText(message) {
  if (!message) return '';
  return classifyContent(message.content).text;
}

const SERVICE_TYPES = new Set([
  'queue-operation', 'last-prompt', 'progress', 'system',
  'attachment', 'custom-title', 'ai-title', 'summary',
]);

function parseJSONL(text) {
  const lines = text.split(/\r?\n/);
  const nodes = [];
  const unknownTypes = new Map();
  let parsed = 0, kept = 0, skipped = 0, errors = 0, compactions = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    parsed++;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { errors++; continue; }

    const t = obj.type;
    if (t === 'summary') compactions++;
    if (t !== 'user' && t !== 'assistant') {
      if (t && !SERVICE_TYPES.has(t)) unknownTypes.set(t, (unknownTypes.get(t) || 0) + 1);
      skipped++;
      continue;
    }

    const { text: msgText, toolUses, toolResults, thinkings, blockCounts, hasCliMeta } = classifyContent(obj.message && obj.message.content);
    const baseId = obj.uuid || `gen-${nodes.length}`;
    const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
    const parentId = obj.parentUuid || null;
    // Если у ассистента нет текста, но есть tool_use или thinking —
    // формируем summary. Приоритет: tool_use → thinking-фраза.
    let finalText = msgText;
    if (t === 'assistant' && !finalText) {
      if (toolUses.length) finalText = buildAssistantSummary(toolUses);
      else if (thinkings.length) finalText = '💭 ' + thinkings[0].slice(0, 80);
    }

    // Pure tool_result detection: user-message содержит ≥1 tool_result блок
    // и НЕТ блоков text/thinking/image — это чистый «возврат от tool'а»,
    // не реальный пользовательский ввод. Получает отдельную роль.
    // (Mixed: user с текстом + tool_result — оставляем role='user', т.к.
    // там есть и реальный комментарий пользователя.)
    let role = t;
    if (t === 'user' && toolResults.length > 0
        && blockCounts.text === 0 && blockCounts.thinking === 0 && blockCounts.image === 0) {
      role = 'tool_result';
    }

    // На user/tool_result нодах сохраняем массив tool_use_id из tool_result
    // блоков и флаг наличия error — для visualization pair-edges и red ring
    // на parent assistant'е (graph.js buildPairEdges использует n.hasError).
    // На assistant-нодах сохраняем usage (для метрик-бейджей).
    const node = {
      id: baseId,
      parentId,
      role,
      ts,
      text: finalText,
      textLen: finalText.length,
    };
    if (hasCliMeta) node._hasCliMeta = true;
    if (t === 'user' && toolResults.length) {
      node.toolResultIds = toolResults.map(r => r.toolUseId);
      node.hasError = toolResults.some(r => r.isError);
    }
    if (t === 'assistant' && obj.message && obj.message.usage) {
      const u = obj.message.usage;
      const inT = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      const outT = u.output_tokens || 0;
      node.tokensIn = inT;
      node.tokensOut = outT;
      node.tokensTotal = inT + outT;
    }
    nodes.push(node);
    kept++;

    if (t === 'assistant') {
      // Thinking ноды идут раньше tool_use (с малым шагом ts), чтобы в
      // timeline они появлялись «между» mind ассистента и его действиями.
      for (let i = 0; i < thinkings.length; i++) {
        const tk = thinkings[i];
        nodes.push({
          id: `${baseId}#th${i}`,
          parentId: baseId,
          role: 'thinking',
          ts: ts + (i + 1) * Math.max(50, Math.floor(CFG.toolUseTsStepMs / 4)),
          text: tk,
          textLen: tk.length,
        });
        kept++;
      }
      for (let i = 0; i < toolUses.length; i++) {
        const tu = toolUses[i];
        const inputStr = safeStringify(tu.input);
        const subText = `${tu.name}\n${inputStr}`;
        nodes.push({
          id: `${baseId}#tu${i}`,
          parentId: baseId,
          role: 'tool_use',
          // Сдвигаем после thinking-блоков, чтобы порядок был
          // assistant → thinking* → tool_use*
          ts: ts + (thinkings.length + i + 1) * CFG.toolUseTsStepMs,
          text: subText,
          textLen: subText.length,
          toolName: tu.name,
          toolUseId: tu.id, // Real API tool_use_id для pair-edges с tool_result
        });
        kept++;
      }
    }

    if (kept >= CFG.maxMessages) break;
  }

  // Post-pass: помечаем user-ноды которые на самом деле — subagent prompts.
  // В Claude Code тред саб-агента начинается с user-message чей parentUuid
  // указывает на virtual tool_use ID родительского ассистента (Task tool).
  // Семантически это машинно-сгенерированный prompt от Lead-агента к
  // саб-агенту, а не ввод человека — отображаем отдельным цветом.
  markSubagentInputs(nodes);
  // Post-pass: помечаем virtual tool_use ноды которые остались без ответа
  // (нет matching tool_result в каком-либо tool_result-message).
  // Может случаться при truncated сессиях или если CLI прервался.
  markPendingToolUses(nodes);

  if (unknownTypes.size && typeof console !== 'undefined') {
    console.warn('[parseJSONL] skipped types:', JSON.stringify(Object.fromEntries(unknownTypes)));
  }

  return { nodes, stats: { parsed, kept, skipped, errors, compactions } };
}

// Помечает user-ноды как 'subagent_input' если их parent — virtual tool_use
// с toolName='Task'. Идемпотентна — может вызываться дважды без эффекта.
// Экспортируется для appendRawNodes (live-mode incremental parsing) — после
// добавления новых нод вызываем этот пост-проход чтобы перевести user→subagent_input.
function markSubagentInputs(nodes) {
  const taskToolUseIds = new Set();
  for (const n of nodes) {
    if (n.role === 'tool_use' && n.toolName === 'Task') {
      taskToolUseIds.add(n.id);
    }
  }
  for (const n of nodes) {
    if (n.role === 'user' && n.parentId && taskToolUseIds.has(n.parentId)) {
      n.role = 'subagent_input';
    }
  }
}

/**
 * Помечает virtual tool_use ноды флагом `_isPendingToolUse=true` если для
 * их `toolUseId` нигде в графе нет matching tool_result (ни в одной user/
 * tool_result ноде через `toolResultIds`).
 *
 * Бывает при:
 *  - truncated JSONL (сессия оборвалась пока tool ещё работал)
 *  - максимальный лимит CFG.maxMessages дошёл до tool_use, но не до result
 *  - саб-агенский tool_use чья tool_result-нода обрезана
 *
 * Идемпотентна. Renderer'ы могут использовать флаг для приглушённого
 * отображения (визуально «не закрытый вызов»), но это polish.
 */
function markPendingToolUses(nodes) {
  const respondedToolUseIds = new Set();
  for (const n of nodes) {
    if (n.toolResultIds) {
      for (const tuid of n.toolResultIds) respondedToolUseIds.add(tuid);
    }
  }
  for (const n of nodes) {
    if (n.role === 'tool_use' && n.toolUseId && !respondedToolUseIds.has(n.toolUseId)) {
      n._isPendingToolUse = true;
    } else if (n.role === 'tool_use' && n._isPendingToolUse) {
      // Если ранее был помечен, а теперь tool_result появился (live-mode) —
      // снимаем флаг. Поддерживает идемпотентность при повторных вызовах.
      n._isPendingToolUse = false;
    }
  }
}

function safeStringify(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

// Ключевое поле input для известных тулов — то что говорит «что делает вызов»
const TOOL_KEY_FIELD = {
  bash: 'command', powershell: 'command', shell: 'command',
  grep: 'pattern', glob: 'pattern', find: 'pattern',
  read: 'file_path', write: 'file_path', edit: 'file_path',
  multiedit: 'file_path', notebookedit: 'file_path',
  webfetch: 'url', websearch: 'query',
  task: 'description', agent: 'description',
  skill: 'skill', scheduledwakeup: 'reason',
};

function summariseToolUse(tu) {
  const name = tu && tu.name ? String(tu.name) : 'tool';
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  const input = (tu && tu.input) || {};
  const field = TOOL_KEY_FIELD[key];
  let val;
  if (field && input[field] != null) {
    val = input[field];
  } else if (key === 'todowrite' && Array.isArray(input.todos)) {
    return `${name} (${input.todos.length} todos)`;
  } else {
    // Первое строковое поле
    for (const k of Object.keys(input)) {
      if (typeof input[k] === 'string' && input[k].length) { val = input[k]; break; }
    }
  }
  if (val == null) return name;
  let s = String(val).replace(/\s+/g, ' ').trim();
  if (s.length > 60) s = s.slice(0, 57) + '…';
  return `${name} "${s}"`;
}

function buildAssistantSummary(toolUses) {
  if (!toolUses.length) return '';
  const parts = toolUses.slice(0, 4).map(summariseToolUse);
  const extra = toolUses.length > 4 ? ` …+${toolUses.length - 4}` : '';
  return '🔧 ' + parts.join(' · ') + extra;
}

/**
 * Парсит одну JSONL-строку. Возвращает массив raw-нод (0-N шт):
 *  - 0 если строка пустая/невалидная/служебный type
 *  - 1 для user
 *  - 1+N для assistant (основная + N tool_use подноды)
 */
function parseLine(line, seedCounter) {
  const trimmed = (line || '').trim();
  if (!trimmed) return [];
  let obj;
  try { obj = JSON.parse(trimmed); } catch { return []; }
  const t = obj.type;
  if (t !== 'user' && t !== 'assistant') return [];

  const { text: msgText, toolUses, toolResults, thinkings, blockCounts, hasCliMeta } = classifyContent(obj.message && obj.message.content);
  const baseId = obj.uuid || `gen-${seedCounter != null ? seedCounter : Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
  const parentId = obj.parentUuid || null;
  let finalText = msgText;
  if (t === 'assistant' && !finalText) {
    if (toolUses.length) finalText = buildAssistantSummary(toolUses);
    else if (thinkings.length) finalText = '💭 ' + thinkings[0].slice(0, 80);
  }

  // Pure tool_result detection (тот же критерий что в parseJSONL).
  let role = t;
  if (t === 'user' && toolResults && toolResults.length > 0
      && blockCounts.text === 0 && blockCounts.thinking === 0 && blockCounts.image === 0) {
    role = 'tool_result';
  }

  const baseNode = {
    id: baseId,
    parentId,
    role,
    ts,
    text: finalText,
    textLen: finalText.length,
  };
  if (hasCliMeta) baseNode._hasCliMeta = true;
  if (t === 'user' && toolResults && toolResults.length) {
    baseNode.toolResultIds = toolResults.map(r => r.toolUseId);
    baseNode.hasError = toolResults.some(r => r.isError);
  }
  const out = [baseNode];
  if (t === 'assistant') {
    for (let i = 0; i < thinkings.length; i++) {
      const tk = thinkings[i];
      out.push({
        id: `${baseId}#th${i}`,
        parentId: baseId,
        role: 'thinking',
        ts: ts + (i + 1) * Math.max(50, Math.floor(CFG.toolUseTsStepMs / 4)),
        text: tk,
        textLen: tk.length,
      });
    }
    for (let i = 0; i < toolUses.length; i++) {
      const tu = toolUses[i];
      const inputStr = safeStringify(tu.input);
      const subText = `${tu.name}\n${inputStr}`;
      out.push({
        id: `${baseId}#tu${i}`,
        parentId: baseId,
        role: 'tool_use',
        ts: ts + (thinkings.length + i + 1) * CFG.toolUseTsStepMs,
        text: subText,
        textLen: subText.length,
        toolName: tu.name,
      });
    }
  }
  return out;
}

    return { stripCliMeta, extractText, parseJSONL, markSubagentInputs, markPendingToolUses, summariseToolUse, parseLine };
  })();

  // --- src/core/adapters.js ---
  __M["src/core/adapters.js"] = (function () {
// Формат-адаптеры. На входе — сырой текст файла, на выходе
// либо уже Claude JSONL (`type: user/assistant + parentUuid`),
// либо пустая строка. loader.js использует detectFormat()
// и вызывает соответствующий toClaudeJsonl().

// Известные тип-метки которые может содержать первая строка Claude JSONL.
const CLAUDE_JSONL_TYPE_MARKERS = new Set([
  'user', 'assistant', 'queue-operation', 'last-prompt',
]);

function tryParseJsonRoot(text) {
  if (text[0] !== '[' && text[0] !== '{') return null;
  try { return JSON.parse(text); } catch { return null; }
}

function detectByJsonRoot(obj) {
  const sample = Array.isArray(obj) ? obj[0] : obj;
  if (sample && sample.mapping) return 'chatgpt-export';
  if (Array.isArray(obj) && obj.length && obj[0].role && obj[0].content != null) {
    return 'anthropic-messages';
  }
  return null;
}

function detectByJsonlFirstLine(text) {
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (CLAUDE_JSONL_TYPE_MARKERS.has(obj.type) || obj.parentUuid !== undefined) {
        return 'claude-jsonl';
      }
    } catch { /* not parseable — not jsonl */ }
    return null; // первая непустая строка не подошла → не jsonl
  }
  return null;
}

function detectFormat(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'unknown';
  const root = tryParseJsonRoot(trimmed);
  if (root) {
    const byRoot = detectByJsonRoot(root);
    if (byRoot) return byRoot;
  }
  const byJsonl = detectByJsonlFirstLine(trimmed);
  if (byJsonl) return byJsonl;
  return 'unknown';
}

// ---- ChatGPT export ----
// Структура: { conversation_id, mapping: { [nodeId]: { message, parent } } }
// либо массив таких объектов. Нас интересуют только user/assistant ноды
// с непустым текстом.

function extractChatGptText(content) {
  if (!content) return '';
  const parts = Array.isArray(content.parts)
    ? content.parts
    : (content.text ? [content.text] : []);
  return parts
    .map(p => (typeof p === 'string' ? p : (p && p.text) || ''))
    .filter(Boolean)
    .join('\n');
}

function chatGptIdWithConv(convId, id) {
  return convId ? `${convId}:${id}` : id;
}

function convertChatGptNode(id, node, convId) {
  const msg = node && node.message;
  if (!msg || !msg.author) return null;
  const role = msg.author.role;
  if (role !== 'user' && role !== 'assistant') return null;
  const text = extractChatGptText(msg.content);
  if (!text) return null;
  const ts = msg.create_time
    ? new Date(msg.create_time * 1000).toISOString()
    : new Date().toISOString();
  const parentId = node.parent || null;
  return {
    type: role,
    uuid: chatGptIdWithConv(convId, id),
    parentUuid: parentId ? chatGptIdWithConv(convId, parentId) : null,
    timestamp: ts,
    message: { role, content: text },
  };
}

function chatgptToClaudeJsonl(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return ''; }
  const conversations = Array.isArray(obj) ? obj : [obj];
  const out = [];
  for (const conv of conversations) {
    const mapping = conv && conv.mapping;
    if (!mapping) continue;
    const convId = conv.id || conv.conversation_id || '';
    for (const [id, node] of Object.entries(mapping)) {
      const converted = convertChatGptNode(id, node, convId);
      if (converted) out.push(JSON.stringify(converted));
    }
  }
  return out.join('\n');
}

function anthropicMessagesToClaudeJsonl(text) {
  let arr;
  try { arr = JSON.parse(text); } catch { return ''; }
  if (!Array.isArray(arr)) return '';
  const out = [];
  const baseTs = Date.now();
  let prevId = null;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    const role = m.role;
    if (role !== 'user' && role !== 'assistant') continue;
    let textBlock = '';
    if (typeof m.content === 'string') textBlock = m.content;
    else if (Array.isArray(m.content)) {
      textBlock = m.content
        .filter(b => b && b.type === 'text')
        .map(b => b.text)
        .join('\n');
    }
    const id = `msg-${i}`;
    const ts = new Date(baseTs + i * 15000).toISOString();
    out.push(JSON.stringify({
      type: role,
      uuid: id,
      parentUuid: prevId,
      timestamp: ts,
      message: { role, content: textBlock },
    }));
    prevId = id;
  }
  return out.join('\n');
}

function normalizeToClaudeJsonl(text) {
  const fmt = detectFormat(text);
  if (fmt === 'chatgpt-export') {
    return { format: fmt, text: chatgptToClaudeJsonl(text) };
  }
  if (fmt === 'anthropic-messages') {
    return { format: fmt, text: anthropicMessagesToClaudeJsonl(text) };
  }
  return { format: fmt, text };
}

    return { detectFormat, chatgptToClaudeJsonl, anthropicMessagesToClaudeJsonl, normalizeToClaudeJsonl };
  })();

  // --- src/core/quadtree.js ---
  __M["src/core/quadtree.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];

function createQuad(x, y, s) {
  return { x, y, s, cx: 0, cy: 0, mass: 0, point: null, children: null };
}

function findQuadrantIndex(q, px, py) {
  const mx = q.x + q.s / 2;
  const my = q.y + q.s / 2;
  let idx = 0;
  if (px >= mx) idx |= 1;
  if (py >= my) idx |= 2;
  return idx;
}

function insert(q, n) {
  if (!q.children && !q.point) {
    q.point = n;
    q.cx = n.x;
    q.cy = n.y;
    q.mass = 1;
    return;
  }
  if (!q.children) {
    const old = q.point;
    q.point = null;
    const half = q.s / 2;
    q.children = [
      createQuad(q.x,        q.y,        half),
      createQuad(q.x + half, q.y,        half),
      createQuad(q.x,        q.y + half, half),
      createQuad(q.x + half, q.y + half, half),
    ];
    q.mass = 0; q.cx = 0; q.cy = 0;
    insert(q.children[findQuadrantIndex(q, old.x, old.y)], old);
    q.mass = 1;
    q.cx = old.x;
    q.cy = old.y;
  }
  const newMass = q.mass + 1;
  q.cx = (q.cx * q.mass + n.x) / newMass;
  q.cy = (q.cy * q.mass + n.y) / newMass;
  q.mass = newMass;
  insert(q.children[findQuadrantIndex(q, n.x, n.y)], n);
}

function buildQuadtree(nodes) {
  if (!nodes.length) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const size = Math.max(w, h) + 2;
  const root = createQuad(minX - 1, minY - 1, size);
  for (const n of nodes) insert(root, n);
  return root;
}

/**
 * Repulsion на node от всего дерева. cutoff2 — opt. squared-distance cutoff.
 */
function computeRepulsion(tree, node, theta, kRep, cutoff2) {
  const acc = { fx: 0, fy: 0 };
  if (!tree || tree.mass === 0) return acc;
  _accumulate(tree, node, theta, kRep, cutoff2, acc);
  return acc;
}

function _accumulate(q, node, theta, k, cutoff2, acc) {
  if (!q || q.mass === 0) return;
  if (q.point && q.point === node) return;
  let dx = node.x - q.cx;
  let dy = node.y - q.cy;
  let d2 = dx * dx + dy * dy;
  // cutoff для дальних кластеров (перформанс)
  if (cutoff2 && d2 > cutoff2) {
    // если это leaf с точкой — skip; для group с массой — тоже skip (вклад малый)
    return;
  }
  if (d2 < 0.01) {
    // deterministic offset по seed если есть
    const sn = node._seedDx != null ? { dx: node._seedDx, dy: node._seedDy } : { dx: 0.01, dy: 0.01 };
    const pt = q.point;
    const sq = pt && pt._seedDx != null ? { dx: pt._seedDx, dy: pt._seedDy } : { dx: -0.01, dy: -0.01 };
    dx = (sn.dx - sq.dx) || 0.01;
    dy = (sn.dy - sq.dy) || 0.01;
    d2 = dx * dx + dy * dy + 0.01;
  }
  const isLeaf = !q.children;
  // leaf с мелким size — не рекурсим (bhLeafMinSize guard)
  if (q.s < CFG.bhLeafMinSize) {
    if (!isLeaf || !q.point || q.point === node) return;
    const d = Math.sqrt(d2);
    const f = (k * q.mass) / d2;
    acc.fx += (dx / d) * f;
    acc.fy += (dy / d) * f;
    return;
  }
  const d = Math.sqrt(d2);
  if (isLeaf || (q.s / d) < theta) {
    const f = (k * q.mass) / d2;
    acc.fx += (dx / d) * f;
    acc.fy += (dy / d) * f;
    return;
  }
  for (const ch of q.children) _accumulate(ch, node, theta, k, cutoff2, acc);
}

    return { buildQuadtree, computeRepulsion };
  })();

  // --- src/core/layout.js ---
  __M["src/core/layout.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { buildQuadtree, computeRepulsion } = __M["src/core/quadtree.js"];

// ---------- D3-style simulation state ----------

function createSim(opts = {}) {
  return {
    alpha: 1,
    alphaTarget: 0,
    alphaDecay: opts.alphaDecay != null ? opts.alphaDecay : CFG.alphaDecay,
    alphaMin: opts.alphaMin != null ? opts.alphaMin : CFG.alphaMin,
    velocityDecay: opts.velocityDecay != null ? opts.velocityDecay : CFG.velocityDecay,
    frozen: false,
    manualFrozen: false,
    // UI-флаг: включены ли adopted-edges в физику. Меняется из ui/orphans-toggle.
    connectOrphans: !!opts.connectOrphans,
  };
}

function reheat(sim, a) {
  if (!sim) return;
  const target = a != null ? a : CFG.reheatAlpha;
  sim.alpha = Math.max(sim.alpha, target);
  sim.alphaTarget = target;
  sim.frozen = false;
}

function freeze(sim) {
  if (!sim) return;
  sim.manualFrozen = true;
  sim.frozen = true;
}

function unfreeze(sim) {
  if (!sim) return;
  sim.manualFrozen = false;
  sim.frozen = false;
  reheat(sim, CFG.reheatAlpha);
}

function isSettled(sim) {
  if (!sim) return true;
  return sim.alpha < sim.alphaMin && sim.alphaTarget === 0;
}

// ---------- deterministic hash for stable jitter ----------

function hashStrToUnit(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return (h >>> 0) / 4294967296;
}
function seedJitter(id) {
  const u1 = hashStrToUnit(id + '|x');
  const u2 = hashStrToUnit(id + '|y');
  return { dx: u1 - 0.5, dy: u2 - 0.5 };
}

// ---------- core step ----------

function stepPhysics(nodes, edges, viewport, sim) {
  const _sim = sim || createSim();

  // alpha cooling (в начале step, до всех ранних return'ов)
  _sim.alpha += (_sim.alphaTarget - _sim.alpha) * _sim.alphaDecay;
  if (_sim.manualFrozen) { _sim.frozen = true; return; }
  if (_sim.alpha < _sim.alphaMin && _sim.alphaTarget === 0) {
    _sim.frozen = true;
    return;
  }
  _sim.frozen = false;

  if (!nodes.length) return;

  const alpha = _sim.alpha;
  const N = nodes.length;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;

  // accumulate forces в fxAcc/fyAcc
  for (const n of nodes) { n.fxAcc = 0; n.fyAcc = 0; }

  // adaptive repulsion strength — растёт логарифмически с N
  const kRep = CFG.repulsion * (1 + Math.log(Math.max(1, N / 100))) * alpha;
  const cutoff2 = CFG.repulsionCutoff * CFG.repulsionCutoff;

  if (N > CFG.barnesHutThreshold) {
    const tree = buildQuadtree(nodes);
    for (const n of nodes) {
      const f = computeRepulsion(tree, n, CFG.barnesHutTheta, kRep, cutoff2);
      n.fxAcc += f.fx;
      n.fyAcc += f.fy;
    }
  } else {
    for (let i = 0; i < N; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < N; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 > cutoff2) continue;
        if (d2 < 0.01) {
          const sa = a._seedDx != null ? { dx: a._seedDx, dy: a._seedDy } : seedJitter(a.id || ('n' + i));
          const sb = b._seedDx != null ? { dx: b._seedDx, dy: b._seedDy } : seedJitter(b.id || ('n' + j));
          dx = (sa.dx - sb.dx) || 0.01;
          dy = (sa.dy - sb.dy) || 0.01;
          d2 = dx * dx + dy * dy + 0.01;
        }
        const d = Math.sqrt(d2);
        const f = kRep / d2;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.fxAcc += fx; a.fyAcc += fy;
        b.fxAcc -= fx; b.fyAcc -= fy;
      }
    }
  }

  // spring (hub-safe: strength ~ 1/sqrt(min deg)); усиливаем для leaf-edges.
  // Adopted-edges (orphan → ts-predecessor) участвуют в физике только когда
  // включён connectOrphans. Иначе orphan forest лежит отдельно.
  //
  // connectOrphans передаётся через sim.connectOrphans чтобы core-модуль
  // не зависел от window.__viz.state (развязка core ↔ UI).
  const connectOrphans = !!(sim && sim.connectOrphans);
  for (const e of edges) {
    if (e.adopted && !connectOrphans) continue;
    const a = e.a, b = e.b;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const disp = d - CFG.springLen;
    const degMin = Math.max(1, Math.min(a.degree || 1, b.degree || 1));
    const leafBoost = (degMin === 1) ? CFG.leafSpringBoost : 1;
    const adoptedMul = e.adopted ? 0.4 : 1; // adopted-edge слабее — хронология, не реальная связь
    const kLink = (CFG.spring * leafBoost * adoptedMul / Math.sqrt(degMin)) * alpha;
    const f = kLink * disp;
    const fx = (dx / d) * f, fy = (dy / d) * f;
    a.fxAcc += fx; a.fyAcc += fy;
    b.fxAcc -= fx; b.fyAcc -= fy;
  }

  // central pull — растёт с N (sqrt-scaled), чтобы держать большой граф в окружности
  const centerScale = Math.sqrt(Math.max(1, N / CFG.centerPullScaleN));
  const kCenter = CFG.centerPull * centerScale * alpha;
  for (const n of nodes) {
    n.fxAcc += (cx - n.x) * kCenter;
    n.fyAcc += (cy - n.y) * kCenter;
  }

  // bounds soft-wall
  const pad = CFG.wallPaddingMul;
  const halfW = (viewport.safeW != null ? viewport.safeW : viewport.width) * pad / 2;
  const halfH = (viewport.safeH != null ? viewport.safeH : viewport.height) * pad / 2;
  const wallLeft = cx - halfW, wallRight = cx + halfW;
  const wallTop = cy - halfH, wallBottom = cy + halfH;
  const kWall = CFG.wallStiffness;
  for (const n of nodes) {
    if (n.x < wallLeft) n.fxAcc += (wallLeft - n.x) * kWall;
    else if (n.x > wallRight) n.fxAcc += (wallRight - n.x) * kWall;
    if (n.y < wallTop) n.fyAcc += (wallTop - n.y) * kWall;
    else if (n.y > wallBottom) n.fyAcc += (wallBottom - n.y) * kWall;
  }

  // Velocity Verlet: v = (v + f) * (1 - velocityDecay); x += v
  const friction = 1 - _sim.velocityDecay;
  const maxV = CFG.maxVelocity;
  const maxV2 = maxV * maxV;
  for (const n of nodes) {
    n.vx = (n.vx + n.fxAcc) * friction;
    n.vy = (n.vy + n.fyAcc) * friction;
    // clamp
    const sp2 = n.vx * n.vx + n.vy * n.vy;
    if (sp2 > maxV2) {
      const k = maxV / Math.sqrt(sp2);
      n.vx *= k;
      n.vy *= k;
    }
    n.x += n.vx;
    n.y += n.vy;
  }
}

// 3D вариант stepPhysics — все три оси (x, y, z) полноценно участвуют
// в физике. Для < ~300 нод — O(N²) repulsion (octree пока не делаем).
// Используется только в 3D-режиме (src/3d/main.js); 2D остаётся на 2D.
function stepPhysics3D(nodes, edges, viewport, sim) {
  const _sim = sim || createSim();
  _sim.alpha += (_sim.alphaTarget - _sim.alpha) * _sim.alphaDecay;
  if (_sim.manualFrozen) { _sim.frozen = true; return; }
  if (_sim.alpha < _sim.alphaMin && _sim.alphaTarget === 0) {
    _sim.frozen = true;
    return;
  }
  _sim.frozen = false;
  if (!nodes.length) return;

  const alpha = _sim.alpha;
  const N = nodes.length;
  // 3D-сцена центрируется в (0, 0, 0) — viewport.cx/cy не используем.
  const cx = 0, cy = 0, cz = 0;

  for (const n of nodes) { n.fxAcc = 0; n.fyAcc = 0; n.fzAcc = 0; }

  // Repulsion — O(N²), 3D-distance. На <300 nodes за <2ms на средней
  // машине; для бóльших графов нужен 3D Octree (TODO).
  const kRep = CFG.repulsion * (1 + Math.log(Math.max(1, N / 100))) * alpha;
  const cutoff2 = CFG.repulsionCutoff * CFG.repulsionCutoff;
  for (let i = 0; i < N; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < N; j++) {
      const b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
      let d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > cutoff2) continue;
      if (d2 < 0.01) {
        // deterministic mini-jitter если ноды совпадают
        const sa = a._seedDx != null ? a._seedDx : 0.01;
        const sb = b._seedDx != null ? b._seedDx : -0.01;
        dx = (sa - sb) || 0.01;
        dy = ((a._seedDy || 0) - (b._seedDy || 0)) || 0.01;
        dz = ((sa * 0.7) - (sb * 0.7)) || 0.01;
        d2 = dx * dx + dy * dy + dz * dz + 0.01;
      }
      const d = Math.sqrt(d2);
      const f = kRep / d2;
      const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
      a.fxAcc += fx; a.fyAcc += fy; a.fzAcc += fz;
      b.fxAcc -= fx; b.fyAcc -= fy; b.fzAcc -= fz;
    }
  }

  // Spring — pulls connected nodes к springLen. 3D-distance.
  const connectOrphans = !!(sim && sim.connectOrphans);
  for (const e of edges) {
    if (e.adopted && !connectOrphans) continue;
    const a = e.a, b = e.b;
    const dx = b.x - a.x, dy = b.y - a.y, dz = (b.z || 0) - (a.z || 0);
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
    const disp = d - CFG.springLen;
    const degMin = Math.max(1, Math.min(a.degree || 1, b.degree || 1));
    const leafBoost = (degMin === 1) ? CFG.leafSpringBoost : 1;
    const adoptedMul = e.adopted ? 0.4 : 1;
    const kLink = (CFG.spring * leafBoost * adoptedMul / Math.sqrt(degMin)) * alpha;
    const f = kLink * disp;
    const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
    a.fxAcc += fx; a.fyAcc += fy; a.fzAcc += fz;
    b.fxAcc -= fx; b.fyAcc -= fy; b.fzAcc -= fz;
  }

  // Central pull в (0, 0, 0). Полный 3D — все три оси.
  const centerScale = Math.sqrt(Math.max(1, N / CFG.centerPullScaleN));
  const kCenter = CFG.centerPull * centerScale * alpha;
  for (const n of nodes) {
    n.fxAcc += (cx - n.x) * kCenter;
    n.fyAcc += (cy - n.y) * kCenter;
    n.fzAcc += (cz - (n.z || 0)) * kCenter;
  }

  // Bounds soft-wall — кубическая. Размер берём симметричным от
  // viewport.safeW (как proxy для 3D-куба).
  const pad = CFG.wallPaddingMul;
  const half = (viewport.safeW != null ? viewport.safeW : viewport.width || 1600) * pad / 2;
  const kWall = CFG.wallStiffness;
  for (const n of nodes) {
    if (n.x < -half) n.fxAcc += (-half - n.x) * kWall;
    else if (n.x > half) n.fxAcc += (half - n.x) * kWall;
    if (n.y < -half) n.fyAcc += (-half - n.y) * kWall;
    else if (n.y > half) n.fyAcc += (half - n.y) * kWall;
    const z = n.z || 0;
    if (z < -half) n.fzAcc += (-half - z) * kWall;
    else if (z > half) n.fzAcc += (half - z) * kWall;
  }

  // Velocity Verlet — 3D
  const friction = 1 - _sim.velocityDecay;
  const maxV = CFG.maxVelocity;
  const maxV2 = maxV * maxV;
  for (const n of nodes) {
    if (n.vz == null) n.vz = 0;
    if (n.z == null) n.z = 0;
    n.vx = (n.vx + n.fxAcc) * friction;
    n.vy = (n.vy + n.fyAcc) * friction;
    n.vz = (n.vz + n.fzAcc) * friction;
    const sp2 = n.vx * n.vx + n.vy * n.vy + n.vz * n.vz;
    if (sp2 > maxV2) {
      const k = maxV / Math.sqrt(sp2);
      n.vx *= k; n.vy *= k; n.vz *= k;
    }
    n.x += n.vx;
    n.y += n.vy;
    n.z += n.vz;
  }
}

// 3D prewarm — то же что обычный prewarm, но stepPhysics3D
function prewarm3D(nodes, edges, viewport, sim, iters) {
  const _sim = sim || createSim();
  const _iters = iters != null ? iters : CFG.prewarmIterations;
  const savedTarget = _sim.alphaTarget;
  _sim.alphaTarget = 0;
  for (let i = 0; i < _iters; i++) stepPhysics3D(nodes, edges, viewport, _sim);
  _sim.alphaTarget = savedTarget;
}

function prewarm(nodes, edges, viewport, simOrIters, maybeIters) {
  // Backward-compat: prewarm(nodes, edges, vp) или (nodes, edges, vp, sim) или (nodes, edges, vp, sim, iters)
  // Старый вызов: prewarm(nodes, edges, vp) — используется в 3d/main.js
  let sim, iters;
  if (simOrIters == null) { sim = createSim(); iters = CFG.prewarmIterations; }
  else if (typeof simOrIters === 'number') { sim = createSim(); iters = simOrIters; }
  else { sim = simOrIters; iters = maybeIters != null ? maybeIters : CFG.prewarmIterations; }
  const savedTarget = sim.alphaTarget;
  sim.alphaTarget = 0; // prewarm остывает
  for (let i = 0; i < iters; i++) stepPhysics(nodes, edges, viewport, sim);
  sim.alphaTarget = savedTarget;
}

// ---------- radial / bbox / fit (без изменений) ----------

// Сложение parent-children словаря и списка корней. Дети одного родителя
// сортируются по timestamp для стабильного визуала.
function buildParentChildIndex(nodes, byId) {
  const children = new Map();
  const roots = [];
  for (const n of nodes) children.set(n.id, []);
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) children.get(n.parentId).push(n.id);
    else roots.push(n.id);
  }
  const byTs = (a, b) => (byId.get(a)?.ts || 0) - (byId.get(b)?.ts || 0);
  for (const arr of children.values()) arr.sort(byTs);
  roots.sort(byTs);
  return { children, roots };
}

// Подсчёт листьев в каждом поддереве — определяет угловой share.
function countLeavesPerSubtree(roots, children) {
  const leaves = new Map();
  const visit = (id) => {
    const kids = children.get(id) || [];
    if (!kids.length) { leaves.set(id, 1); return 1; }
    let sum = 0;
    for (const k of kids) sum += visit(k);
    leaves.set(id, sum);
    return sum;
  };
  for (const r of roots) visit(r);
  return leaves;
}

// Один проход sunburst: рисуем ноду на радиусе depth*ring, делим
// угловую долю между детьми пропорционально количеству их листьев.
function assignRadialPosition(id, depth, angleStart, angleEnd, ctx) {
  const { children, leaves, byId, positions, cx, cy, ring } = ctx;
  const mid = (angleStart + angleEnd) / 2;
  const radius = depth * ring;
  const x = cx + Math.cos(mid) * radius;
  const y = cy + Math.sin(mid) * radius;
  positions.set(id, { x, y });
  const n = byId.get(id);
  if (n) { n._radialX = x; n._radialY = y; }
  const kids = children.get(id) || [];
  if (!kids.length) return;
  const total = leaves.get(id);
  let cur = angleStart;
  for (const k of kids) {
    const share = leaves.get(k) / total;
    const next = cur + (angleEnd - angleStart) * share;
    assignRadialPosition(k, depth + 1, cur, next, ctx);
    cur = next;
  }
}

// Sonar S3516 false positive: считает что функция всегда возвращает один
// тот же объект (Map). Reference действительно один, но содержимое мутируется
// через ctx.positions внутри assignRadialPosition — Sonar этого не видит.
function computeRadialLayout(nodes, byId, viewport) { // NOSONAR
  const positions = new Map();
  if (!nodes.length) return positions;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;
  const { children, roots } = buildParentChildIndex(nodes, byId);
  const leaves = countLeavesPerSubtree(roots, children);
  const ctx = { children, leaves, byId, positions, cx, cy, ring: CFG.radialRingGap };

  if (roots.length === 1) {
    assignRadialPosition(roots[0], 0, -Math.PI / 2, (3 * Math.PI) / 2, ctx);
  } else {
    // Несколько roots: каждый занимает свой сектор на depth=1, центр свободен.
    const slice = (Math.PI * 2) / roots.length;
    for (let i = 0; i < roots.length; i++) {
      const a0 = i * slice - Math.PI / 2;
      const a1 = (i + 1) * slice - Math.PI / 2;
      assignRadialPosition(roots[i], 1, a0, a1, ctx);
    }
  }
  return positions;
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Time-as-river (swim-lanes) layout. X — по РАНГУ (индексу после сортировки
 * по ts), не по сырому ts. Это распределяет ноды равномерно и разводит
 * плотные кластеры. Y — по роли (три плавательные дорожки).
 * Внутри lane локальный y-jitter + лёгкий x-offset чтобы ноды с близким
 * рангом не накладывались.
 */
function computeSwimLanes(nodes, viewport) {
  const positions = new Map();
  if (!nodes.length) return positions;
  const W = viewport.safeW != null ? viewport.safeW : viewport.width;
  const H = viewport.safeH != null ? viewport.safeH : viewport.height;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;

  // Длина реки зависит от количества нод: ~40px на ноду, но не меньше 2×W
  const perNode = 40;
  const lineW = Math.max(W * 2.0, nodes.length * perNode);
  const left = cx - lineW / 2;
  const right = cx + lineW / 2;

  // Рангируем по ts (stable: tool_use подноды идут после своего parent assistant)
  const sorted = [...nodes].sort((a, b) => a.ts - b.ts);
  const rankById = new Map();
  sorted.forEach((n, i) => rankById.set(n.id, i));
  const lastRank = Math.max(1, sorted.length - 1);

  const laneSpacing = H * 0.32;
  const laneY = {
    user: cy - laneSpacing,
    assistant: cy,
    tool_use: cy + laneSpacing,
  };

  for (const n of nodes) {
    const rank = rankById.get(n.id) || 0;
    const t = rank / lastRank;
    const lane = laneY[n.role] != null ? laneY[n.role] : cy;
    const yJ = (n._seedDy != null ? n._seedDy : 0) * laneSpacing * 0.45;
    const xJ = (n._seedDx != null ? n._seedDx : 0) * 16;
    const x = left + t * (right - left) + xJ;
    const y = lane + yJ;
    positions.set(n.id, { x, y });
    // Сохраняем target на ноде — чтобы birth-animation в swim-режиме не тянула к parent
    n._swimX = x;
    n._swimY = y;
  }
  return positions;
}

function computeBBox(nodes) {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0, cx: 0, cy: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x - n.r < minX) minX = n.x - n.r;
    if (n.y - n.r < minY) minY = n.y - n.r;
    if (n.x + n.r > maxX) maxX = n.x + n.r;
    if (n.y + n.r > maxY) maxY = n.y + n.r;
  }
  const w = maxX - minX, h = maxY - minY;
  return { minX, minY, maxX, maxY, w, h, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function fitToView(nodes, viewport) {
  const bbox = computeBBox(nodes);
  const areaW = viewport.safeW != null ? viewport.safeW : viewport.width;
  const areaH = viewport.safeH != null ? viewport.safeH : viewport.height;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;
  if (bbox.w <= 0 || bbox.h <= 0) {
    return { scale: 1, x: bbox.cx - cx, y: bbox.cy - cy };
  }
  const scale = Math.min(areaW / bbox.w, areaH / bbox.h) * CFG.fitPadding;
  return {
    scale,
    x: bbox.cx - cx / scale,
    y: bbox.cy - cy / scale,
  };
}

    return { createSim, reheat, freeze, unfreeze, isSettled, seedJitter, stepPhysics, stepPhysics3D, prewarm3D, prewarm, computeRadialLayout, easeInOutQuad, computeSwimLanes, computeBBox, fitToView };
  })();

  // --- src/core/graph.js ---
  __M["src/core/graph.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { seedJitter } = __M["src/core/layout.js"];
    const { markSubagentInputs, markPendingToolUses } = __M["src/core/parser.js"];

function computeRadius(n) {
  const baseR = CFG.minR + 2 * Math.log(n.textLen + 1);
  const clamped = Math.min(CFG.maxR, Math.max(CFG.minR, baseR));
  // tool_use и tool_result — оба вспомогательные ноды tool-цепочки,
  // одинаковый scale чтобы pair выглядел сбалансированно.
  if (n.role === 'tool_use' || n.role === 'tool_result') return Math.max(CFG.minR, clamped * CFG.toolNodeScale);
  // Thinking-ноды чуть меньше assistant'а — полупрозрачное «облако мыслей»
  if (n.role === 'thinking') return Math.max(CFG.minR, clamped * 0.7);
  return clamped;
}

function recomputeRecency(nodes) {
  if (!nodes.length) return;
  let tMin = Infinity, tMax = -Infinity;
  for (const n of nodes) {
    if (n.ts < tMin) tMin = n.ts;
    if (n.ts > tMax) tMax = n.ts;
  }
  const dt = Math.max(1, tMax - tMin);
  for (const n of nodes) {
    n.recency = (n.ts - tMin) / dt;
    n.r = computeRadius(n);
  }
}

// responseLatencyMs — время от parent-ноды до ассистента (proxy на «думал N сек»).
// Для root-assistant без parent → 0. Для tool_use/thinking поднод → 0.
function computeLatencies(nodes, byId) {
  for (const n of nodes) {
    if (n.role !== 'assistant') { n.responseLatencyMs = 0; continue; }
    const parent = n.parentId ? byId.get(n.parentId) : null;
    n.responseLatencyMs = parent ? Math.max(0, n.ts - parent.ts) : 0;
  }
}

function computeDegreesAndHubs(nodes, edges) {
  for (const n of nodes) n.degree = 0;
  for (const e of edges) {
    if (e.a) e.a.degree = (e.a.degree || 0) + 1;
    if (e.b) e.b.degree = (e.b.degree || 0) + 1;
  }
  // p90 of degree
  if (!nodes.length) return;
  const degs = nodes.map(n => n.degree).sort((a, b) => a - b);
  const p90 = degs[Math.floor(degs.length * 0.9)] || 0;
  const hubThreshold = Math.max(3, p90);
  for (const n of nodes) n.isHub = n.degree > hubThreshold;
}

function applySeedJitter(n) {
  const s = seedJitter(n.id || ('n' + Math.random()));
  n._seedDx = s.dx;
  n._seedDy = s.dy;
}

/**
 * Добавляет raw-ноды (от parseLine) в уже существующий state.
 * Дедупит по id. Связи строятся по parentId, если он есть в byId.
 * Возвращает список РЕАЛЬНО добавленных нод.
 */
function appendRawNodes(state, rawNodes, viewport) {
  if (!rawNodes || !rawNodes.length) return [];
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;
  const added = [];
  for (const src of rawNodes) {
    if (state.byId.has(src.id)) continue;
    const parent = src.parentId ? state.byId.get(src.parentId) : null;
    const angle = Math.random() * Math.PI * 2;
    const dist = CFG.springLen * (CFG.birthSpreadMin + Math.random() * (CFG.birthSpreadMax - CFG.birthSpreadMin));
    const node = {
      ...src,
      x: parent ? parent.x + Math.cos(angle) * dist : cx + (Math.random() - 0.5) * 60,
      y: parent ? parent.y + Math.sin(angle) * dist : cy + (Math.random() - 0.5) * 60,
      vx: 0, vy: 0,
      fxAcc: 0, fyAcc: 0,
      r: CFG.minR,
      recency: 1,
      phase: Math.random() * Math.PI * 2,
      degree: 0,
      isHub: false,
    };
    applySeedJitter(node);
    state.nodes.push(node);
    state.byId.set(node.id, node);
    if (parent) {
      state.edges.push({ source: parent.id, target: node.id, a: parent, b: node });
    }
    added.push(node);
  }
  // Live-mode: после добавления нод-инкремента переоцениваем subagent_input
  // (parseLine не имеет полного контекста, ставит role='user', а здесь —
  // имеем все накопленные ноды и можем найти связь user → Task tool_use).
  markSubagentInputs(state.nodes);
  // А также переоцениваем pending tool_use: если новый tool_result наконец
  // пришёл, флаг _isPendingToolUse снимется. Если новый tool_use без ответа
  // — пометится.
  markPendingToolUses(state.nodes);
  recomputeRecency(state.nodes);
  computeDegreesAndHubs(state.nodes, state.edges);
  return added;
}

// Создание одной physics-ноды из raw parsed-данных. Стартовая позиция —
// круг радиуса 80-140 px вокруг центра viewport, чтобы prewarm не начинал
// с одной точки.
function createPhysicsNode(src, index, total, cx, cy) {
  const angle = total ? (index / total) * Math.PI * 2 : 0;
  const spread = 80 + Math.random() * 60;
  const node = {
    ...src,
    x: cx + Math.cos(angle) * spread + (Math.random() - 0.5) * 30,
    y: cy + Math.sin(angle) * spread + (Math.random() - 0.5) * 30,
    vx: 0, vy: 0,
    fxAcc: 0, fyAcc: 0,
    r: CFG.minR,
    recency: 0,
    phase: Math.random() * Math.PI * 2,
    degree: 0,
    isHub: false,
  };
  applySeedJitter(node);
  return node;
}

// Orphan detection: помечаем ноды у которых parentId не в byId (subagent-
// сессии или обрезано maxMessages). Не меняем parentId — создаём
// adopted-edge к ближайшему по ts предшественнику.
function markOrphans(nodes, byId) {
  const sortedByTs = [...nodes].sort((a, b) => a.ts - b.ts);
  for (let i = 0; i < sortedByTs.length; i++) {
    const node = sortedByTs[i];
    if (node.parentId && !byId.has(node.parentId)) {
      node._isOrphanRoot = true;
      const prev = i > 0 ? sortedByTs[i - 1] : null;
      if (prev) node._adoptedParentId = prev.id;
    }
  }
}

// Сборка edge-списка. Real edge — node.parentId известен. Adopted edge —
// fallback для orphan-нод (отрисовывается пунктиром, в физике участвует
// только когда state.connectOrphans=true).
function buildEdges(nodes, byId) {
  const edges = [];
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) {
      edges.push({
        source: node.parentId, target: node.id,
        a: byId.get(node.parentId), b: node, adopted: false,
      });
    } else if (node._adoptedParentId && byId.has(node._adoptedParentId)) {
      const parent = byId.get(node._adoptedParentId);
      edges.push({
        source: parent.id, target: node.id,
        a: parent, b: node, adopted: true,
      });
    }
  }
  return edges;
}

// Эвристика: «дерево» в смысле визуальной читаемости — есть глубина и
// несколько fan-out точек. Используется loader'ом для авто-выбора radial
// layout вместо force при первом open. Простой алгоритм: BFS от roots,
// считаем maxDepth и кол-во nodes с ≥3 children.
function detectTreeShape(nodes, edges) {
  if (nodes.length < 30) return false;
  const childrenByParent = new Map();
  for (const n of nodes) childrenByParent.set(n.id, []);
  for (const e of edges) {
    if (!e.adopted) childrenByParent.get(e.source).push(e.target);
  }
  const roots = nodes.filter(n => !n.parentId || !childrenByParent.has(n.parentId)).map(n => n.id);
  if (!roots.length) return false;
  let maxDepth = 0;
  let bigFanOuts = 0;
  const queue = roots.map(id => [id, 0]);
  while (queue.length) {
    const [id, d] = queue.shift();
    if (d > maxDepth) maxDepth = d;
    const kids = childrenByParent.get(id) || [];
    if (kids.length >= 3) bigFanOuts++;
    for (const k of kids) queue.push([k, d + 1]);
  }
  return maxDepth >= 3 && bigFanOuts >= 2;
}

// Pair edges — соединяют tool_use ноду с user-нодой содержащей matching
// tool_result. Эти связи существуют в JSONL через `tool_use_id`, но не
// материализованы как parent-child. Рисуются пунктиром в renderer'е.
//
// Для parallel Task (4 tool_use → 1 user-message с 4 tool_result) получаем
// 4 разных pairEdge — каждая исходит из своей virtual tool_use ноды
// (`<assistantId>#tu<index>`), все упираются в одну user-message, но визуально
// не overlap'ят потому что start-точки разные.
//
// Также проставляем флаг node.hasErrorTool для всех assistant-нод чьи
// virtual-children-tool_use получили is_error в matching tool_result —
// renderer рисует красную окантовку.
function buildPairEdges(nodes, byId) {
  // toolUseId → source node (virtual tool_use)
  const toolUseIndex = new Map();
  for (const n of nodes) {
    if (n.toolUseId) toolUseIndex.set(n.toolUseId, n);
  }
  const pairs = [];
  for (const n of nodes) {
    if (!n.toolResultIds || !n.toolResultIds.length) continue;
    for (const tuid of n.toolResultIds) {
      const src = toolUseIndex.get(tuid);
      if (!src) continue; // tool_use не нашёлся (orphan tool_result)
      pairs.push({ source: src.id, target: n.id, a: src, b: n });
      // Mark error на assistant если её tool_use получил is_error result
      if (n.hasError) {
        const assistantId = src.parentId; // virtual-tool_use's parent = assistant
        const assistant = byId.get(assistantId);
        if (assistant) assistant._hasErrorTool = true;
        src._isErrorToolUse = true; // на самой tool_use ноде тоже отметим
      }
    }
  }
  return pairs;
}

function buildGraph(parsed, viewport) {
  const { width, height } = viewport;
  const cx = width / 2, cy = height / 2;
  const total = parsed.nodes.length;

  const nodes = parsed.nodes.map((src, i) => createPhysicsNode(src, i, total, cx, cy));
  const byId = new Map(nodes.map(node => [node.id, node]));

  markOrphans(nodes, byId);
  const edges = buildEdges(nodes, byId);
  const pairEdges = buildPairEdges(nodes, byId);
  recomputeRecency(nodes);
  computeDegreesAndHubs(nodes, edges);
  computeLatencies(nodes, byId);

  return { nodes, edges, byId, pairEdges };
}

    return { appendRawNodes, detectTreeShape, buildGraph };
  })();

  // --- src/core/session-bridge.js ---
  __M["src/core/session-bridge.js"] = (function () {
// Передаёт последний загруженный JSONL между 2D ↔ 3D режимами через
// sessionStorage. sessionStorage живёт в рамках одной вкладки, поэтому
// клик «3D →» (без target="_blank") сохраняет данные, а «← back to 2D»
// восстанавливает. Не засоряет localStorage навсегда.
//
// Limit: sessionStorage в большинстве браузеров ~5MB на origin. Сессии
// обычно помещаются, но для 30+ MB файлов сохраняем не контент, а
// просто маркер «файл был большой — загрузи снова». Пользователь
// увидит sample и должен дропнуть файл повторно.

const KEY = 'viz:last-jsonl';
const KEY_NAME = 'viz:last-jsonl-name';
// ~4 MB — с запасом до quota ~5MB
const MAX_BYTES = 4 * 1024 * 1024;

/** Сохранить JSONL для следующего режима. Возвращает true если получилось. */
function saveSessionForHandoff(text, name) {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    if (!text || typeof text !== 'string') return false;
    // Быстрая проверка по длине (UTF-16 в JS → 2 байта на символ в worst case,
    // но sessionStorage обычно считает в UTF-16-codeunit-длине, что равно .length).
    if (text.length * 2 > MAX_BYTES) {
      // Не сохраняем контент, но запоминаем имя, чтобы можно было сообщить
      sessionStorage.setItem(KEY_NAME, name || 'large-session');
      sessionStorage.removeItem(KEY);
      return false;
    }
    sessionStorage.setItem(KEY, text);
    if (name) sessionStorage.setItem(KEY_NAME, name);
    return true;
  } catch {
    // QuotaExceededError или private-mode
    try { sessionStorage.removeItem(KEY); } catch {}
    return false;
  }
}

/** Получить JSONL, сохранённый предыдущим режимом. */
function loadSessionForHandoff() {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const text = sessionStorage.getItem(KEY);
    const name = sessionStorage.getItem(KEY_NAME);
    return text ? { text, name } : null;
  } catch {
    return null;
  }
}

/** Если пользователь сам выбрал sample — мы не хотим перезаписывать handoff */
function clearSessionForHandoff() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY_NAME);
  } catch {}
}

    return { saveSessionForHandoff, loadSessionForHandoff, clearSessionForHandoff };
  })();

  // --- src/core/url-safety.js ---
  __M["src/core/url-safety.js"] = (function () {
// URL safety helpers. Все внешние URL, принимаемые от пользователя (через
// ?jsonl=, ?sessions=, ?live=, live-input field), проходят через
// isSafeHttpUrl() перед fetch. Цель — ограничить схемы до http(s), чтобы
// исключить javascript:/data:/blob:/file:/ftp:/ws: и прочий неожиданный
// фан. `fetch()` по спеке сам отклоняет javascript: и data: для
// non-navigable requests, но явная проверка читабельнее и защищает от
// случайных багов дальше по коду (location.href = url и т.д.).
//
// Это НЕ защита от SSRF в полном смысле — браузер и так не даёт прочитать
// cross-origin ответ без CORS-заголовков. Но crafted `?jsonl=http://192.168.x.x/admin`
// может вызвать preflight OPTIONS на внутренний сервер, что само по себе
// может быть нежелательно. Fix ниже не блокирует intranet URL (это сломало
// бы ?live=http://localhost:8080/stream для dev use-case), но предупреждает
// в консоль.

const SAFE_SCHEMES = new Set(['http:', 'https:']);

/**
 * Проверяет, что URL — это корректный HTTP(S). Относительные URL тоже OK
 * (they resolve on same origin, так что не дают выйти за пределы).
 * @param {string} url
 * @param {string} [baseUrl] — если передан, относительные резолвятся от него
 * @returns {boolean}
 */
function isSafeHttpUrl(url, baseUrl) {
  if (typeof url !== 'string' || !url) return false;
  // Относительный URL — считаем безопасным (same-origin)
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return true;
  try {
    const parsed = new URL(url, baseUrl || (typeof window !== 'undefined' ? window.location.href : 'http://localhost/'));
    return SAFE_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Оборачивает fetch с предварительной проверкой схемы. Если URL небезопасен —
 * возвращает Promise.reject(Error('unsafe URL scheme')) без отправки запроса.
 *
 * Использование:
 *   import { safeFetch } from '../core/url-safety.js';
 *   const res = await safeFetch(userUrl, { credentials: 'same-origin' });
 */
function safeFetch(url, opts) {
  if (!isSafeHttpUrl(url)) {
    return Promise.reject(new Error('Unsafe URL scheme (only http/https/relative allowed): ' + String(url).slice(0, 80)));
  }
  return fetch(url, opts);
}

/**
 * Warn-только эвристика: является ли URL intranet/loopback. Сам по себе
 * запрос не блокирует (dev-сценарий ?live=http://localhost:3000/session.jsonl
 * должен работать), но выведет предупреждение в консоль.
 */
function isLikelyIntranet(url) {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
    const h = u.hostname;
    return h === 'localhost'
      || h === '127.0.0.1'
      || /^10\./.test(h)
      || /^192\.168\./.test(h)
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
      || h.endsWith('.local');
  } catch {
    return false;
  }
}

    return { isSafeHttpUrl, safeFetch, isLikelyIntranet };
  })();

  // --- src/core/i18n.js ---
  __M["src/core/i18n.js"] = (function () {
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
    'header.subtitle_force': 'v1.6.0 · force-directed',
    'header.subtitle_standalone': 'v1.6.0 · standalone bundle',
    'header.subtitle_3d': 'Three.js · glowing orbs',

    // Primary buttons
    'btn.sample': 'Examples ▾',
    'sample.basic': 'Basic — debug session (~40 nodes)',
    'sample.orchestration': '🤖 Multi-agent — security audit, 4 parallel subagents (~50 nodes)',
    'sample.deep_orchestration': '🤖🤖 Deep orchestration — refactor monorepo, 2-level subagent spawn (~60 nodes)',
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
    'tip.camera_rotate_on': 'Auto-rotate camera + центрировать',
    'tip.camera_rotate_off': 'Stop auto-rotate',
    'tip.camera_reset': 'Center camera on all nodes',
    'tip.drift_on': 'Drift mode ON — лёгкое движение нод',
    'tip.drift_off': 'Drift mode OFF',
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
    'tip.role_user': 'Toggle user (incl. subagent prompts)',
    'tip.role_assistant': 'Toggle assistant',
    'tip.role_tool_use': 'Toggle tool_use (incl. tool_result)',
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
    'stats.nodes': 'nodes',
    'stats.edges': 'edges',
    'stats.lines': 'lines',
    'stats.parsed': 'parsed',
    'stats.kept': 'kept',
    'stats.skipped': 'skipped',
    'stats.errors': 'errors',
    'stats.compactions': 'compactions',

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
    'settings.group.display': 'Display',
    'settings.group.metrics': 'Metrics',
    'settings.group.advanced': 'Advanced',
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
    'settings.cameraRotateSpeed': 'Camera rotate speed (3D)',
    'settings.stepMs': 'Play step interval (ms)',
    'settings.charMs': 'Typewriter speed (ms/char)',
    'settings.maxChars': 'Max chars per bubble',
    'settings.postGapMs': 'Min gap between bubbles',
    'settings.birthMs': 'Birth animation (ms)',
    'settings.showReverseSignal': 'Reverse signal (tool_result → tool_use)',
    'settings.showForwardSignal': 'Forward signal — particles along edges (3D)',
    'settings.showErrorRings': 'Error rings (red dashed)',
    'settings.showThinking': 'Thinking blocks (purple)',
    'settings.showMetrics': 'Token & duration badges',
    'settings.useCanvas2D': 'Use Canvas 2D fallback (WebGL by default)',
    'settings.timelineByCount': 'Play slider — равномерно по count нод (вместо ts)',
    'settings.show3DHoverPreview': '3D — show node preview on hover',

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
    'header.subtitle_force': 'v1.6.0 · force-directed',
    'header.subtitle_standalone': 'v1.6.0 · standalone-сборка',
    'header.subtitle_3d': 'Three.js · светящиеся орбы',

    'btn.sample': 'Примеры ▾',
    'sample.basic': 'Базовый — debug-сессия (~40 нод)',
    'sample.orchestration': '🤖 Multi-agent — security audit, 4 параллельных subagent-а (~50 нод)',
    'sample.deep_orchestration': '🤖🤖 Deep orchestration — рефактор монорепо, 2-уровневый spawn (~60 нод)',
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
    'tip.camera_rotate_on': 'Вращение камеры + центрировать',
    'tip.camera_rotate_off': 'Остановить вращение',
    'tip.camera_reset': 'Центрировать на все ноды',
    'tip.drift_on': 'Drift — лёгкое движение нод',
    'tip.drift_off': 'Выключить drift',
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
    'tip.role_user': 'Скрыть/показать user (вкл. subagent-промпты)',
    'tip.role_assistant': 'Скрыть/показать assistant',
    'tip.role_tool_use': 'Скрыть/показать tool_use (вкл. tool_result)',
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
    'stats.hubs': 'хабы',
    'stats.longest': 'самое длинное',
    'stats.timeline': 'шкала',
    'stats.nodes': 'нод',
    'stats.edges': 'связей',
    'stats.lines': 'строк',
    'stats.parsed': 'разобрано',
    'stats.kept': 'оставлено',
    'stats.skipped': 'пропущено',
    'stats.errors': 'ошибок',
    'stats.compactions': 'сжатий',

    'detail.empty': '(пусто)',
    'detail.star': '☆ Звезда',
    'detail.starred': '★ Отмечено',

    'bookmarks.header': '⭐ Закладки',
    'bookmarks.empty': 'В этой сессии нет закладок.',

    'settings.group.physics': 'Физика',
    'settings.group.visual': 'Визуал',
    'settings.group.playback': 'Воспроизведение',
    'settings.group.birth': 'Анимация рождения',
    'settings.group.display': 'Отображение',
    'settings.group.metrics': 'Метрики',
    'settings.group.advanced': 'Продвинутые',
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
    'settings.cameraRotateSpeed': 'Скорость вращения камеры (3D)',
    'settings.stepMs': 'Интервал шага play (мс)',
    'settings.charMs': 'Скорость печати (мс/символ)',
    'settings.maxChars': 'Макс. символов в пузыре',
    'settings.postGapMs': 'Мин. пауза между пузырями',
    'settings.birthMs': 'Анимация рождения (мс)',
    'settings.showReverseSignal': 'Обратный сигнал (tool_result → tool_use)',
    'settings.showForwardSignal': 'Сигнал вдоль связей в 3D (частицы)',
    'settings.showErrorRings': 'Кольца ошибок (красные пунктиры)',
    'settings.showThinking': 'Thinking-блоки (фиолетовые)',
    'settings.showMetrics': 'Бейджи токенов и времени',
    'settings.useCanvas2D': 'Canvas 2D вместо WebGL (fallback)',
    'settings.timelineByCount': 'Слайдер play — равномерно по нодам (вместо ts)',
    'settings.show3DHoverPreview': '3D — превью ноды при наведении',

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

function initI18n() {
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

function getLanguage() { return _lang; }

function setLanguage(lang) {
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
function t(key, params) {
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
function applyTranslations(root) {
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

    return { initI18n, getLanguage, setLanguage, t, applyTranslations };
  })();

  // --- src/view/state.js ---
  __M["src/view/state.js"] = (function () {
const state = {
  nodes: [],
  edges: [],
  pairEdges: [], // tool_use → tool_result связи (через tool_use_id), пунктиром
  byId: new Map(),
  selected: null,
  hover: null,
  camera: { x: 0, y: 0, scale: 1 },
  stats: null,
  running: true,
  timelineMax: 1,
  pathSet: new Set(),
  stars: [],
  cameraTarget: null,
  searchMatches: new Set(),
  searchActive: null,
  hiddenRoles: new Set(),
  layoutMode: 'force', // 'force' | 'radial'
  perfMode: 'normal',  // 'normal' | 'degraded' | 'minimal'
  sim: null,           // Physics simulation state (createSim)
  playSpeed: 1,        // 0.5 | 1 | 2 | 5
  connectOrphans: false, // B+D по умолчанию: orphan forest + маркеры
  collapsed: new Set(), // nodeId → tool_use-дети скрыты
  topicsMode: false, // TF-IDF topic coloring
  topicFilter: null, // string | null — если задан, подсвечиваем только ноды с таким _topicWord
  diffMode: false,     // сравнение двух сессий
  // diffStats — объект со счётчиками: onlyA, onlyB, both
  diffStats: null,
  // sessions — массив объектов с полями id, name, size, content, meta, remoteUrl?
  sessions: [],
  sessionsOpen: false, // панель session-picker открыта
  isPlaying: false,    // зеркало timeline.playing (для story-mode без циклических импортов)
  annotations: new Map(), // nodeId → { text, starred, ts } (пользовательские заметки/закладки)
  renderBackend: 'webgl', // 'canvas2d' | 'webgl' — WebGL по умолчанию (красивее и быстрее; 2D как fallback)
  showReverseSignal: true,// анимированный обратный импульс tool_result → tool_use
  showForwardSignal: true,// частицы вдоль обычных edges (parent → child) в 3D
  showErrorRings: true,   // красные пунктирные кольца у нод с tool error
  showThinking: true,     // фиолетовые thinking-ноды как virtual children
  showMetrics: false,     // бейджи: tokens на assistant, ⏱ на долгих ожиданиях
  useCanvas2D: false,     // сила Canvas 2D fallback (продвинутая опция в Settings)
  timelineByCount: false, // play slider — равномерно по count нод (true) или по ts (false, default)
  show3DHoverPreview: false, // в 3D — показывать tooltip при hover на ноду (по умолчанию off, чтобы не отвлекало при панорамировании)
};

function resetInteractionState() {
  state.selected = null;
  state.hover = null;
  state.pathSet = new Set();
}

    return { resetInteractionState, state };
  })();

  // --- src/view/camera.js ---
  __M["src/view/camera.js"] = (function () {
function worldToScreen(wx, wy, cam) {
  return { x: (wx - cam.x) * cam.scale, y: (wy - cam.y) * cam.scale };
}

function screenToWorld(sx, sy, cam) {
  return { x: sx / cam.scale + cam.x, y: sy / cam.scale + cam.y };
}

function applyZoom(cam, factor, anchorSx, anchorSy, min, max) {
  const before = screenToWorld(anchorSx, anchorSy, cam);
  cam.scale *= factor;
  if (cam.scale < min) cam.scale = min;
  if (cam.scale > max) cam.scale = max;
  const after = screenToWorld(anchorSx, anchorSy, cam);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
}

    return { worldToScreen, screenToWorld, applyZoom };
  })();

  // --- src/view/path.js ---
  __M["src/view/path.js"] = (function () {
function pathToRoot(node, byId, maxDepth = 500) {
  const ids = new Set();
  if (!node) return ids;
  let cur = node;
  let depth = 0;
  while (cur && !ids.has(cur.id) && depth++ < maxDepth) {
    ids.add(cur.id);
    if (!cur.parentId) break;
    const next = byId.get(cur.parentId);
    if (!next) break;
    cur = next;
  }
  return ids;
}

    return { pathToRoot };
  })();

  // --- src/view/particles.js ---
  __M["src/view/particles.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];

function controlPoint(a, b, strength) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const offset = len * strength;
  return {
    x: midX - (dy / len) * offset,
    y: midY + (dx / len) * offset,
  };
}

function bezierPoint(a, b, cp, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * cp.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * cp.y + t * t * b.y,
  };
}

// Касательная в точке t (нужно для perpendicular jitter)
function bezierTangent(a, b, cp, t) {
  return {
    x: 2 * (1 - t) * (cp.x - a.x) + 2 * t * (b.x - cp.x),
    y: 2 * (1 - t) * (cp.y - a.y) + 2 * t * (b.y - cp.y),
  };
}

function advanceParticle(progress, dt, speed) {
  let p = progress + dt * speed;
  while (p > 1) p -= 1;
  while (p < 0) p += 1;
  return p;
}

function ensureParticles(edges) {
  for (const e of edges) {
    if (!e.particles) {
      e.particles = [];
      for (let i = 0; i < CFG.particlesPerEdge; i++) {
        e.particles.push({ progress: (i + Math.random()) / CFG.particlesPerEdge });
      }
    }
  }
}

function tickParticles(edges, dt) {
  for (const e of edges) {
    if (!e.particles) continue;
    for (const p of e.particles) {
      p.progress = advanceParticle(p.progress, dt, CFG.particleSpeed);
    }
  }
}

function colorsFor(role) {
  if (role === 'tool_use') return { core: '255, 220, 170', mid: '255, 180, 90', halo: '255, 140, 50' };
  return { core: '240, 250, 255', mid: '160, 230, 255', halo: '70, 190, 255' };
}

function drawSpark(ctx, edge, cp, progress, edgeAlpha, camera, perfMode) {
  const a = { x: edge.a.x, y: edge.a.y };
  const b = { x: edge.b.x, y: edge.b.y };
  const colors = colorsFor(edge.b.role);
  // degraded: короче trail, без halo
  const trailN = perfMode === 'degraded' ? 2 : CFG.particleTrailLen;
  const gap = CFG.particleTrailGap;
  const sz = CFG.particleSize;
  const jitter = CFG.particleJitterPx;

  // Случайная вспышка — увеличивает halo на этом кадре
  const flash = Math.random() < CFG.particleFlashChance ? CFG.particleFlashMul : 1;

  for (let k = 0; k < trailN; k++) {
    const t = progress - k * gap;
    if (t < 0 || t > 1) continue;
    const wp = bezierPoint(a, b, cp, t);
    let sx = (wp.x - camera.x) * camera.scale;
    let sy = (wp.y - camera.y) * camera.scale;

    // Perpendicular к касательной для jitter
    const tan = bezierTangent(a, b, cp, t);
    const tanLen = Math.hypot(tan.x, tan.y) || 1;
    const perpX = -tan.y / tanLen;
    const perpY = tan.x / tanLen;

    // Jitter — яркий для ядра, умеренный для хвоста
    const headFactor = k === 0 ? 1 : 0.4;
    const jitterAmt = (Math.random() - 0.5) * jitter * 2 * headFactor;
    sx += perpX * jitterAmt;
    sy += perpY * jitterAmt;

    const envelope = Math.sin(progress * Math.PI) * 1.4;
    const progressFade = Math.min(1, Math.max(0, envelope));
    const trailFade = 1 - k / trailN;
    const alpha = progressFade * trailFade * edgeAlpha;
    if (alpha < 0.02) continue;

    if (perfMode !== 'degraded') {
      // Full quality: halo + mid + core
      const haloR = sz * CFG.particleHaloMul * trailFade * flash;
      ctx.fillStyle = `rgba(${colors.halo}, ${alpha * 0.22})`;
      ctx.beginPath();
      ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
      ctx.fill();

      const midR = sz * CFG.particleMidMul * trailFade;
      ctx.fillStyle = `rgba(${colors.mid}, ${alpha * 0.55})`;
      ctx.beginPath();
      ctx.arc(sx, sy, midR, 0, Math.PI * 2);
      ctx.fill();
    }

    const coreR = Math.max(0.6, sz * trailFade * 0.7);
    ctx.fillStyle = `rgba(${colors.core}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEdgeFlash(ctx, edge, cp, camera, ageFrac, edgeAlpha) {
  const colors = colorsFor(edge.b.role);
  const aScreen = { x: (edge.a.x - camera.x) * camera.scale, y: (edge.a.y - camera.y) * camera.scale };
  const bScreen = { x: (edge.b.x - camera.x) * camera.scale, y: (edge.b.y - camera.y) * camera.scale };
  const cpScreen = { x: (cp.x - camera.x) * camera.scale, y: (cp.y - camera.y) * camera.scale };
  const intensity = Math.pow(1 - ageFrac, 2) * edgeAlpha;

  // outer aura
  ctx.strokeStyle = `rgba(${colors.halo}, ${0.45 * intensity})`;
  ctx.lineWidth = CFG.edgeFlashLineWidth * 2.5;
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();

  // mid
  ctx.strokeStyle = `rgba(${colors.mid}, ${0.75 * intensity})`;
  ctx.lineWidth = CFG.edgeFlashLineWidth * 1.3;
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();

  // bright core
  ctx.strokeStyle = `rgba(${colors.core}, ${intensity})`;
  ctx.lineWidth = CFG.edgeFlashLineWidth * 0.6;
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();
}

function drawParticles(ctx, edges, camera, alphaOf) {
  const nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const e of edges) {
    if (!e.particles) continue;
    const edgeAlpha = alphaOf ? alphaOf(e) : 1;
    if (edgeAlpha <= 0.02) continue;
    const cp = controlPoint({ x: e.a.x, y: e.a.y }, { x: e.b.x, y: e.b.y }, CFG.edgeCurveStrength);

    // Редко триггерим полный разряд по ребру
    if (!e.flashStartMs && Math.random() < CFG.edgeFlashChance) {
      e.flashStartMs = nowMs;
    }
    if (e.flashStartMs != null) {
      const age = nowMs - e.flashStartMs;
      if (age >= CFG.edgeFlashDurationMs) {
        e.flashStartMs = null;
      } else {
        drawEdgeFlash(ctx, e, cp, camera, age / CFG.edgeFlashDurationMs, edgeAlpha);
      }
    }

    for (const p of e.particles) {
      drawSpark(ctx, e, cp, p.progress, edgeAlpha, camera);
    }
  }
  ctx.globalCompositeOperation = prev;
}

    return { controlPoint, bezierPoint, advanceParticle, ensureParticles, tickParticles, drawParticles };
  })();

  // --- src/view/starfield.js ---
  __M["src/view/starfield.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateStarfield(count, seed = 1337, range = CFG.starWorldRange) {
  const rng = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (rng() - 0.5) * range * 2,
      y: (rng() - 0.5) * range * 2,
      depth: CFG.starDepthMin + rng() * (CFG.starDepthMax - CFG.starDepthMin),
      size: 0.3 + rng() * 1.3,
      alpha: 0.18 + rng() * 0.6,
      phase: rng() * Math.PI * 2,
    });
  }
  return stars;
}

function starScreen(star, camera) {
  return {
    x: star.x - camera.x * star.depth,
    y: star.y - camera.y * star.depth,
  };
}

function drawStarfield(ctx, stars, camera, viewport, tSec) {
  const W = viewport.width, H = viewport.height;
  for (const s of stars) {
    const p = starScreen(s, camera);
    if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4) continue;
    const twinkle = 0.85 + 0.15 * Math.sin(tSec * 0.7 + s.phase);
    ctx.fillStyle = `rgba(200, 220, 255, ${s.alpha * twinkle})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

    return { generateStarfield, starScreen, drawStarfield };
  })();

  // --- src/view/tool-icons.js ---
  __M["src/view/tool-icons.js"] = (function () {
// Unicode-символы (одноцветные, без emoji — стабильный рендер в canvas)
const TOOL_ICON_MAP = {
  bash: '▶',
  powershell: '▶',
  shell: '▶',
  read: '≡',
  grep: '⌕',
  glob: '✱',
  find: '⌕',
  write: '✎',
  edit: '✎',
  multiedit: '✎',
  notebookedit: '✎',
  task: '◇',
  agent: '◇',
  skill: '✦',
  webfetch: '↗',
  websearch: '↗',
  todowrite: '☑',
  exitplanmode: '✓',
  enterplanmode: '☰',
  askuserquestion: '?',
  schedulewakeup: '⏱',
  toolsearch: '⌘',
};

function toolIcon(toolName) {
  if (!toolName) return '•';
  const key = String(toolName).toLowerCase().replace(/[^a-z]/g, '');
  if (TOOL_ICON_MAP[key]) return TOOL_ICON_MAP[key];
  // Попробуем распознать по содержимому (mcp__server__foo_bar → foo_bar)
  const tail = key.replace(/^mcp/, '').replace(/^[a-z]+?(?=[A-Z])/, '');
  if (TOOL_ICON_MAP[tail]) return TOOL_ICON_MAP[tail];
  // Fallback — первая буква в uppercase
  return String(toolName).trim().charAt(0).toUpperCase() || '•';
}

    return { toolIcon };
  })();

  // --- src/view/topics.js ---
  __M["src/view/topics.js"] = (function () {
// TF-IDF topic clustering. Для каждой ноды считаем top-слово по TF-IDF,
// хешируем его в hue → ноды с похожей темой окрашены в похожий оттенок.
// Без LLM, без внешних зависимостей. Stopwords — минимальный набор RU/EN.

const STOPWORDS = new Set([
  // English
  'the','a','an','and','or','but','if','then','else','of','to','in','on','at','for','with','by','as','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','should','could','can','may','might','must','shall','this','that','these','those','i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their','what','which','who','whom','where','when','why','how','no','not','so','all','any','each','few','more','most','other','some','such','only','own','same','than','too','very','just','now','also','one','two','three',
  // Russian
  'и','а','но','или','если','то','что','как','так','да','нет','он','она','оно','они','я','ты','мы','вы','это','этот','эта','эти','тот','та','те','же','ли','бы','был','была','были','есть','будет','был','не','ни','для','про','с','к','по','у','во','на','о','об','от','до','из','за','над','под','между','через','при','перед','после','без','при','может','можно','нужно','надо','очень','ещё','еще','уже','только','также','когда','где','кто','чей','какой','который','всё','все','весь','сам','себя','свой','мой','твой','наш','ваш','их','ему','его','её','нас','вас',
  // Code-noise
  'function','const','let','var','return','if','else','for','while','true','false','null','undefined','this','new','class','import','export','from','default','async','await',
]);

function tokenize(text) {
  if (!text) return [];
  // Убираем URL, пунктуацию; оставляем буквы, цифры, дефис
  const cleaned = String(text).replace(/https?:\/\/\S+/g, ' ').toLowerCase();
  return cleaned.split(/[^\p{L}\p{N}-]+/u)
    .filter(w => w.length >= 3 && w.length <= 24 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Анализирует ноды, для каждой возвращает top-1 «тематическое» слово.
 *
 * Классический TF-IDF оверкомпенсирует редкие слова: глагол встречается в
 * одной ноде (df=1) → максимальный IDF → побеждает реальную тему
 * (df=3-5). Поэтому используем **обратную** стратегию: хотим слова,
 * которые ПОВТОРЯЮТСЯ в корпусе (это и есть темы), но сфокусированы в
 * конкретной ноде.
 *
 * Формула: score = tf × log(1 + df). Singleton-слова (df=1) отбрасываются
 * полностью — они либо шум, либо уникальный контекст, непригодный для
 * кластеризации. Fallback: если у ноды нет ни одного не-singleton слова,
 * берём слово с максимальным df среди её токенов.
 *
 * @param {Array} nodes — state.nodes
 * @returns {Map<nodeId, { topWord: string, score: number }>}
 */
// Document frequency — в скольких уникальных нодах встречается каждое слово.
function buildDocFrequency(tokensById) {
  const df = new Map();
  for (const toks of tokensById.values()) {
    for (const w of new Set(toks)) df.set(w, (df.get(w) || 0) + 1);
  }
  return df;
}

// Term frequency — сколько раз слово встречается в одной ноде.
function buildTermFrequency(toks) {
  const tf = new Map();
  for (const w of toks) tf.set(w, (tf.get(w) || 0) + 1);
  return tf;
}

// Основной выбор: среди слов с df >= 2 выбираем то у которого максимальный
// score = tf × log(1 + df). Singleton-слова (df=1) отбрасываем — они не
// кластеризуются.
function pickRecurringTop(tf, df) {
  let best = null, bestScore = 0;
  for (const [w, c] of tf) {
    const d = df.get(w) || 0;
    if (d < 2) continue;
    const score = c * Math.log(1 + d);
    if (score > bestScore) { bestScore = score; best = w; }
  }
  return best ? { topWord: best, score: bestScore } : null;
}

// Fallback когда у ноды нет recurring-слов (например корпус = 1 нода):
// просто берём слово с максимальным df в корпусе.
function pickFallbackByDf(tf, df) {
  let best = null, maxDf = 0;
  for (const w of tf.keys()) {
    const d = df.get(w) || 0;
    if (d > maxDf) { maxDf = d; best = w; }
  }
  return best ? { topWord: best, score: maxDf } : null;
}

function computeTopics(nodes) {
  const result = new Map();
  if (!nodes || !nodes.length) return result;
  // Tokenize все ноды один раз — переиспользуется для DF и TF.
  const tokensById = new Map();
  for (const n of nodes) tokensById.set(n.id, tokenize(n.text || ''));
  const df = buildDocFrequency(tokensById);

  for (const n of nodes) {
    const toks = tokensById.get(n.id) || [];
    if (!toks.length) { result.set(n.id, null); continue; }
    const tf = buildTermFrequency(toks);
    const top = pickRecurringTop(tf, df) || pickFallbackByDf(tf, df);
    result.set(n.id, top);
  }
  return result;
}

// FNV-1a hash → 0..1 для hue
function hashHue(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967296);
}

/**
 * Применяет topic colors к нодам — сохраняет на n._topicHue (0..1).
 * Если у ноды нет topic — _topicHue = null.
 */
function applyTopicsToNodes(nodes) {
  const topics = computeTopics(nodes);
  for (const n of nodes) {
    const t = topics.get(n.id);
    if (t && t.topWord) {
      n._topicWord = t.topWord;
      n._topicHue = hashHue(t.topWord);
    } else {
      n._topicWord = null;
      n._topicHue = null;
    }
  }
  // Top-5 тем в корпусе
  const wordScores = new Map();
  for (const n of nodes) {
    if (!n._topicWord) continue;
    wordScores.set(n._topicWord, (wordScores.get(n._topicWord) || 0) + 1);
  }
  return [...wordScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

/** HSL → hex helper. */
function hueToRgbaString(hue, saturation = 0.65, lightness = 0.6, alpha = 1) {
  const h = hue * 360;
  const s = saturation;
  const l = lightness;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}

    return { computeTopics, hashHue, applyTopicsToNodes, hueToRgbaString };
  })();

  // --- src/view/renderer.js ---
  __M["src/view/renderer.js"] = (function () {
    const { CFG, COLORS } = __M["src/core/config.js"];
    const { worldToScreen } = __M["src/view/camera.js"];
    const { controlPoint } = __M["src/view/particles.js"];
    const { toolIcon } = __M["src/view/tool-icons.js"];
    const { hueToRgbaString } = __M["src/view/topics.js"];

function timelineCutoff(state) {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

// Diff palette
//   A-only: розовато-фуксиевый (теряется в A)
//   B-only: бирюзовый (добавлено в B)
//   both  : нейтрально-тёплый серый
function diffGlowRgba(origin, alpha) {
  if (origin === 'A') return `rgba(255, 96, 175, ${alpha})`;
  if (origin === 'B') return `rgba(90, 210, 255, ${alpha})`;
  return `rgba(200, 200, 210, ${alpha * 0.75})`;
}
function diffCoreRgba(origin, alpha) {
  if (origin === 'A') return `rgba(255, 130, 190, ${alpha})`;
  if (origin === 'B') return `rgba(120, 220, 255, ${alpha})`;
  return `rgba(220, 220, 230, ${alpha})`;
}
function diffCoreDark(origin, alpha) {
  if (origin === 'A') return `rgba(140, 30, 90, ${alpha})`;
  if (origin === 'B') return `rgba(20, 100, 140, ${alpha})`;
  return `rgba(120, 120, 130, ${alpha})`;
}

// subagent_input — машинный prompt от Lead к саб-агенту (parent: Task tool_use).
// Тон: десатурированный сине-стальной — намёк «полу-пользователь, полу-машина»;
// явно отличается от живого user (saturated blue) и от tool_use (orange).
//
// tool_result — pure возврат от tool'а (user-message без своего текста).
// Тон: приглушённый peach-amber — связан с tool_use orange но темнее.
function glowRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffGlowRgba(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.7, 0.6, alpha);
  }
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'subagent_input') return `rgba(140, 165, 200, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  if (role === 'tool_result') return `rgba(200, 145, 80, ${alpha})`;
  if (role === 'thinking') return `rgba(181, 140, 255, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffCoreRgba(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.75, 0.62, alpha);
  }
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'subagent_input') return `rgba(140, 165, 200, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  if (role === 'tool_result') return `rgba(200, 145, 80, ${alpha})`;
  if (role === 'thinking') return `rgba(181, 140, 255, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreDarkRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffCoreDark(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.8, 0.35, alpha);
  }
  if (role === 'user') return `rgba(60, 100, 170, ${alpha})`;
  if (role === 'subagent_input') return `rgba(70, 95, 135, ${alpha})`;
  if (role === 'tool_use') return `rgba(140, 80, 30, ${alpha})`;
  if (role === 'tool_result') return `rgba(115, 75, 30, ${alpha})`;
  if (role === 'thinking') return `rgba(95, 70, 160, ${alpha})`;
  return `rgba(30, 110, 95, ${alpha})`;
}

function edgeRgba(childRole, alpha, edge, diffMode) {
  if (diffMode && edge && edge.diffSide === 'B') return `rgba(90, 210, 255, ${alpha * 1.1})`;
  if (childRole === 'tool_use') return `rgba(236, 160, 64, ${alpha * 1.28})`;
  if (childRole === 'tool_result') return `rgba(200, 145, 80, ${alpha * 1.15})`;
  if (childRole === 'thinking') return `rgba(181, 140, 255, ${alpha * 1.05})`;
  if (childRole === 'subagent_input') return `rgba(140, 165, 200, ${alpha * 1.1})`;
  return `rgba(0, 212, 255, ${alpha})`;
}

function birthFactor(bornAt, now, duration) {
  if (bornAt == null) return 0;
  const t = (now - bornAt) / duration;
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  return t;
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function updateBirths(state, cutoff, nowMs, onBirth) {
  const mode = state.layoutMode;
  for (const n of state.nodes) {
    const alive = n.ts <= cutoff;
    if (alive && n.bornAt == null) {
      n.bornAt = nowMs;
      // В нестандартных раскладках (swim/radial) рождаем сразу на target-координатах
      if (mode === 'swim' && n._swimX != null) {
        n.x = n._swimX;
        n.y = n._swimY;
        n.vx = 0; n.vy = 0;
      } else if (mode === 'radial' && n._radialX != null) {
        n.x = n._radialX;
        n.y = n._radialY;
        n.vx = 0; n.vy = 0;
      } else {
        // force — у parent с jitter (органичная birth-animation)
        const parent = n.parentId ? state.byId.get(n.parentId) : null;
        if (parent && parent.bornAt != null) {
          const angle = Math.random() * Math.PI * 2;
          const dist = CFG.springLen * (CFG.birthSpreadMin + Math.random() * (CFG.birthSpreadMax - CFG.birthSpreadMin));
          n.x = parent.x + Math.cos(angle) * dist;
          n.y = parent.y + Math.sin(angle) * dist;
          n.vx = 0;
          n.vy = 0;
        }
      }
      if (onBirth) onBirth(n);
    } else if (!alive && n.bornAt != null) {
      n.bornAt = null;
    }
  }
}

// Метрики: компактный бейдж "1.2k" (output tokens) и "⏱3s" (latency) под нодой.
// Цвета адаптивные (light/dark theme). На больших latencies (>10s) — оранжевый.
function formatTokensCompact(n) {
  if (n >= 10000) return Math.round(n / 1000) + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
function formatLatencyCompact(ms) {
  if (ms < 1000) return ms + 'ms';
  const sec = ms / 1000;
  if (sec < 60) return sec.toFixed(sec < 10 ? 1 : 0) + 's';
  const m = Math.floor(sec / 60);
  return m + 'm' + Math.round(sec - m * 60) + 's';
}
function drawMetricsBadges(ctx, n, s, r, ag) {
  const tokens = n.tokensOut || 0;
  const latency = n.responseLatencyMs || 0;
  if (!tokens && latency < 1500) return;

  const fs = 10;
  ctx.save();
  ctx.font = `${fs}px ui-monospace, Consolas, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const padH = 4, padV = 2;
  const bgFill = `rgba(20, 30, 60, ${0.82 * ag})`;
  const fgText = `rgba(220, 235, 255, ${Math.min(1, ag * 0.95)})`;

  // Tokens — справа-снизу
  if (tokens > 0) {
    const label = formatTokensCompact(tokens);
    const w = ctx.measureText(label).width + padH * 2;
    const h = fs + padV * 2;
    const bx = s.x + r * 0.6;
    const by = s.y + r + 1;
    ctx.fillStyle = bgFill;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, w, h, 3); ctx.fill(); }
    else ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = fgText;
    ctx.fillText(label, bx + padH, by + h / 2);
  }

  // Latency — слева-снизу. Только если ≥ 1.5s (мелочь не показываем).
  if (latency >= 1500) {
    const label = '⏱' + formatLatencyCompact(latency);
    const w = ctx.measureText(label).width + padH * 2;
    const h = fs + padV * 2;
    const bx = s.x - r * 0.6 - w;
    const by = s.y + r + 1;
    const isLong = latency > 10000;
    ctx.fillStyle = isLong
      ? `rgba(180, 80, 30, ${0.85 * ag})`
      : bgFill;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, w, h, 3); ctx.fill(); }
    else ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = isLong ? `rgba(255, 230, 200, ${Math.min(1, ag)})` : fgText;
    ctx.fillText(label, bx + padH, by + h / 2);
  }
  ctx.restore();
}

function drawEdgeCurve(ctx, aScreen, bScreen, cpScreen) {
  ctx.beginPath();
  ctx.moveTo(aScreen.x, aScreen.y);
  ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, bScreen.x, bScreen.y);
  ctx.stroke();
}

/**
 * Для WebGL-режима: вычисляем cutoff и вызываем updateBirths.
 * В Canvas 2D это происходит внутри draw(), но в WebGL мы не вызываем
 * Canvas 2D draw — birth-логика должна работать независимо.
 */
function updateBirthsForWebgl(state, tSec, viewport) {
  const nowMs = tSec * 1000;
  const cutoff = timelineCutoff(state);
  updateBirths(state, cutoff, nowMs, null);
}

// Вспомогательная: 5-лучевая звезда для annotation star-marker
function drawStar(ctx, cx, cy, outerR, innerR, points) {
  ctx.beginPath();
  const step = Math.PI / points;
  let angle = -Math.PI / 2;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    angle += step;
  }
  ctx.closePath();
}

function draw(ctx, state, tSec, viewport, extras) {
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  // Radial vignette — тёмный cyberpunk-фон
  const W = viewport.width, H = viewport.height;
  const vcx = viewport.cx != null ? viewport.cx : W / 2;
  const vcy = viewport.cy != null ? viewport.cy : H / 2;
  const grad = ctx.createRadialGradient(vcx, vcy, 0, vcx, vcy, Math.max(W, H) * 0.8);
  grad.addColorStop(0, 'rgba(14, 22, 44, 1)');
  grad.addColorStop(0.6, 'rgba(10, 14, 26, 1)');
  grad.addColorStop(1, 'rgba(5, 8, 16, 1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const cam = state.camera;
  const cutoff = timelineCutoff(state);
  const nowMs = tSec * 1000;
  updateBirths(state, cutoff, nowMs, extras && extras.onBirth);
  const perfMode = (extras && extras.perfMode) || 'normal';

  // Swim-mode guide lines (в world) + sticky labels вверху (screen-space)
  if (state.layoutMode === 'swim') {
    const laneSpacingWorld = (viewport.safeH != null ? viewport.safeH : viewport.height) * 0.32;
    const vcy_world = viewport.cy != null ? viewport.cy : viewport.height / 2;
    const lanes = [
      { y: vcy_world - laneSpacingWorld, label: 'USER',      color: 'rgba(123,170,240,' },
      { y: vcy_world,                    label: 'ASSISTANT', color: 'rgba(80,212,181,' },
      { y: vcy_world + laneSpacingWorld, label: 'TOOL_USE',  color: 'rgba(236,160,64,' },
    ];
    // Линии в world-space (ездят с камерой)
    ctx.save();
    ctx.lineWidth = 0.8;
    ctx.setLineDash([6, 8]);
    for (const ln of lanes) {
      const yS = (ln.y - cam.y) * cam.scale;
      if (yS < -4 || yS > viewport.height + 4) continue;
      ctx.strokeStyle = ln.color + '0.3)';
      ctx.beginPath();
      ctx.moveTo(0, yS);
      ctx.lineTo(viewport.width, yS);
      ctx.stroke();
    }
    ctx.restore();

    // Sticky labels в screen-space: фиксированная полоса сверху, лейблы
    // идут по вертикали возле соответствующего lane'а (с clamp чтобы всегда видно)
    ctx.save();
    ctx.font = 'bold 11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const sideX = 20;
    for (const ln of lanes) {
      const yWorld = ln.y;
      const yScreen = (yWorld - cam.y) * cam.scale;
      // clamp вертикально в видимый диапазон с padding
      const y = Math.max(22, Math.min(viewport.height - 22, yScreen));
      // Chip-бекграунд
      const txt = ln.label;
      const w = ctx.measureText(txt).width + 16;
      const h = 20;
      ctx.fillStyle = 'rgba(10,14,26,0.85)';
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(sideX, y - h / 2, w, h, 4); ctx.fill();
      } else {
        ctx.fillRect(sideX, y - h / 2, w, h);
      }
      ctx.strokeStyle = ln.color + '0.55)';
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(sideX, y - h / 2, w, h, 4); ctx.stroke();
      } else {
        ctx.strokeRect(sideX, y - h / 2, w, h);
      }
      ctx.fillStyle = ln.color + '1)';
      ctx.fillText(txt, sideX + 8, y + 1);
    }
    ctx.restore();
  }

  const heartbeat = (extras && extras.allowHeartbeat !== false)
    ? 1 + Math.sin(tSec * CFG.heartbeatFreq) * CFG.heartbeatAmplitude
    : 1;

  // ---- STARFIELD (не подвержен heartbeat)
  if (extras && extras.starfield) {
    extras.starfield(ctx, tSec);
  }

  // ---- Применяем heartbeat на графе вокруг центра viewport
  const cxScreen = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cyScreen = viewport.cy != null ? viewport.cy : viewport.height / 2;
  ctx.save();
  if (heartbeat !== 1) {
    ctx.translate(cxScreen, cyScreen);
    ctx.scale(heartbeat, heartbeat);
    ctx.translate(-cxScreen, -cyScreen);
  }

  const bfOf = n => birthFactor(n.bornAt, nowMs, CFG.birthDurationMs);
  const alpha = n => CFG.birthAlphaStart + (1 - CFG.birthAlphaStart) * easeOutCubic(bfOf(n));
  const sizeScale = n => CFG.birthRadiusStart + (1 - CFG.birthRadiusStart) * easeOutCubic(bfOf(n));
  // Edge birth — длительнее ноды (чтобы линия не «вспыхивала», а росла)
  const edgeBirthMs = CFG.birthDurationMs * 1.6;
  const edgeBfOf = n => birthFactor(n.bornAt, nowMs, edgeBirthMs);
  const edgeAlphaOf = n => easeOutCubic(edgeBfOf(n)); // от 0 до 1, без начального birthAlphaStart
  const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && state.collapsed && state.collapsed.has(n.parentId);
  const thinkingHidden = state.showThinking === false;
  const visible = n => n.ts <= cutoff && n.bornAt != null
    && !(state.hiddenRoles && state.hiddenRoles.has(n.role))
    && !(thinkingHidden && n.role === 'thinking')
    && !isCollapsedChild(n);

  const hasPath = state.pathSet && state.pathSet.size > 0;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const topicFilter = state.topicFilter || null;
  const topicMatches = node => !topicFilter || node._topicWord === topicFilter;
  const dimMul = node => {
    if (hasSearch) return state.searchMatches.has(node.id) ? 1 : CFG.searchDimAlpha;
    if (topicFilter) return topicMatches(node) ? 1 : CFG.searchDimAlpha;
    if (!hasPath) return 1;
    return state.pathSet.has(node.id) ? 1 : CFG.focusDimAlpha;
  };
  const edgeDim = e => {
    if (hasSearch) {
      return (state.searchMatches.has(e.a.id) && state.searchMatches.has(e.b.id)) ? 1 : CFG.searchDimAlpha;
    }
    if (topicFilter) {
      return (topicMatches(e.a) && topicMatches(e.b)) ? 1 : CFG.searchDimAlpha;
    }
    if (!hasPath) return 1;
    return (state.pathSet.has(e.a.id) && state.pathSet.has(e.b.id)) ? 1 : CFG.focusDimAlpha;
  };

  // ---- EDGES (curved) + fog при большом N
  const N = state.nodes.length;
  const fogMul = N > 500 ? Math.max(0.25, 1 - (N - 500) / 2500) : 1;
  const connectOrphans = !!state.connectOrphans;
  ctx.lineWidth = 0.8;
  for (const e of state.edges) {
    if (!visible(e.a) || !visible(e.b)) continue;
    if (e.adopted && !connectOrphans) continue; // скрываем adopted-edges при forest mode
    // Edge alpha — растёт по самой младшей ноде с удлинённым duration
    const youngerEdgeAlpha = Math.min(edgeAlphaOf(e.a), edgeAlphaOf(e.b));
    const ag = youngerEdgeAlpha * edgeDim(e);
    const aS = worldToScreen(e.a.x, e.a.y, cam);
    const bS = worldToScreen(e.b.x, e.b.y, cam);
    const cpWorld = controlPoint({ x: e.a.x, y: e.a.y }, { x: e.b.x, y: e.b.y }, CFG.edgeCurveStrength);
    const cpS = worldToScreen(cpWorld.x, cpWorld.y, cam);
    if (e.adopted) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = `rgba(200, 180, 120, ${0.22 * ag * fogMul})`;
      drawEdgeCurve(ctx, aS, bS, cpS);
      ctx.restore();
    } else {
      ctx.strokeStyle = edgeRgba(e.b.role, 0.35 * ag * fogMul, e, !!state.diffMode);
      drawEdgeCurve(ctx, aS, bS, cpS);
    }
  }

  // ---- REVERSE SIGNAL (tool_use → tool_result, animated lemon comet) ----
  // Поток выполнения tool'а: tool_use (вызов) → tool_result (ответ).
  // На Canvas 2D рисуем 1 частицу на pair с pulsing position по quadratic
  // Bezier (A → B) и затухающим следом.
  if (state.showReverseSignal !== false && state.pairEdges && state.pairEdges.length) {
    ctx.save();
    for (const p of state.pairEdges) {
      if (!visible(p.a) || !visible(p.b)) continue;
      // Forward: комета летит от A (tool_use) к B (tool_result)
      const ax = p.a.x, ay = p.a.y;
      const bx = p.b.x, by = p.b.y;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const off = len * 0.10;
      const ccx = mx - (dy / len) * off;
      const ccy = my + (dx / len) * off;
      // t — фаза кометы 0..1, бежит со скоростью ~1 цикл/сек, разный seed на pair
      const seed = ((p.a.phase || 0) + (p.b.phase || 0)) * 0.15;
      const tt = (tSec * 1.0 + seed) % 1.0;
      const ag = Math.min(alpha(p.a), alpha(p.b)) * edgeDim({ a: p.a, b: p.b }) * fogMul;
      // headFade — гасим когда комета ВПЛОТНУЮ к ноде (tt < 0.15 / > 0.85).
      // Убирает «застрявший glow» на хабах где сходится N pair-edges.
      const head = Math.sin(Math.PI * tt);
      const headFade = Math.max(0, head * 1.4 - 0.4);
      if (headFade <= 0.01) continue;
      // ---- Электрическая искра (как edge-particles, не масштабируется с zoom)
      // Trail из CFG.particleTrailLen точек, каждая с perpendicular-jitter,
      // halo+mid+core layers. Цвет — жёлтый чтобы отличать от cyan/orange
      // edge-частиц (forward направления).
      const trailN = CFG.particleTrailLen;
      const gap = CFG.particleTrailGap;
      const sz = CFG.particleSize;
      // Pre-compute Bezier tangent at this t для perpendicular jitter
      for (let k = 0; k < trailN; k++) {
        const tk = tt - k * gap;
        if (tk < 0 || tk > 1) continue;
        const uk = 1 - tk;
        const wxk = uk * uk * ax + 2 * uk * tk * ccx + tk * tk * bx;
        const wyk = uk * uk * ay + 2 * uk * tk * ccy + tk * tk * by;
        const sH = worldToScreen(wxk, wyk, cam);
        // Perpendicular jitter (электрический «дребезг»)
        const tanX = 2 * uk * (ccx - ax) + 2 * tk * (bx - ccx);
        const tanY = 2 * uk * (ccy - ay) + 2 * tk * (by - ccy);
        const tanLen = Math.hypot(tanX, tanY) || 1;
        const perpX = -tanY / tanLen;
        const perpY = tanX / tanLen;
        const headFactor = k === 0 ? 1 : 0.4;
        const jitterAmt = (Math.random() - 0.5) * CFG.particleJitterPx * 2 * headFactor;
        const sx = sH.x + perpX * jitterAmt;
        const sy = sH.y + perpY * jitterAmt;
        const trailFade = 1 - k / trailN;
        const a = ag * headFade * trailFade;
        if (a < 0.02) continue;
        // Halo (жёлтый)
        const haloR = sz * CFG.particleHaloMul * trailFade;
        ctx.fillStyle = `rgba(255, 220, 80, ${a * 0.22})`;
        ctx.beginPath();
        ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
        ctx.fill();
        // Mid (тёплый жёлтый)
        const midR = sz * CFG.particleMidMul * trailFade;
        ctx.fillStyle = `rgba(255, 230, 130, ${a * 0.55})`;
        ctx.beginPath();
        ctx.arc(sx, sy, midR, 0, Math.PI * 2);
        ctx.fill();
        // Core (почти белый)
        const coreR = Math.max(0.6, sz * trailFade * 0.7);
        ctx.fillStyle = `rgba(255, 250, 220, ${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---- PARTICLES (по кривым рёбер)
  if (extras && extras.particles) {
    extras.particles(ctx, (edge) => {
      if (!visible(edge.a) || !visible(edge.b)) return 0;
      return alpha(edge.b) * edgeDim(edge);
    });
  }

  // ---- NODES
  const useGradient = state.nodes.length < CFG.useGradientFillBelow;
  for (const n of state.nodes) {
    if (!visible(n)) continue;
    const isMatch = hasSearch && state.searchMatches.has(n.id);
    const ag = alpha(n) * dimMul(n);
    const ss = sizeScale(n);
    const s = worldToScreen(n.x, n.y, cam);
    const boost = 0.3 + 0.7 * n.recency;
    const pulse = (Math.sin(tSec * CFG.pulseFreq + n.phase) + 1) * 0.5;
    const searchPulse = isMatch ? (0.5 + 0.5 * Math.sin(tSec * CFG.searchPulseFreq + n.phase)) : 0;
    const hubMul = n.isHub ? (1 + 0.3 * Math.sin(tSec * 1.8 + n.phase)) : 1;
    // При больших графах — уменьшаем node radius чтобы не «сетка»
    const densityScale = N > 800 ? Math.max(0.55, 1 - (N - 800) / 4000) : 1;
    const r = (n.r * ss * (1 + searchPulse * 0.25) * hubMul * densityScale + pulse * 0.8 * boost * ss * densityScale) * cam.scale;
    if (r <= 0) continue;

    // Glow дорогой (radialGradient + extra arc) — пропускаем на больших графах
    const topicsMode = !!state.topicsMode;
    const diffMode = !!state.diffMode;
    if (perfMode !== 'minimal') {
      const glowR = r * CFG.nodeGlowRadiusMul;
      const innerA = (CFG.nodeGlowAlphaBase + CFG.nodeGlowAlphaPulse * pulse * boost) * ag;
      if (perfMode === 'degraded') {
        ctx.fillStyle = glowRgba(n.role, innerA * 0.7, n, topicsMode, diffMode);
      } else {
        const glowGrad = ctx.createRadialGradient(s.x, s.y, r * CFG.nodeGlowInnerStop, s.x, s.y, glowR);
        glowGrad.addColorStop(0, glowRgba(n.role, innerA, n, topicsMode, diffMode));
        glowGrad.addColorStop(1, glowRgba(n.role, 0, n, topicsMode, diffMode));
        ctx.fillStyle = glowGrad;
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (useGradient) {
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      grad.addColorStop(0, coreRgba(n.role, ag, n, topicsMode, diffMode));
      grad.addColorStop(1, coreDarkRgba(n.role, ag, n, topicsMode, diffMode));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = coreRgba(n.role, ag, n, topicsMode, diffMode);
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();


    // Hub ring (yellow-gold outline для нод с high degree)
    if (n.isHub && perfMode !== 'minimal') {
      ctx.strokeStyle = `rgba(255, 215, 120, ${0.55 * ag})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Error ring: красное пунктирное кольцо у нод с tool error (assistant
    // которая дала tool_use получивший is_error в matching tool_result, или
    // сама virtual tool_use нода).
    if (state.showErrorRings !== false && (n._hasErrorTool || n._isErrorToolUse) && perfMode !== 'minimal') {
      const errPulse = 0.55 + 0.25 * Math.sin(tSec * 2.2 + n.phase);
      ctx.save();
      const dashOff = -(tSec * 8) % 10;
      ctx.lineDashOffset = dashOff;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = `rgba(255, 90, 90, ${errPulse * ag})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Orphan-root marker: пунктирное кольцо
    if (n._isOrphanRoot && perfMode !== 'minimal') {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = `rgba(236, 160, 64, ${0.65 * ag})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // User annotations: золотая ★ для starred, маленький ✍ для заметки.
    // Рисуем поверх всего, но с учётом ag (fade-in при рождении).
    const ann = state.annotations && state.annotations.get(n.id);
    if (ann && perfMode !== 'minimal') {
      if (ann.starred) {
        const starSize = Math.max(8, r * 0.9);
        const sx = s.x + r + 1, sy = s.y - r - 1;
        ctx.save();
        ctx.fillStyle = `rgba(255, 215, 120, ${0.95 * ag})`;
        ctx.strokeStyle = `rgba(140, 90, 10, ${0.9 * ag})`;
        ctx.lineWidth = 0.8;
        drawStar(ctx, sx, sy, starSize * 0.55, starSize * 0.25, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (ann.text) {
        // Маленький «✍» индикатор на противоположной стороне от звезды
        const nx = s.x - r - 2, ny = s.y - r - 2;
        ctx.save();
        ctx.font = `${Math.max(9, Math.round(r * 0.75))}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(123, 170, 240, ${0.9 * ag})`;
        ctx.fillText('✍', nx, ny);
        ctx.restore();
      }
    }

    // Collapsed-marker: assistant нода с свёрнутыми tool_use детьми — бейдж "×N"
    if (n.role === 'assistant' && state.collapsed && state.collapsed.has(n.id)) {
      let count = 0;
      for (const m of state.nodes) {
        if (m.parentId === n.id && m.role === 'tool_use') count++;
      }
      if (count > 0) {
        const badgeFs = Math.max(9, Math.round(r * 0.9));
        ctx.font = `bold ${badgeFs}px ui-monospace, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // фон бейджа
        const label = '×' + count;
        const w = ctx.measureText(label).width + 6;
        const bx = s.x + r + 2, by = s.y - r - 2;
        ctx.fillStyle = `rgba(236, 160, 64, ${0.85 * ag})`;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx - w / 2, by - badgeFs * 0.7, w, badgeFs * 1.3, 4) : ctx.rect(bx - w / 2, by - badgeFs * 0.7, w, badgeFs * 1.3);
        ctx.fill();
        ctx.fillStyle = '#1a1204';
        ctx.fillText(label, bx, by);
      }
    }

    // Tool icon внутри tool_use ноды
    if (n.role === 'tool_use' && r >= CFG.toolIconMinR) {
      const fs = Math.max(CFG.toolIconMinFontPx, Math.round(r * CFG.toolIconFontMul));
      ctx.font = `${fs}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(20, 14, 4, ${Math.min(1, ag * 0.92)})`;
      ctx.fillText(toolIcon(n.toolName), s.x, s.y + fs * 0.05);
    }

    // Metrics badges (только для assistant-нод, под showMetrics toggle).
    // Размещаем под нодой: tokens справа-внизу, ⏱latency слева-внизу.
    if (state.showMetrics && n.role === 'assistant' && perfMode !== 'minimal') {
      drawMetricsBadges(ctx, n, s, r, ag);
    }

    // Thinking nodes: 💭 icon + soft pulsing dashed ring (как «облако мысли»)
    if (n.role === 'thinking' && perfMode !== 'minimal') {
      // Dashed cloud ring чуть дальше core
      const cloudPulse = 0.6 + 0.25 * Math.sin(tSec * 1.6 + n.phase);
      ctx.save();
      const dashOff = -(tSec * 4) % 8;
      ctx.lineDashOffset = dashOff;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = `rgba(181, 140, 255, ${cloudPulse * 0.5 * ag})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // 💭 icon если хватает места
      if (r >= 6) {
        const fs = Math.max(9, Math.round(r * 1.0));
        ctx.font = `${fs}px ui-monospace, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(245, 235, 255, ${Math.min(1, ag * 0.95)})`;
        ctx.fillText('💭', s.x, s.y + fs * 0.05);
      }
    }
  }

  // ---- HOVER RING
  if (state.hover && visible(state.hover)) {
    const s = worldToScreen(state.hover.x, state.hover.y, cam);
    const r = state.hover.r * cam.scale + 4;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.selected && visible(state.selected)) {
    const s = worldToScreen(state.selected.x, state.selected.y, cam);
    const r = state.selected.r * cam.scale + 7;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Активный search-результат — подсветка
  if (state.searchActive) {
    const activeNode = state.byId.get(state.searchActive);
    if (activeNode && visible(activeNode)) {
      const s = worldToScreen(activeNode.x, activeNode.y, cam);
      const r = activeNode.r * cam.scale + 10;
      const pulse = (Math.sin(tSec * CFG.searchPulseFreq) + 1) * 0.5;
      ctx.strokeStyle = `rgba(236, 160, 64, ${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

    return { birthFactor, easeOutCubic, updateBirthsForWebgl, draw };
  })();

  // --- src/view/renderer-webgl.js ---
  __M["src/view/renderer-webgl.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
// WebGL-рендерер v2 — красивая альтернатива Canvas 2D.
//
// 4 passes на кадр (все — один draw call каждый, GPU-heavy):
//   1. Starfield (статичные точки на фоне)
//   2. Edge bezier segments (gl.LINES, градиент к середине)
//   3. Edge particles (gl.POINTS, бегут вдоль рёбер, питаются от u_time)
//   4. Nodes (gl.POINTS, multi-layer glow + pulse + white core)
//   5. Hub rings (gl.POINTS, вложенный fragment shader рисует annulus)
//
// Все цвета/размеры пересчитываются CPU'ом каждый кадр (buffer upload)
// — для 10k нод это ~500KB/frame, тянет 60 fps. Вершинные трансформации
// и все shading-эффекты — на GPU через uniforms.


// ==== GLSL shaders ====

// --- Points (nodes) ---
const POINT_VS = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_size;
  attribute float a_phase;    // для пульса (0..2π)
  attribute float a_flags;    // bit0 = search match, bit1 = selected
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  uniform float u_time;
  varying vec4 v_color;
  varying float v_pulse;
  varying float v_highlight;

  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);

    // Пульс ноды — ядро «дышит»
    float pulse = 0.5 + 0.5 * sin(u_time * 1.8 + a_phase);
    v_pulse = pulse;

    // Флаги: 1.0 = search match (ярче + больше), 2.0 = selected
    v_highlight = a_flags;

    float sizeMul = 1.0 + 0.08 * pulse;
    if (mod(a_flags, 2.0) >= 1.0) {
      // match — заметное «биение»
      sizeMul *= 1.15 + 0.1 * sin(u_time * 4.2 + a_phase);
    }
    gl_PointSize = max(1.0, a_size * u_dpr * sizeMul);
    v_color = a_color;
  }
`;

// Multi-layer glow: плотное белое ядро → насыщенный цветной middle →
// мягкий halo. Даёт бёрн-эффект как у реальных светящихся орбов.
const POINT_FS = `
  precision mediump float;
  varying vec4 v_color;
  varying float v_pulse;
  varying float v_highlight;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Три слоя:
    //   core   — плотная яркая сердцевина (белая, нормализованная цветом)
    //   mid    — основной тон ноды
    //   halo   — мягкое свечение до края
    float core = smoothstep(0.25, 0.0, dist);
    float mid  = smoothstep(0.5, 0.15, dist);
    float halo = smoothstep(0.5, 0.0, dist) * 0.45;

    // Белая сердцевина: цвет стремится к белому в центре.
    vec3 whiteCore = mix(v_color.rgb, vec3(1.0, 1.0, 1.0), core * (0.65 + 0.25 * v_pulse));

    // Композиция (additive-friendly)
    vec3 rgb = whiteCore * (mid + halo * 0.35);
    float alpha = (mid + halo) * v_color.a;

    // Search-match — подсветка белым поверх
    if (mod(v_highlight, 2.0) >= 1.0) {
      float flash = smoothstep(0.5, 0.2, dist) * (0.5 + 0.5 * v_pulse);
      rgb += vec3(1.0, 1.0, 0.85) * flash * 0.6;
    }

    gl_FragColor = vec4(rgb, alpha);
  }
`;

// --- Hub rings ---
// Отдельный fragment shader рисует annulus (кольцо) в gl_PointCoord.
const HUB_VS = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_size;
  attribute float a_phase;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  uniform float u_time;
  varying vec4 v_color;
  varying float v_rotation;

  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    float sizeMul = 1.0 + 0.1 * sin(u_time * 1.2 + a_phase);
    gl_PointSize = max(2.0, a_size * u_dpr * sizeMul);
    v_color = a_color;
    v_rotation = u_time * 0.8 + a_phase;
  }
`;
const HUB_FS = `
  precision mediump float;
  varying vec4 v_color;
  varying float v_rotation;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    // Annulus: кольцо между 0.38 и 0.47 радиуса (от центра point-size)
    float ring = smoothstep(0.38, 0.42, dist) * smoothstep(0.49, 0.44, dist);
    // Разрывы по углу — даёт эффект «3 дуги, вращающихся»
    float angle = atan(coord.y, coord.x) + v_rotation;
    float arcs = 0.5 + 0.5 * sin(angle * 3.0);
    arcs = smoothstep(0.35, 0.65, arcs);
    float alpha = ring * (0.55 + 0.45 * arcs) * v_color.a;
    gl_FragColor = vec4(v_color.rgb * 1.2, alpha);
  }
`;

// --- Edges (bezier lines) ---
const LINE_VS = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  varying vec4 v_color;

  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    v_color = a_color;
  }
`;
const LINE_FS = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    gl_FragColor = v_color;
  }
`;

// --- Pair edges (tool_use ↔ tool_result, dotted lemon-yellow) ---
// Координаты идут как gl.LINES сегменты; для dotted-effect используем
// varying, который меняется вдоль линии (в каждой паре вершин t=0 и t=1),
// и в fragment отрезаем по mod(длина_от_старта).

// --- Error ring (красная пунктирная окружность вокруг assistant с tool error) ---
const ERR_VS = `
  precision mediump float;
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_phase;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  uniform float u_time;
  varying float v_phase;
  void main() {
    vec2 screen = (a_position - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    float pulse = 0.5 + 0.5 * sin(u_time * 3.5 + a_phase);
    gl_PointSize = max(8.0, a_size * u_dpr * (1.05 + 0.15 * pulse));
    v_phase = a_phase;
  }
`;
const ERR_FS = `
  precision mediump float;
  varying float v_phase;
  uniform float u_time;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    // Annulus 0.42..0.49
    float ring = smoothstep(0.42, 0.45, dist) * smoothstep(0.495, 0.46, dist);
    // Пунктирные сегменты по углу
    float angle = atan(coord.y, coord.x) + u_time * 1.2 + v_phase;
    float dash = 0.5 + 0.5 * sin(angle * 8.0);
    dash = smoothstep(0.4, 0.6, dash);
    float pulse = 0.55 + 0.45 * sin(u_time * 3.5 + v_phase);
    float alpha = ring * dash * pulse;
    // Красный с лёгким оранжевым оттенком
    gl_FragColor = vec4(1.0, 0.32, 0.28, alpha * 0.95);
  }
`;

// --- Edge particles ---
// Position вычисляется per-vertex как bezier(u_time*speed + offset).
const PARTICLE_VS = `
  attribute vec2 a_start;       // A
  attribute vec2 a_end;         // B
  attribute vec2 a_ctrl;        // control point
  attribute vec4 a_color;
  attribute float a_offset;     // фаза вдоль ребра (0..1)
  attribute float a_speed;      // коэф скорости
  uniform float u_time;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  varying vec4 v_color;

  void main() {
    // t перемещается по кривой, петляет 0→1→0→1…
    float t = fract(u_time * a_speed * 0.35 + a_offset);
    // Quadratic Bezier
    float u = 1.0 - t;
    vec2 world = u*u*a_start + 2.0*u*t*a_ctrl + t*t*a_end;
    vec2 screen = (world - u_camera) * u_scale;
    vec2 clip = screen / (u_viewport * 0.5) - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    // Размер пульсирует вдоль пути
    float head = smoothstep(0.0, 0.3, t) * smoothstep(1.0, 0.3, t);
    gl_PointSize = (2.5 + 2.5 * head) * u_dpr;
    v_color = vec4(a_color.rgb, a_color.a * (0.6 + 0.4 * head));
  }
`;
const PARTICLE_FS = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(v_color.rgb, v_color.a * core);
  }
`;

// --- Starfield ---
const STAR_VS = `
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_depth;
  uniform vec2 u_camera;
  uniform float u_scale;
  uniform vec2 u_viewport;
  uniform float u_dpr;
  varying float v_alpha;

  void main() {
    // Parallax: глубина влияет на сдвиг от камеры — дальние звёзды
    // двигаются медленнее, создают объём.
    vec2 world = a_position - u_camera * a_depth;
    vec2 screen = world * (0.6 + 0.4 * a_depth);
    // Оборачиваем внутри viewport (бесконечное поле)
    screen = mod(screen, u_viewport) - u_viewport * 0.5;
    vec2 clip = screen / (u_viewport * 0.5);
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    gl_PointSize = a_size * u_dpr * a_depth;
    v_alpha = 0.3 + 0.7 * a_depth;
  }
`;
const STAR_FS = `
  precision mediump float;
  varying float v_alpha;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(0.82, 0.88, 1.0, core * v_alpha);
  }
`;

// ==== Compile helpers ====

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Shader compile error: ' + info);
  }
  return sh;
}
function compileProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    throw new Error('Link error: ' + info);
  }
  return prog;
}

// ==== Module state ====

let gl = null;
let canvasEl = null;

let pointProg, hubProg, lineProg, particleProg, starProg, errProg;
let pointBuf, hubBuf, lineBuf, particleBuf, starBuf, reverseBuf, errBuf;

// Layouts (floats per vertex)
const POINT_STRIDE = 9;    // x, y, r, g, b, a, size, phase, flags
const HUB_STRIDE = 8;      // x, y, r, g, b, a, size, phase
const LINE_STRIDE = 6;     // x, y, r, g, b, a
const PARTICLE_STRIDE = 10; // ax, ay, bx, by, cx, cy, r, g, b, a (offset/speed вычисляются из mod+index)
const STAR_STRIDE = 4;     // x, y, size, depth
const REVERSE_STRIDE = 10; // тот же layout что PARTICLE — переиспользуем particleProg
const ERR_STRIDE = 4;      // x, y, size, phase

let pointArr, hubArr, lineArr, particleArr, reverseArr, errArr;
let starsBuilt = null; // Float32Array, statиc

// Uniforms
const uPoint = {}, uHub = {}, uLine = {}, uParticle = {}, uStar = {}, uErr = {};
const aPoint = {}, aHub = {}, aLine = {}, aParticle = {}, aStar = {}, aErr = {};

const EDGE_SEGMENTS = 10;
const PARTICLES_PER_EDGE = 2;

// ==== Init ====

function initWebglRenderer(canvas) {
  canvasEl = canvas;
  gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false, alpha: false })
    || canvas.getContext('experimental-webgl', { antialias: true, premultipliedAlpha: false, alpha: false });
  if (!gl) throw new Error('WebGL не поддерживается браузером');

  // WebGL context может быть потерян (вкладка в фоне долго, или GPU переключается
  // между iGPU/dGPU). Предотвращаем default behavior (чтобы context можно было
  // восстановить) и сбрасываем наш ref, чтобы drawWebgl() стал no-op.
  canvas.addEventListener('webglcontextlost', (ev) => {
    ev.preventDefault();
    gl = null;
    pointProg = hubProg = lineProg = particleProg = starProg = null;
    pointBuf = hubBuf = lineBuf = particleBuf = starBuf = null;
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    // Рекомпилируем shaders и создаём buffers заново
    try { initWebglRenderer(canvas); } catch (e) { /* браузер не восстановил */ }
  }, false);

  pointProg = compileProgram(gl, POINT_VS, POINT_FS);
  hubProg = compileProgram(gl, HUB_VS, HUB_FS);
  lineProg = compileProgram(gl, LINE_VS, LINE_FS);
  particleProg = compileProgram(gl, PARTICLE_VS, PARTICLE_FS);
  starProg = compileProgram(gl, STAR_VS, STAR_FS);
  // Новые passes (v1.3) — компилируем отдельно, чтобы их падение не
  // ломало всё. При fail просто отключаем pass через null-program.
  try { errProg = compileProgram(gl, ERR_VS, ERR_FS); }
  catch (e) { errProg = null; if (typeof console !== 'undefined') console.warn('[webgl] errProg compile failed:', e.message); }

  cacheAttribs(pointProg, aPoint, uPoint, ['a_position', 'a_color', 'a_size', 'a_phase', 'a_flags'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr', 'u_time']);
  cacheAttribs(hubProg, aHub, uHub, ['a_position', 'a_color', 'a_size', 'a_phase'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr', 'u_time']);
  cacheAttribs(lineProg, aLine, uLine, ['a_position', 'a_color'],
    ['u_camera', 'u_scale', 'u_viewport']);
  cacheAttribs(particleProg, aParticle, uParticle, ['a_start', 'a_end', 'a_ctrl', 'a_color', 'a_offset', 'a_speed'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr', 'u_time']);
  cacheAttribs(starProg, aStar, uStar, ['a_position', 'a_size', 'a_depth'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr']);
  if (errProg) cacheAttribs(errProg, aErr, uErr, ['a_position', 'a_size', 'a_phase'],
    ['u_camera', 'u_scale', 'u_viewport', 'u_dpr', 'u_time']);

  pointBuf = gl.createBuffer();
  hubBuf = gl.createBuffer();
  lineBuf = gl.createBuffer();
  particleBuf = gl.createBuffer();
  starBuf = gl.createBuffer();
  reverseBuf = gl.createBuffer();
  errBuf = gl.createBuffer();

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive

  buildStars();
  resizeWebgl(canvas);
  return { gl };
}

function cacheAttribs(prog, aMap, uMap, aNames, uNames) {
  for (const n of aNames) aMap[n.replace(/^a_/, '')] = gl.getAttribLocation(prog, n);
  for (const n of uNames) uMap[n.replace(/^u_/, '')] = gl.getUniformLocation(prog, n);
}

function resizeWebgl(canvas) {
  if (!gl) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  gl.viewport(0, 0, canvas.width, canvas.height);
}

// ==== Starfield build (один раз при init) ====

function buildStars() {
  const count = 500;
  const range = 3000;
  const arr = new Float32Array(count * STAR_STRIDE);
  // Детерминированный PRNG чтобы звёзды не прыгали при resize
  let seed = 0x13579;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 8) / 16777216;
  };
  for (let i = 0; i < count; i++) {
    const off = i * STAR_STRIDE;
    arr[off + 0] = (rnd() - 0.5) * range * 2;
    arr[off + 1] = (rnd() - 0.5) * range * 2;
    arr[off + 2] = 1.0 + rnd() * 1.5;     // size
    arr[off + 3] = 0.15 + rnd() * 0.35;   // depth (parallax)
  }
  starsBuilt = arr;
  gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
  gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
}

// ==== Color helpers ====

const ROLE_RGB = {
  user: [0.482, 0.666, 0.941],
  assistant: [0.313, 0.831, 0.709],
  tool_use: [0.925, 0.627, 0.250],
  thinking: [0.71, 0.55, 1.0],          // фиолетовый — «облако мысли»
  subagent_input: [0.549, 0.647, 0.784], // steel-blue — машинный prompt от Lead
  tool_result: [0.784, 0.568, 0.313],   // приглушённый peach — возврат от tool'а
};

const DIFF_RGB = {
  A: [1.0, 0.376, 0.686],
  B: [0.352, 0.823, 1.0],
  both: [0.784, 0.784, 0.839],
};

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h * 6;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh < 1) { r = c; g = x; }
  else if (hh < 2) { r = x; g = c; }
  else if (hh < 3) { g = c; b = x; }
  else if (hh < 4) { g = x; b = c; }
  else if (hh < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

function nodeColor(n, state, out) {
  let r, g, b;
  if (state.diffMode && n._diffOrigin) {
    [r, g, b] = DIFF_RGB[n._diffOrigin] || DIFF_RGB.both;
  } else if (state.topicsMode && n._topicHue != null) {
    [r, g, b] = hslToRgb(n._topicHue, 0.75, 0.58);
  } else {
    [r, g, b] = ROLE_RGB[n.role] || [0.5, 0.5, 0.5];
  }
  out[0] = r; out[1] = g; out[2] = b;
  return out;
}

function edgeColor(e, state, out) {
  let r, g, b;
  if (state.diffMode && e.diffSide === 'B') {
    [r, g, b] = DIFF_RGB.B;
  } else if (e.adopted) {
    r = 0.78; g = 0.71; b = 0.47;
  } else if (e.b && e.b.role === 'tool_use') {
    r = 0.925; g = 0.627; b = 0.250;
  } else if (e.b && e.b.role === 'tool_result') {
    r = 0.784; g = 0.568; b = 0.313;
  } else if (e.b && e.b.role === 'thinking') {
    r = 0.71; g = 0.55; b = 1.0;
  } else if (e.b && e.b.role === 'subagent_input') {
    r = 0.549; g = 0.647; b = 0.784;
  } else {
    r = 0.0; g = 0.831; b = 1.0;
  }
  out[0] = r; out[1] = g; out[2] = b;
  return out;
}

// ==== Birth helpers ====

function birthFactorLocal(bornAt, nowMs, duration) {
  if (bornAt == null) return 0;
  const t = (nowMs - bornAt) / duration;
  if (t >= 1) return 1;
  if (t <= 0) return 0;
  return t;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// ==== Capacity management ====

function ensureArr(name, neededFloats) {
  switch (name) {
    case 'point':
      if (!pointArr || pointArr.length < neededFloats) {
        pointArr = new Float32Array(Math.max(neededFloats, (pointArr?.length || 0) * 2 || 1024));
      }
      return pointArr;
    case 'hub':
      if (!hubArr || hubArr.length < neededFloats) {
        hubArr = new Float32Array(Math.max(neededFloats, (hubArr?.length || 0) * 2 || 256));
      }
      return hubArr;
    case 'line':
      if (!lineArr || lineArr.length < neededFloats) {
        lineArr = new Float32Array(Math.max(neededFloats, (lineArr?.length || 0) * 2 || 2048));
      }
      return lineArr;
    case 'particle':
      if (!particleArr || particleArr.length < neededFloats) {
        particleArr = new Float32Array(Math.max(neededFloats, (particleArr?.length || 0) * 2 || 1024));
      }
      return particleArr;
    case 'reverse':
      if (!reverseArr || reverseArr.length < neededFloats) {
        reverseArr = new Float32Array(Math.max(neededFloats, (reverseArr?.length || 0) * 2 || 1024));
      }
      return reverseArr;
    case 'err':
      if (!errArr || errArr.length < neededFloats) {
        errArr = new Float32Array(Math.max(neededFloats, (errArr?.length || 0) * 2 || 64));
      }
      return errArr;
  }
}

// ==== Fill buffers ====

function fillPointBuffer(state, nowMs) {
  const nodes = state.nodes;
  const collapsed = state.collapsed;
  const hidden = state.hiddenRoles;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const hasPath = state.pathSet && state.pathSet.size > 0;
  const topicFilter = state.topicFilter || null;

  ensureArr('point', nodes.length * POINT_STRIDE);
  const arr = pointArr;
  const rgb = [0, 0, 0];
  let count = 0;

  const thinkingHidden = state.showThinking === false;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.bornAt == null) continue;
    if (hidden && hidden.has(n.role)) continue;
    if (thinkingHidden && n.role === 'thinking') continue;
    if (n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId)) continue;
    const bf = birthFactorLocal(n.bornAt, nowMs, CFG.birthDurationMs);
    const ag = CFG.birthAlphaStart + (1 - CFG.birthAlphaStart) * easeOutCubic(bf);
    const ss = CFG.birthRadiusStart + (1 - CFG.birthRadiusStart) * easeOutCubic(bf);
    let dimMul = 1;
    const matchSearch = hasSearch && state.searchMatches.has(n.id);
    if (hasSearch) dimMul = matchSearch ? 1 : CFG.searchDimAlpha;
    else if (topicFilter) dimMul = n._topicWord === topicFilter ? 1 : CFG.searchDimAlpha;
    else if (hasPath) dimMul = state.pathSet.has(n.id) ? 1 : CFG.focusDimAlpha;
    const alpha = ag * dimMul;
    const hubMul = n.isHub ? 1.25 : 1;
    // size в CSS-px — x3 от node.r для glow bleed, плюс scale камеры
    const size = Math.max(3, n.r * ss * hubMul * 3.2 * state.camera.scale);

    nodeColor(n, state, rgb);
    const off = count * POINT_STRIDE;
    arr[off + 0] = n.x;
    arr[off + 1] = n.y;
    arr[off + 2] = rgb[0];
    arr[off + 3] = rgb[1];
    arr[off + 4] = rgb[2];
    arr[off + 5] = alpha;
    arr[off + 6] = size;
    arr[off + 7] = n.phase || 0;
    arr[off + 8] = matchSearch ? 1 : 0; // flags: bit0
    count++;
  }
  return count;
}

function fillHubBuffer(state, nowMs) {
  const nodes = state.nodes;
  const hidden = state.hiddenRoles;
  ensureArr('hub', nodes.length * HUB_STRIDE);
  const arr = hubArr;
  let count = 0;
  for (const n of nodes) {
    if (!n.isHub) continue;
    if (n.bornAt == null) continue;
    if (hidden && hidden.has(n.role)) continue;
    const bf = birthFactorLocal(n.bornAt, nowMs, CFG.birthDurationMs);
    const ag = CFG.birthAlphaStart + (1 - CFG.birthAlphaStart) * easeOutCubic(bf);
    const ss = CFG.birthRadiusStart + (1 - CFG.birthRadiusStart) * easeOutCubic(bf);
    // Кольцо крупнее ноды x2.2
    const size = Math.max(10, n.r * ss * 6.5 * state.camera.scale);
    const off = count * HUB_STRIDE;
    arr[off + 0] = n.x;
    arr[off + 1] = n.y;
    arr[off + 2] = 1.0;   // золотистый
    arr[off + 3] = 0.84;
    arr[off + 4] = 0.47;
    arr[off + 5] = 0.85 * ag;
    arr[off + 6] = size;
    arr[off + 7] = n.phase || 0;
    count++;
  }
  return count;
}

function quadBezier(ax, ay, bx, by, cx, cy, t, out) {
  const u = 1 - t;
  out[0] = u * u * ax + 2 * u * t * cx + t * t * bx;
  out[1] = u * u * ay + 2 * u * t * cy + t * t * by;
}

function fillLineBuffer(state, nowMs) {
  const edges = state.edges;
  const hidden = state.hiddenRoles;
  const connectOrphans = !!state.connectOrphans;
  const collapsed = state.collapsed;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  const topicFilter = state.topicFilter || null;
  ensureArr('line', edges.length * EDGE_SEGMENTS * 2 * LINE_STRIDE);
  const arr = lineArr;
  const rgb = [0, 0, 0];
  const p0 = [0, 0], p1 = [0, 0];
  let count = 0;

  const thinkingHidden = state.showThinking === false;
  // Удлинённый birth для edges — чтобы росли плавнее обычной ноды
  // (нода 600ms, edge выпускает 1000ms = чуть длительнее)
  const edgeBirthMs = CFG.birthDurationMs * 1.6;
  for (const e of edges) {
    if (!e.a || !e.b) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    if (hidden && (hidden.has(e.a.role) || hidden.has(e.b.role))) continue;
    if (thinkingHidden && (e.a.role === 'thinking' || e.b.role === 'thinking')) continue;
    if (e.adopted && !connectOrphans) continue;
    const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId);
    if (isCollapsedChild(e.a) || isCollapsedChild(e.b)) continue;

    // Birth factor edge'а — берём по самой младшей ноде (b обычно).
    // Используем удлинённый edgeBirthMs + ease-out cubic для плавности.
    const youngerBornAt = Math.max(e.a.bornAt, e.b.bornAt);
    const bft = nowMs != null ? Math.min(1, Math.max(0, (nowMs - youngerBornAt) / edgeBirthMs)) : 1;
    const birthMul = 1 - Math.pow(1 - bft, 3); // easeOutCubic
    let edgeAlpha = (e.adopted ? 0.25 : 0.6) * birthMul;
    if (hasSearch) {
      edgeAlpha *= (state.searchMatches.has(e.a.id) && state.searchMatches.has(e.b.id)) ? 1 : CFG.searchDimAlpha;
    } else if (topicFilter) {
      edgeAlpha *= (e.a._topicWord === topicFilter && e.b._topicWord === topicFilter) ? 1 : CFG.searchDimAlpha;
    }
    edgeColor(e, state, rgb);

    const ax = e.a.x, ay = e.a.y;
    const bx = e.b.x, by = e.b.y;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const off = len * CFG.edgeCurveStrength;
    const cx = mx - (dy / len) * off;
    const cy = my + (dx / len) * off;

    for (let s = 0; s < EDGE_SEGMENTS; s++) {
      const t0 = s / EDGE_SEGMENTS;
      const t1 = (s + 1) / EDGE_SEGMENTS;
      quadBezier(ax, ay, bx, by, cx, cy, t0, p0);
      quadBezier(ax, ay, bx, by, cx, cy, t1, p1);
      // Fade: интенсивнее ближе к ноде-цели (чтобы "стрелка" читалась)
      const fade0 = 0.5 + 0.5 * t0;
      const fade1 = 0.5 + 0.5 * t1;
      let off0 = count * LINE_STRIDE;
      arr[off0++] = p0[0]; arr[off0++] = p0[1];
      arr[off0++] = rgb[0]; arr[off0++] = rgb[1]; arr[off0++] = rgb[2];
      arr[off0++] = edgeAlpha * fade0;
      count++;
      let off1 = count * LINE_STRIDE;
      arr[off1++] = p1[0]; arr[off1++] = p1[1];
      arr[off1++] = rgb[0]; arr[off1++] = rgb[1]; arr[off1++] = rgb[2];
      arr[off1++] = edgeAlpha * fade1;
      count++;
    }
  }
  return count;
}

function fillParticleBuffer(state) {
  const edges = state.edges;
  const hidden = state.hiddenRoles;
  const collapsed = state.collapsed;
  const topicFilter = state.topicFilter || null;
  const hasSearch = state.searchMatches && state.searchMatches.size > 0;
  // PARTICLES_PER_EDGE частиц на ребро. Per-vertex: ax, ay, bx, by, cx, cy, r, g, b, a
  ensureArr('particle', edges.length * PARTICLES_PER_EDGE * PARTICLE_STRIDE);
  const arr = particleArr;
  const rgb = [0, 0, 0];
  let count = 0;

  for (let ei = 0; ei < edges.length; ei++) {
    const e = edges[ei];
    if (!e.a || !e.b) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    if (hidden && (hidden.has(e.a.role) || hidden.has(e.b.role))) continue;
    if (e.adopted) continue; // по adopted-рёбрам не гоняем частицы
    const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId);
    if (isCollapsedChild(e.a) || isCollapsedChild(e.b)) continue;

    // skip если edge dim'нут поиском/фильтром
    if (hasSearch && !(state.searchMatches.has(e.a.id) && state.searchMatches.has(e.b.id))) continue;
    if (topicFilter && !(e.a._topicWord === topicFilter && e.b._topicWord === topicFilter)) continue;

    edgeColor(e, state, rgb);
    const ax = e.a.x, ay = e.a.y;
    const bx = e.b.x, by = e.b.y;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const off = len * CFG.edgeCurveStrength;
    const cx = mx - (dy / len) * off;
    const cy = my + (dx / len) * off;

    for (let p = 0; p < PARTICLES_PER_EDGE; p++) {
      // offset per particle фиксирован — визуально равномерно распределены
      let o = count * PARTICLE_STRIDE;
      arr[o++] = ax; arr[o++] = ay;
      arr[o++] = bx; arr[o++] = by;
      arr[o++] = cx; arr[o++] = cy;
      arr[o++] = rgb[0]; arr[o++] = rgb[1]; arr[o++] = rgb[2];
      arr[o++] = 0.9;
      count++;
    }
  }
  return count;
}

// Заполняет буфер reverse-signal частиц.
//
// Идея: рисуем светящуюся «комету» по pair-связи tool_use ↔ tool_result.
// Семантически — это поток выполнения tool'а: ассистент вызвал tool_use →
// инструмент сделал работу → результат пришёл к user-tool_result. Поэтому
// частица летит ОТ tool_use (a) К tool_result (b) — в направлении дейст­вия.
//
// Переиспользуем существующий particleProg shader: тот же layout
// (a_start, a_end, a_ctrl, a_color, a_offset, a_speed). Цвет — лимонно-жёлтый.
const REVERSE_PARTICLES_PER_EDGE = 1;
const REVERSE_RGB = [1.0, 0.92, 0.36]; // lemon
function fillReverseSignalBuffer(state) {
  if (state.showReverseSignal === false) return 0;
  const pairs = state.pairEdges || [];
  if (!pairs.length) return 0;
  ensureArr('reverse', pairs.length * REVERSE_PARTICLES_PER_EDGE * REVERSE_STRIDE);
  const arr = reverseArr;
  let count = 0;
  const hidden = state.hiddenRoles;
  const collapsed = state.collapsed;
  for (const p of pairs) {
    const a = p.a, b = p.b;
    if (!a || !b) continue;
    if (a.bornAt == null || b.bornAt == null) continue;
    if (hidden && (hidden.has(a.role) || hidden.has(b.role))) continue;
    const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId);
    if (isCollapsedChild(a) || isCollapsedChild(b)) continue;

    // Forward направление: start = a (tool_use), end = b (tool_result)
    const ax = a.x, ay = a.y; // start
    const bx = b.x, by = b.y; // end
    // Control point — лёгкий arc, отнесён ортогонально от середины
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const off = len * 0.10;
    const cx = mx - (dy / len) * off;
    const cy = my + (dx / len) * off;
    for (let i = 0; i < REVERSE_PARTICLES_PER_EDGE; i++) {
      const o = count * REVERSE_STRIDE;
      arr[o + 0] = ax; arr[o + 1] = ay;
      arr[o + 2] = bx; arr[o + 3] = by;
      arr[o + 4] = cx; arr[o + 5] = cy;
      arr[o + 6] = REVERSE_RGB[0];
      arr[o + 7] = REVERSE_RGB[1];
      arr[o + 8] = REVERSE_RGB[2];
      arr[o + 9] = 1.0;
      count++;
    }
  }
  return count;
}

// Заполняет буфер для error-rings (assistant-ноды у которых tool_use получил error).
function fillErrBuffer(state) {
  if (state.showErrorRings === false) return 0;
  if (!state.nodes || !state.nodes.length) return 0;
  // Сначала посчитаем сколько нод с error — чтобы не аллоцировать на весь массив
  let errCount = 0;
  for (const n of state.nodes) {
    if ((n._hasErrorTool || n._isErrorToolUse) && n.bornAt != null) errCount++;
  }
  if (!errCount) return 0;
  ensureArr('err', errCount * ERR_STRIDE);
  const arr = errArr;
  let count = 0;
  const hidden = state.hiddenRoles;
  for (const n of state.nodes) {
    if (!n._hasErrorTool && !n._isErrorToolUse) continue;
    if (n.bornAt == null) continue;
    if (hidden && hidden.has(n.role)) continue;
    const r = (typeof n.r === 'number' && n.r > 0) ? n.r : 5;
    const size = Math.max(10, r * 4.5 * state.camera.scale);
    const off = count * ERR_STRIDE;
    arr[off + 0] = n.x || 0;
    arr[off + 1] = n.y || 0;
    arr[off + 2] = size;
    arr[off + 3] = n.phase || 0;
    count++;
  }
  return count;
}

// ==== Draw ====

function drawWebgl(state, tSec, viewport) {
  if (!gl) return;
  const nowMs = tSec * 1000;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const vw = viewport.width;
  const vh = viewport.height;

  const bg = readCssColor('--bg', [0.039, 0.055, 0.102]);
  gl.clearColor(bg[0], bg[1], bg[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // ---- 1. Starfield ----
  if (starsBuilt) {
    gl.useProgram(starProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    const stride = STAR_STRIDE * 4;
    gl.enableVertexAttribArray(aStar.position);
    gl.vertexAttribPointer(aStar.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aStar.size);
    gl.vertexAttribPointer(aStar.size, 1, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(aStar.depth);
    gl.vertexAttribPointer(aStar.depth, 1, gl.FLOAT, false, stride, 3 * 4);
    gl.uniform2f(uStar.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uStar.scale, state.camera.scale);
    gl.uniform2f(uStar.viewport, vw, vh);
    gl.uniform1f(uStar.dpr, dpr);
    gl.drawArrays(gl.POINTS, 0, starsBuilt.length / STAR_STRIDE);
  }

  // ---- 2. Edge lines (основа) ----
  const lineCount = fillLineBuffer(state, nowMs);
  if (lineCount > 0) {
    gl.useProgram(lineProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lineArr.subarray(0, lineCount * LINE_STRIDE), gl.DYNAMIC_DRAW);
    const stride = LINE_STRIDE * 4;
    gl.enableVertexAttribArray(aLine.position);
    gl.vertexAttribPointer(aLine.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aLine.color);
    gl.vertexAttribPointer(aLine.color, 4, gl.FLOAT, false, stride, 2 * 4);
    gl.uniform2f(uLine.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uLine.scale, state.camera.scale);
    gl.uniform2f(uLine.viewport, vw, vh);
    gl.drawArrays(gl.LINES, 0, lineCount);
  }

  // ---- 3. Edge particles ----
  const particleCount = fillParticleBuffer(state);
  if (particleCount > 0) {
    gl.useProgram(particleProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, particleArr.subarray(0, particleCount * PARTICLE_STRIDE), gl.DYNAMIC_DRAW);
    const stride = PARTICLE_STRIDE * 4;
    gl.enableVertexAttribArray(aParticle.start);
    gl.vertexAttribPointer(aParticle.start, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aParticle.end);
    gl.vertexAttribPointer(aParticle.end, 2, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(aParticle.ctrl);
    gl.vertexAttribPointer(aParticle.ctrl, 2, gl.FLOAT, false, stride, 4 * 4);
    gl.enableVertexAttribArray(aParticle.color);
    gl.vertexAttribPointer(aParticle.color, 4, gl.FLOAT, false, stride, 6 * 4);
    // offset/speed через vertexAttrib1f — фиксированные per-draw для простоты.
    // Частицы чередуются — первая со сдвигом, вторая на противоположной фазе.
    if (aParticle.offset >= 0) gl.disableVertexAttribArray(aParticle.offset);
    if (aParticle.speed >= 0) gl.disableVertexAttribArray(aParticle.speed);
    // Рисуем по очереди: 0-я частица каждого ребра, потом 1-я
    for (let p = 0; p < PARTICLES_PER_EDGE; p++) {
      const offset = p / PARTICLES_PER_EDGE;
      const speed = 1.0 + p * 0.2;
      if (aParticle.offset >= 0) gl.vertexAttrib1f(aParticle.offset, offset);
      if (aParticle.speed >= 0) gl.vertexAttrib1f(aParticle.speed, speed);
      gl.uniform1f(uParticle.time, tSec);
      gl.uniform2f(uParticle.camera, state.camera.x, state.camera.y);
      gl.uniform1f(uParticle.scale, state.camera.scale);
      gl.uniform2f(uParticle.viewport, vw, vh);
      gl.uniform1f(uParticle.dpr, dpr);
      // рисуем каждую p-ю — все p=0 вершины через STRIDE offset
      // Проще: частицы идут подряд в buffer — по 1 на ребро на шаг p
      // Так как fillParticleBuffer кладёт их подряд, используем [p*edgeCount .. (p+1)*edgeCount]
      const countPerPhase = Math.floor(particleCount / PARTICLES_PER_EDGE);
      const start = p * countPerPhase;
      gl.drawArrays(gl.POINTS, start, countPerPhase);
    }
  }

  // ---- 4. Hub rings ----
  const hubCount = fillHubBuffer(state, nowMs);
  if (hubCount > 0) {
    gl.useProgram(hubProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, hubBuf);
    gl.bufferData(gl.ARRAY_BUFFER, hubArr.subarray(0, hubCount * HUB_STRIDE), gl.DYNAMIC_DRAW);
    const stride = HUB_STRIDE * 4;
    gl.enableVertexAttribArray(aHub.position);
    gl.vertexAttribPointer(aHub.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aHub.color);
    gl.vertexAttribPointer(aHub.color, 4, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(aHub.size);
    gl.vertexAttribPointer(aHub.size, 1, gl.FLOAT, false, stride, 6 * 4);
    gl.enableVertexAttribArray(aHub.phase);
    gl.vertexAttribPointer(aHub.phase, 1, gl.FLOAT, false, stride, 7 * 4);
    gl.uniform2f(uHub.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uHub.scale, state.camera.scale);
    gl.uniform2f(uHub.viewport, vw, vh);
    gl.uniform1f(uHub.dpr, dpr);
    gl.uniform1f(uHub.time, tSec);
    gl.drawArrays(gl.POINTS, 0, hubCount);
  }

  // ---- 5. Reverse signal particles (tool_result → tool_use, lemon comet) ----
  // Переиспользуем particleProg shader; в буфере a_start/a_end SWAPped
  // относительно обычных particles → частица движется в обратную сторону.
  try {
    const reverseCount = fillReverseSignalBuffer(state);
    if (reverseCount > 0) {
      gl.useProgram(particleProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, reverseBuf);
      gl.bufferData(gl.ARRAY_BUFFER, reverseArr.subarray(0, reverseCount * REVERSE_STRIDE), gl.DYNAMIC_DRAW);
      const stride = REVERSE_STRIDE * 4;
      gl.enableVertexAttribArray(aParticle.start);
      gl.vertexAttribPointer(aParticle.start, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(aParticle.end);
      gl.vertexAttribPointer(aParticle.end, 2, gl.FLOAT, false, stride, 2 * 4);
      gl.enableVertexAttribArray(aParticle.ctrl);
      gl.vertexAttribPointer(aParticle.ctrl, 2, gl.FLOAT, false, stride, 4 * 4);
      gl.enableVertexAttribArray(aParticle.color);
      gl.vertexAttribPointer(aParticle.color, 4, gl.FLOAT, false, stride, 6 * 4);
      // a_offset / a_speed считаем в JS-side (они в shader'е uniform-like
      // через vertex_id фактически, но удобнее вычислить из id частицы).
      // Пока — vertexAttrib1f задаёт constant-per-draw (упрощение): один
      // partic'l на pair → constant offset/speed одинаковые, а phase даём
      // per-draw через time. Чтобы не дёргать на каждую частицу отдельно,
      // используем a_offset = 0 (фаза по time только) и a_speed = 1.
      if (aParticle.offset != null && aParticle.offset >= 0) gl.vertexAttrib1f(aParticle.offset, 0);
      if (aParticle.speed != null && aParticle.speed >= 0) gl.vertexAttrib1f(aParticle.speed, 1.4);
      gl.uniform2f(uParticle.camera, state.camera.x, state.camera.y);
      gl.uniform1f(uParticle.scale, state.camera.scale);
      gl.uniform2f(uParticle.viewport, vw, vh);
      gl.uniform1f(uParticle.dpr, dpr);
      gl.uniform1f(uParticle.time, tSec);
      gl.drawArrays(gl.POINTS, 0, reverseCount);
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[webgl] reverse-signal pass failed:', e.message);
  }

  // ---- 6. Error rings (красные пунктирные кольца у нод с tool error) ----
  try {
    if (errProg) {
      const errCount = fillErrBuffer(state);
      if (errCount > 0) {
        gl.useProgram(errProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, errBuf);
        gl.bufferData(gl.ARRAY_BUFFER, errArr.subarray(0, errCount * ERR_STRIDE), gl.DYNAMIC_DRAW);
        const stride = ERR_STRIDE * 4;
        gl.enableVertexAttribArray(aErr.position);
        gl.vertexAttribPointer(aErr.position, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(aErr.size);
        gl.vertexAttribPointer(aErr.size, 1, gl.FLOAT, false, stride, 2 * 4);
        gl.enableVertexAttribArray(aErr.phase);
        gl.vertexAttribPointer(aErr.phase, 1, gl.FLOAT, false, stride, 3 * 4);
        gl.uniform2f(uErr.camera, state.camera.x, state.camera.y);
        gl.uniform1f(uErr.scale, state.camera.scale);
        gl.uniform2f(uErr.viewport, vw, vh);
        gl.uniform1f(uErr.dpr, dpr);
        gl.uniform1f(uErr.time, tSec);
        gl.drawArrays(gl.POINTS, 0, errCount);
      }
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[webgl] err-rings pass failed:', e.message);
    errProg = null;
  }

  // ---- 7. Nodes (поверх рёбер и колец) ----
  const pointCount = fillPointBuffer(state, nowMs);
  if (pointCount > 0) {
    gl.useProgram(pointProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pointArr.subarray(0, pointCount * POINT_STRIDE), gl.DYNAMIC_DRAW);
    const stride = POINT_STRIDE * 4;
    gl.enableVertexAttribArray(aPoint.position);
    gl.vertexAttribPointer(aPoint.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aPoint.color);
    gl.vertexAttribPointer(aPoint.color, 4, gl.FLOAT, false, stride, 2 * 4);
    gl.enableVertexAttribArray(aPoint.size);
    gl.vertexAttribPointer(aPoint.size, 1, gl.FLOAT, false, stride, 6 * 4);
    gl.enableVertexAttribArray(aPoint.phase);
    gl.vertexAttribPointer(aPoint.phase, 1, gl.FLOAT, false, stride, 7 * 4);
    gl.enableVertexAttribArray(aPoint.flags);
    gl.vertexAttribPointer(aPoint.flags, 1, gl.FLOAT, false, stride, 8 * 4);
    gl.uniform2f(uPoint.camera, state.camera.x, state.camera.y);
    gl.uniform1f(uPoint.scale, state.camera.scale);
    gl.uniform2f(uPoint.viewport, vw, vh);
    gl.uniform1f(uPoint.dpr, dpr);
    gl.uniform1f(uPoint.time, tSec);
    gl.drawArrays(gl.POINTS, 0, pointCount);
  }
}

function readCssColor(cssVar, fallback) {
  try {
    const s = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    if (!s) return fallback;
    if (s.startsWith('#')) {
      const hex = s.slice(1);
      const h = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      const r = parseInt(h.slice(0, 2), 16) / 255;
      const g = parseInt(h.slice(2, 4), 16) / 255;
      const b = parseInt(h.slice(4, 6), 16) / 255;
      return [r, g, b];
    }
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
    if (m) return [parseInt(m[1]) / 255, parseInt(m[2]) / 255, parseInt(m[3]) / 255];
    return fallback;
  } catch {
    return fallback;
  }
}

function isWebglSupported() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

    return { initWebglRenderer, resizeWebgl, drawWebgl, isWebglSupported };
  })();

  // --- src/ui/annotations.js ---
  __M["src/ui/annotations.js"] = (function () {
    const { state } = __M["src/view/state.js"];
// Annotations — личные заметки и закладки пользователя к нодам. Хранятся
// в localStorage по ключу, привязанному к id первой ноды сессии (стабильно
// для одного JSONL, не зависит от имени файла).
//
// Схема в localStorage:
//   'viz:annot:<sessionKey>' →
//     { version: 1, annotations: { [nodeId]: { text, starred, ts } } }
//
// API:
//   loadAnnotationsForSession() — вызывается после успешной loadText;
//     восстанавливает state.annotations из localStorage.
//   setAnnotation(nodeId, { text?, starred? }) — обновляет поля (merge),
//     пустой text и starred=false → удаление.
//   getAnnotation(nodeId) → { text, starred } | null
//   toggleStar(nodeId) → bool (новое состояние)
//   listStarred() → Array<nodeId>
//   listAnnotated() → Array<nodeId> (все с text или starred)


const LS_PREFIX = 'viz:annot:';
const VERSION = 1;

function initAnnotations() {
  if (!state.annotations) state.annotations = new Map();
}

/** Ключ localStorage по первой (по ts) ноде — стабилен для данного JSONL. */
function sessionKey() {
  if (!state.nodes || !state.nodes.length) return null;
  let firstId = null, firstTs = Infinity;
  for (const n of state.nodes) {
    if (n.ts < firstTs) { firstTs = n.ts; firstId = n.id; }
  }
  return firstId ? LS_PREFIX + firstId : null;
}

/** Загрузить сохранённые аннотации для текущей сессии. Идемпотентно. */
function loadAnnotationsForSession() {
  state.annotations = new Map();
  const key = sessionKey();
  if (!key) return;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || data.version !== VERSION || !data.annotations) return;
    for (const [nodeId, ann] of Object.entries(data.annotations)) {
      if (ann && (ann.text || ann.starred)) {
        state.annotations.set(nodeId, ann);
      }
    }
  } catch (e) {
    console.warn('[annotations] load failed:', e.message);
  }
}

function save() {
  const key = sessionKey();
  if (!key) return;
  try {
    if (!state.annotations || !state.annotations.size) {
      localStorage.removeItem(key);
      return;
    }
    const obj = { version: VERSION, annotations: {} };
    for (const [id, ann] of state.annotations) obj.annotations[id] = ann;
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {
    // quota exceeded или private mode — тихо игнорируем (данные в памяти остаются)
    console.warn('[annotations] save failed:', e.message);
  }
}

function setAnnotation(nodeId, patch) {
  if (!nodeId) return;
  if (!state.annotations) state.annotations = new Map();
  const current = state.annotations.get(nodeId) || { text: '', starred: false, ts: Date.now() };
  const next = {
    text: patch.text != null ? String(patch.text) : current.text,
    starred: patch.starred != null ? !!patch.starred : current.starred,
    ts: Date.now(),
  };
  // Если после patch пусто — удаляем
  if (!next.text && !next.starred) {
    state.annotations.delete(nodeId);
  } else {
    state.annotations.set(nodeId, next);
  }
  save();
}

function getAnnotation(nodeId) {
  if (!state.annotations) return null;
  return state.annotations.get(nodeId) || null;
}

/** @returns {boolean} новое значение starred */
function toggleStar(nodeId) {
  const cur = getAnnotation(nodeId);
  const next = !(cur && cur.starred);
  setAnnotation(nodeId, { starred: next });
  return next;
}

function listStarred() {
  if (!state.annotations) return [];
  return [...state.annotations.entries()]
    .filter(([, a]) => a.starred)
    .map(([id]) => id);
}

function listAnnotated() {
  if (!state.annotations) return [];
  return [...state.annotations.entries()]
    .filter(([, a]) => a.starred || a.text)
    .map(([id]) => id);
}

/** Есть ли хоть одна аннотация — для UI-индикаторов. */
function hasAnnotations() {
  return state.annotations && state.annotations.size > 0;
}

    return { initAnnotations, loadAnnotationsForSession, setAnnotation, getAnnotation, toggleStar, listStarred, listAnnotated, hasAnnotations };
  })();

  // --- src/ui/detail-panel.js ---
  __M["src/ui/detail-panel.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { state } = __M["src/view/state.js"];
    const { getAnnotation, setAnnotation, toggleStar } = __M["src/ui/annotations.js"];
    const { t } = __M["src/core/i18n.js"];

let detailEl, detailRoleEl, detailTsEl, detailBodyEl;
let starBtn, noteTextarea, noteHint;
let _currentNode = null;
let _saveTimer = null;

function initDetail() {
  detailEl = document.getElementById('detail');
  detailRoleEl = document.getElementById('detail-role');
  detailTsEl = document.getElementById('detail-ts');
  detailBodyEl = document.getElementById('detail-body');
  document.getElementById('detail-close').addEventListener('click', () => {
    flushNote();
    state.selected = null;
    hideDetail();
  });
  ensureAnnotationUI();
}

function ensureAnnotationUI() {
  if (!detailEl) return;
  if (starBtn && noteTextarea) return;

  // Secure: создаём DOM-ноды без innerHTML — user text сюда не попадает,
  // но шаблон всё равно пишем программно для единообразия с остальным UI.
  const wrap = document.createElement('div');
  wrap.className = 'detail-annot';

  // Row: [⭐ Star] [✍ hint]
  const row = document.createElement('div');
  row.className = 'detail-annot-row';

  starBtn = document.createElement('button');
  starBtn.className = 'detail-star';
  starBtn.type = 'button';
  starBtn.textContent = t('detail.star');
  starBtn.title = t('tip.star');
  starBtn.addEventListener('click', () => {
    if (!_currentNode) return;
    toggleStar(_currentNode.id);
    updateAnnotUI();
  });
  row.appendChild(starBtn);

  noteHint = document.createElement('span');
  noteHint.className = 'detail-note-hint';
  noteHint.textContent = t('hint.detail_note');
  row.appendChild(noteHint);

  wrap.appendChild(row);

  noteTextarea = document.createElement('textarea');
  noteTextarea.className = 'detail-note';
  noteTextarea.rows = 3;
  noteTextarea.placeholder = t('placeholder.note');
  noteTextarea.addEventListener('input', () => {
    // Debounce — сохраняем через 400мс после остановки ввода
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      if (_currentNode) {
        setAnnotation(_currentNode.id, { text: noteTextarea.value });
      }
    }, 400);
  });
  // Гарантируем сохранение при blur (переключение фокуса, закрытие панели)
  noteTextarea.addEventListener('blur', flushNote);
  wrap.appendChild(noteTextarea);

  detailEl.appendChild(wrap);

  // CSS — inline, чтобы не трогать HTML-файлы
  const css = document.createElement('style');
  css.textContent = `
    .detail-annot { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); }
    .detail-annot-row { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; font-size: 10px; }
    .detail-star { background: transparent; border: 1px solid var(--border); color: var(--muted);
      padding: 3px 9px; cursor: pointer; font-family: inherit; font-size: 10px;
      letter-spacing: 0.08em; border-radius: 2px; transition: all .15s; }
    .detail-star:hover { color: var(--text); border-color: var(--user); }
    .detail-star.starred { color: #ffd778; border-color: #ffd778; background: rgba(255,215,120,0.08); }
    .detail-note-hint { color: var(--muted); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; }
    .detail-note { width: 100%; background: rgba(255,255,255,0.02); border: 1px solid var(--border);
      color: var(--text); font-family: inherit; font-size: 11px; padding: 6px 8px;
      border-radius: 2px; resize: vertical; outline: none; }
    .detail-note:focus { border-color: var(--assistant); }
    .detail-note::placeholder { color: var(--muted); }
  `;
  document.head.appendChild(css);
}

function flushNote() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  if (_currentNode && noteTextarea) {
    setAnnotation(_currentNode.id, { text: noteTextarea.value });
  }
}

function updateAnnotUI() {
  if (!_currentNode || !starBtn || !noteTextarea) return;
  const ann = getAnnotation(_currentNode.id);
  const starred = !!(ann && ann.starred);
  starBtn.classList.toggle('starred', starred);
  starBtn.textContent = starred ? t('detail.starred') : t('detail.star');
  noteTextarea.value = (ann && ann.text) || '';
}

// Перерисовываем тексты в detail panel при смене языка
if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    if (starBtn) {
      const ann = _currentNode ? getAnnotation(_currentNode.id) : null;
      starBtn.textContent = (ann && ann.starred) ? t('detail.starred') : t('detail.star');
      starBtn.title = t('tip.star');
    }
    if (noteHint) noteHint.textContent = t('hint.detail_note');
    if (noteTextarea) noteTextarea.placeholder = t('placeholder.note');
  });
}

function showDetail(n) {
  // Если переключаемся между нодами — сохраним заметку предыдущей
  if (_currentNode && _currentNode.id !== n.id) flushNote();
  _currentNode = n;
  detailRoleEl.textContent = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
  detailRoleEl.className = 'role ' + n.role;
  detailTsEl.textContent = new Date(n.ts).toISOString().replace('T', ' ').slice(0, 19);
  const txt = n.text || t('detail.empty');
  detailBodyEl.textContent = txt.length > CFG.excerptChars ? txt.slice(0, CFG.excerptChars) + '…' : txt;
  updateAnnotUI();
  detailEl.classList.add('show');
}

function hideDetail() {
  flushNote();
  _currentNode = null;
  if (detailEl) detailEl.classList.remove('show');
}

/** Вызывается из keyboard.js для hotkey S */
function toggleStarOnCurrent() {
  if (_currentNode) {
    toggleStar(_currentNode.id);
    updateAnnotUI();
    return true;
  }
  return false;
}

    return { initDetail, showDetail, hideDetail, toggleStarOnCurrent };
  })();

  // --- src/ui/tooltip.js ---
  __M["src/ui/tooltip.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];

let tooltipEl, tooltipRoleEl, tooltipBodyEl;

function initTooltip() {
  tooltipEl = document.getElementById('tooltip');
  tooltipRoleEl = tooltipEl.querySelector('.tt-role');
  tooltipBodyEl = tooltipEl.querySelector('.tt-body');
}

function showTooltip(node, screenX, screenY) {
  if (!tooltipEl || !node) return;
  const text = node.text || '';
  const trimmed = text.slice(0, CFG.tooltipMaxChars);
  const suffix = text.length > CFG.tooltipMaxChars ? '…' : '';
  tooltipRoleEl.textContent = node.role === 'tool_use' ? (node.toolName || 'tool') : node.role;
  tooltipRoleEl.className = 'tt-role ' + node.role;
  tooltipBodyEl.textContent = trimmed + suffix;
  const { innerWidth: W, innerHeight: H } = window;
  const rect = tooltipEl.getBoundingClientRect();
  const padding = 14;
  let left = screenX + padding;
  let top = screenY + padding;
  if (left + rect.width > W - 8) left = screenX - rect.width - padding;
  if (top + rect.height > H - 8) top = screenY - rect.height - padding;
  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top = top + 'px';
  tooltipEl.classList.add('show');
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('show');
}

    return { initTooltip, showTooltip, hideTooltip };
  })();

  // --- src/ui/story-mode.js ---
  __M["src/ui/story-mode.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { toolIcon } = __M["src/view/tool-icons.js"];
// isPlaying читается через state.isPlaying (избегаем циклического импорта с timeline.js)

let streamEl, phoneEl;

const seen = new Set();
const pendingQueue = [];
let lastPostMs = 0;
let activeNodeId = null;

function initStory() {
  streamEl = document.getElementById('chat-stream');
  phoneEl = document.getElementById('phone');
}

function buildBubble(node) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-row role-' + node.role;

  const msg = document.createElement('div');
  msg.className = 'chat-msg role-' + node.role;

  const roleEl = document.createElement('div');
  roleEl.className = 'chat-role ' + node.role;
  if (node.role === 'tool_use') {
    const icon = document.createElement('span');
    icon.className = 'chat-tool-icon';
    icon.textContent = toolIcon(node.toolName);
    roleEl.appendChild(icon);
    roleEl.appendChild(document.createTextNode(' ' + (node.toolName || 'tool')));
  } else {
    roleEl.textContent = node.role;
  }

  const textEl = document.createElement('div');
  textEl.className = 'chat-text typing';

  const raw = node.text || '';
  const trimmed = raw.length > CFG.storyMaxChars ? raw.slice(0, CFG.storyMaxChars) + '…' : (raw || '(no text)');

  msg.appendChild(roleEl);
  msg.appendChild(textEl);
  wrap.appendChild(msg);
  return { wrap, textEl, fullText: trimmed };
}

function typeOut(textEl, fullText) {
  const total = fullText.length;
  if (total === 0) { textEl.classList.remove('typing'); return; }
  const charMs = CFG.storyCharMs;
  const estimatedMs = total * charMs;
  const stepPerTick = estimatedMs > CFG.storyMaxTypeMs
    ? Math.ceil(total / (CFG.storyMaxTypeMs / charMs))
    : 1;
  let i = 0;
  const tick = () => {
    // Если bubble уже удалён из DOM (history trim / resetStory) —
    // прекращаем таймер, иначе closure будет писать в detached DOM и
    // удерживать его от GC. Проверка isConnected — ES2019+, в поддерживаемых
    // браузерах всегда доступна.
    if (!textEl.isConnected) {
      textEl._typeTimer = null;
      return;
    }
    i = Math.min(total, i + stepPerTick);
    textEl.textContent = fullText.slice(0, i);
    if (streamEl) streamEl.scrollTop = streamEl.scrollHeight;
    if (i < total) {
      textEl._typeTimer = setTimeout(tick, charMs);
    } else {
      textEl._typeTimer = null;
      textEl.classList.remove('typing');
    }
  };
  tick();
}

function isPhoneWorthy(n) {
  // Empty assistant-сообщения (только tool_use без текста) не показываем в phone —
  // их tool_use подноды пойдут отдельно.
  if (n.role === 'assistant' && (!n.text || !n.text.trim())) return false;
  return true;
}

function collectNew(state) {
  const newly = [];
  for (const n of state.nodes) {
    if (n.bornAt == null) continue;
    if (seen.has(n.id)) continue;
    seen.add(n.id); // помечаем даже если пропускаем — чтобы не перебирать снова
    if (!isPhoneWorthy(n)) continue;
    newly.push(n);
  }
  newly.sort((a, b) => a.ts - b.ts);
  return newly;
}

function clearBubbleTimer(wrapOrText) {
  if (!wrapOrText) return;
  const t = wrapOrText.querySelector ? wrapOrText.querySelector('.chat-text') : wrapOrText;
  if (t && t._typeTimer) { clearTimeout(t._typeTimer); t._typeTimer = null; }
}

function postBubble(node) {
  if (!streamEl) return;
  const { wrap, textEl, fullText } = buildBubble(node);
  wrap.dataset.nodeId = node.id;
  streamEl.appendChild(wrap);
  const heavy = fullText.length > 800;
  const perfMinimal = (window.__viz && window.__viz.state && window.__viz.state.perfMode === 'minimal');
  requestAnimationFrame(() => {
    wrap.classList.add('show');
    streamEl.scrollTop = streamEl.scrollHeight;
    if (heavy || perfMinimal) {
      textEl.textContent = fullText;
      textEl.classList.remove('typing');
    } else {
      typeOut(textEl, fullText);
    }
  });
  while (streamEl.children.length > CFG.storyMaxHistory) {
    const removed = streamEl.firstChild;
    clearBubbleTimer(removed);
    seen.delete(removed?.dataset?.nodeId);
    streamEl.removeChild(removed);
  }
  seen.add(node.id);
  activeNodeId = node.id;
  if (phoneEl) phoneEl.classList.add('active');
}

function postBubbleInstant(node) {
  if (!streamEl) return;
  const { wrap, textEl, fullText } = buildBubble(node);
  wrap.dataset.nodeId = node.id;
  wrap.classList.add('show');
  textEl.textContent = fullText;
  textEl.classList.remove('typing');
  streamEl.appendChild(wrap);
  seen.add(node.id);
  activeNodeId = node.id;
  if (phoneEl) phoneEl.classList.add('active');
}

function cutoffTs(state) {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

function syncChatToTimeline(state) {
  if (!streamEl) return;
  const cutoff = cutoffTs(state);
  const targetIds = new Set();
  for (const n of state.nodes) {
    if (n.ts <= cutoff) targetIds.add(n.id);
  }
  for (const child of [...streamEl.children]) {
    const id = child.dataset.nodeId;
    if (!targetIds.has(id)) {
      clearBubbleTimer(child);
      child.remove();
      seen.delete(id);
    }
  }
  const toAdd = [];
  for (const n of state.nodes) {
    if (!targetIds.has(n.id)) continue;
    if (seen.has(n.id)) continue;
    if (!isPhoneWorthy(n)) { seen.add(n.id); continue; }
    toAdd.push(n);
  }
  toAdd.sort((a, b) => a.ts - b.ts);
  for (const n of toAdd) postBubbleInstant(n);
  while (streamEl.children.length > CFG.storyMaxHistory) {
    const removed = streamEl.firstChild;
    clearBubbleTimer(removed);
    seen.delete(removed?.dataset?.nodeId);
    streamEl.removeChild(removed);
  }
  streamEl.scrollTop = streamEl.scrollHeight;
  if (phoneEl) {
    if (streamEl.children.length > 0) phoneEl.classList.add('active');
    else phoneEl.classList.remove('active');
  }

  // Синхронизация bornAt чтобы draw() не триггерил лишнюю birth-анимацию
  const nowMs = performance.now();
  const longAgo = nowMs - CFG.birthDurationMs - 50;
  for (const n of state.nodes) {
    const alive = n.ts <= cutoff;
    if (alive && n.bornAt == null) n.bornAt = longAgo;
    else if (!alive && n.bornAt != null) n.bornAt = null;
  }

  // Сбрасываем очередь на случай если она не очищена
  pendingQueue.length = 0;
}

/** Перестраивает seen-set из текущего содержимого DOM. Вызывается после manual drag. */
function rebuildSeen(state) {
  seen.clear();
  if (!streamEl) return;
  for (const child of streamEl.children) {
    if (child.dataset.nodeId) seen.add(child.dataset.nodeId);
  }
}

function tickStory(nowMs, state) {
  const active = !!state.isPlaying && state.nodes.length > 0;
  if (!active) {
    // Когда play выключен — чистим очередь (manual режим)
    if (pendingQueue.length) pendingQueue.length = 0;
    return;
  }
  // Накапливаем новых в очередь (может прийти несколько за кадр при frame drop)
  const newly = collectNew(state);
  if (newly.length) pendingQueue.push(...newly);

  // Выдаём ровно одну bubble за кадр (если прошёл MIN_POST_GAP_MS), чтобы
  // typewriter не накладывался. playSpeed масштабирует gap.
  const minGap = CFG.storyPostGapMs / Math.max(0.1, state.playSpeed || 1);
  if (pendingQueue.length && (nowMs - lastPostMs) >= minGap) {
    const n = pendingQueue.shift();
    postBubble(n);
    lastPostMs = nowMs;
  }
}

function getFrontierNodeId() { return activeNodeId; }

function resetStory() {
  seen.clear();
  pendingQueue.length = 0;
  lastPostMs = 0;
  activeNodeId = null;
  if (window.__viz && window.__viz.state && Array.isArray(window.__viz.state.nodes)) {
    for (const n of window.__viz.state.nodes) n.bornAt = null;
  }
  if (streamEl) {
    // Очистить все активные typewriter таймеры
    for (const child of streamEl.children) clearBubbleTimer(child);
    streamEl.innerHTML = '';
  }
  if (phoneEl) phoneEl.classList.remove('active');
}

    return { initStory, syncChatToTimeline, rebuildSeen, tickStory, getFrontierNodeId, resetStory };
  })();

  // --- src/ui/timeline.js ---
  __M["src/ui/timeline.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { state } = __M["src/view/state.js"];
    const { resetStory, syncChatToTimeline, rebuildSeen } = __M["src/ui/story-mode.js"];
    const { reheat } = __M["src/core/layout.js"];

function centerRootsInViewport() {
  // Помещаем все "root"-ноды (без parent) в центр текущего viewport камеры,
  // чтобы при рестарте play первая нода появлялась в поле зрения.
  const cam = state.camera;
  const vp = { w: window.innerWidth, h: window.innerHeight };
  const cx = cam.x + (vp.w / 2) / cam.scale;
  const cy = cam.y + (vp.h / 2) / cam.scale;
  const roots = state.nodes.filter(n => !n.parentId || !state.byId.has(n.parentId));
  if (!roots.length) return;
  if (roots.length === 1) {
    roots[0].x = cx;
    roots[0].y = cy;
    roots[0].vx = 0;
    roots[0].vy = 0;
  } else {
    // Несколько корней — по небольшому кольцу вокруг центра
    const R = 40;
    for (let i = 0; i < roots.length; i++) {
      const a = (i / roots.length) * Math.PI * 2;
      roots[i].x = cx + Math.cos(a) * R;
      roots[i].y = cy + Math.sin(a) * R;
      roots[i].vx = 0;
      roots[i].vy = 0;
    }
  }
}

let sliderEl, labelEl, playBtn;
let playing = false;
// Зеркалим в state чтобы story-mode мог прочитать без циклического импорта
function setPlaying(v) { playing = v; state.isPlaying = v; }
let lastStepMs = 0;
let sortedIds = [];
let stepIndex = 0;

function initTimeline() {
  sliderEl = document.getElementById('timeline');
  labelEl = document.getElementById('timeline-label');
  playBtn = document.getElementById('btn-play');
  sliderEl.addEventListener('input', onSliderInput);
  playBtn.addEventListener('click', togglePlay);
  updateLabel();
  updatePlayBtn();
}

function currentStepInterval() {
  return CFG.storyDwellMs / Math.max(0.1, state.playSpeed || 1);
}

function setSpeed(mult) {
  state.playSpeed = mult;
  // при изменении speed пересчитываем lastStepMs, чтобы не произошло instant advance
  lastStepMs = performance.now();
}

function onSliderInput() {
  state.timelineMax = parseFloat(sliderEl.value) / 100;
  if (playing) stopPlay();
  updateLabel();
  syncChatToTimeline(state);
  rebuildSeen(state);
}

function togglePlay() {
  if (playing) stopPlay(); else startPlay();
}

function isPlaying() { return playing; }

function computeTsBounds() {
  if (!state.nodes.length) return { tsMin: 0, tsMax: 1 };
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return { tsMin, tsMax };
}

function startPlay() {
  if (!state.nodes.length) return;
  sortedIds = [...state.nodes].sort((a, b) => a.ts - b.ts).map(n => n.id);
  const atEnd = state.timelineMax >= 0.9999;
  if (atEnd) {
    resetStory();
    state.timelineMax = 0;
    stepIndex = 0;
    // Ставим корни в центр viewport + полный reheat, чтобы первая нода появилась в поле зрения
    centerRootsInViewport();
    if (state.sim) reheat(state.sim, 0.8);
  } else {
    const { tsMin, tsMax } = computeTsBounds();
    const range = Math.max(1, tsMax - tsMin);
    const cutoff = tsMin + range * state.timelineMax;
    stepIndex = 0;
    for (let i = 0; i < sortedIds.length; i++) {
      const node = state.byId.get(sortedIds[i]);
      if (node && node.ts <= cutoff) stepIndex = i + 1;
      else break;
    }
    // rebuild seen from DOM после manual drag
    rebuildSeen(state);
  }
  setPlaying(true);
  lastStepMs = performance.now();
  updatePlayBtn();
  updateLabel();
  if (atEnd) advanceStep();
}

function stopPlay() {
  setPlaying(false);
  updatePlayBtn();
}

function advanceStep() {
  if (stepIndex >= sortedIds.length) {
    state.timelineMax = 1;
    syncSlider();
    updateLabel();
    stopPlay();
    return;
  }
  const id = sortedIds[stepIndex++];
  const node = state.byId.get(id);
  if (!node) return advanceStep();
  // Two semantics:
  //   timelineByCount=true  → slider растёт равномерно, шаг = 1/N (визуально
  //     ровный прогресс вне зависимости от ts-разрывов)
  //   timelineByCount=false → slider = (node.ts - tsMin) / range (default,
  //     отражает реальное время — большой gap = большой прыжок)
  let desired;
  if (state.timelineByCount) {
    desired = stepIndex / sortedIds.length; // stepIndex уже инкрементирован
  } else {
    const { tsMin, tsMax } = computeTsBounds();
    const range = Math.max(1, tsMax - tsMin);
    desired = (node.ts - tsMin) / range;
  }
  state.timelineMax = Math.min(1, desired + 0.0001);
  // небольшой re-heat чтобы новорождённая нода могла устаканиться
  if (state.sim && state.sim.alpha < 0.12) reheat(state.sim, 0.15);
  syncSlider();
  updateLabel();
}

function tickPlay() {
  if (!playing) return;
  const now = performance.now();
  const interval = currentStepInterval();
  // строго 1 advance на кадр; если отстали — просто догоняем по 1 на кадр
  if (now - lastStepMs >= interval) {
    lastStepMs = now;
    advanceStep();
  }
}

function advanceTimeline(current, dt, duration) {
  const next = current + dt / duration;
  if (next >= 1) return { value: 1, finished: true };
  return { value: next, finished: false };
}

function syncSlider() {
  if (sliderEl) sliderEl.value = String(Math.round(state.timelineMax * 100));
}

function updatePlayBtn() {
  if (!playBtn) return;
  playBtn.textContent = playing ? '⏸' : '▶';
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  playBtn.classList.toggle('playing', playing);
}

function updateLabel() {
  if (!labelEl) return;
  if (!state.nodes.length) { labelEl.textContent = '—'; return; }
  const { tsMin, tsMax } = computeTsBounds();
  const t = tsMin + (tsMax - tsMin) * state.timelineMax;
  const visible = state.nodes.filter(n => n.ts <= t).length;
  labelEl.innerHTML = `<b>${visible}</b> / ${state.nodes.length} &middot; <span>${new Date(t).toISOString().replace('T', ' ').slice(0, 19)}</span>`;
}

function resetTimeline() {
  stopPlay();
  if (sliderEl) sliderEl.value = 100;
  state.timelineMax = 1;
  sortedIds = [];
  stepIndex = 0;
  updateLabel();
}

    return { initTimeline, setSpeed, togglePlay, isPlaying, tickPlay, advanceTimeline, resetTimeline };
  })();

  // --- src/ui/search.js ---
  __M["src/ui/search.js"] = (function () {
    const { state } = __M["src/view/state.js"];

let barEl, inputEl, countEl, closeEl;
let matches = [];
let currentIndex = 0;
let _srchGetViewport = () => ({ cx: window.innerWidth / 2, cy: window.innerHeight / 2 });

function initSearch(_srchGetViewportFn) {
  if (_srchGetViewportFn) _srchGetViewport = _srchGetViewportFn;
  barEl = document.getElementById('search-bar');
  inputEl = document.getElementById('search-input');
  countEl = document.getElementById('search-count');
  closeEl = document.getElementById('search-close');
  if (!barEl) return;
  inputEl.addEventListener('input', runSearch);
  inputEl.addEventListener('keydown', onInputKey);
  closeEl.addEventListener('click', closeSearch);
  window.addEventListener('keydown', onGlobalKey);
  updateCount();
}

function onGlobalKey(ev) {
  const typingInField = document.activeElement === inputEl;
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'f' || ev.key === 'F')) {
    ev.preventDefault();
    openSearch();
  } else if (ev.key === '/' && !typingInField) {
    ev.preventDefault();
    openSearch();
  } else if (ev.key === 'Escape' && barEl && barEl.classList.contains('show')) {
    closeSearch();
  }
}

function onInputKey(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    goto(ev.shiftKey ? -1 : 1);
  } else if (ev.key === 'Escape') {
    ev.preventDefault();
    closeSearch();
  }
}

function openSearch() {
  if (!barEl) return;
  barEl.classList.add('show');
  inputEl.focus();
  inputEl.select();
}

function closeSearch() {
  if (!barEl) return;
  barEl.classList.remove('show');
  inputEl.value = '';
  matches = [];
  currentIndex = 0;
  state.searchMatches = new Set();
  state.searchActive = null;
  updateCount();
}

function matchNodes(q, nodes) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [];
  const out = [];
  for (const n of nodes) {
    const hay = ((n.text || '') + ' ' + (n.toolName || '')).toLowerCase();
    if (hay.includes(query)) out.push(n.id);
  }
  return out;
}

function runSearch() {
  matches = matchNodes(inputEl.value, state.nodes);
  state.searchMatches = new Set(matches);
  if (matches.length > 0) {
    currentIndex = 0;
    focusMatch();
  } else {
    state.searchActive = null;
  }
  updateCount();
}

function goto(dir) {
  if (!matches.length) return;
  currentIndex = (currentIndex + dir + matches.length) % matches.length;
  focusMatch();
  updateCount();
}

function focusMatch() {
  const id = matches[currentIndex];
  const node = state.byId.get(id);
  if (!node) return;
  state.searchActive = id;
  state.selected = node;
  const vp = _srchGetViewport();
  const cx = vp.cx != null ? vp.cx : window.innerWidth / 2;
  const cy = vp.cy != null ? vp.cy : window.innerHeight / 2;
  state.cameraTarget = {
    x: node.x - cx / state.camera.scale,
    y: node.y - cy / state.camera.scale,
    scale: state.camera.scale,
  };
}

function updateCount() {
  if (!countEl) return;
  if (!inputEl || !inputEl.value) {
    countEl.textContent = '—';
  } else if (!matches.length) {
    countEl.textContent = '0 matches';
  } else {
    countEl.textContent = `${currentIndex + 1} / ${matches.length}`;
  }
}

    return { initSearch, matchNodes };
  })();

  // --- src/ui/live.js ---
  __M["src/ui/live.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { CFG } = __M["src/core/config.js"];
    const { parseLine } = __M["src/core/parser.js"];
    const { appendRawNodes } = __M["src/core/graph.js"];
    const { reheat } = __M["src/core/layout.js"];
    const { ensureParticles } = __M["src/view/particles.js"];
    const { safeFetch } = __M["src/core/url-safety.js"];

let urlInput, btnStart, btnStop, statusEl;
let pollingId = null;
let lastByteLen = 0;
let lastUrl = '';
let _liveGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

function initLive(_liveGetViewportFn) {
  if (_liveGetViewportFn) _liveGetViewport = _liveGetViewportFn;
  urlInput = document.getElementById('live-url');
  btnStart = document.getElementById('btn-live-start');
  btnStop = document.getElementById('btn-live-stop');
  statusEl = document.getElementById('live-status');
  if (!btnStart) return;
  btnStart.addEventListener('click', startWatching);
  btnStop.addEventListener('click', stopWatching);
  urlInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); startWatching(); }
  });
  setStatus('idle');
}

function startWatching() {
  const url = urlInput.value.trim();
  if (!url) return;
  lastUrl = url;
  lastByteLen = 0;
  setStatus('connecting…');
  pullOnce();
  if (pollingId) clearInterval(pollingId);
  pollingId = setInterval(pullOnce, CFG.livePollMs);
  btnStart.style.display = 'none';
  btnStop.style.display = '';
}

function stopWatching() {
  if (pollingId) clearInterval(pollingId);
  pollingId = null;
  setStatus('stopped');
  if (btnStart) btnStart.style.display = '';
  if (btnStop) btnStop.style.display = 'none';
}

async function pullOnce() {
  if (!lastUrl) return;
  try {
    const sep = lastUrl.includes('?') ? '&' : '?';
    const resp = await safeFetch(lastUrl + sep + '_t=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) { setStatus('http ' + resp.status); return; }
    const text = await resp.text();
    const byteLen = text.length;
    if (byteLen < lastByteLen) {
      // файл был обрезан/пересоздан — начинаем заново
      lastByteLen = 0;
    }
    const newText = text.slice(lastByteLen);
    lastByteLen = byteLen;

    const lines = newText.split(/\r?\n/);
    const newRaw = [];
    let counter = state.nodes.length;
    for (const line of lines) {
      const parsed = parseLine(line, counter++);
      for (const p of parsed) newRaw.push(p);
    }
    if (newRaw.length) {
      const added = appendRawNodes(state, newRaw, _liveGetViewport());
      // Cap суммарного количества нод в live-режиме. При переполнении отрезаем
      // самые старые (по ts) — граф остаётся актуальным, но не съедает RAM.
      const MAX_LIVE_NODES = CFG.liveMaxNodes || 5000;
      if (state.nodes.length > MAX_LIVE_NODES) {
        const drop = state.nodes.length - MAX_LIVE_NODES;
        const sorted = [...state.nodes].sort((a, b) => a.ts - b.ts);
        const toRemove = new Set(sorted.slice(0, drop).map(n => n.id));
        state.nodes = state.nodes.filter(n => !toRemove.has(n.id));
        state.edges = state.edges.filter(e => !toRemove.has(e.source) && !toRemove.has(e.target));
        for (const id of toRemove) state.byId.delete(id);
      }
      ensureParticles(state.edges);
      if (state.sim) reheat(state.sim, 0.2);
      state.timelineMax = 1; // показываем актуальное
      updateStatsHUD();
      setStatus(`+${added.length} @ ${timeNow()} (${state.nodes.length} total)`);
    } else {
      setStatus(`up-to-date · ${byteLen}b`);
    }
  } catch (e) {
    setStatus('err: ' + e.message);
  }
}

function updateStatsHUD() {
  const el = document.getElementById('stats');
  if (el) {
    el.innerHTML = `<b>${state.nodes.length}</b> nodes &middot; <b>${state.edges.length}</b> edges &middot; <span>live</span>`;
  }
}

function timeNow() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
}

function setStatus(s) {
  if (statusEl) statusEl.textContent = s;
}

    return { initLive };
  })();

  // --- src/ui/filter.js ---
  __M["src/ui/filter.js"] = (function () {
    const { state } = __M["src/view/state.js"];

const ROLES = ['user', 'assistant', 'tool_use'];

// Связанные роли: при toggle ключевой роли скрываются/показываются вместе.
//   user → subagent_input — оба «вход для агента» (живой / машинный)
//   tool_use → tool_result — pair tool-цепочки (вызов / ответ)
const LINKED_ROLES = {
  user: ['subagent_input'],
  tool_use: ['tool_result'],
};

function initFilter() {
  for (const role of ROLES) {
    const btn = document.querySelector(`.btn-role[data-role="${role}"]`);
    if (!btn) continue;
    btn.addEventListener('click', () => toggleRole(role, btn));
    btn.classList.add('active');
  }
}

function toggleRole(role, btn) {
  const linked = LINKED_ROLES[role] || [];
  if (state.hiddenRoles.has(role)) {
    state.hiddenRoles.delete(role);
    for (const r of linked) state.hiddenRoles.delete(r);
    btn.classList.add('active');
  } else {
    state.hiddenRoles.add(role);
    for (const r of linked) state.hiddenRoles.add(r);
    btn.classList.remove('active');
  }
}

function isRoleVisible(role) {
  return !state.hiddenRoles.has(role);
}

    return { initFilter, isRoleVisible };
  })();

  // --- src/ui/minimap.js ---
  __M["src/ui/minimap.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { state } = __M["src/view/state.js"];

let canvasEl, ctx, dpr = 1;
let tf = null; // сохранённая трансформация для click->world
let frameCounter = 0;
let _mmGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

function initMinimap(_mmGetViewportFn) {
  if (_mmGetViewportFn) _mmGetViewport = _mmGetViewportFn;
  canvasEl = document.getElementById('minimap');
  if (!canvasEl) return;
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvasEl.width = CFG.minimapW * dpr;
  canvasEl.height = CFG.minimapH * dpr;
  canvasEl.style.width = CFG.minimapW + 'px';
  canvasEl.style.height = CFG.minimapH + 'px';
  ctx = canvasEl.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvasEl.addEventListener('click', onClick);
}

function colorFor(role) {
  if (role === 'user') return '#7BAAF0';
  if (role === 'subagent_input') return '#8CA5C8';
  if (role === 'tool_use') return '#ECA040';
  if (role === 'tool_result') return '#C89150';
  if (role === 'thinking') return '#B58CFF';
  return '#50D4B5';
}

function tickMinimap() {
  if (!canvasEl || !ctx) return;
  if ((frameCounter++) % CFG.minimapEveryNFrames !== 0) return;
  const W = CFG.minimapW, H = CFG.minimapH;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10, 14, 26, 0.55)';
  ctx.fillRect(0, 0, W, H);

  if (!state.nodes.length) {
    tf = null;
    return;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of state.nodes) {
    if (state.hiddenRoles.has(n.role)) continue;
    if (n.bornAt == null) continue;
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  if (!isFinite(minX)) { tf = null; return; }
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const pad = CFG.minimapPadding;
  const s = Math.min((W - pad * 2) / bw, (H - pad * 2) / bh);
  const ox = pad + ((W - pad * 2) - bw * s) / 2;
  const oy = pad + ((H - pad * 2) - bh * s) / 2;
  const w2m = (wx, wy) => ({ x: ox + (wx - minX) * s, y: oy + (wy - minY) * s });

  // edges
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.22)';
  ctx.lineWidth = 0.5;
  for (const e of state.edges) {
    if (state.hiddenRoles.has(e.a.role) || state.hiddenRoles.has(e.b.role)) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    const a = w2m(e.a.x, e.a.y);
    const b = w2m(e.b.x, e.b.y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // nodes
  for (const n of state.nodes) {
    if (state.hiddenRoles.has(n.role)) continue;
    if (n.bornAt == null) continue;
    const p = w2m(n.x, n.y);
    ctx.fillStyle = colorFor(n.role);
    ctx.beginPath();
    ctx.arc(p.x, p.y, CFG.minimapNodeR, 0, Math.PI * 2);
    ctx.fill();
  }

  // viewport rectangle
  const cam = state.camera;
  const vp = _mmGetViewport();
  const vw = vp.width / cam.scale;
  const vh = vp.height / cam.scale;
  const tl = w2m(cam.x, cam.y);
  const br = w2m(cam.x + vw, cam.y + vh);
  ctx.strokeStyle = 'rgba(236, 160, 64, 0.75)';
  ctx.lineWidth = 1;
  const rx = Math.max(0, Math.min(W, tl.x));
  const ry = Math.max(0, Math.min(H, tl.y));
  const rw = Math.max(1, Math.min(W - rx, br.x - tl.x));
  const rh = Math.max(1, Math.min(H - ry, br.y - tl.y));
  ctx.strokeRect(rx, ry, rw, rh);

  tf = { ox, oy, s, minX, minY };
}

function onClick(ev) {
  if (!tf) return;
  const rect = canvasEl.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const my = ev.clientY - rect.top;
  const wx = (mx - tf.ox) / tf.s + tf.minX;
  const wy = (my - tf.oy) / tf.s + tf.minY;
  const vp = _mmGetViewport();
  const cx = vp.cx != null ? vp.cx : vp.width / 2;
  const cy = vp.cy != null ? vp.cy : vp.height / 2;
  state.cameraTarget = {
    x: wx - cx / state.camera.scale,
    y: wy - cy / state.camera.scale,
    scale: state.camera.scale,
  };
}

    return { initMinimap, tickMinimap };
  })();

  // --- src/ui/freeze-toggle.js ---
  __M["src/ui/freeze-toggle.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { freeze, unfreeze } = __M["src/core/layout.js"];
    const { t } = __M["src/core/i18n.js"];

let _frzBtn;

function initFreezeToggle() {
  _frzBtn = document.getElementById('btn-freeze');
  if (_frzBtn) _frzBtn.addEventListener('click', toggle);
  window.addEventListener('languagechange', updateFreezeBtn);
  updateFreezeBtn();
}

function toggleFreeze() { toggle(); }

function toggle() {
  if (!state.sim) return;
  if (state.sim.manualFrozen) unfreeze(state.sim);
  else freeze(state.sim);
  updateFreezeBtn();
}

/** Вызывается из interaction.js когда drag авто-размораживает, и при init. */
function updateFreezeBtn() {
  if (!_frzBtn) return;
  const frozen = state.sim && state.sim.manualFrozen;
  _frzBtn.textContent = frozen ? '▶' : '❄';
  _frzBtn.title = frozen ? t('tip.freeze_off') : t('tip.freeze_on');
  _frzBtn.classList.toggle('active-freeze', !!frozen);
}

    return { initFreezeToggle, toggleFreeze, updateFreezeBtn };
  })();

  // --- src/ui/speed-control.js ---
  __M["src/ui/speed-control.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { CFG } = __M["src/core/config.js"];
    const { setSpeed: timelineSetSpeed } = __M["src/ui/timeline.js"];

let buttons = [];

function initSpeedControl() {
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

function setSpeed(mult) {
  state.playSpeed = mult;
  timelineSetSpeed(mult);
  for (const b of buttons) b.classList.toggle('active', parseFloat(b.dataset.speed) === mult);
}

    return { initSpeedControl, setSpeed };
  })();

  // --- src/ui/orphans-toggle.js ---
  __M["src/ui/orphans-toggle.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { reheat } = __M["src/core/layout.js"];
    const { t } = __M["src/core/i18n.js"];

let _orphBtn;

function initOrphansToggle() {
  _orphBtn = document.getElementById('btn-orphans');
  if (_orphBtn) _orphBtn.addEventListener('click', toggle);
  window.addEventListener('languagechange', update);
  update();
}

function toggleOrphans() { toggle(); }

function toggle() {
  state.connectOrphans = !state.connectOrphans;
  // Зеркалим флаг в sim чтобы core/layout не читал window.__viz.state
  if (state.sim) {
    state.sim.connectOrphans = state.connectOrphans;
    reheat(state.sim, 0.5);
  }
  update();
}

function update() {
  if (!_orphBtn) return;
  _orphBtn.textContent = '🔗';
  _orphBtn.title = state.connectOrphans ? t('tip.orphans_on') : t('tip.orphans_off');
  _orphBtn.classList.toggle('active-orphans', state.connectOrphans);
}

    return { initOrphansToggle, toggleOrphans };
  })();

  // --- src/ui/render-toggle.js ---
  __M["src/ui/render-toggle.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { isWebglSupported, initWebglRenderer, resizeWebgl } = __M["src/view/renderer-webgl.js"];
    const { t } = __M["src/core/i18n.js"];
// Toggle между Canvas 2D и WebGL рендерерами. Сохраняет выбор в
// localStorage, чтобы после перезагрузки остаться в выбранном режиме.
// Если WebGL недоступен — кнопка прячется.


const LS_KEY = 'viz:render-backend';
let _btn = null;
let _webglInited = false;
let _webglCanvas = null;
let _canvas2d = null;

function initRenderToggle() {
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

function toggleRenderBackend() {
  setBackend(state.renderBackend === 'webgl' ? 'canvas2d' : 'webgl');
}

/** Программное переключение backend'а — для Settings modal toggle.
 * В 3D-режиме canvas-elements не существуют, попытка init'а WebGL
 * упадёт — поэтому tihely no-op если canvas DOM не подключен. */
function setRenderBackend(backend) {
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

    return { initRenderToggle, toggleRenderBackend, setRenderBackend };
  })();

  // --- src/ui/settings-modal.js ---
  __M["src/ui/settings-modal.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { state } = __M["src/view/state.js"];
    const { reheat } = __M["src/core/layout.js"];
    const { t } = __M["src/core/i18n.js"];
    const { setRenderBackend } = __M["src/ui/render-toggle.js"];
// Settings modal — live-update для основных CFG параметров.
// Сохранение в localStorage. Все labels — через t() для i18n.


const KEY = 'viz-settings';

// Range params: [groupKey, key, min, max, step]. Label берётся через
// labelOf(key) из i18n. Group title — t('settings.group.<groupKey>').
const PARAMS = [
  // Physics
  ['physics', 'repulsion',       500,  30000, 100],
  ['physics', 'spring',          0.01, 0.3,   0.01],
  ['physics', 'springLen',       30,   300,   5],
  ['physics', 'centerPull',      0.0,  0.02,  0.0005],
  ['physics', 'velocityDecay',   0.1,  0.9,   0.02],
  ['physics', 'maxVelocity',     5,    200,   1],
  ['physics', 'alphaDecay',      0.005, 0.2,  0.002],
  ['physics', 'repulsionCutoff', 500,  6000,  100],
  // Visual
  ['visual',  'particlesPerEdge', 0,    3,    1],
  ['visual',  'particleSpeed',   0.1,  2,     0.05],
  ['visual',  'particleJitterPx',0,    6,     0.1],
  ['visual',  'starfieldCount',  0,    1000,  50],
  ['visual',  'nodeGlowRadiusMul', 1,  4,     0.1],
  ['visual',  'nodeGlowAlphaBase', 0,  0.3,   0.01],
  // Playback
  ['playback','storyDwellMs',    400,  5000,  100],
  ['playback','storyCharMs',     5,    80,    1],
  ['playback','storyMaxChars',   80,   1200,  20],
  ['playback','storyPostGapMs',  200,  3000,  50],
  // 3D camera (актуально только в 3D режиме)
  ['visual',  'cameraRotateSpeed', 0.1, 4.0,   0.1],
  // Birth
  ['birth',   'birthDurationMs', 100,  2500,  50],
];

// Map from PARAMS key → i18n label key. Большинство один-в-один по
// settings.<key>, но `particlesPerEdge` сокращается до `particles`,
// `particleJitterPx` → `particleJitter`, `storyDwellMs` → `stepMs`,
// `storyCharMs` → `charMs`, `storyMaxChars` → `maxChars`,
// `storyPostGapMs` → `postGapMs`, `birthDurationMs` → `birthMs`.
const LABEL_KEY = {
  particlesPerEdge: 'settings.particles',
  particleJitterPx: 'settings.particleJitter',
  storyDwellMs:     'settings.stepMs',
  storyCharMs:      'settings.charMs',
  storyMaxChars:    'settings.maxChars',
  storyPostGapMs:   'settings.postGapMs',
  birthDurationMs:  'settings.birthMs',
};
function labelOf(key) {
  return t(LABEL_KEY[key] || ('settings.' + key));
}

// Boolean toggles [groupKey, key, scope, customApply?]. scope='state' →
// state.<key>, 'CFG' → CFG.<key>. customApply вызывается после set value.
const TOGGLES = [
  ['display', 'showReverseSignal', 'state'],
  ['display', 'showForwardSignal', 'state'],
  ['display', 'showErrorRings',    'state'],
  ['display', 'showThinking',      'state'],
  // 3D-only: hover-tooltip с превью текста ноды (по умолчанию off,
  // чтобы не отвлекало при свободном вращении камеры)
  ['display', 'show3DHoverPreview','state'],
  ['metrics', 'showMetrics',       'state'],
  // Play slider — равномерно по count нод вместо по реальному ts
  ['playback', 'timelineByCount',  'state'],
  // useCanvas2D — boolean fallback вместо WebGL (продвинутая опция)
  ['advanced', 'useCanvas2D',      'state', (val) => setRenderBackend(val ? 'canvas2d' : 'webgl')],
];

// Группы в порядке отображения. Если в группе нет параметров — пропускается.
const GROUP_ORDER = ['physics', 'visual', 'display', 'metrics', 'playback', 'birth', 'advanced'];

let modalEl, btn;

function initSettingsModal() {
  btn = document.getElementById('btn-settings');
  if (btn) btn.addEventListener('click', toggle);
  // Применяем saved settings
  loadSaved();
}

function toggleSettings() { toggle(); }

function toggle() {
  if (modalEl) { close(); return; }
  open();
}

function open() {
  modalEl = document.createElement('div');
  modalEl.id = 'settings-modal';
  modalEl.className = 'settings-modal';

  const inner = document.createElement('div');
  inner.className = 'settings-body';
  modalEl.appendChild(inner);

  const header = document.createElement('div');
  header.className = 'settings-header';
  const titleEl = document.createElement('span');
  titleEl.textContent = t('settings.header');
  header.appendChild(titleEl);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'settings-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', t('aria.close'));
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);
  inner.appendChild(header);

  // Группируем range-параметры и toggle'ы по группам
  const groups = new Map();
  for (const g of GROUP_ORDER) groups.set(g, { ranges: [], toggles: [] });
  for (const p of PARAMS) {
    if (!groups.has(p[0])) groups.set(p[0], { ranges: [], toggles: [] });
    groups.get(p[0]).ranges.push(p);
  }
  for (const tg of TOGGLES) {
    if (!groups.has(tg[0])) groups.set(tg[0], { ranges: [], toggles: [] });
    groups.get(tg[0]).toggles.push(tg);
  }

  for (const [groupKey, items] of groups) {
    if (!items.ranges.length && !items.toggles.length) continue;
    const gTitle = document.createElement('div');
    gTitle.className = 'settings-group-title';
    gTitle.textContent = t('settings.group.' + groupKey).toUpperCase();
    inner.appendChild(gTitle);

    // Toggles идут первыми (компактные чекбоксы наверху группы)
    for (const tg of items.toggles) {
      const key = tg[1];
      const scope = tg[2];
      const customApply = tg[3];
      const row = document.createElement('div');
      row.className = 'settings-row settings-row-toggle';
      const lbl = document.createElement('label');
      lbl.textContent = labelOf(key);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.key = key;
      input.dataset.scope = scope;
      const target = scope === 'state' ? state : CFG;
      // Toggles с default OFF: useCanvas2D, timelineByCount, showMetrics, show3DHoverPreview.
      // Для остальных — default ON (если поле не задано в state — считаем true).
      const defaultOff = key === 'useCanvas2D' || key === 'timelineByCount'
        || key === 'showMetrics' || key === 'show3DHoverPreview';
      input.checked = defaultOff ? !!target[key] : target[key] !== false;
      input.addEventListener('change', () => {
        target[key] = !!input.checked;
        save();
        if (customApply) customApply(target[key]);
      });
      row.appendChild(lbl);
      row.appendChild(input);
      inner.appendChild(row);
    }

    for (const p of items.ranges) {
      const key = p[1], min = p[2], max = p[3], step = p[4];
      const row = document.createElement('div');
      row.className = 'settings-row';
      const lbl = document.createElement('label');
      lbl.textContent = labelOf(key);
      const val = document.createElement('span');
      val.className = 'settings-val';
      val.textContent = formatValue(CFG[key]);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(CFG[key]);
      input.dataset.key = key;
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        CFG[key] = v;
        val.textContent = formatValue(v);
        save();
        if (state.sim) reheat(state.sim, 0.3);
      });
      row.appendChild(lbl);
      row.appendChild(input);
      row.appendChild(val);
      inner.appendChild(row);
    }
  }

  const footer = document.createElement('div');
  footer.className = 'settings-footer';
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = t('btn.reset_defaults');
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(KEY);
    location.reload();
  });
  footer.appendChild(resetBtn);
  inner.appendChild(footer);

  document.body.appendChild(modalEl);
  // Click outside to close
  modalEl.addEventListener('click', (ev) => { if (ev.target === modalEl) close(); });
}

function close() {
  if (modalEl) { modalEl.remove(); modalEl = null; }
}

function formatValue(v) {
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return String(v);
  const abs = Math.abs(v);
  if (abs < 0.001) return v.toFixed(5);
  if (abs < 0.1) return v.toFixed(3);
  if (abs < 10) return v.toFixed(2);
  return v.toFixed(0);
}

function save() {
  const obj = {};
  for (const p of PARAMS) obj[p[1]] = CFG[p[1]];
  for (const tg of TOGGLES) {
    const key = tg[1], scope = tg[2];
    obj[key] = (scope === 'state' ? state : CFG)[key];
  }
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    for (const p of PARAMS) {
      const key = p[1];
      if (typeof obj[key] === 'number' && isFinite(obj[key])) CFG[key] = obj[key];
    }
    for (const tg of TOGGLES) {
      const key = tg[1], scope = tg[2];
      if (typeof obj[key] === 'boolean') {
        (scope === 'state' ? state : CFG)[key] = obj[key];
      }
    }
  } catch {}
}

    return { initSettingsModal, toggleSettings };
  })();

  // --- src/ui/topics-toggle.js ---
  __M["src/ui/topics-toggle.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { applyTopicsToNodes, hueToRgbaString } = __M["src/view/topics.js"];
    const { t } = __M["src/core/i18n.js"];

let _topicBtn;
let _legendEl;

function initTopicsToggle() {
  _topicBtn = document.getElementById('btn-topics');
  if (_topicBtn) _topicBtn.addEventListener('click', toggle);
  _legendEl = ensureLegend();
  updateBtn();
}

function toggleTopics() { toggle(); }

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
function setTopicFilter(word) {
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

function clearTopicFilter() {
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

    return { initTopicsToggle, toggleTopics, setTopicFilter, clearTopicFilter };
  })();

  // --- src/ui/bookmarks.js ---
  __M["src/ui/bookmarks.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { listStarred, getAnnotation } = __M["src/ui/annotations.js"];
    const { showDetail } = __M["src/ui/detail-panel.js"];
    const { t } = __M["src/core/i18n.js"];
// Bookmarks panel — показывает все starred-ноды в текущей сессии,
// клик фокусирует камеру и открывает detail-panel. Кнопка ⭐ в HUD
// открывает панель.


let _btn, _panel, _listEl;

function initBookmarks() {
  _btn = document.getElementById('btn-bookmarks');
  if (_btn) _btn.addEventListener('click', toggle);
  _panel = ensurePanel();
  updateBadge();
}

function toggleBookmarks() { toggle(); }

function toggle() {
  if (!_panel) return;
  const open = !_panel.classList.contains('open');
  _panel.classList.toggle('open', open);
  if (open) render();
  if (_btn) _btn.classList.toggle('active-bookmarks', open);
}

/** Вызывается после loadAnnotations — обновляет счётчик на кнопке. */
function updateBadge() {
  if (!_btn) return;
  const starred = listStarred();
  _btn.textContent = '⭐';
  _btn.title = starred.length
    ? t('tip.bookmarks_count', { n: starred.length })
    : t('tip.bookmarks_empty');
  if (starred.length) _btn.dataset.badge = String(starred.length);
  else delete _btn.dataset.badge;
}

if (typeof window !== 'undefined') window.addEventListener('languagechange', updateBadge);

function ensurePanel() {
  let el = document.getElementById('bookmarks-panel');
  if (el) return el;
  el = document.createElement('aside');
  el.id = 'bookmarks-panel';
  el.className = 'bookmarks-panel';

  const header = document.createElement('div');
  header.className = 'bookmarks-header';
  const title = document.createElement('span');
  title.textContent = '⭐ Bookmarks';
  header.appendChild(title);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'bookmarks-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', toggle);
  header.appendChild(closeBtn);
  el.appendChild(header);

  _listEl = document.createElement('div');
  _listEl.className = 'bookmarks-list';
  el.appendChild(_listEl);

  const hint = document.createElement('div');
  hint.className = 'bookmarks-hint';
  hint.textContent = 'Выдели ноду и нажми S или ☆ Star в панели детали. Клик здесь — фокус на ноде.';
  el.appendChild(hint);

  // CSS — inline, не трогаем HTML
  const css = document.createElement('style');
  css.textContent = `
    .bookmarks-panel { position: fixed; top: 80px; right: 16px; width: 300px;
      max-height: calc(100vh - 180px); z-index: 22; display: none; flex-direction: column;
      background: var(--panel); border: 1px solid var(--border); border-radius: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; }
    .bookmarks-panel.open { display: flex; }
    .bookmarks-header { display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-bottom: 1px solid var(--border);
      font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); }
    .bookmarks-close { background: transparent; border: 0; color: var(--muted);
      font-size: 18px; cursor: pointer; line-height: 1; padding: 0 4px; }
    .bookmarks-close:hover { color: var(--accent); }
    .bookmarks-list { flex: 1; overflow-y: auto; padding: 6px 0; }
    .bookmarks-empty { padding: 16px; color: var(--muted); font-size: 11px; font-style: italic; }
    .bookmark-item { padding: 8px 14px; cursor: pointer; border-bottom: 1px solid rgba(123,170,240,0.06);
      transition: background .12s; }
    .bookmark-item:hover { background: rgba(255,215,120,0.08); }
    .bookmark-role { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--muted); margin-bottom: 3px; }
    .bookmark-role.user { color: var(--user); }
    .bookmark-role.assistant { color: var(--assistant); }
    .bookmark-role.tool_use { color: var(--tool); }
    .bookmark-preview { font-size: 11px; color: var(--text); line-height: 1.3;
      max-height: 3em; overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .bookmark-note { font-size: 10px; color: var(--accent); margin-top: 3px;
      font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bookmarks-hint { padding: 10px 14px; font-size: 10px; color: var(--muted);
      border-top: 1px solid var(--border); line-height: 1.5; }
    .btn.active-bookmarks { border-color: #ffd778; color: #ffd778; }
  `;
  document.head.appendChild(css);
  document.body.appendChild(el);
  return el;
}

function render() {
  if (!_listEl) return;
  _listEl.innerHTML = '';
  const starred = listStarred();
  if (!starred.length) {
    const empty = document.createElement('div');
    empty.className = 'bookmarks-empty';
    empty.textContent = 'Нет закладок в этой сессии.';
    _listEl.appendChild(empty);
    updateBadge();
    return;
  }
  // Сортировка: по времени ноды
  const items = starred
    .map(id => state.byId.get(id))
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);
  for (const n of items) {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    const role = document.createElement('div');
    role.className = 'bookmark-role ' + n.role;
    role.textContent = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
    item.appendChild(role);
    const preview = document.createElement('div');
    preview.className = 'bookmark-preview';
    preview.textContent = (n.text || '(empty)').slice(0, 140);
    item.appendChild(preview);
    const ann = getAnnotation(n.id);
    if (ann && ann.text) {
      const note = document.createElement('div');
      note.className = 'bookmark-note';
      note.textContent = '✍ ' + ann.text.slice(0, 80);
      item.appendChild(note);
    }
    item.addEventListener('click', () => focusOnNode(n));
    _listEl.appendChild(item);
  }
  updateBadge();
}

function focusOnNode(n) {
  state.selected = n;
  // Camera zoom — повторяем логику из interaction.js
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = 1.5;
  state.cameraTarget = {
    x: n.x - (w / 2) / scale,
    y: n.y - (h / 2) / scale,
    scale,
  };
  showDetail(n);
}

    return { initBookmarks, toggleBookmarks, updateBadge };
  })();

  // --- src/ui/keyboard.js ---
  __M["src/ui/keyboard.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { togglePlay } = __M["src/ui/timeline.js"];
    const { fitToView } = __M["src/core/layout.js"];
    const { syncChatToTimeline } = __M["src/ui/story-mode.js"];
    const { hideDetail, toggleStarOnCurrent } = __M["src/ui/detail-panel.js"];
    const { toggleFreeze } = __M["src/ui/freeze-toggle.js"];
    const { setSpeed } = __M["src/ui/speed-control.js"];
    const { toggleOrphans } = __M["src/ui/orphans-toggle.js"];
    const { toggleSettings } = __M["src/ui/settings-modal.js"];
    const { clearTopicFilter } = __M["src/ui/topics-toggle.js"];
    const { toggleBookmarks, updateBadge: updateBookmarksBadge } = __M["src/ui/bookmarks.js"];
    const { toggleStar } = __M["src/ui/annotations.js"];

let _kbdGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

function initKeyboard(_kbdGetViewportFn) {
  if (_kbdGetViewportFn) _kbdGetViewport = _kbdGetViewportFn;
  window.addEventListener('keydown', onKey);
  // Чтобы Space/Enter на наших кнопках не триггерил shortcut повторно — blur после click
  document.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => { try { b.blur(); } catch {} });
  });
}

function isInputFocused() {
  const a = document.activeElement;
  if (!a) return false;
  const tag = a.tagName && a.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || a.isContentEditable;
}

function onKey(ev) {
  if (isInputFocused()) return;
  if (ev.key === ' ') {
    ev.preventDefault();
    togglePlay();
  } else if (ev.key === 'ArrowRight') {
    ev.preventDefault();
    stepTimeline(1);
  } else if (ev.key === 'ArrowLeft') {
    ev.preventDefault();
    stepTimeline(-1);
  } else if (ev.key === 'Home' || ev.key === 'r' || ev.key === 'R') {
    ev.preventDefault();
    resetView();
  } else if (ev.key === 'Escape') {
    let handled = false;
    if (state.topicFilter) { clearTopicFilter(); handled = true; }
    if (!handled && (state.selected || state.cameraTarget)) {
      state.selected = null;
      state.cameraTarget = null;
      hideDetail();
    }
  } else if (ev.key === 'f' || ev.key === 'F') {
    ev.preventDefault();
    toggleFreeze();
  } else if (ev.key === 'o' || ev.key === 'O') {
    ev.preventDefault();
    toggleOrphans();
  } else if (ev.key === ',') {
    ev.preventDefault();
    toggleSettings();
  } else if (ev.key === 'b' || ev.key === 'B') {
    ev.preventDefault();
    toggleBookmarks();
  } else if (ev.key === 's' || ev.key === 'S') {
    // Star на текущую selected-ноду. Если detail-panel открыт — он сам
    // обновит UI. Если нет — переключим через state.selected.
    if (toggleStarOnCurrent()) {
      updateBookmarksBadge();
      ev.preventDefault();
    } else if (state.selected) {
      toggleStar(state.selected.id);
      updateBookmarksBadge();
      ev.preventDefault();
    }
  } else if (ev.key === '1') { ev.preventDefault(); setSpeed(0.5); }
  else if (ev.key === '2') { ev.preventDefault(); setSpeed(1); }
  else if (ev.key === '3') { ev.preventDefault(); setSpeed(2); }
  else if (ev.key === '5') { ev.preventDefault(); setSpeed(5); }
}

function stepTimeline(dir) {
  if (!state.nodes.length) return;
  const sorted = [...state.nodes].sort((a, b) => a.ts - b.ts);
  const tsMin = sorted[0].ts;
  const tsMax = sorted[sorted.length - 1].ts;
  const range = Math.max(1, tsMax - tsMin);
  const cutoff = tsMin + range * state.timelineMax;
  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].ts <= cutoff) currentIdx = i;
    else break;
  }
  const newIdx = Math.max(0, Math.min(sorted.length - 1, currentIdx + dir));
  state.timelineMax = Math.min(1, (sorted[newIdx].ts - tsMin) / range + 0.0001);
  const slider = document.getElementById('timeline');
  if (slider) {
    slider.value = String(Math.round(state.timelineMax * 100));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    syncChatToTimeline(state);
  }
}

function resetView() {
  if (!state.nodes.length) return;
  const cam = fitToView(state.nodes, _kbdGetViewport());
  state.cameraTarget = { x: cam.x, y: cam.y, scale: cam.scale };
}

    return { initKeyboard };
  })();

  // --- src/ui/stats-hud.js ---
  __M["src/ui/stats-hud.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { toolIcon } = __M["src/view/tool-icons.js"];

let panelEl, tokensEl, durationEl, topToolsEl, longestEl;
let tickCounter = 0;

function initStats() {
  panelEl = document.getElementById('stats-panel');
  tokensEl = document.getElementById('stat-tokens');
  durationEl = document.getElementById('stat-duration');
  topToolsEl = document.getElementById('stat-top-tools');
  longestEl = document.getElementById('stat-longest');
}

function computeStats(nodes) {
  if (!nodes || !nodes.length) return null;
  let totalChars = 0;
  let tsMin = Infinity, tsMax = -Infinity;
  let longest = null;
  let hubs = 0;
  const toolCounts = new Map();
  for (const n of nodes) {
    if (typeof n.textLen === 'number') totalChars += n.textLen;
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
    if (!longest || n.textLen > longest.textLen) longest = n;
    if (n.isHub) hubs++;
    if (n.role === 'tool_use' && n.toolName) {
      toolCounts.set(n.toolName, (toolCounts.get(n.toolName) || 0) + 1);
    }
  }
  return {
    tokens: Math.round(totalChars / 4),
    durationSec: (tsMax - tsMin) / 1000,
    longest,
    hubs,
    topTools: [...toolCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
}

function formatDuration(sec) {
  if (sec < 0 || !isFinite(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const parts = [];
  if (h) parts.push(h + 'h');
  if (m || h) parts.push(m + 'm');
  parts.push(s + 's');
  return parts.join(' ');
}

function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function recomputeStats() {
  if (!panelEl) return;
  const s = computeStats(state.nodes);
  if (!s) { panelEl.style.display = 'none'; return; }
  panelEl.style.display = '';
  // Не все вызывающие страницы (например 3d.html) имеют все элементы;
  // null-check на каждый — иначе TypeError ломает render-loop.
  if (tokensEl) tokensEl.textContent = '~' + formatTokens(s.tokens);
  if (durationEl) durationEl.textContent = formatDuration(s.durationSec);
  if (topToolsEl) {
    if (s.topTools.length) {
      topToolsEl.innerHTML = s.topTools.map(([name, count]) =>
        `<span class="tool-chip"><span class="tool-chip-icon">${escapeHtml(toolIcon(name))}</span>${escapeHtml(name)} <b>×${count}</b></span>`
      ).join(' ');
    } else {
      topToolsEl.innerHTML = '<span class="muted">—</span>';
    }
  }
  // Hubs
  const hubsLabel = document.getElementById('stat-hubs');
  if (hubsLabel) hubsLabel.textContent = s.hubs > 0 ? String(s.hubs) : '—';
  if (longestEl) {
    if (s.longest) {
      const preview = (s.longest.text || '').slice(0, 36).replace(/\n/g, ' ');
      const ellipsis = (s.longest.text || '').length > 36 ? '…' : '';
      longestEl.innerHTML = `<span class="longest-role ${s.longest.role}">${s.longest.role}</span> <span class="longest-len">${s.longest.textLen}</span> <span class="longest-preview">${escapeHtml(preview)}${ellipsis}</span>`;
    } else {
      longestEl.textContent = '—';
    }
  }
}

function tickStats() {
  if ((tickCounter++) % 180 !== 0) return;
  recomputeStats();
}

    return { initStats, computeStats, formatDuration, formatTokens, recomputeStats, tickStats };
  })();

  // --- src/ui/layout-toggle.js ---
  __M["src/ui/layout-toggle.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { CFG } = __M["src/core/config.js"];
    const { computeRadialLayout, computeSwimLanes, easeInOutQuad, fitToView, reheat } = __M["src/core/layout.js"];

// btns — массив объектов с полями mode (string) и el (HTMLElement)
let btns = [];
let transition = null;
let _ltGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

function initLayoutToggle(_ltGetViewportFn) {
  if (_ltGetViewportFn) _ltGetViewport = _ltGetViewportFn;
  // Восстанавливаем закреплённый выбор пользователя — иначе остаётся
  // дефолт 'force' и auto-detect в loader'е может его переопределить.
  try {
    const saved = localStorage.getItem('viz:layoutMode');
    if (saved === 'force' || saved === 'radial' || saved === 'swim') {
      state.layoutMode = saved;
    }
  } catch {}
  const host = document.getElementById('layout-switch');
  if (!host) return;
  host.innerHTML = '';
  const modes = [
    { id: 'force',  label: 'Force'     },
    { id: 'radial', label: 'Radial'    },
    { id: 'swim',   label: '🌊 Swim'   },
  ];
  btns = [];
  for (const m of modes) {
    const el = document.createElement('button');
    el.className = 'btn btn-layout-chip';
    el.dataset.mode = m.id;
    el.textContent = m.label;
    el.addEventListener('click', () => switchTo(m.id));
    host.appendChild(el);
    btns.push({ mode: m.id, el });
  }
  updateActive();
}

function switchTo(toMode) {
  if (transition) return;
  if (toMode === state.layoutMode) return;
  // Запоминаем явный выбор пользователя — отключает auto-detect tree
  // при следующем loadText. Если пользователь хочет сбросить
  // (вернуть авто-detect) — localStorage.removeItem('viz:layoutMode').
  try { localStorage.setItem('viz:layoutMode', toMode); } catch {}
  const from = new Map();
  for (const n of state.nodes) from.set(n.id, { x: n.x, y: n.y });
  let to;
  if (toMode === 'radial') {
    to = computeRadialLayout(state.nodes, state.byId, _ltGetViewport());
  } else if (toMode === 'swim') {
    to = computeSwimLanes(state.nodes, _ltGetViewport());
  } else {
    to = new Map();
    for (const n of state.nodes) {
      to.set(n.id, { x: n.x + (Math.random() - 0.5) * 20, y: n.y + (Math.random() - 0.5) * 20 });
    }
  }
  transition = { from, to, startTime: performance.now(), duration: CFG.layoutTransitionMs, toMode };
  // Автофит камеры под новую раскладку после transition
  setTimeout(() => {
    if (state.nodes.length) {
      const cam = fitToView(state.nodes, _ltGetViewport());
      state.cameraTarget = { x: cam.x, y: cam.y, scale: cam.scale };
    }
  }, CFG.layoutTransitionMs + 50);
}

function tickLayoutTransition() {
  if (!transition) return;
  const now = performance.now();
  const t = Math.min(1, (now - transition.startTime) / transition.duration);
  const e = easeInOutQuad(t);
  for (const n of state.nodes) {
    const from = transition.from.get(n.id);
    const to = transition.to.get(n.id);
    if (!from || !to) continue;
    n.x = from.x + (to.x - from.x) * e;
    n.y = from.y + (to.y - from.y) * e;
    n.vx = 0;
    n.vy = 0;
  }
  if (t >= 1) {
    state.layoutMode = transition.toMode;
    if (transition.toMode === 'force' && state.sim) reheat(state.sim, 0.5);
    transition = null;
    updateActive();
  }
}

function isRadialActive() {
  const m = (transition && transition.toMode) || state.layoutMode;
  return m === 'radial' || m === 'swim';
}

function updateActive() {
  for (const b of btns) b.el.classList.toggle('active', b.mode === state.layoutMode);
}

    return { initLayoutToggle, tickLayoutTransition, isRadialActive };
  })();

  // --- src/ui/audio.js ---
  __M["src/ui/audio.js"] = (function () {
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

function initAudio() {
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

function chirpFor(node) {
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

function isAudioEnabled() { return enabled; }

    return { initAudio, chirpFor, isAudioEnabled };
  })();

  // --- src/ui/recorder.js ---
  __M["src/ui/recorder.js"] = (function () {
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

function initRecorder(getCanvas) {
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

function start() {
  const canvas = _getCanvas();
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
  _recBtnEl.textContent = recording ? '● REC 0s' : '●';
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

    return { initRecorder };
  })();

  // --- src/ui/snapshot.js ---
  __M["src/ui/snapshot.js"] = (function () {
    const { t } = __M["src/core/i18n.js"];
// PNG/SVG-снимок текущего view. PNG через canvas.toBlob, SVG через
// ручную сериализацию (без html2canvas — zero deps принцип).


let _snapBtn;
// Function returning the canvas to snapshot. По умолчанию — 2D `#graph`.
// В 3D — Three.js renderer.domElement (требует preserveDrawingBuffer:true
// в WebGLRenderer чтобы toBlob не вернул пустоту).
let _getCanvas = () => document.getElementById('graph');
// SVG-snapshot имеет смысл только для 2D (где есть state.nodes/edges с
// плоскими x/y координатами). В 3D — отключаем пункт меню.
let _supportSvg = true;

function initSnapshot(opts) {
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

    return { initSnapshot };
  })();

  // --- src/ui/diff-mode.js ---
  __M["src/ui/diff-mode.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { parseJSONL } = __M["src/core/parser.js"];
    const { normalizeToClaudeJsonl } = __M["src/core/adapters.js"];
    const { CFG } = __M["src/core/config.js"];
    const { seedJitter, computeBBox, fitToView } = __M["src/core/layout.js"];
    const { t } = __M["src/core/i18n.js"];
// Diff mode — сравнение двух сессий. Пользователь уже загрузил файл A,
// нажимает "🔀 Diff" и дропает второй JSONL. Мы парсим B, хешируем
// каждую ноду по (role + первые 300 символов text), находим совпадения
// с A и подсвечиваем три группы:
//   - _diffOrigin='A'     — нода только в A (розоватый)
//   - _diffOrigin='B'     — нода только в B (бирюзовый)
//   - _diffOrigin='both'  — нода в обоих (серый/общий)
// Уникальные ноды B добавляются в state.nodes со сдвигом по X
// (чтобы образовался «правый кластер»). Рёбра B, смотрящие на общие ноды,
// перецепляются на A-id.
//
// Повторный клик по кнопке отключает режим: удаляем B-ноды/edges,
// очищаем _diffOrigin, сбрасываем stats. Родной набор A никогда не
// мутируется деструктивно (кроме очистки annotations).


let _diffGetViewport;
let _diffBtn;

function initDiffMode(getViewportFn) {
  _diffGetViewport = getViewportFn;
  _diffBtn = document.getElementById('btn-diff');
  if (_diffBtn) _diffBtn.addEventListener('click', onBtnClick);
  initDropZone();
  updateBtn();
}

function onBtnClick() {
  if (state.diffMode) {
    clearDiff();
  } else {
    openDropZone();
  }
}

function initDropZone() {
  const overlay = document.getElementById('diff-drop');
  if (!overlay) return;
  const cancelBtn = document.getElementById('diff-cancel');
  const fileInput = document.getElementById('diff-file-input');
  if (cancelBtn) cancelBtn.addEventListener('click', closeDropZone);
  if (fileInput) fileInput.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (f) { readAndApply(f); fileInput.value = ''; }
  });
  const browseBtn = document.getElementById('diff-browse');
  if (browseBtn && fileInput) browseBtn.addEventListener('click', () => fileInput.click());
  overlay.addEventListener('dragover', (ev) => { ev.preventDefault(); overlay.classList.add('hover'); });
  overlay.addEventListener('dragleave', () => overlay.classList.remove('hover'));
  overlay.addEventListener('drop', (ev) => {
    ev.preventDefault();
    overlay.classList.remove('hover');
    const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (f) readAndApply(f);
  });
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closeDropZone();
  });
}

function openDropZone() {
  const overlay = document.getElementById('diff-drop');
  if (overlay) overlay.classList.add('show');
}
function closeDropZone() {
  const overlay = document.getElementById('diff-drop');
  if (overlay) overlay.classList.remove('show');
}

function readAndApply(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyDiffText(String(reader.result));
      closeDropZone();
    } catch (e) {
      setDropError('Parse error: ' + e.message);
      console.error(e);
    }
  };
  reader.onerror = () => setDropError('Read error: ' + (reader.error && reader.error.message));
  reader.readAsText(file);
}

function setDropError(msg) {
  const el = document.getElementById('diff-drop-error');
  if (el) el.textContent = msg;
}

function applyDiffText(text) {
  if (!state.nodes.length) {
    setDropError('Сначала загрузите первую сессию.');
    return;
  }
  const norm = normalizeToClaudeJsonl(text);
  const parsed = parseJSONL(norm.text);
  if (!parsed.nodes.length) {
    setDropError('Во втором файле нет сообщений.');
    return;
  }
  const stats = mergeDiff(state, parsed.nodes, _diffGetViewport());
  state.diffMode = true;
  state.diffStats = stats;
  updateBtn();
  refitCamera();
}

/**
 * Чистая функция слияния. Мутирует state.nodes/edges/byId, добавляя
 * уникальные B-ноды, и помечает _diffOrigin на всех A и B.
 *
 * @returns {{ onlyA: number, onlyB: number, both: number }}
 */
function mergeDiff(target, rawNodesB, viewport) {
  const hashA = new Map(); // hash → A-node
  for (const a of target.nodes) {
    a._diffOrigin = 'A';
    hashA.set(hashNode(a), a);
  }
  // BBox для сдвига B-подграфа
  const bbox = computeBBox(target.nodes);
  const gap = 220;
  const offsetX = (bbox.maxX ?? viewport.cx) + gap;
  const centerY = ((bbox.minY ?? 0) + (bbox.maxY ?? 0)) / 2;

  const mappedId = new Map(); // rawId → resolved id in target.byId
  let onlyB = 0, both = 0;

  // Первый проход — дедуп: либо совпадает по хэшу с A (both),
  // либо добавляем новую B-ноду
  for (const raw of rawNodesB) {
    const h = hashNode(raw);
    const existing = hashA.get(h);
    if (existing) {
      existing._diffOrigin = 'both';
      mappedId.set(raw.id, existing.id);
      both++;
    } else {
      const newId = 'B:' + raw.id;
      mappedId.set(raw.id, newId);
      // Позиция: ниже B-кластера + небольшое облако
      const s = seedJitter(newId);
      const node = {
        ...raw,
        id: newId,
        parentId: null, // резолвим ниже
        x: offsetX + (s.dx - 0.5) * 400,
        y: centerY + (s.dy - 0.5) * 400,
        vx: 0, vy: 0,
        fxAcc: 0, fyAcc: 0,
        r: CFG.minR,
        recency: 1,
        phase: ((s.dx + s.dy) * Math.PI),
        degree: 0,
        isHub: false,
        _seedDx: s.dx,
        _seedDy: s.dy,
        _diffOrigin: 'B',
      };
      target.nodes.push(node);
      target.byId.set(newId, node);
      onlyB++;
    }
  }

  // Второй проход — рёбра B: родитель резолвится через mappedId.
  // Если raw.parentId → общая нода (both), edge свяжет её с B-ребёнком.
  for (const raw of rawNodesB) {
    const resolvedId = mappedId.get(raw.id);
    const node = target.byId.get(resolvedId);
    if (!node) continue;
    if (!raw.parentId) continue;
    const parentResolved = mappedId.get(raw.parentId);
    if (!parentResolved) continue;
    const parent = target.byId.get(parentResolved);
    if (!parent) continue;
    // Только для B-уникальной ноды добавим ребро; для both-ноды это её родная связь из A
    if (resolvedId.startsWith('B:')) {
      // Но только если такого ребра ещё нет (дубль из A)
      const already = target.edges.some(e => e.source === parent.id && e.target === resolvedId);
      if (!already) {
        target.edges.push({
          source: parent.id,
          target: resolvedId,
          a: parent,
          b: node,
          adopted: false,
          diffSide: 'B',
        });
      }
    }
  }

  // Пересчёт степеней
  for (const n of target.nodes) n.degree = 0;
  for (const e of target.edges) {
    if (e.a) e.a.degree = (e.a.degree || 0) + 1;
    if (e.b) e.b.degree = (e.b.degree || 0) + 1;
  }

  const onlyA = target.nodes.filter(n => n._diffOrigin === 'A').length;
  return { onlyA, onlyB, both };
}

function clearDiff() {
  if (!state.diffMode) return;
  // Выкинуть все B-ноды (id начинается с 'B:') и их edges
  const removeIds = new Set();
  state.nodes = state.nodes.filter(n => {
    if (typeof n.id === 'string' && n.id.startsWith('B:')) {
      removeIds.add(n.id);
      state.byId.delete(n.id);
      return false;
    }
    return true;
  });
  state.edges = state.edges.filter(e => !removeIds.has(e.source) && !removeIds.has(e.target));
  for (const n of state.nodes) delete n._diffOrigin;
  state.diffMode = false;
  state.diffStats = null;
  updateBtn();
  refitCamera();
}

function refitCamera() {
  if (!state.nodes.length) return;
  const cam = fitToView(state.nodes, _diffGetViewport());
  state.cameraTarget = { x: cam.x, y: cam.y, scale: cam.scale };
}

function updateBtn() {
  if (!_diffBtn) return;
  _diffBtn.textContent = '🔀';
  if (state.diffMode && state.diffStats) {
    const s = state.diffStats;
    _diffBtn.title = t('tip.diff_on', { a: s.onlyA, b: s.onlyB, both: s.both });
    _diffBtn.dataset.badge = String(s.onlyB);
    _diffBtn.classList.add('active-diff');
  } else {
    _diffBtn.title = t('tip.diff_off');
    delete _diffBtn.dataset.badge;
    _diffBtn.classList.remove('active-diff');
  }
}

if (typeof window !== 'undefined') window.addEventListener('languagechange', updateBtn);

// FNV-1a hash. Пусть две ноды считаются одинаковыми если совпадает
// role + первые 300 символов текста (после trim и схлопывания whitespace).
function hashNode(n) {
  const role = n.role || '';
  const raw = String(n.text || '').slice(0, 300).trim().replace(/\s+/g, ' ');
  return fnv1a(role + '\u0001' + raw);
}

function fnv1a(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

    return { initDiffMode, applyDiffText, mergeDiff, clearDiff, hashNode, fnv1a };
  })();

  // --- src/ui/session-picker.js ---
  __M["src/ui/session-picker.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { parseJSONL } = __M["src/core/parser.js"];
    const { normalizeToClaudeJsonl } = __M["src/core/adapters.js"];
    const { safeFetch } = __M["src/core/url-safety.js"];
    const { t } = __M["src/core/i18n.js"];
// Session picker — in-memory список JSONL-сессий. Пользователь кидает
// несколько файлов одновременно (или указывает ?sessions=<index.json>),
// и может переключаться между ними через боковую панель.
//
// Локальный режим: каждая загруженная сессия хранится в state.sessions как
//   { id, name, size, content, meta: { nodes?, edges?, firstTs?, lastTs? } }
// Контент храним прямо в памяти — это JSONL-строка, после parseJSONL её
// можно заново превращать в граф. Для 30MB сессии это ~30MB в RAM,
// на 5 сессий = 150MB — приемлемо для браузерного UX.
//
// Remote режим: URL параметр ?sessions=<url> указывает на JSON-индекс
//   { sessions: [{ id, title, url, mtime?, size? }, ...] }
// Контент подгружается по требованию (fetch() при клике на элемент).


let _loadText = null;
let _panel = null;
let _toggleBtn = null;
let _activeId = null;

/**
 * @param {(text: string) => void} loadTextFn — колбэк из loader.js
 */
function initSessionPicker(loadTextFn) {
  _loadText = loadTextFn;
  _panel = document.getElementById('sessions-panel');
  _toggleBtn = document.getElementById('btn-sessions');
  if (_toggleBtn) _toggleBtn.addEventListener('click', togglePanel);
  if (!state.sessions) state.sessions = [];
  render();
}

function toggleSessions() { togglePanel(); }

function togglePanel() {
  if (!_panel) return;
  state.sessionsOpen = !state.sessionsOpen;
  _panel.classList.toggle('open', !!state.sessionsOpen);
  if (_toggleBtn) _toggleBtn.classList.toggle('active-sessions', !!state.sessionsOpen);
}

/**
 * Добавить локальные файлы в список сессий (вызывается из loader.js
 * при drag-drop или file-input с multi).
 *
 * @param {FileList | Array<File>} files
 * @param {{ autoLoadFirst?: boolean }} opts
 */
// Лимит на количество сессий с content в памяти. Выше — старые теряют
// .content (meta остаётся, при клике re-load из File если локальная или
// из remoteUrl если удалённая). Не даст 50-ти 30MB-файлам съесть 1.5GB RAM.
const MAX_SESSIONS_WITH_CONTENT = 20;

function evictOldestContent(keepId) {
  // Простой LRU по touchedAt — но мы его не храним. Альтернатива:
  // сохраняем порядок добавления (индекс массива) и сбрасываем content
  // у самых старых (кроме активной).
  const withContent = state.sessions.filter(s => s.content && s.id !== keepId);
  while (withContent.length > MAX_SESSIONS_WITH_CONTENT - 1 && withContent.length) {
    const victim = withContent.shift();
    victim.content = null; // meta остаётся
  }
}

async function addSessionFiles(files, opts = {}) {
  if (!files || !files.length) return;
  const added = [];
  for (const f of Array.from(files)) {
    if (!f) continue;
    // Читаем как текст
    const content = await f.text();
    const session = createSession({
      id: 'local:' + f.name + ':' + f.size + ':' + (f.lastModified || 0),
      name: f.name,
      size: f.size,
      content,
    });
    added.push(session);
  }
  // Дедуп по id — если повторно тот же файл
  for (const s of added) {
    const existing = state.sessions.findIndex(x => x.id === s.id);
    if (existing >= 0) state.sessions[existing] = s;
    else state.sessions.push(s);
  }
  // LRU eviction — держим в памяти только MAX_SESSIONS_WITH_CONTENT
  evictOldestContent(added.length ? added[0].id : null);
  render();
  if (opts.autoLoadFirst && added.length) {
    selectSession(added[0].id);
    if (!state.sessionsOpen && state.sessions.length > 1) togglePanel();
  }
}

/**
 * Добавить удалённые сессии из index.json.
 * @param {Array<{id, title, url, mtime?, size?}>} items
 */
function addRemoteSessions(items) {
  if (!Array.isArray(items)) return;
  for (const it of items) {
    if (!it || !it.url) continue;
    const id = 'remote:' + (it.id || it.url);
    if (state.sessions.some(s => s.id === id)) continue;
    state.sessions.push({
      id,
      name: it.title || it.id || it.url,
      size: it.size || 0,
      content: null, // lazy load
      remoteUrl: it.url,
      mtime: it.mtime || null,
    });
  }
  render();
}

/**
 * Загрузить индекс с сервера и добавить сессии.
 * @param {string} url
 */
async function loadSessionIndex(url) {
  try {
    const res = await safeFetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.sessions || []);
    addRemoteSessions(items);
    // Показать панель чтобы пользователь сразу увидел
    if (!state.sessionsOpen) togglePanel();
  } catch (e) {
    console.warn('[sessions] не смог загрузить индекс', url, e.message);
  }
}

function createSession({ id, name, size, content }) {
  const meta = computeMeta(content);
  return { id, name, size, content, meta };
}

function computeMeta(content) {
  try {
    const norm = normalizeToClaudeJsonl(content || '');
    const parsed = parseJSONL(norm.text);
    const tsList = parsed.nodes.map(n => n.ts).filter(Number.isFinite).sort((a, b) => a - b);
    return {
      format: norm.format,
      nodes: parsed.nodes.length,
      firstTs: tsList[0] || null,
      lastTs: tsList[tsList.length - 1] || null,
    };
  } catch (e) {
    return { format: 'unknown', nodes: 0, firstTs: null, lastTs: null };
  }
}

async function selectSession(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s || !_loadText) return;
  // Ленивая загрузка удалённых сессий
  if (!s.content && s.remoteUrl) {
    try {
      const res = await safeFetch(s.remoteUrl, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      s.content = await res.text();
      s.meta = computeMeta(s.content);
    } catch (e) {
      console.warn('[sessions] не могу загрузить', s.remoteUrl, e.message);
      return;
    }
  }
  if (s.content) {
    _activeId = id;
    _loadText(s.content);
    render();
  }
}

function removeSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  if (_activeId === id) _activeId = null;
  render();
}

function render() {
  if (!_panel) return;
  const listEl = _panel.querySelector('.sessions-list');
  const hintEl = _panel.querySelector('.sessions-hint');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!state.sessions.length) {
    if (hintEl) hintEl.style.display = '';
    if (_toggleBtn) updateBadge();
    return;
  }
  if (hintEl) hintEl.style.display = 'none';
  for (const s of state.sessions) {
    const item = document.createElement('div');
    item.className = 'session-item' + (s.id === _activeId ? ' active' : '');
    const title = document.createElement('div');
    title.className = 'session-title';
    title.textContent = s.name;
    const meta = document.createElement('div');
    meta.className = 'session-meta';
    const parts = [];
    if (s.meta?.nodes) parts.push(`${s.meta.nodes} nodes`);
    if (s.meta?.format && s.meta.format !== 'claude-jsonl') parts.push(s.meta.format);
    if (s.size) parts.push(formatBytes(s.size));
    if (s.meta?.firstTs) parts.push(formatShortDate(s.meta.firstTs));
    meta.textContent = parts.join(' · ');
    const rm = document.createElement('button');
    rm.className = 'session-remove';
    rm.textContent = '×';
    rm.title = 'Удалить из списка';
    rm.addEventListener('click', (ev) => { ev.stopPropagation(); removeSession(s.id); });
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(rm);
    item.addEventListener('click', () => selectSession(s.id));
    listEl.appendChild(item);
  }
  updateBadge();
}

function updateBadge() {
  if (!_toggleBtn) return;
  const n = state.sessions.length;
  _toggleBtn.textContent = '📚';
  _toggleBtn.title = n ? t('tip.sessions_loaded', { n }) : t('tip.sessions_empty');
  if (n > 0) _toggleBtn.dataset.badge = String(n);
  else delete _toggleBtn.dataset.badge;
}

if (typeof window !== 'undefined') window.addEventListener('languagechange', updateBadge);

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatShortDate(ts) {
  try {
    const d = new Date(ts);
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

    return { initSessionPicker, toggleSessions, addRemoteSessions, addSessionFiles, loadSessionIndex };
  })();

  // --- src/ui/lang-toggle.js ---
  __M["src/ui/lang-toggle.js"] = (function () {
    const { setLanguage, getLanguage } = __M["src/core/i18n.js"];
// Переключатель языка RU/EN. Показывает текущую локаль на кнопке,
// клик меняет язык и триггерит applyTranslations + languagechange event.


let _btn = null;

function initLangToggle() {
  _btn = document.getElementById('btn-lang');
  if (!_btn) return;
  _btn.addEventListener('click', () => {
    setLanguage(getLanguage() === 'ru' ? 'en' : 'ru');
    updateBtn();
  });
  window.addEventListener('languagechange', updateBtn);
  updateBtn();
}

function updateBtn() {
  if (!_btn) return;
  // Показываем КУДА переключит — т.е. другую локаль
  const next = getLanguage() === 'ru' ? 'EN' : 'RU';
  _btn.textContent = next;
  _btn.title = getLanguage() === 'ru' ? 'Switch to English' : 'Переключить на русский';
}

    return { initLangToggle };
  })();

  // --- src/ui/metrics-overlay.js ---
  __M["src/ui/metrics-overlay.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { worldToScreen } = __M["src/view/camera.js"];
// Metrics overlay — HTML/CSS bubble badges поверх WebGL canvas.
//
// Зачем: WebGL не умеет рисовать AA-текст «из коробки». В Canvas 2D мы
// рисуем `drawMetricsBadges` через ctx.fillText, в WebGL же используем
// DOM-overlay: <div id="metrics-overlay"> с position:fixed, inside —
// маленькие <div class="metrics-badge"> с tokens / ⏱latency, transform
// перенастраивается каждый кадр под экранные координаты ноды.
//
// Cost: на 200 ассистент-нод = ~400 DOM элементов. Обновление через
// transform: translate (compositor-friendly). Профилировано — < 1 ms на
// кадр на средней плотности.


let overlayEl = null;
const cache = new Map(); // nodeId → { wrap, tokenEl, latencyEl, lastTokens, lastLatency }

function formatTokensCompact(n) {
  if (n >= 10000) return Math.round(n / 1000) + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
function formatLatencyCompact(ms) {
  if (ms < 1000) return ms + 'ms';
  const sec = ms / 1000;
  if (sec < 60) return sec.toFixed(sec < 10 ? 1 : 0) + 's';
  const m = Math.floor(sec / 60);
  return m + 'm' + Math.round(sec - m * 60) + 's';
}

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.id = 'metrics-overlay';
  overlayEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:ui-monospace,Consolas,monospace;font-size:10px;';
  document.body.appendChild(overlayEl);
  // Inject CSS только один раз
  if (!document.getElementById('metrics-overlay-style')) {
    const style = document.createElement('style');
    style.id = 'metrics-overlay-style';
    style.textContent = `
      .metrics-wrap { position: absolute; left: 0; top: 0; transform: translate(-9999px,-9999px); display: flex; gap: 3px; will-change: transform; white-space: nowrap; }
      .metrics-badge { background: rgba(20, 30, 60, 0.82); color: rgba(220,235,255,0.95); padding: 1px 5px; border-radius: 3px; font-variant-numeric: tabular-nums; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); }
      :root[data-theme="light"] .metrics-badge { background: rgba(50, 60, 90, 0.9); color: rgba(245, 250, 255, 0.98); }
      .metrics-badge.long { background: rgba(180, 80, 30, 0.88); color: rgba(255, 230, 200, 1); }
      :root[data-theme="light"] .metrics-badge.long { background: rgba(165, 70, 25, 0.95); color: rgba(255, 240, 220, 1); }
    `;
    document.head.appendChild(style);
  }
  return overlayEl;
}

function getOrCreateBadge(node) {
  let entry = cache.get(node.id);
  if (entry) return entry;
  const wrap = document.createElement('div');
  wrap.className = 'metrics-wrap';
  const latencyEl = document.createElement('div');
  latencyEl.className = 'metrics-badge';
  const tokenEl = document.createElement('div');
  tokenEl.className = 'metrics-badge';
  // latency слева, tokens справа — порядок в DOM = порядок отображения
  wrap.appendChild(latencyEl);
  wrap.appendChild(tokenEl);
  overlayEl.appendChild(wrap);
  entry = { wrap, tokenEl, latencyEl, lastTokens: -1, lastLatency: -1, lastVisible: false };
  cache.set(node.id, entry);
  return entry;
}

function hideEntry(entry) {
  if (!entry.lastVisible) return;
  entry.wrap.style.transform = 'translate(-9999px,-9999px)';
  entry.lastVisible = false;
}

function isVisibleNode(n, cutoff) {
  if (n.bornAt == null) return false;
  if (n.ts > cutoff) return false;
  if (state.hiddenRoles && state.hiddenRoles.has(n.role)) return false;
  return true;
}

function timelineCutoff() {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

/**
 * Вызывается каждый кадр из main.js (только в WebGL-режиме). Update'ит
 * positions всех бейджей под текущую камеру; добавляет/удаляет элементы
 * по необходимости.
 */
function updateMetricsOverlay(viewport) {
  if (!state.showMetrics) {
    if (overlayEl && overlayEl.children.length) {
      overlayEl.innerHTML = '';
      cache.clear();
    }
    return;
  }
  ensureOverlay();
  const cam = state.camera;
  const cutoff = timelineCutoff();
  const seen = new Set();

  for (const n of state.nodes) {
    if (n.role !== 'assistant') continue;
    const tokens = n.tokensOut || 0;
    const latency = n.responseLatencyMs || 0;
    if (!tokens && latency < 1500) continue;
    if (!isVisibleNode(n, cutoff)) continue;
    seen.add(n.id);

    const entry = getOrCreateBadge(n);
    // Сборка/обновление текстов (только если изменилось — экономит paint)
    if (entry.lastTokens !== tokens) {
      entry.tokenEl.textContent = tokens > 0 ? formatTokensCompact(tokens) : '';
      entry.tokenEl.style.display = tokens > 0 ? '' : 'none';
      entry.lastTokens = tokens;
    }
    if (entry.lastLatency !== latency) {
      if (latency >= 1500) {
        entry.latencyEl.textContent = '⏱' + formatLatencyCompact(latency);
        entry.latencyEl.style.display = '';
        entry.latencyEl.classList.toggle('long', latency > 10000);
      } else {
        entry.latencyEl.style.display = 'none';
      }
      entry.lastLatency = latency;
    }

    // Position: под нодой по центру (transform CSS = compositor-only)
    const s = worldToScreen(n.x, n.y, cam);
    const r = (n.r || 5) * cam.scale;
    const x = Math.round(s.x);
    const y = Math.round(s.y + r + 3);
    entry.wrap.style.transform = `translate(calc(${x}px - 50%), ${y}px)`;
    entry.lastVisible = true;
  }

  // Скрываем (но не удаляем) бейджи нод, которых нет в видимом наборе.
  // Удаление приведёт к дёрганью при play (нода скрылась → удалили DOM).
  for (const [id, entry] of cache) {
    if (!seen.has(id)) hideEntry(entry);
  }
}

function clearMetricsOverlay() {
  if (overlayEl) overlayEl.innerHTML = '';
  cache.clear();
}

    return { updateMetricsOverlay, clearMetricsOverlay };
  })();

  // --- src/ui/fps-counter.js ---
  __M["src/ui/fps-counter.js"] = (function () {
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

function initFpsCounter(elementId) {
  _el = document.getElementById(elementId || 'fps-counter');
}

function tickFps(nowMs) {
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

function resetFps() {
  _times.length = 0;
  _idx = 0;
  _lastDisplayed = -1;
  _lastUpdateMs = 0;
}

    return { initFpsCounter, tickFps, resetFps };
  })();

  // --- src/ui/interaction.js ---
  __M["src/ui/interaction.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { state } = __M["src/view/state.js"];
    const { screenToWorld, applyZoom } = __M["src/view/camera.js"];
    const { pathToRoot } = __M["src/view/path.js"];
    const { reheat, unfreeze } = __M["src/core/layout.js"];
    const { updateFreezeBtn } = __M["src/ui/freeze-toggle.js"];
    const { showDetail, hideDetail } = __M["src/ui/detail-panel.js"];
    const { showTooltip, hideTooltip } = __M["src/ui/tooltip.js"];

let interactionCanvas;
let dragging = false, dragStart = null, dragMoved = false, lastMouse = null;
let draggedNode = null;
let getViewportFn = () => ({ width: window.innerWidth, height: window.innerHeight, cx: window.innerWidth / 2, cy: window.innerHeight / 2 });

function initInteraction(canvasEl, getViewport) {
  interactionCanvas = canvasEl;
  if (getViewport) getViewportFn = getViewport;
  attachToCanvas(canvasEl);
  // Также привязываемся к WebGL-канвасу, если он существует — события
  // обрабатываются на видимом canvas, поэтому listener'ы на обоих не мешают.
  const webglCanvas = document.getElementById('graph-webgl');
  if (webglCanvas && webglCanvas !== canvasEl) attachToCanvas(webglCanvas);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('keydown', onKey);
}

function attachToCanvas(c) {
  c.addEventListener('mousedown', onDown);
  c.addEventListener('wheel', onWheel, { passive: false });
  c.addEventListener('mouseleave', () => { state.hover = null; state.pathSet = new Set(); hideTooltip(); });
  c.addEventListener('dblclick', onDblClick);
}

function onDblClick(ev) {
  const hit = hitTest(ev.clientX, ev.clientY);
  if (!hit) return;
  if (hit.role !== 'assistant') return;
  // Проверяем есть ли tool_use дети
  let hasToolChildren = false;
  for (const n of state.nodes) {
    if (n.parentId === hit.id && n.role === 'tool_use') { hasToolChildren = true; break; }
  }
  if (!hasToolChildren) return;
  if (state.collapsed.has(hit.id)) state.collapsed.delete(hit.id);
  else state.collapsed.add(hit.id);
  if (state.sim) reheat(state.sim, 0.3);
}

function isPanning() { return dragging && !draggedNode; }
function isDraggingNode() { return !!draggedNode; }

function timelineCutoff() {
  if (!state.nodes.length) return Infinity;
  let tsMin = Infinity, tsMax = -Infinity;
  for (const n of state.nodes) {
    if (n.ts < tsMin) tsMin = n.ts;
    if (n.ts > tsMax) tsMax = n.ts;
  }
  return tsMin + (tsMax - tsMin) * state.timelineMax;
}

function hitTest(sx, sy) {
  const cam = state.camera;
  const cutoff = timelineCutoff();
  const world = screenToWorld(sx, sy, cam);
  let best = null, bestD2 = Infinity;
  for (const n of state.nodes) {
    if (n.ts > cutoff) continue;
    if (n.bornAt == null) continue;
    const dx = n.x - world.x, dy = n.y - world.y;
    const d2 = dx * dx + dy * dy;
    const r = n.r + CFG.hitPad / cam.scale;
    if (d2 < r * r && d2 < bestD2) { bestD2 = d2; best = n; }
  }
  return best;
}

function onDown(ev) {
  dragging = true;
  dragMoved = false;
  dragStart = { x: ev.clientX, y: ev.clientY };
  lastMouse = { x: ev.clientX, y: ev.clientY };
  draggedNode = hitTest(ev.clientX, ev.clientY);
  state.cameraTarget = null;
  if (draggedNode) {
    // Auto-unfreeze + re-heat на drag ноды
    if (state.sim && state.sim.manualFrozen) { unfreeze(state.sim); updateFreezeBtn(); }
    if (state.sim) { reheat(state.sim, 0.3); state.sim.alphaTarget = 0.3; }
    state.hover = draggedNode;
    state.pathSet = pathToRoot(draggedNode, state.byId);
    hideTooltip();
    interactionCanvas.style.cursor = 'grabbing';
  } else {
    interactionCanvas.classList.add('dragging');
  }
}

function onMove(ev) {
  if (dragging) {
    const dx = ev.clientX - lastMouse.x;
    const dy = ev.clientY - lastMouse.y;
    const totalDx = ev.clientX - dragStart.x;
    const totalDy = ev.clientY - dragStart.y;
    if (Math.abs(totalDx) > CFG.clickTolerancePx || Math.abs(totalDy) > CFG.clickTolerancePx) dragMoved = true;
    if (draggedNode) {
      const world = screenToWorld(ev.clientX, ev.clientY, state.camera);
      draggedNode.x = world.x;
      draggedNode.y = world.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else {
      state.camera.x -= dx / state.camera.scale;
      state.camera.y -= dy / state.camera.scale;
    }
    lastMouse = { x: ev.clientX, y: ev.clientY };
    hideTooltip();
  } else {
    const h = hitTest(ev.clientX, ev.clientY);
    state.hover = h;
    state.pathSet = h ? pathToRoot(h, state.byId) : new Set();
    interactionCanvas.style.cursor = h ? 'pointer' : 'grab';
    if (h) showTooltip(h, ev.clientX, ev.clientY);
    else hideTooltip();
  }
}

function onUp(ev) {
  if (!dragging) return;
  dragging = false;
  interactionCanvas.classList.remove('dragging');
  const wasNodeDrag = !!draggedNode;
  draggedNode = null;
  if (wasNodeDrag && state.sim) state.sim.alphaTarget = 0; // отпустили — cool down
  if (!dragMoved) {
    const hit = hitTest(ev.clientX, ev.clientY);
    if (hit) {
      state.selected = hit;
      showDetail(hit);
      zoomToNode(hit);
    } else {
      state.selected = null;
      hideDetail();
    }
  }
  interactionCanvas.style.cursor = wasNodeDrag ? 'pointer' : 'grab';
}

function zoomToNode(node) {
  const vp = getViewportFn();
  const cx = vp.cx != null ? vp.cx : vp.width / 2;
  const cy = vp.cy != null ? vp.cy : vp.height / 2;
  const curScale = state.camera.scale;
  const nextScale = Math.min(CFG.zoomMax, Math.max(curScale, curScale * 1.1));
  state.cameraTarget = {
    x: node.x - cx / nextScale,
    y: node.y - cy / nextScale,
    scale: nextScale,
  };
}

function onWheel(ev) {
  ev.preventDefault();
  state.cameraTarget = null;
  const factor = ev.deltaY < 0 ? CFG.zoomStep : 1 / CFG.zoomStep;
  applyZoom(state.camera, factor, ev.clientX, ev.clientY, CFG.zoomMin, CFG.zoomMax);
  hideTooltip();
}

function onKey(ev) {
  if (ev.key === 'Escape') {
    state.selected = null;
    state.cameraTarget = null;
    hideDetail();
  }
}

    return { initInteraction, isPanning, isDraggingNode };
  })();

  // --- src/ui/loader.js ---
  __M["src/ui/loader.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { CFG } = __M["src/core/config.js"];
    const { parseJSONL } = __M["src/core/parser.js"];
    const { buildGraph, detectTreeShape } = __M["src/core/graph.js"];
    const { fitToView, prewarm, createSim, computeSwimLanes, computeRadialLayout } = __M["src/core/layout.js"];
    const { SAMPLE_JSONL } = __M["src/core/sample.js"];
    const { MULTI_AGENT_ORCHESTRATION_JSONL, DEEP_ORCHESTRATION_JSONL } = __M["src/core/samples-embedded.js"];
    const { t } = __M["src/core/i18n.js"];
    const { normalizeToClaudeJsonl } = __M["src/core/adapters.js"];
    const { hideDetail } = __M["src/ui/detail-panel.js"];
    const { hideTooltip } = __M["src/ui/tooltip.js"];
    const { resetTimeline } = __M["src/ui/timeline.js"];
    const { addSessionFiles } = __M["src/ui/session-picker.js"];
    const { saveSessionForHandoff, loadSessionForHandoff, clearSessionForHandoff } = __M["src/core/session-bridge.js"];
    const { loadAnnotationsForSession } = __M["src/ui/annotations.js"];
    const { updateBadge: updateBookmarksBadge } = __M["src/ui/bookmarks.js"];

// Sample, который грузится по умолчанию при первом открытии страницы.
// Раньше был SAMPLE_JSONL (basic, ~40 линейных нод) — он не показывает
// ни ветвление графа, ни 3D-объём. Deep orchestration с 60 нодами и
// 2-уровневым subagent spawn — самый наглядный для wow-эффекта.
const DEFAULT_SAMPLE = DEEP_ORCHESTRATION_JSONL;

let _getViewport;
let _onReady = () => {};

// ==== Examples ▾ dropdown menu ====

const SAMPLE_OPTIONS = [
  { id: 'basic', i18n: 'sample.basic', text: () => SAMPLE_JSONL },
  { id: 'orchestration', i18n: 'sample.orchestration', text: () => MULTI_AGENT_ORCHESTRATION_JSONL },
  { id: 'deep_orchestration', i18n: 'sample.deep_orchestration', text: () => DEEP_ORCHESTRATION_JSONL },
];

function toggleSamplesMenu(anchor) {
  const existing = document.getElementById('samples-menu');
  if (existing) { existing.remove(); anchor.setAttribute('aria-expanded', 'false'); return; }
  const menu = document.createElement('div');
  menu.id = 'samples-menu';
  menu.className = 'samples-menu';
  menu.setAttribute('role', 'menu');
  const rect = anchor.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top = (rect.bottom + 4) + 'px';

  let outsideHandler = null;
  const closeMenu = () => {
    menu.remove();
    anchor.setAttribute('aria-expanded', 'false');
    if (outsideHandler) {
      document.removeEventListener('click', outsideHandler);
      document.removeEventListener('keydown', escHandler);
      outsideHandler = null;
    }
  };
  const escHandler = (ev) => { if (ev.key === 'Escape') closeMenu(); };

  for (const opt of SAMPLE_OPTIONS) {
    const item = document.createElement('button');
    item.className = 'samples-menu-item';
    item.setAttribute('role', 'menuitem');
    item.textContent = t(opt.i18n);
    item.addEventListener('click', () => {
      closeMenu();
      clearSessionForHandoff();
      loadText(opt.text());
    });
    menu.appendChild(item);
  }

  document.body.appendChild(menu);
  anchor.setAttribute('aria-expanded', 'true');

  setTimeout(() => {
    outsideHandler = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== anchor) closeMenu();
    };
    document.addEventListener('click', outsideHandler);
    document.addEventListener('keydown', escHandler);
  }, 0);
}

function initLoader(getViewportFn, onReady) {
  _getViewport = getViewportFn;
  if (onReady) _onReady = onReady;

  const fileInput = document.getElementById('file-input');
  // multiple=true ставится динамически, чтобы можно было выбирать несколько
  if (fileInput) fileInput.setAttribute('multiple', 'true');
  document.getElementById('btn-file').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (ev) => {
    const files = ev.target.files;
    if (files && files.length) handleFiles(files);
    fileInput.value = '';
  });

  // Examples ▾ dropdown — на клик открывает меню с тремя примерами.
  // Закрытие при клике вне или повторном клике по кнопке. Hover/focus
  // не используется — только явный клик, чтобы не мешать туториал-скриншотам.
  const sampleBtn = document.getElementById('btn-sample');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleSamplesMenu(sampleBtn);
    });
  }
  document.getElementById('btn-reset').addEventListener('click', resetView);

  initDragDrop();

  // Если пришли из 3D режима с уже загруженным файлом — восстановим его
  const handoff = loadSessionForHandoff();
  if (handoff && handoff.text) {
    loadText(handoff.text);
  } else {
    loadText(DEFAULT_SAMPLE);
  }
}

function initDragDrop() {
  const dropHint = document.getElementById('drop-hint');
  let depth = 0;
  window.addEventListener('dragenter', (ev) => { ev.preventDefault(); depth++; dropHint.classList.add('show'); });
  window.addEventListener('dragover', (ev) => ev.preventDefault());
  window.addEventListener('dragleave', (ev) => {
    ev.preventDefault();
    depth--;
    if (depth <= 0) { depth = 0; dropHint.classList.remove('show'); }
  });
  window.addEventListener('drop', (ev) => {
    ev.preventDefault();
    depth = 0;
    dropHint.classList.remove('show');
    const files = ev.dataTransfer && ev.dataTransfer.files;
    if (files && files.length) handleFiles(files);
  });
}

/**
 * Обрабатывает один или несколько файлов: все кладём в session-picker,
 * а первый сразу загружаем для отображения.
 */
function handleFiles(files) {
  if (files.length === 1) {
    const f = files[0];
    loadFile(f);
    // также добавить в список сессий без autoLoad (уже загружается)
    addSessionFiles([f], { autoLoadFirst: false });
    return;
  }
  // Multi: все в picker, первый авто-загружается
  addSessionFiles(files, { autoLoadFirst: true });
}

function loadText(text) {
  try {
    hideError();
    const norm = normalizeToClaudeJsonl(text);
    if (norm.format !== 'claude-jsonl' && norm.format !== 'unknown') {
      setLoadFormat(norm.format);
    } else {
      setLoadFormat(null);
    }
    const parsed = parseJSONL(norm.text);
    if (!parsed.nodes.length) { showError('No user/assistant messages found.'); return; }
    const vp = _getViewport();
    const g = buildGraph(parsed, vp);
    // Auto-degrade: при больших графах уменьшаем prewarm чтобы не зафризить UI
    const n = g.nodes.length;
    if (n >= CFG.perfHeavyThreshold) state.perfMode = 'minimal';
    else if (n >= CFG.perfDegradeThreshold) state.perfMode = 'degraded';
    else state.perfMode = 'normal';
    const prewarmN = state.perfMode === 'minimal' ? CFG.perfMinimalPrewarm
      : state.perfMode === 'degraded' ? Math.max(40, Math.floor(CFG.prewarmIterations / 3))
      : CFG.prewarmIterations;
    // В minimal режиме — более быстрое охлаждение (physics быстрее дойдёт до settled)
    const simOpts = state.perfMode === 'minimal' ? { alphaDecay: CFG.perfMinimalAlphaDecay } : {};
    state.sim = createSim(simOpts);
    prewarm(g.nodes, g.edges, vp, state.sim, prewarmN);
    state.nodes = g.nodes;
    state.edges = g.edges;
    state.pairEdges = g.pairEdges || [];
    state.byId = g.byId;
    state.selected = null;
    state.hover = null;
    state.pathSet = new Set();
    state.cameraTarget = null;
    state.searchMatches = new Set();
    state.searchActive = null;
    state.collapsed = new Set();
    state.stats = parsed.stats;
    // Auto-detect tree-shape — если граф похож на дерево с 2+ fan-out
    // точками и глубиной >=3, переключаемся в radial. Только при первом
    // load (или если пользователь не закрепил выбор через localStorage).
    const userPickedLayout = (() => {
      try { return localStorage.getItem('viz:layoutMode'); } catch { return null; }
    })();
    if (!userPickedLayout && detectTreeShape(state.nodes, state.edges)) {
      state.layoutMode = 'radial';
    }
    // Если активен не-force layout — применяем его сразу к новым нодам
    if (state.layoutMode === 'swim') {
      const pos = computeSwimLanes(state.nodes, vp);
      for (const [id, p] of pos) {
        const n = state.byId.get(id);
        if (n) { n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0; }
      }
    } else if (state.layoutMode === 'radial') {
      const pos = computeRadialLayout(state.nodes, state.byId, vp);
      for (const [id, p] of pos) {
        const n = state.byId.get(id);
        if (n) { n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0; }
      }
    }
    const cam = fitToView(state.nodes, vp);
    state.camera.scale = cam.scale;
    state.camera.x = cam.x;
    state.camera.y = cam.y;
    resetTimeline();
    hideDetail();
    hideTooltip();
    updateStatsHUD();
    // Восстановим сохранённые аннотации (звёзды и заметки) для этой сессии
    loadAnnotationsForSession();
    updateBookmarksBadge();
    _onReady();
    // Запомним текст для возможного перехода в 3D. Sample-ы не сохраняем —
    // пусть 3D при первом открытии тоже покажет default sample.
    const isSample = text === SAMPLE_JSONL || text === MULTI_AGENT_ORCHESTRATION_JSONL || text === DEEP_ORCHESTRATION_JSONL;
    if (!isSample) saveSessionForHandoff(text);
  } catch (e) {
    showError('Parse error: ' + e.message);
    console.error(e);
  }
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = () => loadText(String(reader.result));
  reader.onerror = () => showError('Read error: ' + reader.error);
  reader.readAsText(file);
}

function resetView() {
  if (!state.nodes.length) return;
  const cam = fitToView(state.nodes, _getViewport());
  state.camera.scale = cam.scale;
  state.camera.x = cam.x;
  state.camera.y = cam.y;
}

// Перерисовываем stats при переключении языка
if (typeof window !== 'undefined') {
  window.addEventListener('languagechange', () => {
    if (state.stats) updateStatsHUD();
  });
}

function updateStatsHUD() {
  const s = state.stats;
  const el = document.getElementById('stats');
  if (!s) { el.textContent = '—'; return; }
  const fmtEl = document.getElementById('load-format');
  const fmtSuffix = fmtEl && fmtEl.textContent ? ' &middot; <span class="fmt-chip">' + fmtEl.textContent + '</span>' : '';
  const perfSuffix = state.perfMode && state.perfMode !== 'normal'
    ? ` &middot; <span class="perf-chip" style="color:var(--accent)">${state.perfMode}</span>`
    : '';
  el.innerHTML = `<b>${state.nodes.length}</b> ${t('stats.nodes')} &middot; <b>${state.edges.length}</b> ${t('stats.edges')} &middot; <span>${s.parsed} ${t('stats.lines')}</span>${fmtSuffix}${perfSuffix}`;
  const compLine = s.compactions ? `\n${t('stats.compactions')}: ${s.compactions}` : '';
  el.title = `${t('stats.parsed')}: ${s.parsed}\n${t('stats.kept')}: ${s.kept}\n${t('stats.skipped')}: ${s.skipped}\n${t('stats.errors')}: ${s.errors}${compLine}\nperf: ${state.perfMode}`;
}

function setLoadFormat(fmt) {
  let el = document.getElementById('load-format');
  if (!el) {
    el = document.createElement('span');
    el.id = 'load-format';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  el.textContent = fmt || '';
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(hideError, 5000);
}
function hideError() {
  const el = document.getElementById('error');
  if (el) el.classList.remove('show');
}

    return { initLoader, loadText };
  })();

  // --- src/ui/share.js ---
  __M["src/ui/share.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { loadText } = __M["src/ui/loader.js"];
    const { safeFetch, isSafeHttpUrl } = __M["src/core/url-safety.js"];

let toastEl, btnShare;

function initShare() {
  btnShare = document.getElementById('btn-share');
  toastEl = document.getElementById('toast');
  if (btnShare) btnShare.addEventListener('click', shareCurrent);
}

function buildShareUrl() {
  const params = new URLSearchParams();
  params.set('t', String(Math.round(state.timelineMax * 100)));
  if (state.selected && state.selected.id) params.set('n', state.selected.id);
  const hidden = [...state.hiddenRoles];
  if (hidden.length) params.set('hide', hidden.join(','));
  return window.location.origin + window.location.pathname + '?' + params.toString();
}

function parseUrlParams(search) {
  const out = {};
  const p = new URLSearchParams(search || '');
  if (p.has('jsonl')) out.jsonl = p.get('jsonl');
  if (p.has('t')) {
    const t = parseFloat(p.get('t'));
    if (!isNaN(t)) out.t = Math.max(0, Math.min(1, t / 100));
  }
  if (p.has('n')) out.nodeId = p.get('n');
  if (p.has('hide')) {
    out.hide = p.get('hide').split(',').map(r => r.trim()).filter(Boolean);
  }
  return out;
}

async function shareCurrent() {
  const url = buildShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard');
  } catch {
    prompt('Copy URL:', url);
  }
}

function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

async function applyUrlParamsLate() {
  const params = parseUrlParams(window.location.search);

  if (params.jsonl) {
    try {
      if (!isSafeHttpUrl(params.jsonl)) {
        console.warn('[share] отклонён небезопасный URL:', params.jsonl);
        return;
      }
      const resp = await safeFetch(params.jsonl, { cache: 'no-store' });
      if (resp.ok) {
        const text = await resp.text();
        loadText(text);
      }
    } catch (e) {
      console.warn('[share] failed to fetch jsonl param:', e.message);
    }
  }

  if (params.t != null) {
    state.timelineMax = params.t;
    const slider = document.getElementById('timeline');
    if (slider) {
      slider.value = String(Math.round(state.timelineMax * 100));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Whitelist ролей — не принимаем произвольный текст из ?hide=
  const KNOWN_ROLES = new Set(['user', 'assistant', 'tool_use', 'tool_result', 'subagent_input', 'thinking']);
  if (Array.isArray(params.hide)) {
    for (const r of params.hide) {
      if (!KNOWN_ROLES.has(r)) continue;
      state.hiddenRoles.add(r);
      const btn = document.querySelector(`.btn-role[data-role="${r}"]`);
      if (btn) btn.classList.remove('active');
    }
  }

  if (params.nodeId && state.byId) {
    const node = state.byId.get(params.nodeId);
    if (node) state.selected = node;
  }
}

    return { initShare, buildShareUrl, parseUrlParams, applyUrlParamsLate };
  })();

  // --- src/main.js ---
  __M["src/main.js"] = (function () {
    const { state } = __M["src/view/state.js"];
    const { CFG } = __M["src/core/config.js"];
    const { stepPhysics, createSim } = __M["src/core/layout.js"];
    const { draw, updateBirthsForWebgl } = __M["src/view/renderer.js"];
    const { generateStarfield, drawStarfield } = __M["src/view/starfield.js"];
    const { ensureParticles, tickParticles, drawParticles } = __M["src/view/particles.js"];
    const { initInteraction, isPanning, isDraggingNode } = __M["src/ui/interaction.js"];
    const { initLoader, loadText } = __M["src/ui/loader.js"];
    const { initDetail } = __M["src/ui/detail-panel.js"];
    const { initTooltip } = __M["src/ui/tooltip.js"];
    const { initTimeline, tickPlay, isPlaying } = __M["src/ui/timeline.js"];
    const { initStory, tickStory, getFrontierNodeId, resetStory } = __M["src/ui/story-mode.js"];
    const { initSearch } = __M["src/ui/search.js"];
    const { initLive } = __M["src/ui/live.js"];
    const { initKeyboard } = __M["src/ui/keyboard.js"];
    const { initFilter } = __M["src/ui/filter.js"];
    const { initMinimap, tickMinimap } = __M["src/ui/minimap.js"];
    const { initStats, tickStats, recomputeStats } = __M["src/ui/stats-hud.js"];
    const { initShare, applyUrlParamsLate } = __M["src/ui/share.js"];
    const { initLayoutToggle, tickLayoutTransition, isRadialActive } = __M["src/ui/layout-toggle.js"];
    const { initAudio, chirpFor } = __M["src/ui/audio.js"];
    const { initRecorder } = __M["src/ui/recorder.js"];
    const { initFreezeToggle } = __M["src/ui/freeze-toggle.js"];
    const { initSpeedControl } = __M["src/ui/speed-control.js"];
    const { initOrphansToggle } = __M["src/ui/orphans-toggle.js"];
    const { initSnapshot } = __M["src/ui/snapshot.js"];
    const { initSettingsModal } = __M["src/ui/settings-modal.js"];
    const { initTopicsToggle } = __M["src/ui/topics-toggle.js"];
    const { initDiffMode } = __M["src/ui/diff-mode.js"];
    const { initSessionPicker, loadSessionIndex } = __M["src/ui/session-picker.js"];
    const { initAnnotations } = __M["src/ui/annotations.js"];
    const { initBookmarks } = __M["src/ui/bookmarks.js"];
    const { initRenderToggle } = __M["src/ui/render-toggle.js"];
    const { drawWebgl } = __M["src/view/renderer-webgl.js"];
    const { initI18n } = __M["src/core/i18n.js"];
    const { initLangToggle } = __M["src/ui/lang-toggle.js"];
    const { updateMetricsOverlay, clearMetricsOverlay } = __M["src/ui/metrics-overlay.js"];
    const { initFpsCounter, tickFps } = __M["src/ui/fps-counter.js"];

const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');

const SAFE_INSETS = { top: 130, bottom: 80, left: 16, right: 16 };

function getViewport() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const safeW = Math.max(100, w - SAFE_INSETS.left - SAFE_INSETS.right);
  const safeH = Math.max(100, h - SAFE_INSETS.top - SAFE_INSETS.bottom);
  return {
    width: w,
    height: h,
    safeW,
    safeH,
    cx: SAFE_INSETS.left + safeW / 2,
    cy: SAFE_INSETS.top + safeH / 2,
  };
}

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// i18n должен быть первым — он проходит по DOM и применяет переводы
// до того как модули начнут читать/писать textContent кнопок.
initI18n();
initLangToggle();
initDetail();
initTooltip();
initTimeline();
initStory();
initSearch(getViewport);
initLive(getViewport);
initFilter();
initMinimap(getViewport);
initStats();
initShare();
initLayoutToggle(getViewport);
initAudio();
initRecorder();
initFreezeToggle();
initSpeedControl();
initOrphansToggle();
initSnapshot();
initSettingsModal();
initTopicsToggle();
initDiffMode(getViewport);
initSessionPicker(loadText);
initAnnotations();
initBookmarks();
initRenderToggle();
initFpsCounter('fps-counter');
state.sim = createSim();
let urlParamsApplied = false;
function onGraphReady() {
  ensureParticles(state.edges);
  resetStory();
  recomputeStats();
  if (!urlParamsApplied) {
    urlParamsApplied = true;
    applyUrlParamsLate();
  }
}

initInteraction(canvas, getViewport);
initLoader(getViewport, onGraphReady);
initKeyboard(getViewport);

// URL-param ?sessions=<url-to-index.json> — загрузить список сессий
try {
  const sp = new URLSearchParams(window.location.search);
  const sessionsUrl = sp.get('sessions');
  if (sessionsUrl) loadSessionIndex(sessionsUrl);
} catch {}

state.stars = generateStarfield(CFG.starfieldCount);

let lastMs = performance.now();
let frameIdx = 0;
function frame(tms) {
  const tSec = tms / 1000;
  const dt = Math.min(0.1, (tms - lastMs) / 1000);
  lastMs = tms;
  frameIdx++;
  const vp = getViewport();

  tickPlay();
  tickLayoutTransition();
  const physicsDisabled = isRadialActive() || (state.sim && state.sim.frozen && !isDraggingNode());
  // На больших графах считаем физику раз в N кадров (render всегда)
  const skip = state.perfMode === 'minimal' ? CFG.perfMinimalPhysicsSkip
    : state.perfMode === 'degraded' ? CFG.perfDegradedPhysicsSkip
    : 1;
  const doPhysics = state.running && !physicsDisabled && (frameIdx % skip === 0);
  if (doPhysics) stepPhysics(state.nodes, state.edges, vp, state.sim);
  tickParticles(state.edges, dt);

  // Camera auto-follow при play (если пользователь ничего не тащит)
  if (isPlaying() && !isPanning() && !isDraggingNode()) {
    const fid = getFrontierNodeId();
    if (fid) {
      const target = state.byId.get(fid);
      if (target) {
        const desiredX = target.x - vp.cx / state.camera.scale;
        const desiredY = target.y - vp.cy / state.camera.scale;
        state.camera.x += (desiredX - state.camera.x) * CFG.cameraFollowLerp;
        state.camera.y += (desiredY - state.camera.y) * CFG.cameraFollowLerp;
      }
    }
  }

  // Camera target (zoom-to-node)
  if (state.cameraTarget) {
    const t = state.cameraTarget;
    const dx = t.x - state.camera.x;
    const dy = t.y - state.camera.y;
    const ds = t.scale - state.camera.scale;
    state.camera.x += dx * CFG.cameraTargetLerp;
    state.camera.y += dy * CFG.cameraTargetLerp;
    state.camera.scale += ds * CFG.cameraTargetLerp;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(ds) < 0.001) {
      state.cameraTarget = null;
    }
  }

  const allowHeartbeat = !isDraggingNode() && !isPanning();

  const perfMode = state.perfMode || 'normal';
  if (state.renderBackend === 'webgl') {
    // В WebGL мы сами вычисляем bornAt (birth-animation) через updateBirths,
    // которая жила внутри draw(). Вынесем её в view/renderer.js как export.
    updateBirthsForWebgl(state, tSec, vp);
    drawWebgl(state, tSec, vp);
    // Metrics в WebGL — через DOM-overlay (тексты не рисуются в WebGL)
    updateMetricsOverlay(vp);
  } else {
    // В Canvas 2D — рисуем metrics inline через ctx.fillText, overlay не нужен
    clearMetricsOverlay();
    draw(ctx, state, tSec, vp, {
      allowHeartbeat: allowHeartbeat && perfMode !== 'minimal',
      starfield: perfMode === 'minimal' ? null : (c, t) => drawStarfield(c, state.stars, state.camera, vp, t),
      particles: (c, alphaOf) => drawParticles(c, state.edges, state.camera, alphaOf, perfMode),
      onBirth: chirpFor,
      perfMode,
    });
  }

  // Story mode должен читать bornAt после того как draw()/updateBirths его обновил
  tickStory(tms, state);
  tickMinimap();
  tickStats();
  tickDiffLegend();
  tickFps(tms);

  requestAnimationFrame(frame);
}

let _diffLegendEl = null;
function tickDiffLegend() {
  if (!_diffLegendEl) _diffLegendEl = document.getElementById('diff-legend');
  if (!_diffLegendEl) return;
  _diffLegendEl.classList.toggle('show', !!state.diffMode);
}
requestAnimationFrame(frame);

window.__viz = { state, CFG };

    return {};
  })();
})(typeof window !== "undefined" ? window : this);