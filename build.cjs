// Мини-бандлер для file:// стандалон-режима. Каждый модуль заворачивается
// в собственную IIFE-функцию и экспортирует свои binding'и в общий реестр
// __M[moduleId]. Другие модули подтягивают чужие экспорты через деструктуризацию
// из __M[targetModuleId]. Это решает коллизии имён между модулями
// (let btn, let ctx, function toggle, function updateBtn и т.п.), которые
// раньше ломали bundle в strict mode.
//
// Поддерживаются формы импорта/экспорта, которые реально используются в репо:
//   import { A, B } from './x.js';
//   import { A as B } from './x.js';
//   import A from './x.js';            (обрабатываем как default)
//   export function F() {...}
//   export const X = ...; / export let Y = ...; / export var Z = ...;
//   export default expr;
//   export { A, B };
//   export { A as B };
//
// Сборка выглядит так:
//   "use strict";
//   (function (window) {
//     const __M = Object.create(null);
//     __M['src/core/config.js'] = (function () {
//       // ... module code, imports превращены в const { X } = __M['src/other.js'];
//       return { CFG, COLORS };
//     })();
//     ...
//   })(typeof window !== 'undefined' ? window : this);

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist', 'ai-conversation-viz.js');

const MODULES = [
  'src/core/config.js',
  'src/core/sample.js',
  'src/core/samples-embedded.js',
  'src/core/parser.js',
  'src/core/adapters.js',
  'src/core/graph.js',
  'src/core/quadtree.js',
  'src/core/layout.js',
  'src/core/session-bridge.js',
  'src/core/url-safety.js',
  'src/core/i18n.js',
  'src/view/state.js',
  'src/view/camera.js',
  'src/view/path.js',
  'src/view/particles.js',
  'src/view/starfield.js',
  'src/view/tool-icons.js',
  'src/view/topics.js',
  'src/view/renderer.js',
  'src/view/renderer-webgl.js',
  'src/ui/detail-panel.js',
  'src/ui/tooltip.js',
  'src/ui/timeline.js',
  'src/ui/story-mode.js',
  'src/ui/search.js',
  'src/ui/live.js',
  'src/ui/filter.js',
  'src/ui/minimap.js',
  'src/ui/keyboard.js',
  'src/ui/stats-hud.js',
  'src/ui/layout-toggle.js',
  'src/ui/audio.js',
  'src/ui/recorder.js',
  'src/ui/freeze-toggle.js',
  'src/ui/speed-control.js',
  'src/ui/orphans-toggle.js',
  'src/ui/snapshot.js',
  'src/ui/settings-modal.js',
  'src/ui/topics-toggle.js',
  'src/ui/diff-mode.js',
  'src/ui/session-picker.js',
  'src/ui/annotations.js',
  'src/ui/bookmarks.js',
  'src/ui/render-toggle.js',
  'src/ui/lang-toggle.js',
  'src/ui/metrics-overlay.js',
  'src/ui/interaction.js',
  'src/ui/loader.js',
  'src/ui/share.js',
  'src/main.js',
];

