import { CFG } from './config.js';

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

export function extractText(message) {
  if (!message) return '';
  return classifyContent(message.content).text;
}

const SERVICE_TYPES = new Set([
  'queue-operation', 'last-prompt', 'progress', 'system',
  'attachment', 'custom-title', 'ai-title', 'summary',
]);

export function parseJSONL(text) {
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

export function summariseToolUse(tu) {
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
export function parseLine(line, seedCounter) {
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
