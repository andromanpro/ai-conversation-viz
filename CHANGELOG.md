# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/).

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
