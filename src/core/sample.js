export const SAMPLE_JSONL = [
  `{"type":"queue-operation","operation":"enqueue","timestamp":"2026-04-23T10:00:00.000Z","content":"служебное, должно отфильтроваться"}`,
  `{"type":"user","uuid":"u1","parentUuid":null,"timestamp":"2026-04-23T10:00:00.000Z","message":{"role":"user","content":"Хочу визуализировать разговор с ИИ как граф. Ноды = сообщения, рёбра = связи."}}`,
  `{"type":"assistant","uuid":"a1","parentUuid":"u1","timestamp":"2026-04-23T10:00:14.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Графом — хорошая идея. parentUuid даёт готовое дерево. Цветом по роли, размером по длине, пульсом по свежести."},{"type":"tool_use","id":"tu_a1_1","name":"Grep","input":{"pattern":"force.*directed","path":"src/"}}]}}`,
  `{"type":"user","uuid":"u2","parentUuid":"a1","timestamp":"2026-04-23T10:00:38.000Z","message":{"role":"user","content":"Да, именно так. А стек?"}}`,
  `{"type":"assistant","uuid":"a2","parentUuid":"u2","timestamp":"2026-04-23T10:00:50.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Canvas 2D без зависимостей — как lava-orb. Сначала один файл, потом модули."},{"type":"tool_use","id":"tu_a2_1","name":"Write","input":{"file_path":"index.html"}}]}}`,
  `{"type":"user","uuid":"u3","parentUuid":"a2","timestamp":"2026-04-23T10:01:15.000Z","message":{"role":"user","content":"Физика какая?"}}`,
  `{"type":"assistant","uuid":"a3","parentUuid":"u3","timestamp":"2026-04-23T10:01:30.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Классический spring-damper: Coulomb-repulsion, spring на рёбрах, damping 0.85, слабая центральная сила. До ~1000 нод без Barnes-Hut."}]}}`,
  `{"type":"user","uuid":"u4","parentUuid":"a1","timestamp":"2026-04-23T10:01:45.000Z","message":{"role":"user","content":"А данные откуда?"}}`,
  `{"type":"assistant","uuid":"a4","parentUuid":"u4","timestamp":"2026-04-23T10:02:05.000Z","message":{"role":"assistant","content":[{"type":"text","text":"JSONL-сессии Claude Code в ~/.claude/projects/. uuid + parentUuid — готовый граф."},{"type":"tool_use","id":"tu_a4_1","name":"Glob","input":{"pattern":"**/*.jsonl"}}]}}`,
  `{"type":"user","uuid":"u5","parentUuid":"a3","timestamp":"2026-04-23T10:02:30.000Z","message":{"role":"user","content":"Интерактив?"}}`,
  `{"type":"assistant","uuid":"a5","parentUuid":"u5","timestamp":"2026-04-23T10:02:48.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Zoom колесом, pan drag-ом, клик = панель с текстом, hover = тултип, timeline slider — видеть разговор во времени."}]}}`,
  `{"type":"queue-operation","operation":"dequeue","timestamp":"2026-04-23T10:02:48.010Z"}`,
].join('\n');
