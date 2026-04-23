# ai-conversation-viz

Force-directed визуализация разговоров человека с ИИ. Загружает JSONL-файл сессии (формат Claude Code: `~/.claude/projects/*/*.jsonl`) и рисует граф сообщений — ноды и связи по `parentUuid`.

Canvas 2D, без зависимостей.

## Что видно

- **Синие ноды** — реплики пользователя
- **Бирюзовые** — ответы ассистента
- **Оранжевые** — вызовы инструментов (`tool_use`)
- Размер — длина сообщения (лог-шкала)
- Пульс — свежесть (чем позже, тем ярче)
- Рёбра — связь parent → child

## Как открыть

**Без сервера (двойной клик):** `standalone.html` — подключает собранный бандл `dist/ai-conversation-viz.js`, работает через `file://`.

**С dev-сервером:**
```bash
python -m http.server 8881 --directory .
# http://localhost:8881/
```
`index.html` в этом режиме грузит исходники из `src/` как ES modules — правишь файл, F5, видишь изменения.

## Управление

| Действие | Результат |
|---|---|
| `wheel` | zoom вокруг курсора |
| `drag` по ноде | перетаскивание ноды (физика остальных продолжается) |
| `drag` по фону | pan камеры |
| `click` по ноде | панель с ролью, временем и первыми 400 символами |
| `hover` | всплывающая подсказка с первыми 80 символами |
| `drop` файла | загрузить JSONL |
| ползунок timeline | показать только сообщения до момента t |
| кнопка ▶ | воспроизведение по таймлайну (20 сек на весь диалог) |
| Reset view | автомасштаб под текущее состояние графа |

## Откуда брать данные

Claude Code пишет JSONL-сессии в `~/.claude/projects/<project>/*.jsonl`. Каждая строка — JSON-объект с `uuid`, `parentUuid`, `timestamp`, `type` (`user`/`assistant`/`queue-operation`/...), `message.content`. Парсер оставляет только `user` и `assistant`, разбивает `content`-блоки ассистента на текстовую и `tool_use`-подноды.

## Структура

```
src/
  core/     — config, sample, parser, graph, layout (чистые модули, без DOM)
  view/     — state, camera, renderer
  ui/       — detail-panel, tooltip, timeline, interaction, loader
  main.js   — bootstrap + render loop
tests/
  run.js    — unit-тесты (node, без зависимостей)
build.cjs   — собирает всё в dist/ai-conversation-viz.js как IIFE
```

## Разработка

```bash
node tests/run.js   # 23 теста: parser, camera, graph, layout, timeline
node build.cjs      # пересобрать dist/ для standalone.html
```

Тесты покрывают чистую логику (парсинг JSONL, трансформации камеры, подсчёт bbox, шаг физики, прогресс таймлайна). UI не тестируется автоматически.

## Вдохновение

Первоначальная идея — маленькая панель `NETWORK` на mission-control дашборде: случайные ноды, связи по близости, лёгкий пульс. Здесь тот же визуальный язык, но поверх реальной структуры диалога.
