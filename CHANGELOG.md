# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

## [1.5.3] — 2026-04-25

### Removed — Light theme

Светлая тема выпилена целиком по запросу пользователя — на белом фоне
ноды и edges либо терялись, либо требовали отдельной палитры,
shader-ветки, dark outline и nоды-перерисовки. Это давало хрупкий код
и плохой результат. Тёмная cyberpunk-тема — единственная.

Удалено:
- `state.theme`, `src/ui/theme-toggle.js` (целиком)
- `[data-theme="light"]` CSS блоки (index/standalone/3d.html)
- `#btn-theme` из всех HUD
- `--canvas-vig-*`, `--canvas-edge*`, `--canvas-star-alpha` CSS-vars
- Hotkey **T**, i18n keys `tip.theme_*`, `aria.theme`
- POINT_FS uniform `u_light` и его branching
- `ROLE_RGB_LIGHT`, `ROLE_COLORS_LIGHT` (Canvas 2D + WebGL + 3D)
- isLight ветки в `edgeColor`, `nodeColor`, `edgeRgba`, `edgeColorHex`
- Edge alpha boost для light, dark outline для light
- 3D `applyTheme3D`, `themechange` event listener в 3d/main.js

### Added — Reverse signal particles

Заменил статичные пунктирные tool_use ↔ tool_result связи на
**анимированную «комету»**, бегущую от tool_result обратно к tool_use.
Визуализирует возврат ответа от инструмента к ассистенту, который его
вызвал. На multi-tool turn'ах видно как N ответов разлетаются обратно
к N parent'ам.

Реализация:
- WebGL: переиспользует `particleProg` shader, в буфере SWAP a_start↔a_end
  → particle движется в обратную сторону. Цвет лимонно-жёлтый (1.0,
  0.92, 0.36). Buffer/stride отдельные (`reverseBuf`, `reverseArr`).
- Canvas 2D: 1 частица на pair, движется по quadratic Bezier (B → A) с
  bell-curve размером (Math.sin(π·t) для head). Halo radial-gradient.
- Toggle: Settings → Display → «Reverse signal (tool_result → tool_use)»
  (был `showPairEdges`, переименован в `showReverseSignal`).

Удалено: `PAIR_VS`, `PAIR_FS`, `fillPairBuffer`, `pairBuf`, `PAIR_STRIDE`,
вся 5-я pass для pair edges; Canvas 2D pair-edges drawing.

### Added — Canvas 2D toggle moved to Settings

`#btn-render` 🎨 удалена из HUD (загружала visual-noise при том что
99% юзеров остаются в WebGL). Toggle перенесён в Settings → Advanced
→ «Canvas 2D fallback (WebGL by default)». Default OFF.

В `settings-modal.js` добавлен новый формат TOGGLES `[group, key, scope,
customApply]` — `customApply(val)` вызывается после set value. Для
useCanvas2D — `setRenderBackend(val ? 'canvas2d' : 'webgl')`.

### Improved — Smoother edge birth

Связи между нодами рождались слишком резко (вспыхивали полной alpha
сразу после `bornAt` обеих нод). Сделал плавный fade-in:
- `edgeBirthMs = CFG.birthDurationMs * 1.6` — длительнее ноды
- Edge alpha = easeOutCubic((nowMs - youngerBornAt) / edgeBirthMs)
- WebGL `fillLineBuffer` теперь принимает `nowMs` параметр
- Canvas 2D вычисляет `edgeAlphaOf(n)` отдельно от node alpha

### Improved — i18n right HUD

Stats-панель показывала «87 nodes · 86 edges · 60 lines» — захардкожено
в `loader.js#updateStatsHUD`. Заменено на `t('stats.nodes')`, добавлены
keys: nodes, edges, lines, parsed, kept, skipped, errors (en + ru).
`updateStatsHUD()` подписан на `languagechange` event для перерисовки.

`detail-panel.js`: «☆ Star», «Note (сохраняется в localStorage):»,
«Ваша заметка к этой ноде…», «(empty)» — заменены на t(). Listener
languagechange перерисовывает starBtn / noteHint / placeholder.

### Files

- `src/view/state.js` — `showReverseSignal`, `useCanvas2D`; убран `theme`
- `src/ui/theme-toggle.js` — **удалён**
- `src/ui/render-toggle.js` — `setRenderBackend()` export, sync
  `state.useCanvas2D` ↔ `state.renderBackend`
