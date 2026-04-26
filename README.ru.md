# ai-conversation-viz

> 🇷🇺 Русский · [🇬🇧 English](README.md)

Force-directed визуализация диалогов человек↔AI, включая мульти-агент оркестрацию через Task-tool с порождением суб-агентов.

[🌐 Live demo](https://andromanpro.github.io/ai-conversation-viz/) · [🌐 3D](https://andromanpro.github.io/ai-conversation-viz/3d.html) · [🤖 Multi-agent](https://andromanpro.github.io/ai-conversation-viz/?jsonl=samples/multi-agent-orchestration.jsonl) · [🤖🤖 Deep orchestration](https://andromanpro.github.io/ai-conversation-viz/?jsonl=samples/deep-orchestration.jsonl)

![overview-2d](media/overview-2d.png)

Парсит Claude Code JSONL, ChatGPT-экспорты (`conversations.json`) и Anthropic API `messages[]`. Без зависимостей. Canvas 2D (основной) + WebGL + Three.js 3D. RU / EN интерфейс.

## Возможности

### Визуализация
- **Force-directed раскладка** — D3-style alpha cooling, Velocity Verlet, адаптивный centerPull, leaf-spring boost, soft-wall границы, Barnes-Hut O(n log n) в 2D
- **3 режима раскладки** — force, radial sunburst, swim-lanes (время-как-река)
- **3D режим** — Three.js с кастомными orb-шейдерами (fresnel + specular highlight + breath-pulse), UnrealBloom post-processing, OrbitControls камера + drift, фоновое аудио
- **Адаптивный масштаб для мега-графов** — camera frustum / fog / soft-wall расширяются по `√N`

### Семантика ролей
- **`user`** — реальный ввод человека
- **`assistant`** — ответы AI
- **`tool_use`** — виртуальные ноды на каждый вызов тула (Bash/Grep/Read/Task/…)
- **`tool_result`** — отдельная роль для чистых возвратов от тулов (до v1.6 визуально не отличалось от `user`)
- **`subagent_input`** — prompt'ы саб-агентам через Task tool (steel-blue, отличается от живого пользователя)
- **`thinking`** — `<thinking>` блоки как virtual children ассистентов

### Интерактив
- **Timeline воспроизведение** — пошагово по нодам со скоростью 0.5×/1×/2×/5×
- **Phone-мокап** — чат рендерится как iPhone-пузыри с эффектом печатной машинки
- **Drag нод**, pan/zoom, click для деталей, Ctrl+F поиск, hover preview (в 3D — toggle в Settings), keyboard shortcuts
- **Hub-подсветка** (auto-detection нод с большим degree)
- **Branch collapse** — dbl-click по ассистенту скрывает его tool_use-детей
- **Topics mode** — TF-IDF кластерные цвета

### Данные
- **Multi-agent оркестрация** — Task tool calls визуализируются как саб-агентские треды через virtual `#tu<i>` parent links; sub-sub-agents до N уровней
- **Live watch** — polling URL для растущего JSONL файла
- **Diff mode** — сравнение двух сессий side-by-side
- **Статистика** — токены, длительность, топ-тулы, longest, compactions
- **Экспорт** — PNG / SVG snapshot, WebM MediaRecorder
- **Ambient аудио** — генеративный pad + chirp при рождении ноды
- **CLI-meta strip** — удаляет `<system-reminder>` / `<command-name>` / `<command-message>` из отображаемого текста
- **Auto performance degrade** при 400+ / 1500+ нодах
- **Share URL** — `?jsonl=<url>&t=<0..100>&n=<nodeId>&hide=<roles>`

## Галерея

### 2D — воспроизведение + смена раскладки

![2d-playback](media/2d-playback.webp)
![2d-layout-switch](media/2d-layout-switch.webp)

### 3D — orbit + анимация рождения + смена раскладки

![3d-orbit](media/3d-orbit.webp)
![3d-growth](media/3d-growth-1.webp)
![3d-layout-switch](media/3d-layout-switch.webp)

### Mega-structure — большая сессия в 3D

![mega-structure](media/mega-structure.webp)

## Установка

```bash
npm install @andromanpro/ai-conversation-viz
```

## Использование (embed)

```js
import { mount, SAMPLE_JSONL } from '@andromanpro/ai-conversation-viz';

const viewer = mount(document.getElementById('viz'), {
  jsonl: SAMPLE_JSONL,     // либо своя строка JSONL / ChatGPT json / Anthropic messages
  width: 800,               // опционально (иначе clientWidth)
  height: 600,
  starfield: true,
  autoFit: true,
});

// API
viewer.loadJsonl(newJsonl);   // заменить данные
viewer.setTimeline(0.5);      // позиция [0..1]
viewer.play();                // от начала
viewer.pause();
viewer.fitView();
viewer.destroy();
viewer.getState();            // низкоуровневый доступ
```

## Использование (standalone UI)

Двойной клик на `standalone.html` — готовый self-contained offline viewer с полным UI (phone, timeline, search, stats, share, record). Данные подгружаются через «Open JSONL…» или drag-drop.

Или через HTTP:
```bash
npx serve .
# http://localhost:3000/         — 2D
# http://localhost:3000/3d.html  — 3D
```

## Форматы данных

Распознаются автоматически:
- **Claude Code JSONL** — `{"type":"user|assistant", "uuid", "parentUuid", "message":{"content":[{"type":"text|thinking|tool_use|tool_result|image"}]}}`
- **ChatGPT export** (`conversations.json`) — массив с `mapping: {id: {message, parent, children}}`
- **Anthropic API** — массив `[{role, content}]`

Парсер извлекает из каждого message: text, thinking (`💭`), tool_use (имя + ключевой параметр), tool_result (`↩` или `⚠` при `is_error`), image (`[image]`). Для assistant без текста генерируется summary `🔧 Grep "pattern" · Bash "cmd" · …`.

## Горячие клавиши

| Клавиша | Действие |
|---|---|
| `Space` | Play / Pause |
| `←` / `→` | Шаг назад / вперёд |
| `Home` / `R` | Сбросить вид |
| `Ctrl+F` | Поиск |
| `F` | Заморозить физику |
| `O` | Соединить sirota-ноды |
| `1/2/3/5` | Скорость 0.5× / 1× / 2× / 5× |
| `Esc` | Закрыть детали / поиск |
| Dbl-click ноды | Свернуть / развернуть tool_use-детей |

## Сборка

```bash
npm run build    # → dist/ai-conversation-viz.js (IIFE, ~370 KB)
npm run test     # 147 unit-тестов
npm run sonar    # SonarQube скан (NAS @ 192.168.1.130:9000)
```

## Архитектура

```
src/
├─ core/
│  ├─ config.js        — все настройки (CFG + COLORS)
│  ├─ parser.js        — parseJSONL, parseLine, classifyContent
│  ├─ adapters.js      — detect + ChatGPT/Anthropic → Claude JSONL
│  ├─ graph.js         — buildGraph, appendRawNodes, degree/hub
│  ├─ layout.js        — stepPhysics (sim), radial, swim, fitToView, stepPhysics3D
│  ├─ quadtree.js      — Barnes-Hut O(n log n) repulsion
│  ├─ tree.js          — computeDepths (BFS)
│  └─ sample.js        — демо JSONL
├─ view/
│  ├─ state.js         — общий mutable state
│  ├─ camera.js        — world↔screen
│  ├─ renderer.js      — canvas 2D рендер + birth-animation
│  ├─ renderer-webgl.js— WebGL рендер (быстрее на 1500+ нодах)
│  ├─ particles.js     — электрические искры по рёбрам
│  ├─ starfield.js     — параллакс звёзд
│  ├─ path.js          — pathToRoot (hover highlight)
│  └─ tool-icons.js    — Unicode-иконки по имени тула
├─ ui/
│  ├─ loader.js        — load/drop/URL → normalize → buildGraph
│  ├─ interaction.js   — mouse/wheel события
│  ├─ timeline.js      — пошаговое воспроизведение + скорость
│  ├─ story-mode.js    — phone + typewriter + очередь
│  ├─ search.js        — Ctrl+F
│  ├─ live.js          — polling растущего JSONL URL
│  ├─ detail-panel.js  — click-инфо
│  ├─ tooltip.js       — hover preview
│  ├─ filter.js        — toggle ролей
│  ├─ minimap.js       — мини-карта в углу + click-телепорт
│  ├─ stats-hud.js     — tokens/duration/tools/hubs
│  ├─ share.js         — Share URL
│  ├─ settings-modal.js— ⚙ Настройки
│  ├─ layout-toggle.js — force/radial/swim чипы
│  ├─ freeze-toggle.js — ❄ Freeze
│  ├─ speed-control.js — чипы скорости
│  ├─ audio.js         — генеративный ambient + chirp
│  ├─ recorder.js      — MediaRecorder WebM
│  ├─ snapshot.js      — PNG / SVG
│  ├─ orphans-toggle.js— 🔗 Connect orphans
│  └─ keyboard.js      — глобальные shortcuts
├─ 3d/
│  ├─ main.js          — Three.js сцена, raycaster, phone
│  ├─ layouts3d.js     — compute3DRadialLayout, compute3DSwimLanes
│  └─ scatter.js       — applySphericalScatter (Fibonacci)
├─ main.js             — 2D entrypoint
└─ embed.js            — npm entry (programmatic mount)
```

## Лицензия

MIT
