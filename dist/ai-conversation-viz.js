"use strict";
(function (window) {
  const __M = Object.create(null);

  // --- src/core/config.js ---
  __M["src/core/config.js"] = (function () {
const CFG = {
  maxMessages: 5000,
  excerptChars: 400,
  tooltipMaxChars: 80,
  repulsion: 9000,
  spring: 0.05,
  springLen: 90,
  damping: 0.85,
  centerPull: 0.002,
  minR: 3,
  maxR: 20,
  pulseFreq: 2.0,
  clickTolerancePx: 4,
  hitPad: 4,
  toolNodeScale: 0.6,
  fitPadding: 0.85,
  prewarmIterations: 180,
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
  edge: 'rgba(0, 212, 255, 0.35)',
  toolEdge: 'rgba(236, 160, 64, 0.45)',
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

const MULTI_AGENT_ORCHESTRATION_JSONL = "{\"type\":\"user\",\"uuid\":\"u1\",\"parentUuid\":null,\"timestamp\":\"2026-04-25T10:00:00.000Z\",\"message\":{\"role\":\"user\",\"content\":\"Нужен security-audit всех 4-х микросервисов перед релизом v3.0. Сервисы: auth, billing, notifications, api-gateway. Цель — найти critical/high уязвимости (SQL injection, XSS, secrets в коде, CVE в deps).\"}}\n{\"type\":\"assistant\",\"uuid\":\"a1\",\"parentUuid\":\"u1\",\"timestamp\":\"2026-04-25T10:00:06.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"Четыре сервиса × 4 класса уязвимостей = 16 проверок. Последовательно займёт ~40 минут. Распараллелю через Task — спавню сразу 4 subagent'а в одном сообщении (parallel execution в Claude Code), каждый делает все 4 проверки у себя. Это займёт ~10 минут.\"},{\"type\":\"text\",\"text\":\"Сначала бегло пройдусь по структуре монорепо чтобы понять где что.\"},{\"type\":\"tool_use\",\"id\":\"tu_a1_ls\",\"name\":\"Bash\",\"input\":{\"command\":\"ls services/\",\"description\":\"List microservices\"}}]}}\n{\"type\":\"user\",\"uuid\":\"u2\",\"parentUuid\":\"a1\",\"timestamp\":\"2026-04-25T10:00:07.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_a1_ls\",\"content\":\"auth/\\nbilling/\\nnotifications/\\napi-gateway/\\nshared/\\ndocker-compose.yml\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"a2\",\"parentUuid\":\"u2\",\"timestamp\":\"2026-04-25T10:00:12.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"4 сервиса + shared. Спавню 4 subagent'а ПАРАЛЛЕЛЬНО — все Task в одном message, чтобы Claude Code запустил их одновременно.\"},{\"type\":\"tool_use\",\"id\":\"tu_task_auth\",\"name\":\"Task\",\"input\":{\"description\":\"Audit auth service\",\"subagent_type\":\"security-audit\",\"prompt\":\"Проверь services/auth/ на SQL-injection, XSS, hardcoded secrets, CVE. Краткий отчёт.\"}},{\"type\":\"tool_use\",\"id\":\"tu_task_bill\",\"name\":\"Task\",\"input\":{\"description\":\"Audit billing service\",\"subagent_type\":\"security-audit\",\"prompt\":\"Проверь services/billing/.\"}},{\"type\":\"tool_use\",\"id\":\"tu_task_notif\",\"name\":\"Task\",\"input\":{\"description\":\"Audit notifications service\",\"subagent_type\":\"security-audit\",\"prompt\":\"Проверь services/notifications/.\"}},{\"type\":\"tool_use\",\"id\":\"tu_task_gw\",\"name\":\"Task\",\"input\":{\"description\":\"Audit api-gateway\",\"subagent_type\":\"security-audit\",\"prompt\":\"Проверь services/api-gateway/.\"}}]}}\n\n{\"type\":\"user\",\"uuid\":\"sa1_u1\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:13.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[AUTH subagent] Проверь services/auth/ на SQL-injection, XSS, hardcoded secrets, CVE.\"}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a1\",\"parentUuid\":\"sa1_u1\",\"timestamp\":\"2026-04-25T10:00:18.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sa1_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/auth/**/*.{js,ts}\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sa1_u2\",\"parentUuid\":\"sa1_a1\",\"timestamp\":\"2026-04-25T10:00:19.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sa1_glob\",\"content\":\"services/auth/src/index.ts\\nservices/auth/src/jwt.ts\\nservices/auth/src/db.ts\\nservices/auth/src/routes/login.ts\\nservices/auth/src/routes/register.ts\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a2\",\"parentUuid\":\"sa1_u2\",\"timestamp\":\"2026-04-25T10:00:24.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sa1_grep1\",\"name\":\"Grep\",\"input\":{\"pattern\":\"query\\\\(|\\\\.raw\\\\(|\\\\$\\\\{\",\"path\":\"services/auth/src\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sa1_u3\",\"parentUuid\":\"sa1_a2\",\"timestamp\":\"2026-04-25T10:00:25.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sa1_grep1\",\"content\":\"routes/login.ts:14: db.query(`SELECT * FROM users WHERE email='${email}'`)\\nroutes/register.ts:22: db.raw(`INSERT INTO users(email) VALUES('${input.email}')`)\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a3\",\"parentUuid\":\"sa1_u3\",\"timestamp\":\"2026-04-25T10:00:30.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"2 SQL-injection — critical.\"},{\"type\":\"text\",\"text\":\"🚨 2 SQL-injection в auth: login:14 и register:22.\"},{\"type\":\"tool_use\",\"id\":\"tu_sa1_grep2\",\"name\":\"Grep\",\"input\":{\"pattern\":\"SECRET|API_KEY\",\"path\":\"services/auth/src\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sa1_u4\",\"parentUuid\":\"sa1_a3\",\"timestamp\":\"2026-04-25T10:00:31.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sa1_grep2\",\"content\":\"jwt.ts:8: const SECRET = 'dev-secret-please-change-12345'\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a4\",\"parentUuid\":\"sa1_u4\",\"timestamp\":\"2026-04-25T10:00:36.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sa1_audit\",\"name\":\"Bash\",\"input\":{\"command\":\"cd services/auth && npm audit --json\",\"description\":\"CVE check\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sa1_u5\",\"parentUuid\":\"sa1_a4\",\"timestamp\":\"2026-04-25T10:00:42.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sa1_audit\",\"content\":\"high: lodash CVE-2019-10744, jsonwebtoken CVE-2022-23529\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sa1_a5\",\"parentUuid\":\"sa1_u5\",\"timestamp\":\"2026-04-25T10:00:48.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[AUTH report]** critical=2 (SQLi×2), high=3 (dev-secret + 2 CVE), medium=0.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"sb1_u1\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:13.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[BILLING subagent] Проверь services/billing/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a1\",\"parentUuid\":\"sb1_u1\",\"timestamp\":\"2026-04-25T10:00:18.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sb1_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/billing/**/*.py\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sb1_u2\",\"parentUuid\":\"sb1_a1\",\"timestamp\":\"2026-04-25T10:00:19.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sb1_glob\",\"content\":\"services/billing/main.py\\nservices/billing/models.py\\nservices/billing/stripe_webhook.py\\nservices/billing/invoices.py\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a2\",\"parentUuid\":\"sb1_u2\",\"timestamp\":\"2026-04-25T10:00:25.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sb1_grep\",\"name\":\"Grep\",\"input\":{\"pattern\":\"webhook_secret|verify\",\"path\":\"services/billing\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sb1_u3\",\"parentUuid\":\"sb1_a2\",\"timestamp\":\"2026-04-25T10:00:26.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sb1_grep\",\"content\":\"stripe_webhook.py:28: # TODO: verify signature properly\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a3\",\"parentUuid\":\"sb1_u3\",\"timestamp\":\"2026-04-25T10:00:32.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sb1_read\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/billing/stripe_webhook.py\",\"offset\":20,\"limit\":15}}]}}\n{\"type\":\"user\",\"uuid\":\"sb1_u4\",\"parentUuid\":\"sb1_a3\",\"timestamp\":\"2026-04-25T10:00:33.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sb1_read\",\"content\":\"@app.route('/webhook', methods=['POST'])\\ndef handle_webhook():\\n    payload = request.data\\n    # TODO: verify signature properly\\n    event = json.loads(payload)\\n    process_event(event)\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a4\",\"parentUuid\":\"sb1_u4\",\"timestamp\":\"2026-04-25T10:00:39.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"🚨 Stripe webhook не проверяет подпись — fake events → бесплатные подписки.\"},{\"type\":\"tool_use\",\"id\":\"tu_sb1_safety\",\"name\":\"Bash\",\"input\":{\"command\":\"safety check\",\"description\":\"CVE\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sb1_u5\",\"parentUuid\":\"sb1_a4\",\"timestamp\":\"2026-04-25T10:00:45.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sb1_safety\",\"content\":\"requests 2.25.0 — CVE-2023-32681 (medium)\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sb1_a5\",\"parentUuid\":\"sb1_u5\",\"timestamp\":\"2026-04-25T10:00:51.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[BILLING report]** critical=1 (unverified webhook), high=0, medium=1 (CVE). SQL чистый — ORM.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"sc1_u1\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:14.000Z\",\"message\":{\"role\":\"user\",\"content\":\"[NOTIFICATIONS subagent] Проверь services/notifications/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a1\",\"parentUuid\":\"sc1_u1\",\"timestamp\":\"2026-04-25T10:00:19.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sc1_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/notifications/**/*.{go,tmpl}\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sc1_u2\",\"parentUuid\":\"sc1_a1\",\"timestamp\":\"2026-04-25T10:00:20.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sc1_glob\",\"content\":\"services/notifications/main.go\\nservices/notifications/mailer.go\\nservices/notifications/templates/welcome.tmpl\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a2\",\"parentUuid\":\"sc1_u2\",\"timestamp\":\"2026-04-25T10:00:26.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sc1_grep\",\"name\":\"Grep\",\"input\":{\"pattern\":\"text/template|html/template\",\"path\":\"services/notifications\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sc1_u3\",\"parentUuid\":\"sc1_a2\",\"timestamp\":\"2026-04-25T10:00:27.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sc1_grep\",\"content\":\"mailer.go:3: \\\"text/template\\\"\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a3\",\"parentUuid\":\"sc1_u3\",\"timestamp\":\"2026-04-25T10:00:33.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"text/template без auto-escape в HTML-emails — XSS vector через user-provided fields.\"},{\"type\":\"tool_use\",\"id\":\"tu_sc1_read\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/notifications/templates/welcome.tmpl\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sc1_u4\",\"parentUuid\":\"sc1_a3\",\"timestamp\":\"2026-04-25T10:00:34.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sc1_read\",\"content\":\"<html><body><h1>Welcome, {{.Name}}!</h1><p>Bio: {{.Bio}}</p></body></html>\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a4\",\"parentUuid\":\"sc1_u4\",\"timestamp\":\"2026-04-25T10:00:40.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"🚨 XSS: text/template + user Bio в HTML-email = можно внедрить <script>.\"},{\"type\":\"tool_use\",\"id\":\"tu_sc1_vuln\",\"name\":\"Bash\",\"input\":{\"command\":\"govulncheck ./...\",\"description\":\"CVE\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sc1_u5\",\"parentUuid\":\"sc1_a4\",\"timestamp\":\"2026-04-25T10:00:46.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sc1_vuln\",\"content\":\"No vulnerabilities found.\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sc1_a5\",\"parentUuid\":\"sc1_u5\",\"timestamp\":\"2026-04-25T10:00:52.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[NOTIFICATIONS report]** critical=1 (XSS в email templates), high=0, medium=0, CVE clean.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"sd1_u1\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:14.500Z\",\"message\":{\"role\":\"user\",\"content\":\"[API-GATEWAY subagent] Проверь services/api-gateway/.\"}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a1\",\"parentUuid\":\"sd1_u1\",\"timestamp\":\"2026-04-25T10:00:19.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sd1_glob\",\"name\":\"Glob\",\"input\":{\"pattern\":\"services/api-gateway/**/*.{ts,yml}\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sd1_u2\",\"parentUuid\":\"sd1_a1\",\"timestamp\":\"2026-04-25T10:00:20.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sd1_glob\",\"content\":\"services/api-gateway/src/server.ts\\nservices/api-gateway/src/rate-limit.ts\\nservices/api-gateway/cors.yml\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a2\",\"parentUuid\":\"sd1_u2\",\"timestamp\":\"2026-04-25T10:00:27.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"tool_use\",\"id\":\"tu_sd1_cors\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/api-gateway/cors.yml\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sd1_u3\",\"parentUuid\":\"sd1_a2\",\"timestamp\":\"2026-04-25T10:00:28.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sd1_cors\",\"content\":\"cors:\\n  allow_origins: ['*']\\n  allow_credentials: true\\n  allow_methods: ['GET','POST','PUT','DELETE','PATCH']\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a3\",\"parentUuid\":\"sd1_u3\",\"timestamp\":\"2026-04-25T10:00:34.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"🚨 wildcard origins + credentials — куки утекают на любой origin.\"},{\"type\":\"tool_use\",\"id\":\"tu_sd1_rate\",\"name\":\"Read\",\"input\":{\"file_path\":\"services/api-gateway/src/rate-limit.ts\"}}]}}\n{\"type\":\"user\",\"uuid\":\"sd1_u4\",\"parentUuid\":\"sd1_a3\",\"timestamp\":\"2026-04-25T10:00:35.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_sd1_rate\",\"content\":\"const limiter = rateLimit({ windowMs: 60000, max: 1000, skip: (req) => req.path.startsWith('/auth') });\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a4\",\"parentUuid\":\"sd1_u4\",\"timestamp\":\"2026-04-25T10:00:42.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"🚨 Login без rate-limit → brute-force forever.\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"sd1_a5\",\"parentUuid\":\"sd1_a4\",\"timestamp\":\"2026-04-25T10:00:48.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**[API-GATEWAY report]** critical=2 (CORS wildcard + no rate-limit на login), high=0, medium=0.\"}]}}\n\n{\"type\":\"user\",\"uuid\":\"u3\",\"parentUuid\":\"a2\",\"timestamp\":\"2026-04-25T10:00:55.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_task_auth\",\"content\":\"AUTH: critical=2 high=3 medium=0\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_task_bill\",\"content\":\"BILLING: critical=1 high=0 medium=1\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_task_notif\",\"content\":\"NOTIFICATIONS: critical=1 high=0 medium=0\"},{\"type\":\"tool_result\",\"tool_use_id\":\"tu_task_gw\",\"content\":\"API-GATEWAY: critical=2 high=0 medium=0\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"a3\",\"parentUuid\":\"u3\",\"timestamp\":\"2026-04-25T10:01:02.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"thinking\",\"thinking\":\"Все 4 subagent'а вернулись параллельно за ~1 минуту. Суммирую: 6 critical + 3 high + 1 medium. Релиз v3.0 блокируется до фиксов critical.\"},{\"type\":\"text\",\"text\":\"Все 4 subagent'а вернулись. Собираю сводку и пишу отчёт.\"},{\"type\":\"tool_use\",\"id\":\"tu_a3_write\",\"name\":\"Write\",\"input\":{\"file_path\":\"SECURITY-AUDIT-v3.0.md\",\"content\":\"# Security Audit v3.0\\n\\n| Service | critical | high | medium |\\n|---|---|---|---|\\n| auth | 2 | 3 | 0 |\\n| billing | 1 | 0 | 1 |\\n| notifications | 1 | 0 | 0 |\\n| api-gateway | 2 | 0 | 0 |\\n| **TOTAL** | **6** | **3** | **1** |\\n\\n## CRITICAL (блокируют релиз)\\n1. auth/routes/login.ts:14 — SQL-injection\\n2. auth/routes/register.ts:22 — SQL-injection\\n3. billing/stripe_webhook.py:28 — signature не проверяется\\n4. notifications/mailer.go — text/template → XSS\\n5. api-gateway/cors.yml — wildcard origins + credentials\\n6. api-gateway/rate-limit.ts:4 — login без rate-limit\"}}]}}\n{\"type\":\"user\",\"uuid\":\"u4\",\"parentUuid\":\"a3\",\"timestamp\":\"2026-04-25T10:01:03.000Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"tool_result\",\"tool_use_id\":\"tu_a3_write\",\"content\":\"File created: SECURITY-AUDIT-v3.0.md\"}]}}\n{\"type\":\"assistant\",\"uuid\":\"a4\",\"parentUuid\":\"u4\",\"timestamp\":\"2026-04-25T10:01:08.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"**Audit complete.** 6 critical, 3 high, 1 medium. Релиз v3.0 откладываем минимум на неделю.\\n\\nПлан фиксов:\\n- День 1: SQL-injection (auth) + CORS (gateway) — 3 часа\\n- День 2: Stripe signature + rate-limit + text→html template — 4 часа\\n- День 3: CVE updates + regression tests — 4 часа\\n- День 4: pen-test, релиз в день 5\\n\\nПараллельный запуск 4 subagent'ов через Task занял ~50 секунд вместо ~12 минут последовательно.\"}]}}\n";


    return { MULTI_AGENT_ORCHESTRATION_JSONL };
  })();

  // --- src/core/parser.js ---
  __M["src/core/parser.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];

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
  if (typeof content === 'string') return { text: content, toolUses: [] };
  if (!Array.isArray(content)) return { text: '', toolUses: [] };
  const textParts = [];
  const toolUses = [];
  for (const block of content) {
    if (!block) continue;
    switch (block.type) {
      case 'text':
        if (typeof block.text === 'string') textParts.push(block.text);
        break;
      case 'thinking':
        if (typeof block.thinking === 'string') {
          textParts.push('💭 ' + block.thinking);
        }
        break;
      case 'tool_use':
        toolUses.push({
          id: block.id || null,
          name: typeof block.name === 'string' ? block.name : 'tool',
          input: block.input || {},
        });
        break;
      case 'tool_result': {
        const rt = extractToolResultText(block.content);
        const prefix = block.is_error ? '⚠ ' : '↩ ';
        if (rt) textParts.push(prefix + rt);
        break;
      }
      case 'image':
        textParts.push('[image]');
        break;
      default:
        // неизвестный тип — пропускаем
        break;
    }
  }
  return { text: textParts.join('\n\n'), toolUses };
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
  let parsed = 0, kept = 0, skipped = 0, errors = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    parsed++;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { errors++; continue; }

    const t = obj.type;
    if (t !== 'user' && t !== 'assistant') {
      if (t && !SERVICE_TYPES.has(t)) unknownTypes.set(t, (unknownTypes.get(t) || 0) + 1);
      skipped++;
      continue;
    }

    const { text: msgText, toolUses } = classifyContent(obj.message && obj.message.content);
    const baseId = obj.uuid || `gen-${nodes.length}`;
    const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
    const parentId = obj.parentUuid || null;
    // Если у ассистента нет текста, но есть tool_use — формируем summary из тулов
    const finalText = (t === 'assistant' && !msgText && toolUses.length)
      ? buildAssistantSummary(toolUses)
      : msgText;

    nodes.push({
      id: baseId,
      parentId,
      role: t,
      ts,
      text: finalText,
      textLen: finalText.length,
    });
    kept++;

    if (t === 'assistant') {
      for (let i = 0; i < toolUses.length; i++) {
        const tu = toolUses[i];
        const inputStr = safeStringify(tu.input);
        const subText = `${tu.name}\n${inputStr}`;
        nodes.push({
          id: `${baseId}#tu${i}`,
          parentId: baseId,
          role: 'tool_use',
          ts: ts + (i + 1) * CFG.toolUseTsStepMs,
          text: subText,
          textLen: subText.length,
          toolName: tu.name,
        });
        kept++;
      }
    }

    if (kept >= CFG.maxMessages) break;
  }

  if (unknownTypes.size && typeof console !== 'undefined') {
    console.warn('[parseJSONL] skipped types:', JSON.stringify(Object.fromEntries(unknownTypes)));
  }

  return { nodes, stats: { parsed, kept, skipped, errors } };
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

  const { text: msgText, toolUses } = classifyContent(obj.message && obj.message.content);
  const baseId = obj.uuid || `gen-${seedCounter != null ? seedCounter : Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
  const parentId = obj.parentUuid || null;
  const finalText = (t === 'assistant' && !msgText && toolUses.length)
    ? buildAssistantSummary(toolUses)
    : msgText;

  const out = [{
    id: baseId,
    parentId,
    role: t,
    ts,
    text: finalText,
    textLen: finalText.length,
  }];
  if (t === 'assistant') {
    for (let i = 0; i < toolUses.length; i++) {
      const tu = toolUses[i];
      const inputStr = safeStringify(tu.input);
      const subText = `${tu.name}\n${inputStr}`;
      out.push({
        id: `${baseId}#tu${i}`,
        parentId: baseId,
        role: 'tool_use',
        ts: ts + (i + 1) * CFG.toolUseTsStepMs,
        text: subText,
        textLen: subText.length,
        toolName: tu.name,
      });
    }
  }
  return out;
}

    return { extractText, parseJSONL, summariseToolUse, parseLine };
  })();

  // --- src/core/adapters.js ---
  __M["src/core/adapters.js"] = (function () {
// Формат-адаптеры. На входе — сырой текст файла, на выходе
// либо уже Claude JSONL (`type: user/assistant + parentUuid`),
// либо пустая строка. loader.js использует detectFormat()
// и вызывает соответствующий toClaudeJsonl().

function detectFormat(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'unknown';
  if (trimmed[0] === '[' || trimmed[0] === '{') {
    try {
      const obj = JSON.parse(trimmed);
      const sample = Array.isArray(obj) ? obj[0] : obj;
      if (sample && sample.mapping) return 'chatgpt-export';
      if (Array.isArray(obj) && obj.length && obj[0].role && obj[0].content != null) return 'anthropic-messages';
    } catch { /* might be JSONL */ }
  }
  // Первая непустая строка — валидный JSON c типом/полями Claude Code
  for (const line of trimmed.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (obj.type === 'user' || obj.type === 'assistant'
          || obj.type === 'queue-operation' || obj.type === 'last-prompt'
          || obj.parentUuid !== undefined) {
        return 'claude-jsonl';
      }
    } catch {}
    break;
  }
  return 'unknown';
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
      const msg = node && node.message;
      if (!msg || !msg.author) continue;
      const role = msg.author.role;
      if (role !== 'user' && role !== 'assistant') continue;
      const c = msg.content || {};
      const parts = Array.isArray(c.parts) ? c.parts : (c.text ? [c.text] : []);
      const textJoined = parts
        .map(p => (typeof p === 'string' ? p : (p && p.text) || ''))
        .filter(Boolean)
        .join('\n');
      if (!textJoined) continue;
      const ts = msg.create_time
        ? new Date(msg.create_time * 1000).toISOString()
        : new Date().toISOString();
      const parentId = node.parent || null;
      out.push(JSON.stringify({
        type: role,
        uuid: convId ? `${convId}:${id}` : id,
        parentUuid: parentId ? (convId ? `${convId}:${parentId}` : parentId) : null,
        timestamp: ts,
        message: { role, content: textJoined },
      }));
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

function computeRadialLayout(nodes, byId, viewport) {
  const positions = new Map();
  if (!nodes.length) return positions;
  const cx = viewport.cx != null ? viewport.cx : viewport.width / 2;
  const cy = viewport.cy != null ? viewport.cy : viewport.height / 2;

  const children = new Map();
  const roots = [];
  for (const n of nodes) children.set(n.id, []);
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) children.get(n.parentId).push(n.id);
    else roots.push(n.id);
  }
  for (const arr of children.values()) arr.sort((a, b) => (byId.get(a)?.ts || 0) - (byId.get(b)?.ts || 0));

  const leaves = new Map();
  const countLeaves = (id) => {
    const kids = children.get(id) || [];
    if (!kids.length) { leaves.set(id, 1); return 1; }
    let sum = 0;
    for (const k of kids) sum += countLeaves(k);
    leaves.set(id, sum);
    return sum;
  };
  for (const r of roots) countLeaves(r);

  const ring = CFG.radialRingGap;
  const assign = (id, depth, angleStart, angleEnd) => {
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
      assign(k, depth + 1, cur, next);
      cur = next;
    }
  };

  if (roots.length === 1) {
    assign(roots[0], 0, -Math.PI / 2, (3 * Math.PI) / 2);
  } else {
    // Множественные roots — не сливать в точке. Ставим их на depth=1 (первое
    // кольцо), оставляя центр свободным. Сортируем по ts для стабильного порядка.
    roots.sort((a, b) => (byId.get(a)?.ts || 0) - (byId.get(b)?.ts || 0));
    const slice = (Math.PI * 2) / roots.length;
    const startDepth = 1;
    for (let i = 0; i < roots.length; i++) {
      assign(roots[i], startDepth, i * slice - Math.PI / 2, (i + 1) * slice - Math.PI / 2);
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

    return { createSim, reheat, freeze, unfreeze, isSettled, seedJitter, stepPhysics, prewarm, computeRadialLayout, easeInOutQuad, computeSwimLanes, computeBBox, fitToView };
  })();

  // --- src/core/graph.js ---
  __M["src/core/graph.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { seedJitter } = __M["src/core/layout.js"];

function computeRadius(n) {
  const baseR = CFG.minR + 2 * Math.log(n.textLen + 1);
  const clamped = Math.min(CFG.maxR, Math.max(CFG.minR, baseR));
  return n.role === 'tool_use' ? Math.max(CFG.minR, clamped * CFG.toolNodeScale) : clamped;
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
  recomputeRecency(state.nodes);
  computeDegreesAndHubs(state.nodes, state.edges);
  return added;
}

function buildGraph(parsed, viewport) {
  const { width, height } = viewport;
  const cx = width / 2, cy = height / 2;
  const n = parsed.nodes.length;

  const nodes = parsed.nodes.map((src, i) => {
    const angle = n ? (i / n) * Math.PI * 2 : 0;
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
  });

  const byId = new Map(nodes.map(node => [node.id, node]));

  // Orphan detection: помечаем ноды у которых parentId не в byId (subagent
  // сессии или обрезано maxMessages). Не меняем их parentId — создадим
  // adopted-edge к ближайшему по ts предшественнику. Toggle `connectOrphans`
  // решает как их показывать: как отдельный forest (off, default) или
  // пунктирно-связанными с основной цепью (on).
  const sortedByTs = [...nodes].sort((a, b) => a.ts - b.ts);
  for (let i = 0; i < sortedByTs.length; i++) {
    const node = sortedByTs[i];
    if (node.parentId && !byId.has(node.parentId)) {
      node._isOrphanRoot = true;
      const prev = i > 0 ? sortedByTs[i - 1] : null;
      if (prev) node._adoptedParentId = prev.id;
    }
  }

  const edges = [];
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) {
      edges.push({
        source: node.parentId,
        target: node.id,
        a: byId.get(node.parentId),
        b: node,
        adopted: false,
      });
    } else if (node._adoptedParentId && byId.has(node._adoptedParentId)) {
      const parent = byId.get(node._adoptedParentId);
      edges.push({
        source: parent.id,
        target: node.id,
        a: parent,
        b: node,
        adopted: true,
      });
    }
  }

  if (nodes.length) {
    let tMin = Infinity, tMax = -Infinity;
    for (const node of nodes) {
      if (node.ts < tMin) tMin = node.ts;
      if (node.ts > tMax) tMax = node.ts;
    }
    const dt = Math.max(1, tMax - tMin);
    for (const node of nodes) {
      node.recency = (node.ts - tMin) / dt;
      node.r = computeRadius(node);
    }
  }

  computeDegreesAndHubs(nodes, edges);

  return { nodes, edges, byId };
}

    return { appendRawNodes, buildGraph };
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
      || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)
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
  diffStats: null,     // { onlyA, onlyB, both }
  sessions: [],        // [{ id, name, size, content, meta, remoteUrl? }]
  sessionsOpen: false, // панель session-picker открыта
  isPlaying: false,    // зеркало timeline.playing (для story-mode без циклических импортов)
  annotations: new Map(), // nodeId → { text, starred, ts } (пользовательские заметки/закладки)
  renderBackend: 'webgl', // 'canvas2d' | 'webgl' — WebGL по умолчанию (красивее и быстрее; 2D как fallback)
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
function computeTopics(nodes) {
  const result = new Map();
  if (!nodes || !nodes.length) return result;
  // DF — в скольких документах встречается слово
  const df = new Map();
  const nodeTokens = new Map();
  for (const n of nodes) {
    const toks = tokenize(n.text || '');
    nodeTokens.set(n.id, toks);
    const seen = new Set(toks);
    for (const w of seen) df.set(w, (df.get(w) || 0) + 1);
  }

  for (const n of nodes) {
    const toks = nodeTokens.get(n.id) || [];
    if (!toks.length) { result.set(n.id, null); continue; }
    // TF
    const tf = new Map();
    for (const w of toks) tf.set(w, (tf.get(w) || 0) + 1);
    // Пройдём два раза: сначала ищем среди non-singleton (df >= 2),
    // потом fallback на слово с max df.
    let best = null, bestScore = 0;
    for (const [w, c] of tf) {
      const d = df.get(w) || 0;
      if (d < 2) continue;
      const score = c * Math.log(1 + d);
      if (score > bestScore) { bestScore = score; best = w; }
    }
    if (!best) {
      // Fallback — берём самое «массовое» слово в корпусе из токенов ноды
      let maxDf = 0;
      for (const w of tf.keys()) {
        const d = df.get(w) || 0;
        if (d > maxDf) { maxDf = d; best = w; bestScore = d; }
      }
    }
    result.set(n.id, best ? { topWord: best, score: bestScore } : null);
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
    const { controlPoint, bezierPoint } = __M["src/view/particles.js"];
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

function glowRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffGlowRgba(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.7, 0.6, alpha);
  }
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffCoreRgba(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.75, 0.62, alpha);
  }
  if (role === 'user') return `rgba(123, 170, 240, ${alpha})`;
  if (role === 'tool_use') return `rgba(236, 160, 64, ${alpha})`;
  return `rgba(80, 212, 181, ${alpha})`;
}