// Нормализуем путь импорта `from './x.js'` относительно текущего модуля.
// Возвращаем ключ как в MODULES (всегда с '/', без './').
function resolveImportPath(fromModule, specifier) {
  const absFrom = path.dirname(path.join(ROOT, fromModule));
  const abs = path.resolve(absFrom, specifier);
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

// Разбор строки импорта. Возвращает { kind: 'named'|'default', specs: [{local, imported}], source }
// или null, если строка не похожа на import.
function parseImport(line) {
  // import 'x';  — сайд-эффект, игнорируем
  const side = /^\s*import\s+['"][^'"]+['"]\s*;?\s*$/.exec(line);
  if (side) return { kind: 'side', specs: [], source: null };

  // import X from '...';   (default)
  const def = /^\s*import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/.exec(line);
  if (def) return { kind: 'default', specs: [{ local: def[1], imported: 'default' }], source: def[2] };

  // import { A, B as C } from '...';
  const named = /^\s*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/.exec(line);
  if (named) {
    const specs = named[1].split(',').map(s => s.trim()).filter(Boolean).map(part => {
      const m = /^(\w+)(?:\s+as\s+(\w+))?$/.exec(part);
      if (!m) throw new Error('Не смог разобрать named import: ' + part);
      return { imported: m[1], local: m[2] || m[1] };
    });
    return { kind: 'named', specs, source: named[2] };
  }
  return null;
}

// Собрать список экспортов модуля. Возвращает [{ local, exported }].
// local — имя в scope модуля, exported — имя, по которому его импортируют снаружи.
function collectExports(code) {
  const exports = [];
  // export default expr;
  //   Конвертируем в `const __default = expr;` с exported='default'.
  //   НЕ используется в репо (проверили), но на всякий случай.
  //
  // export function foo(...) {...}
  const reFn = /^\s*export\s+function\s+(\w+)\s*\(/gm;
  let m;
  while ((m = reFn.exec(code))) exports.push({ local: m[1], exported: m[1] });

  // export async function foo(...) — просто на всякий
  const reAFn = /^\s*export\s+async\s+function\s+(\w+)\s*\(/gm;
  while ((m = reAFn.exec(code))) exports.push({ local: m[1], exported: m[1] });

  // export class Foo {...}
  const reCls = /^\s*export\s+class\s+(\w+)\s*[\{|(extends)]/gm;
  while ((m = reCls.exec(code))) exports.push({ local: m[1], exported: m[1] });

  // export const/let/var X = ...;
  // Матчим только имя прямо после ключевого слова — ищем первый идентификатор.
  // Множественные декларации (`export const A = 1, B = 2;`) в репо не используются.
  const reVar = /^\s*export\s+(?:const|let|var)\s+(\w+)/gm;
  while ((m = reVar.exec(code))) {
    exports.push({ local: m[1], exported: m[1] });
  }

  // export { A, B as C };
  const reBlock = /^\s*export\s*\{([^}]*)\}\s*;?\s*$/gm;
  while ((m = reBlock.exec(code))) {
    const parts = m[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      const pm = /^(\w+)(?:\s+as\s+(\w+))?$/.exec(part);
      if (pm) exports.push({ local: pm[1], exported: pm[2] || pm[1] });
    }
  }
  return exports;
}

// Простой split строки по запятым на верхнем уровне (без учёта вложенности —
// для наших export-declarations достаточно).
function splitTopLevel(s) {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

// Преобразование исходника модуля: заменяем import-строки на
//   const { A, B } = __M['src/x.js'];
// Убираем `export` ключевое слово (функции, классы, let/const остаются
// локальными в IIFE, но в конце мы формируем `return { ... }`).
function transformModule(modulePath, src) {
  const lines = src.split(/\r?\n/);
  const outLines = [];
  const importsByModule = new Map(); // targetMod → [{local, imported}]
  for (const line of lines) {
    if (/^\s*import\b/.test(line)) {
      const imp = parseImport(line);
      if (!imp) { outLines.push(line); continue; }
      if (imp.kind === 'side') continue; // просто удаляем
      const target = resolveImportPath(modulePath, imp.source);
      if (!importsByModule.has(target)) importsByModule.set(target, []);
      importsByModule.get(target).push(...imp.specs);
      continue;
    }
    // Снимаем `export` (default, block и declared)
    if (/^\s*export\s+default\s+/.test(line)) {
      outLines.push(line.replace(/^(\s*)export\s+default\s+/, '$1const __default = '));
      continue;
    }
    if (/^\s*export\s*\{[^}]*\}\s*;?\s*$/.test(line)) {
      // export-block — удаляем (экспорты соберём отдельно)
      continue;
    }
    if (/^\s*export\s+/.test(line)) {
      outLines.push(line.replace(/^(\s*)export\s+/, '$1'));
      continue;
    }
    outLines.push(line);
  }
  const body = outLines.join('\n');
  // Имитация default-экспорта отдельно (если встретили export default)
  const hasDefault = /\bconst\s+__default\s*=/.test(body);
  return { body, importsByModule, hasDefault };
}

function topologicalOrder(modules, depsOf) {
  // Kahn's algorithm — сначала модули без зависимостей.
  const visited = new Set();
  const temp = new Set();
  const order = [];
  function visit(n) {
    if (visited.has(n)) return;
    if (temp.has(n)) return; // цикл — просто пропускаем (ESM допускает циклы с TDZ-риском)
    temp.add(n);
    for (const d of depsOf(n) || []) visit(d);
    temp.delete(n);
    visited.add(n);
    order.push(n);
  }
  for (const m of modules) visit(m);
  return order;
}

// Pre-step: генерируем src/core/samples-embedded.js из samples/*.jsonl.
// Эмбед делает демо-сэмплы доступными через import (без runtime fetch),
// что работает и в standalone.html на file://, и в npm-пакете.
function generateSamplesEmbedded() {
  const samplesDir = path.join(ROOT, 'samples');
  if (!fs.existsSync(samplesDir)) return;
  const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.jsonl'));
  const parts = [
    '// Auto-generated from samples/*.jsonl by build.cjs — do not edit.\n',
    '// Embeds sample JSONL content so the app works offline (file://) and in\n',
    '// the npm package without runtime fetch.\n\n',
  ];
  for (const f of files) {
    const text = fs.readFileSync(path.join(samplesDir, f), 'utf8');
    const id = f.replace(/\.jsonl$/, '').replace(/[^\w]/g, '_').toUpperCase();
    parts.push('export const ' + id + '_JSONL = ' + JSON.stringify(text) + ';\n\n');
  }
  const out = path.join(ROOT, 'src', 'core', 'samples-embedded.js');
  fs.writeFileSync(out, parts.join(''));
}

function build() {
  generateSamplesEmbedded();
  // Шаг 1. Прочитать все модули.
  const parsedByPath = new Map();
  for (const modulePath of MODULES) {
    const abs = path.join(ROOT, modulePath);
    const src = fs.readFileSync(abs, 'utf8');
    const exports = collectExports(src);
    const transformed = transformModule(modulePath, src);
    if (transformed.hasDefault && !exports.some(e => e.exported === 'default')) {
      exports.push({ local: '__default', exported: 'default' });
    }
    parsedByPath.set(modulePath, { modulePath, src, exports, transformed });
  }

  // Быстрая валидация: все импорты указывают на известные модули.
  const known = new Set(MODULES);
  for (const p of parsedByPath.values()) {
    for (const [target] of p.transformed.importsByModule) {
      if (!known.has(target)) {
        throw new Error(`Модуль ${p.modulePath} импортирует из ${target}, которого нет в MODULES`);
      }
    }
  }

  // Шаг 1.5. Топологическая сортировка: импорты должны быть инициализированы
  // до тела импортёра, иначе __M[target] === undefined при destructuring.
  const order = topologicalOrder(MODULES, m => [...parsedByPath.get(m).transformed.importsByModule.keys()]);
  const parsed = order.map(m => parsedByPath.get(m));

  // Шаг 2. Сборка итогового файла.
  const out = [];
  out.push('"use strict";');
  out.push('(function (window) {');
  out.push('  const __M = Object.create(null);');
  for (const p of parsed) {
    out.push('');
    out.push('  // --- ' + p.modulePath + ' ---');
    out.push('  __M[' + JSON.stringify(p.modulePath) + '] = (function () {');

    // Декларации импортов
    for (const [target, specs] of p.transformed.importsByModule) {
      // дедуп
      const seen = new Set();
      const unique = specs.filter(s => {
        const key = s.imported + '\u0001' + s.local;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!unique.length) continue;
      const destruct = unique.map(s => s.local === s.imported ? s.local : `${s.imported}: ${s.local}`).join(', ');
      out.push(`    const { ${destruct} } = __M[${JSON.stringify(target)}];`);
    }

    out.push(p.transformed.body);

    // Формирование return-объекта с экспортами
    if (p.exports.length) {
      const entries = p.exports.map(e =>
        e.exported === e.local ? e.local : `${JSON.stringify(e.exported)}: ${e.local}`
      ).join(', ');
      out.push(`    return { ${entries} };`);
    } else {
      out.push('    return {};');
    }
    out.push('  })();');
  }
  out.push('})(typeof window !== "undefined" ? window : this);');

  const combined = out.join('\n');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, combined, 'utf8');
  console.log('Wrote ' + OUT + ' (' + combined.length + ' bytes, ' + MODULES.length + ' modules)');
}

build();
