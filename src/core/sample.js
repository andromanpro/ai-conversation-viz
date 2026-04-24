// Развёрнутое демо — ~30 сообщений с разветвлениями, tool_use + tool_result,
// thinking-блоками, ошибкой от тула, изображением. Имитирует реальный debug-диалог.

const T0 = Date.parse('2026-04-24T10:00:00.000Z');
const step = (sec) => new Date(T0 + sec * 1000).toISOString();

function entry(obj) { return JSON.stringify(obj); }

export const SAMPLE_JSONL = [
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
      { type: 'tool_result', tool_use_id: 'tu_a13_1', content: '[main abc1234] Barnes-Hut + electric sparks\n 6 files changed, 412 insertions(+), 28 deletions(-)\nTo http://192.168.1.130:3000/androman/ai-conversation-viz.git\n   360158d..abc1234  main -> main\nTo https://github.com/andromanpro/ai-conversation-viz.git\n   360158d..abc1234  main -> main' },
    ] } }),

  // Финальное служебное
  entry({ type: 'queue-operation', operation: 'dequeue', timestamp: step(200) }),
].join('\n');