function coreDarkRgba(role, alpha, node, topicsMode, diffMode) {
  if (diffMode && node && node._diffOrigin) return diffCoreDark(node._diffOrigin, alpha);
  if (topicsMode && node && node._topicHue != null) {
    return hueToRgbaString(node._topicHue, 0.8, 0.35, alpha);
  }
  if (role === 'user') return `rgba(60, 100, 170, ${alpha})`;
  if (role === 'tool_use') return `rgba(140, 80, 30, ${alpha})`;
  return `rgba(30, 110, 95, ${alpha})`;
}

function edgeRgba(childRole, alpha, edge, diffMode) {
  if (diffMode && edge && edge.diffSide === 'B') return `rgba(90, 210, 255, ${alpha * 1.1})`;
  if (childRole === 'tool_use') return `rgba(236, 160, 64, ${alpha * 1.28})`;
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
    const vcx_world = viewport.cx != null ? viewport.cx : viewport.width / 2;
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
  const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && state.collapsed && state.collapsed.has(n.parentId);
  const visible = n => n.ts <= cutoff && n.bornAt != null
    && !(state.hiddenRoles && state.hiddenRoles.has(n.role))
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
  const edgeCPs = new Map();
  for (const e of state.edges) {
    if (!visible(e.a) || !visible(e.b)) continue;
    if (e.adopted && !connectOrphans) continue; // скрываем adopted-edges при forest mode
    const ag = alpha(e.b) * edgeDim(e);
    const aS = worldToScreen(e.a.x, e.a.y, cam);
    const bS = worldToScreen(e.b.x, e.b.y, cam);
    const cpWorld = controlPoint({ x: e.a.x, y: e.a.y }, { x: e.b.x, y: e.b.y }, CFG.edgeCurveStrength);
    const cpS = worldToScreen(cpWorld.x, cpWorld.y, cam);
    edgeCPs.set(e, cpWorld);
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

let pointProg, hubProg, lineProg, particleProg, starProg;
let pointBuf, hubBuf, lineBuf, particleBuf, starBuf;

// Layouts (floats per vertex)
const POINT_STRIDE = 9;    // x, y, r, g, b, a, size, phase, flags
const HUB_STRIDE = 8;      // x, y, r, g, b, a, size, phase
const LINE_STRIDE = 6;     // x, y, r, g, b, a
const PARTICLE_STRIDE = 10; // ax, ay, bx, by, cx, cy, r, g, b, a (offset/speed вычисляются из mod+index)
const STAR_STRIDE = 4;     // x, y, size, depth

let pointArr, hubArr, lineArr, particleArr;
let starsBuilt = null; // Float32Array, statиc

// Uniforms
const uPoint = {}, uHub = {}, uLine = {}, uParticle = {}, uStar = {};
const aPoint = {}, aHub = {}, aLine = {}, aParticle = {}, aStar = {};

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

  pointBuf = gl.createBuffer();
  hubBuf = gl.createBuffer();
  lineBuf = gl.createBuffer();
  particleBuf = gl.createBuffer();
  starBuf = gl.createBuffer();

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

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.bornAt == null) continue;
    if (hidden && hidden.has(n.role)) continue;
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

function fillLineBuffer(state) {
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

  for (const e of edges) {
    if (!e.a || !e.b) continue;
    if (e.a.bornAt == null || e.b.bornAt == null) continue;
    if (hidden && (hidden.has(e.a.role) || hidden.has(e.b.role))) continue;
    if (e.adopted && !connectOrphans) continue;
    const isCollapsedChild = n => n.role === 'tool_use' && n.parentId && collapsed && collapsed.has(n.parentId);
    if (isCollapsedChild(e.a) || isCollapsedChild(e.b)) continue;

    let edgeAlpha = e.adopted ? 0.25 : 0.6;
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
  const connectOrphans = !!state.connectOrphans;
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
  const lineCount = fillLineBuffer(state);
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

  // ---- 5. Nodes (поверх рёбер и колец) ----
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
  starBtn.textContent = '☆ Star';
  starBtn.title = 'Отметить (S)';
  starBtn.addEventListener('click', () => {
    if (!_currentNode) return;
    toggleStar(_currentNode.id);
    updateAnnotUI();
  });
  row.appendChild(starBtn);

  noteHint = document.createElement('span');
  noteHint.className = 'detail-note-hint';
  noteHint.textContent = 'Note (сохраняется в localStorage):';
  row.appendChild(noteHint);

  wrap.appendChild(row);

  noteTextarea = document.createElement('textarea');
  noteTextarea.className = 'detail-note';
  noteTextarea.rows = 3;
  noteTextarea.placeholder = 'Ваша заметка к этой ноде…';
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
  starBtn.textContent = starred ? '★ Starred' : '☆ Star';
  noteTextarea.value = (ann && ann.text) || '';
}

function showDetail(n) {
  // Если переключаемся между нодами — сохраним заметку предыдущей
  if (_currentNode && _currentNode.id !== n.id) flushNote();
  _currentNode = n;
  detailRoleEl.textContent = n.role === 'tool_use' ? (n.toolName || 'tool') : n.role;
  detailRoleEl.className = 'role ' + n.role;
  detailTsEl.textContent = new Date(n.ts).toISOString().replace('T', ' ').slice(0, 19);
  const txt = n.text || '(empty)';
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

  // Выдаём не чаще одной bubble за MIN_POST_GAP_MS (учитывая playSpeed)
  const minGap = CFG.storyPostGapMs / Math.max(0.1, state.playSpeed || 1);
  while (pendingQueue.length && (nowMs - lastPostMs) >= minGap) {
    const n = pendingQueue.shift();
    postBubble(n);
    lastPostMs = nowMs;
    break; // ровно одна за кадр — чтобы typewriter не накладывался
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
  const { tsMin, tsMax } = computeTsBounds();
  const range = Math.max(1, tsMax - tsMin);
  const desired = (node.ts - tsMin) / range;
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

function initFilter() {
  for (const role of ROLES) {
    const btn = document.querySelector(`.btn-role[data-role="${role}"]`);
    if (!btn) continue;
    btn.addEventListener('click', () => toggleRole(role, btn));
    btn.classList.add('active');
  }
}

function toggleRole(role, btn) {
  if (state.hiddenRoles.has(role)) {
    state.hiddenRoles.delete(role);
    btn.classList.add('active');
  } else {
    state.hiddenRoles.add(role);
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
  if (role === 'tool_use') return '#ECA040';
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

  // --- src/ui/settings-modal.js ---
  __M["src/ui/settings-modal.js"] = (function () {
    const { CFG } = __M["src/core/config.js"];
    const { state } = __M["src/view/state.js"];
    const { reheat } = __M["src/core/layout.js"];
// Settings modal — live-update для основных CFG параметров.
// Сохранение в localStorage.


const KEY = 'viz-settings';

// Описание регулируемых параметров (group, key, min, max, step, label)
const PARAMS = [
  // Physics
  ['Physics', 'repulsion',       500,  30000, 100,  'Repulsion strength'],
  ['Physics', 'spring',          0.01, 0.3,   0.01, 'Spring strength'],
  ['Physics', 'springLen',       30,   300,   5,    'Spring rest length'],
  ['Physics', 'centerPull',      0.0,  0.02,  0.0005, 'Center pull'],
  ['Physics', 'velocityDecay',   0.1,  0.9,   0.02, 'Velocity decay (friction)'],
  ['Physics', 'maxVelocity',     5,    200,   1,    'Max velocity clamp'],
  ['Physics', 'alphaDecay',      0.005, 0.2,  0.002, 'Alpha decay rate'],
  ['Physics', 'repulsionCutoff', 500,  6000,  100,  'Repulsion cutoff (px)'],
  // Visual
  ['Visual',  'particlesPerEdge', 0,    3,    1,   'Particles per edge (0 = off)'],
  ['Visual',  'particleSpeed',   0.1,  2,     0.05, 'Particle speed'],
  ['Visual',  'particleJitterPx',0,    6,     0.1, 'Particle jitter'],
  ['Visual',  'starfieldCount',  0,    1000,  50,  'Starfield density'],
  ['Visual',  'nodeGlowRadiusMul', 1,  4,     0.1, 'Node glow radius'],
  ['Visual',  'nodeGlowAlphaBase', 0,  0.3,   0.01, 'Node glow alpha'],
  // Playback
  ['Playback','storyDwellMs',    400,  5000,  100, 'Play step interval (ms)'],
  ['Playback','storyCharMs',     5,    80,    1,   'Typewriter speed (ms/char)'],
  ['Playback','storyMaxChars',   80,   1200,  20,  'Max chars per bubble'],
  ['Playback','storyPostGapMs',  200,  3000,  50,  'Min gap between bubbles'],
  // Birth
  ['Birth',   'birthDurationMs', 100,  2500,  50,  'Birth animation (ms)'],
];

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
  header.innerHTML = `<span>⚙ Settings</span>`;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'settings-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);
  inner.appendChild(header);

  const groups = new Map();
  for (const [group] of PARAMS) if (!groups.has(group)) groups.set(group, []);
  for (const p of PARAMS) groups.get(p[0]).push(p);

  for (const [groupName, items] of groups) {
    const gTitle = document.createElement('div');
    gTitle.className = 'settings-group-title';
    gTitle.textContent = groupName.toUpperCase();
    inner.appendChild(gTitle);
    for (const [, key, min, max, step, label] of items) {
      const row = document.createElement('div');
      row.className = 'settings-row';
      const lbl = document.createElement('label');
      lbl.textContent = label;
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
  resetBtn.textContent = 'Reset to defaults';
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
  for (const [, key] of PARAMS) obj[key] = CFG[key];
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    for (const [, key] of PARAMS) {
      if (typeof obj[key] === 'number' && isFinite(obj[key])) CFG[key] = obj[key];
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
    const { toggleTopics, clearTopicFilter } = __M["src/ui/topics-toggle.js"];
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
  tokensEl.textContent = '~' + formatTokens(s.tokens);
  durationEl.textContent = formatDuration(s.durationSec);
  if (s.topTools.length) {
    topToolsEl.innerHTML = s.topTools.map(([name, count]) =>
      `<span class="tool-chip"><span class="tool-chip-icon">${escapeHtml(toolIcon(name))}</span>${escapeHtml(name)} <b>×${count}</b></span>`
    ).join(' ');
  } else {
    topToolsEl.innerHTML = '<span class="muted">—</span>';
  }
  // Hubs
  const hubsLabel = document.getElementById('stat-hubs');
  if (hubsLabel) hubsLabel.textContent = s.hubs > 0 ? String(s.hubs) : '—';
  if (s.longest) {
    const preview = (s.longest.text || '').slice(0, 36).replace(/\n/g, ' ');
    const ellipsis = (s.longest.text || '').length > 36 ? '…' : '';
    longestEl.innerHTML = `<span class="longest-role ${s.longest.role}">${s.longest.role}</span> <span class="longest-len">${s.longest.textLen}</span> <span class="longest-preview">${escapeHtml(preview)}${ellipsis}</span>`;
  } else {
    longestEl.textContent = '—';
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

let btns = []; // {mode, el}
let transition = null;
let _ltGetViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
  cx: window.innerWidth / 2,
  cy: window.innerHeight / 2,
});

function initLayoutToggle(_ltGetViewportFn) {
  if (_ltGetViewportFn) _ltGetViewport = _ltGetViewportFn;
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

function initRecorder() {
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

function initSnapshot() {
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
  mkBtn(t('snapshot.svg'), () => saveSvg());
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
  const canvas = document.getElementById('graph');
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

  const roleColor = (role) => role === 'user' ? '#7BAAF0'
    : role === 'tool_use' ? '#ECA040'
    : '#50D4B5';

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
    if (_webglCanvas) _webglCanvas.style.display = 'block';
    if (_canvas2d) _canvas2d.style.display = 'none';
    if (_webglCanvas) resizeWebgl(_webglCanvas);
    if (!silent) toast('WebGL режим включён');
  } else {
    state.renderBackend = 'canvas2d';
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

    return { initRenderToggle, toggleRenderBackend };
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
    const { buildGraph } = __M["src/core/graph.js"];
    const { fitToView, prewarm, createSim, computeSwimLanes, computeRadialLayout } = __M["src/core/layout.js"];
    const { SAMPLE_JSONL } = __M["src/core/sample.js"];
    const { MULTI_AGENT_ORCHESTRATION_JSONL } = __M["src/core/samples-embedded.js"];
    const { normalizeToClaudeJsonl } = __M["src/core/adapters.js"];
    const { hideDetail } = __M["src/ui/detail-panel.js"];
    const { hideTooltip } = __M["src/ui/tooltip.js"];
    const { resetTimeline } = __M["src/ui/timeline.js"];
    const { addSessionFiles } = __M["src/ui/session-picker.js"];
    const { saveSessionForHandoff, loadSessionForHandoff, clearSessionForHandoff } = __M["src/core/session-bridge.js"];
    const { loadAnnotationsForSession } = __M["src/ui/annotations.js"];
    const { updateBadge: updateBookmarksBadge } = __M["src/ui/bookmarks.js"];

let _getViewport;
let _onReady = () => {};

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

  document.getElementById('btn-sample').addEventListener('click', () => {
    clearSessionForHandoff(); // юзер явно выбрал sample — не сохраняем его как «последнюю сессию»
    loadText(SAMPLE_JSONL);
  });
  const btnDemoOrch = document.getElementById('btn-demo-orchestration');
  if (btnDemoOrch) {
    btnDemoOrch.addEventListener('click', () => {
      clearSessionForHandoff();
      loadText(MULTI_AGENT_ORCHESTRATION_JSONL);
    });
  }
  document.getElementById('btn-reset').addEventListener('click', resetView);

  initDragDrop();

  // Если пришли из 3D режима с уже загруженным файлом — восстановим его
  const handoff = loadSessionForHandoff();
  if (handoff && handoff.text) {
    loadText(handoff.text);
  } else {
    loadText(SAMPLE_JSONL);
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
    state.byId = g.byId;
    state.selected = null;
    state.hover = null;
    state.pathSet = new Set();
    state.cameraTarget = null;
    state.searchMatches = new Set();
    state.searchActive = null;
    state.collapsed = new Set();
    state.stats = parsed.stats;
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
    // Запомним текст для возможного перехода в 3D. Sample не сохраняем —
    // пусть 3D при первом открытии тоже покажет sample.
    if (text !== SAMPLE_JSONL) saveSessionForHandoff(text);
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

function updateStatsHUD() {
  const s = state.stats;
  const el = document.getElementById('stats');
  if (!s) { el.textContent = '—'; return; }
  const fmtEl = document.getElementById('load-format');
  const fmtSuffix = fmtEl && fmtEl.textContent ? ' &middot; <span class="fmt-chip">' + fmtEl.textContent + '</span>' : '';
  const perfSuffix = state.perfMode && state.perfMode !== 'normal'
    ? ` &middot; <span class="perf-chip" style="color:var(--accent)">${state.perfMode}</span>`
    : '';
  el.innerHTML = `<b>${state.nodes.length}</b> nodes &middot; <b>${state.edges.length}</b> edges &middot; <span>${s.parsed} lines</span>${fmtSuffix}${perfSuffix}`;
  el.title = `parsed: ${s.parsed}\nkept: ${s.kept}\nskipped: ${s.skipped}\nerrors: ${s.errors}\nperf: ${state.perfMode}`;
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
  const KNOWN_ROLES = new Set(['user', 'assistant', 'tool_use']);
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
  } else {
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