- `src/ui/settings-modal.js` — TOGGLES с customApply hook, group `advanced`
- `src/ui/loader.js` — i18n stats text, languagechange listener
- `src/ui/detail-panel.js` — i18n labels, languagechange listener
- `src/ui/keyboard.js` — убран hotkey T
- `src/main.js` — убран import initThemeToggle
- `src/3d/main.js` — убраны applyTheme3D, ROLE_COLORS_LIGHT, isLight
  ветки в colorForNode/edgeColorHex
- `src/view/renderer.js` — Canvas 2D reverse signal particles, edge
  alpha по edgeBirthMs, убраны cssVar/isLight
- `src/view/renderer-webgl.js` — fillReverseSignalBuffer, переиспользует
  particleProg; убраны PAIR shaders, ROLE_RGB_LIGHT, edge alpha boost,
  u_light uniform; fillLineBuffer принимает nowMs
- `src/view/starfield.js` — убран --canvas-star-alpha check
- `src/core/i18n.js` — keys для stats.nodes/edges/lines/parsed/kept/etc;
  settings.useCanvas2D, settings.group.advanced
- `index.html / standalone.html / 3d.html` — убраны [data-theme=light]
  CSS, btn-theme, btn-render
- `build.cjs` — убран theme-toggle.js
- `CHANGELOG.md`, `package.json`

123 passed, bundle 351 KB / 50 modules.

## [1.5.2] — 2026-04-25

### Added — 3D Force/Radial/Swim layouts

- **3D Radial** (новый layout) — концентрические сферические оболочки
  вокруг root. На каждой оболочке Fibonacci-spiral распределение точек.
  Дочерние ноды попадают в cone (~60°) вокруг направления parent от
  центра — естественное ветвление вместо «звёздного хаоса». Радиус
  оболочки = depth × `RING_R_3D` (220).
- **3D Swim Lanes** (новый layout) — длинная река вдоль оси X (по rank
  от ts), Y разносит роли (3 lane: USER +320, ASSISTANT 0, TOOL_USE
  -320), Z даёт parallax-глубину (thinking +180, tool_use -120).
- **Layout switcher в 3D HUD** — три chip-кнопки FORCE / RADIAL / SWIM
  как в 2D. Сохранение выбора в `localStorage['viz:layoutMode-3d']`.
  Анимированный transition `CFG.layoutTransitionMs` мс между layouts.
  Во время не-force layout physics автоматически замораживается.

### Added — 3D Light theme

- **Theme toggle в 3D HUD** — `#btn-theme` (☀/🌙). При переключении:
  - `scene.background` и `scene.fog` меняются на light off-white
  - Starfield скрывается на light theme
  - Custom event `themechange` для синхронизации между 2D и 3D
- **3D edges** — на light theme получают тёмные RGB (0x14479e вместо
  0x00d4ff cyan, 0xa55308 вместо 0xeca040 orange, etc) — иначе на
  белом фоне теряются.
- **3D node colors** — отдельная `ROLE_COLORS_LIGHT` палитра
  (тёмно-синий вместо пастельного голубого, etc). При theme change
  uniform `uColor` обновляется в каждой ноде.

### Files

- `src/3d/layouts3d.js` — **новый** (compute3DRadialLayout +
  compute3DSwimLanes)
- `src/3d/main.js` — `init3DLayoutSwitch`, `applyLayoutTargets3D`,
  `tickLayoutTransition3D`, `applyTheme3D`; `ROLE_COLORS_LIGHT`,
  thinking color; edgeColorHex theme branch; physics только в force
- `src/ui/theme-toggle.js` — dispatch `themechange` event при toggle
- `3d.html` — `#layout-switch-3d` div, `#btn-theme` button,
  `[data-theme="light"]` CSS-block, `.btn-layout-chip` styles
- `standalone.html` — cache busting `?v=152` на script src

### Fix — Light theme cache

