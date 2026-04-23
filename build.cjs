// Minimal bundler inspired by lava-orb/build.cjs.
// Concatenates ES modules in dependency order, strips import/export,
// wraps in an IIFE -> dist/ai-conversation-viz.js (for file:// use without a server).

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist', 'ai-conversation-viz.js');

const MODULES = [
  'src/core/config.js',
  'src/core/sample.js',
  'src/core/parser.js',
  'src/core/graph.js',
  'src/core/layout.js',
  'src/view/state.js',
  'src/view/camera.js',
  'src/view/path.js',
  'src/view/particles.js',
  'src/view/starfield.js',
  'src/view/renderer.js',
  'src/ui/detail-panel.js',
  'src/ui/tooltip.js',
  'src/ui/timeline.js',
  'src/ui/story-mode.js',
  'src/ui/interaction.js',
  'src/ui/loader.js',
  'src/main.js',
];

function stripModuleSyntax(code) {
  return code
    .replace(/^\s*import\b[^;]*;\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+\{[^}]*\}\s*;\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '');
}

function build() {
  const parts = ['"use strict";', '(function (window) {'];
  for (const mod of MODULES) {
    const abs = path.join(ROOT, mod);
    const src = fs.readFileSync(abs, 'utf8');
    parts.push('// --- ' + mod + ' ---');
    parts.push(stripModuleSyntax(src));
  }
  parts.push('})(typeof window !== "undefined" ? window : this);');
  const combined = parts.join('\n\n');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, combined, 'utf8');
  console.log('Wrote ' + OUT + ' (' + combined.length + ' bytes, ' + MODULES.length + ' modules)');
}

build();