При обновлении кода shader'ы в WebGL могут оставаться кэшированными
браузером (особенно при file:// или агрессивном HTTP-кэше). Добавлен
query string `?v=152` к `dist/ai-conversation-viz.js`. Hard reload
(Ctrl+Shift+R) больше не требуется при следующих обновлениях если
script src идёт через `?v=`.

### Notes

3D Force-layout использует тот же `stepPhysics` что и в 2D — он
обновляет только `n.x` и `n.y`, поэтому в 3D-Force ноды живут в
плоскости `z = depth × 140 + jitter`. Это quasi-3D. Полное 3D
physics (с обновлением vz/n.z) — отдельная итерация (потребует
переработки `stepPhysics`).

123 passed, bundle 353 KB / 51 modules.

## [1.5.1] — 2026-04-25

### Fixed / Added

- **WebGL metrics badges** — ранее tokens/⏱latency бейджи рисовались
  только в Canvas 2D (через `ctx.fillText`). В WebGL текста рендеринга
  нет, бейджей не было. Решено через **DOM-overlay**:
  `src/ui/metrics-overlay.js` создаёт `<div id="metrics-overlay">`
  поверх canvas, на каждый кадр обновляет positions ассистент-нод через
  `transform: translate` (compositor-friendly). Кеш по nodeId,
  показ/скрытие через transform off-screen. На 200 нодах ≈ <1 ms / frame.
  Стиль .metrics-badge адаптируется к теме через CSS-vars.
- **Light theme — ноды стали видимыми**. На скриншоте от пользователя
  в светлой теме ноды получались светло-серые из-за `whiteCore` mix в
  POINT_FS shader'е (центр ноды → белый). На светлом фоне это = пятно.
  Фикс:
  - POINT_FS получил uniform `u_light` (0|1). На light: `whiteCore`
    отключается, рисуется solid `v_color.rgb` с тёмным `outline`
    (smoothstep 0.40→0.50, mix к `vec3(0.05, 0.08, 0.18)`).
  - Добавлена отдельная `ROLE_RGB_LIGHT` палитра — пастельный голубой
    `(0.482, 0.666, 0.941)` заменяется на тёмно-синий
    `(0.17, 0.37, 0.72)`, мятный → тёмно-зелёный, etc. На белом фоне
    эти варианты читаются.
- **Light theme — edges и pair-edges**. На светлой теме:
  - `edgeColor()` возвращает тёмные RGB (`0.08, 0.27, 0.62` для default,
    burnt-orange для tool_use, насыщенный фиолетовый для thinking)
  - Edge-alpha `× 1.5` boost (иначе теряются)
  - Pair edges (tool_use ↔ tool_result): получили uniform `u_color` +
    `u_alpha`. На light — тёмно-янтарь `(0.62, 0.42, 0.05)` с alpha 0.95
    вместо лимонно-жёлтого
  - Topics palette: `lightness` снижен с 0.58 → 0.42 на light
- **3D: Examples ▾ dropdown** — раньше в `3d.html` была одна кнопка
  «Load sample» которая грузила только `SAMPLE_JSONL`. Теперь она
  превращена в trigger такого же dropdown как в 2D режиме — три
  опции (basic / orchestration / deep_orchestration).
  CSS `.samples-menu/.samples-menu-item` скопирован в 3d.html.

### Files

- `src/ui/metrics-overlay.js` — **новый** модуль (DOM-overlay)
- `src/main.js` — `updateMetricsOverlay(vp)` в WebGL frame loop;
  `clearMetricsOverlay()` при switch на Canvas 2D
- `src/view/renderer-webgl.js` — POINT_FS theme branch; ROLE_RGB_LIGHT;
  edgeColor light branch; pair shader uniforms u_color/u_alpha; edge
  alpha boost; nodeColor light palette; topics lightness 0.42
- `src/view/renderer.js` — Canvas 2D dark outline на light theme
- `src/3d/main.js` — Examples ▾ dropdown (3 sample'а вместо 1 кнопки)
- `3d.html` — `.samples-menu` CSS, btn-sample → "Examples ▾"
- `build.cjs` — `metrics-overlay.js` в MODULES

### Known limitations

- **3D layout (Radial / Force)** — 3D режим использует свой 3D physics
  и не разделяется по layout-mode из 2D state. Реализация сложнее
  чем переключатель и отложена. В 3D: только 3D-force.
- **3D file:// поддержка** — три.js загружается через CDN-importmap
  и file:// CORS блокирует в Firefox. Workaround: HTTP server
  (`python -m http.server 8000`).

123 passed, bundle 353 KB / 51 modules.

## [1.5.0] — 2026-04-25

### Added

- **💭 Thinking blocks visual** — парсер выделяет `thinking` content-блоки
  ассистента в отдельные **virtual thinking nodes** (`<assistantId>#th<i>`,
  role='thinking'), параллельно tool_use поднодам. Цвет фиолетовый
  (#B58CFF), радиус 0.7× от parent, иконка 💭 внутри ноды + dashed
  pulsing ring («облако мысли»). Отдельная ROLE_RGB запись в WebGL
  renderer'е. Тогглится через Settings → Display → «Thinking blocks».
  Текст thinking больше не дублируется в text родителя — у assistant с
  thinking-only content text синтезируется как `💭 первые 80 символов`.
- **☀ Light theme** — переключатель тем `dark ↔ light` через CSS-vars
  на `:root[data-theme="light"]`. Все renderer-цвета (vignette stops,
  edge palette, star alpha) читаются через `getComputedStyle`.
  В светлой теме — мягкий warm-off-white фон, тёмно-синие edges
  (rgba(20,70,160) вместо неонового cyan), звёздное поле выключено,
  thinking фиолетовый темнее. Кнопка ☀/🌙 в HUD, hotkey **T**,
  состояние сохраняется в `localStorage['viz:theme']`.
- **💰⏱ Metrics badges** — Settings → Metrics → «Token & duration
  badges». На assistant-нодах:
  - Tokens: компактный бейдж справа-снизу, `formatTokensCompact` →
    «1.2k» / «456». Считается `output_tokens` из `message.usage`.
  - Latency: `⏱5.0s` слева-снизу, только если ≥1.5s. На больших
    задержках (>10s) — оранжевый. Считается как `ts_assistant -
    ts_parent` (proxy на «время ответа»).
- **i18n для Settings modal** — все labels, group titles, header через
  `t('settings.<key>')`. EN + RU словари обновлены. Settings modal
  переключается вместе с lang-toggle без перезагрузки.

### Files

- `src/core/parser.js` — `classifyContent` возвращает `thinkings[]`,
  `parseJSONL`/`parseLine` создают virtual thinking nodes; `usage`
  сохраняется как `tokensIn/Out/Total` на assistant-нодах
- `src/core/graph.js` — `computeRadius` добавляет thinking (0.7×),
  `computeLatencies` вычисляет `responseLatencyMs`
- `src/core/config.js` — `COLORS.thinking`, `COLORS.thinkingEdge`
- `src/view/state.js` — `showThinking: true`, `showMetrics: false`,
  `theme: 'dark'`
- `src/view/renderer.js` — purple core/glow для thinking, 💭 icon +
  dashed ring, `drawMetricsBadges`, `cssVar`/`cssVarNum` helpers,
  vignette из CSS-vars, edge colors light-aware
- `src/view/renderer-webgl.js` — `ROLE_RGB.thinking`, edgeColor
  thinking branch, hide thinking when `state.showThinking===false`,
  `readCssVarNum` для star alpha
- `src/view/starfield.js` — skip when `--canvas-star-alpha === 0`
- `src/ui/theme-toggle.js` — **новый** module
- `src/ui/settings-modal.js` — `t(...)` для всех labels, новые toggles
  (`showThinking`, `showMetrics`), Display + Metrics группы
- `src/ui/keyboard.js` — hotkey `T` = toggle theme
- `src/core/i18n.js` — keys `settings.show*`, `tip.theme_*`,
  `settings.group.display/metrics`
- `index.html` / `standalone.html` — `[data-theme="light"]` CSS-block,
  `#btn-theme` в HUD
- `build.cjs` — `theme-toggle.js` в MODULES
- `tests/run.js` — обновлён `parseLine: thinking` тест + новый
  `parseLine: assistant с ONLY thinking → 💭 fallback`

### Why

Юзер просил wow-эффект для thinking, светлую тему для слайдов и
аналитический контур (tokens + latency). Все три — реализованы по
минимально-инвазивному пути (без переработки render-pipeline).

123 passed, bundle 344 KB / 50 modules.

## [1.4.0] — 2026-04-25

### Added

- **Display toggles в Settings modal** (`,`) — два чекбокса в новой группе
  Display: «Pair edges (tool_use ↔ result)» и «Error rings (red dashed)».
  Сохраняются в localStorage вместе с остальными settings. Default: оба ON.
  Реализовано через расширение settings-modal.js — добавлен второй массив
  `TOGGLES` с scope ('state'|'CFG') рядом с `PARAMS` (range sliders).
- **Canvas 2D рендеринг pair edges + error rings** — раньше эти эффекты
  были только в WebGL renderer. Теперь Canvas 2D отрисовывает их тем же
  стилем (lemon-yellow dashed [8,6] с animated dashOffset для pair;
  красное пульсирующее кольцо [4,3] для error). Рендер-паритет между
  backend'ами восстановлен.

### Why

Пользователь сообщил что пунктирные линии не отображались в play-режиме.
Главная причина — в Canvas 2D рендере pair edges не было вообще. Если
переключиться на 2D через render-toggle, никаких пунктиров. В WebGL они
работают, но при play-mode + camera-follow ноды могут стоять очень близко
→ короткий segment → паттерн почти невидим. Toggle позволяет полностью
отключить если визуальный шум мешает.

### Files

- `src/view/state.js` — `showPairEdges: true`, `showErrorRings: true`
- `src/view/renderer-webgl.js` — early return в fillPairBuffer/fillErrBuffer
- `src/view/renderer.js` — новые проходы PAIR EDGES и Error ring (после
  edges, перед particles)
- `src/ui/settings-modal.js` — TOGGLES массив + checkbox UI + save/load
- `index.html`, `standalone.html` — CSS `.settings-row-toggle`

Bundle 331 KB (+4 KB за Canvas 2D pair/err passes), 49 modules, 122 passed.

## [1.3.0] — 2026-04-25

### Added (по плану A4 + B + C1)

- **Pair edges** (B) — пунктирные lemon-yellow связи между tool_use ↔
  tool_result через matching `tool_use_id`. Парсер сохраняет
  `node.toolUseId` на virtual-tool_use нодах и `node.toolResultIds[]` +
  `node.hasError` на user-нодах. `buildGraph` собирает `pairEdges` массив.
  WebGL рендерер рисует отдельным pass'ом перед нодами через `gl.LINES`
  с varying `t` и shader-pattern (12 px on / 8 off, animated через u_time).
  Для parallel Task получается N пунктиров от virtual-tool_use нод
  → одной user-ноды tool_result message — без overlap (start-точки разные).
- **Error rings** (C1) — assistant-ноды у которых хотя бы один tool_use
  получил `is_error: true` в matching tool_result, получают красное
  пунктирное кольцо. Отдельный gl.POINTS pass с annulus + dashed angles
  + pulse. Также самой virtual-tool_use ноде ставим `_isErrorToolUse`.
- **Auto-detect tree-shape** (A4) — `detectTreeShape(nodes, edges)` в
  graph.js: если граф ≥30 нод, max depth ≥3 и ≥2 узла с fan-out ≥3 →
  loader.js при первом open переключает в `radial` layout. Закрепляется
  в localStorage только если пользователь явно выбрал layout через
  toggle (для сохранения уважения к ручному выбору).
- **Force defaults tuned** (A1) — repulsion 9000→14000, springLen 90→140,
  centerPull 0.002→0.0012, fitPadding 0.85→0.7, prewarmIterations 180→260.
  Раньше графы 50+ нод схлопывались в кучу — теперь больше воздуха.
  Layout-tests обновлены (cam.scale 5.1→4.2 от 0.7-padding).

### Внутренности

- `state.pairEdges` добавлен.
- Renderer-webgl: новые `pairProg`/`errProg` + buffers + ensureArr cases
  ('pair', 'err'). Layout: 7 passes (был 5).
- Layout-toggle: при init читает `viz:layoutMode` из localStorage,
  switchTo сохраняет.

### Sample fix

Bundle 327k (+14k за shader-код), 49 modules, 122 passed.

## [1.2.0] — 2026-04-25

### Added

- **Examples ▾ dropdown** — заменил две отдельные кнопки («Load sample» +
  «🤖 Multi-agent demo») на одну с выпадающим меню. Меню содержит:
  - Basic — debug session (~40 nodes)
  - 🤖 Multi-agent — security audit, 4 parallel subagents (~50 nodes)
  - 🤖🤖 Deep orchestration — refactor monorepo, 2-level subagent spawn (~60 nodes)
- **`samples/deep-orchestration.jsonl`** — новый пример с настоящей
  tree-структурой: lead → 3 subagent → 8 sub-sub-agents → tool chains.
  Сценарий — рефактор монорепо (split services/ → packages/), параллельные
  Architect / Migrator / Tester, каждый сам спавнит 2-4 sub-sub-agent'а.
  Branches:
  - `a0 → 4 children` (3 subagent + tool_results return)
  - `arch_a1 → 3 children`
  - `mig_a1 → 5 children`
  - `test_a1 → 3 children`

Граф визуально становится «ветвистым» именно за счёт двух уровней
параллельного spawn — раньше структура multi-agent была fan-out × 1
уровень, теперь × 2.

### i18n

- `btn.sample` теперь «Examples ▾» / «Примеры ▾»
- `sample.basic`, `sample.orchestration`, `sample.deep_orchestration` (RU + EN)

## [1.1.0] — 2026-04-25

### Fixed

- **Bug** (`src/ui/story-mode.js:227`) — `while … break` всегда исполнялся
  максимум один раз. Заменил на `if`. Поведение идентичное, но Sonar
  больше не ругается, и читать код проще.

### Changed (safe refactoring after Sonar audit)

Снизил cognitive complexity у изолированных, протестированных, не-hot-path
функций. Хот-функции рендера/физики (`draw()`, `stepPhysics()`, `tick()`,
`fillLineBuffer/PointBuffer`) **намеренно не трогал** — там высокая
сложность это плата за минимум аллокаций в frame loop.

- `chatgptToClaudeJsonl()` (49 → ≤15) — извлёк `extractChatGptText`,
  `convertChatGptNode`, `chatGptIdWithConv`.
- `detectFormat()` (22 → ≤15) — выделил `tryParseJsonRoot`,
  `detectByJsonRoot`, `detectByJsonlFirstLine`. CLAUDE_JSONL_TYPE_MARKERS
  как Set вместо длинного OR-списка.
- `computeTopics()` (35 → ≤15) — `buildDocFrequency`, `buildTermFrequency`,
  `pickRecurringTop`, `pickFallbackByDf` как чистые helpers.
- `computeRadialLayout()` (31 → ≤15) — `buildParentChildIndex`,
  `countLeavesPerSubtree`, `assignRadialPosition` (рекурсивный helper
  принимает context-объект вместо closure'а 6 переменных).
- `buildGraph()` (29 → ≤15) — `createPhysicsNode`, `markOrphans`,
  `buildEdges` как отдельные helpers.

### Sonar metrics — до / после

| | до | после |
|---|---|---|
| Bugs | 1 | **0** |
| Code smells | 72 | **66** |
| Tech debt (min) | 1006 | **887** |
| Reliability rating | C | **A** |
| Maintainability | A | A |
| Security | A | A |

122 tests passing.

## [1.0.5] — 2026-04-25

### Fixed

- `.scannerwork/` (SonarQube working dir) попало в коммит v1.0.4. Удалено
  из репо, добавлено в `.gitignore`.

## [1.0.4] — 2026-04-25

### Added

- `sonar-project.properties` — конфиг для прогона через self-hosted
  SonarQube. Excludes `dist/`, `samples/`, `samples-embedded.js`.
- `npm run sonar` — алиас на `sonar-scanner` с подтянутым токеном.

### Notes

Первый прогон через SonarQube 9.9.8 показал: **0 vulnerabilities**,
Security Rating A, Maintainability A, Reliability C (1 bug, 73 code
smells — большинство cognitive complexity на hot-path функциях
рендера/физики). 39 security hotspots — все false-positive (build-time
regex backtracking при контролируемом входе + Math.random для
starfield). 7244 NLOC, 0.2% duplication, ~17 часов tech debt.

## [1.0.3] — 2026-04-25

### Fixed

- **Orchestration sample** теперь имеет правильную fan-out структуру.
  В v1.0.2 sample был «гребёнкой»: каждый Task в отдельном assistant,
  subagent'ы внуки/правнуки. Перепеределал в реалистичный Claude Code
  паттерн: ОДИН assistant с 4 tool_use Task. Все 4 subagent-поддерева
  имеют parentUuid=a2 — рисуются как 4 параллельные ветки от hub'а.
  Подтверждено: `a2 → [sa1_u1, sb1_u1, sc1_u1, sd1_u1, u3]`.

## [1.0.2] — 2026-04-25

### Added

- Кнопка **🤖 Multi-agent demo** в HUD, рядом с «Load sample».
- `build.cjs` теперь автогенерирует `src/core/samples-embedded.js` из
  `samples/*.jsonl` при каждом `npm run build`. Эмбед делает sample'ы
  доступными через `import` без runtime fetch — работает в `file://` и
  в npm-пакете.

### i18n

- `btn.demo_orchestration`, `tip.demo_orchestration` (RU + EN).

## [1.0.1] — 2026-04-25

### Fixed

- **Privacy**: убрал реальный LAN-IP NAS (`192.168.1.130:3000/androman/`)
  из фейкового `git push` output в `src/core/sample.js`. Заменил на
  нейтральный `git@github.com:user/...`. RFC1918 не атакуется снаружи,
  но раскрывал топологию личной LAN. Старые коммиты в git history не
  переписываю — для public repo это плохая идея (ломает форки/звёзды).

## [1.0.0] — 2026-04-25

First stable release. Feature-complete for the intended pet-project use case
(visualizing Claude Code JSONL sessions + ChatGPT / Anthropic API exports).

### Added

- **Architecture decoupling** — `src/core/layout.js` no longer reads
  `window.__viz.state`. `connectOrphans` flows through `sim.connectOrphans`.
- **WebGL context-lost handling** — renderer tolerates GPU reset without
  requiring a page reload.
- **Live-stream node cap** (`CFG.liveMaxNodes = 5000`) with FIFO eviction by
  timestamp, preventing unbounded growth in long-running tails.
- **Session-picker LRU** — at most 20 sessions keep `.content` in memory;
  older ones drop content (meta retained, re-fetch on click if remote).
- **Typewriter GC guard** — detect detached DOM (`textEl.isConnected`) and
  stop the timer to prevent closure leak.
- **Snapshot menu** correctly removes its outside-click listener when a
  menu item is clicked (previously leaked one listener per menu open).
- `.editorconfig`, `.gitattributes`, expanded `.gitignore`.
- `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`.

### Changed

- Removed `console.log('[topics] top words:')` from production.
- Light theme removed (dark cyberpunk only).

## [0.15.1] — 2026-04-25

### Added

- `samples/multi-agent-orchestration.jsonl` — realistic demo of a 4-subagent
  security audit, ~60 nodes with deep tool_use chains and a final synthesis.
- `SECURITY.md` documenting threat model, completed audit, and accepted risks
  (Three.js without SRI).

## [0.15.0] — 2026-04-25

### Added

- **i18n (RU / EN)** — `src/core/i18n.js` with ~120 keys, `t(key, params)`
  with `{name}` interpolation, language persistence in localStorage.
- `src/ui/lang-toggle.js` — toolbar button switches between RU and EN.
- `data-i18n` / `data-i18n-title` / `data-i18n-placeholder` / `data-i18n-aria`
  / `data-i18n-html` attributes in HTML.

## [0.14.4] — 2026-04-25

### Fixed

- Toggle modules (freeze, orphans, topics, diff, sessions, bookmarks, render)
  were overwriting `textContent` with long labels that overflowed 30×30
  icon buttons. Now icon-only with full description in `title`.

### Added

- Count badges on icon buttons (`data-badge` attribute, CSS `::after`).

## [0.14.3] — 2026-04-25

### Changed

- Toolbar split into two rows: primary (text) + secondary (icon-only with
  separators). Fits comfortably on 1440px wide screens.
- Light theme removed; always dark cyberpunk.

## [0.14.2] — 2026-04-25

### Added

- **3D volumetric orbs** — custom `ShaderMaterial` with Fresnel rim, pulsing
  white-hot core, breath animation. Replaces flat `MeshStandardMaterial`.
- **UnrealBloomPass** for real glow. Orbs light up their surroundings.
- **3D node dragging** — pointerdown picks, ray-plane intersect drives motion
  in a plane coplanar to camera direction; `reheat(sim, 0.3)` at end.
- Prominent "🌐 3D →" and "← 2D mode" navigation buttons.

## [0.14.1] — 2026-04-25

### Added

- **WebGL renderer** made default. Five passes: starfield, edge lines, edge
  particles, hub rings, nodes (multi-layer glow + individual breath pulse).
- Fallback to Canvas 2D when WebGL unavailable.

## [0.14.0] — 2026-04-24

### Added

- WebGL renderer (`src/view/renderer-webgl.js`) as alternative to Canvas 2D.
  Nodes as `gl.POINTS`, edges as batched `gl.LINES` bezier segments.
- Second `#graph-webgl` canvas + render-toggle.

## [0.13.0] — 2026-04-24

### Added

- **Annotations** — star ⭐ and freeform note ✍ per node, persisted in
  localStorage keyed by the first node's id.
- **Bookmarks panel** — sidebar listing starred nodes, click zooms camera.
- Hotkeys `S` (toggle star on selected), `B` (open bookmarks).

## [0.12.4] — 2026-04-24

### Fixed

- Security audit — `safeFetch()` wraps all user-supplied URLs with scheme
  whitelist (`http`/`https`/relative only). `?hide=<roles>` validated
  against known roles.

## [0.12.3] — 2026-04-24

### Fixed

- Session handoff 2D ↔ 3D via sessionStorage (was showing sample after
  switching modes).
- Halo visibility in 3D synced with node birth (was pre-filled before play).

## [0.12.2] — 2026-04-24

### Added

- Clickable topic legend — click a topic to filter the graph.

## [0.12.1] — 2026-04-24

### Fixed

- Topics algorithm picked action verbs (`implement`, `fix`) instead of
  subject nouns (`authentication`, `database`). Switched from classic
  `TF × log(N/df)` to `TF × log(1 + df)` with singleton filtering.

## [0.12.0] — 2026-04-24

### Added

- 3D visual polish — edges track nodes (dynamic `LineSegments`), cross-torus
  hub rings, halo glow, z-jitter for parallax.

## [0.11.0] — 2026-04-24

### Added

- 3D feature parity — hub rings, orphan markers, topic/diff coloring,
  search highlight, role filter, stats panel, dark/light theme (then
  removed in 0.14.3).

## [0.10.0] — 2026-04-24

### Added

- **Session picker** — drop multiple JSONL files, switch between them in
  a sidebar. URL param `?sessions=<index-url>` for remote JSON index with
  lazy content loading.

## [0.9.0] — 2026-04-24

### Added

- **Diff mode** — drop a second JSONL to compare sessions. FNV-1a hash of
  role + first 300 chars matches messages. Unique to A / B get distinct
  colors, common gray.
- Rewrote `build.cjs` as proper module-namespace bundler with topological
  sort. Fixed silent collisions in pre-existing bundle (`let btn` × 6,
  `let getViewport` × 5).
- Broke timeline ↔ story-mode circular import via `state.isPlaying`.

## [0.8.0] — 2026-04-24

### Added

- Settings modal with 19 live-tunable physics/visual/playback parameters.
- TF-IDF topic clusters with hue-hashed coloring.

## [0.7.0] — 2026-04-24

### Added

- Published to npm as `@andromanpro/ai-conversation-viz`.
- `src/embed.js` — programmatic mount API.

## [0.6.0] — 2026-04-24

### Added

- Radial sunburst + swim-lanes layouts (switchable with chip group).
- ChatGPT export + Anthropic messages adapters.

## [0.5.0] — 2026-04-24

### Added

- Physics rewrite — D3-style alpha cooling, Velocity Verlet, adaptive
  centerPull, leaf-spring boost, soft-wall bounds, max-velocity clamp.
- Hub auto-detection, freeze toggle, speed slider (0.5×/1×/2×/5×).

## [0.4.0] — 2026-04-24

### Added

- Keyboard shortcuts, role filter, minimap, stats HUD, share URL.

## [0.3.0] — 2026-04-24

### Added

- Tool icons, Ctrl+F search, live-stream URL polling, UX polish.

## [0.2.0] — 2026-04-24

### Added

- Wow effects — particles along edges, starfield, phone mockup with
  typewriter.

## [0.1.0] — 2026-04-24

### Added

- Initial force-directed visualization of Claude Code JSONL sessions.
