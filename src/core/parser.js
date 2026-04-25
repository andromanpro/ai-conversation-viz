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
  if (typeof content === 'string') return { text: content, toolUses: [], toolResults: [], thinkings: [] };
  if (!Array.isArray(content)) return { text: '', toolUses: [], toolResults: [], thinkings: [] };
  const textParts = [];
  const toolUses = [];
  const toolResults = []; // { toolUseId, isError }
  const thinkings = [];   // string[] — для отдельных virtual thinking nodes
  for (const block of content) {
    if (!block) continue;
    switch (block.type) {
      case 'text':
        if (typeof block.text === 'string') textParts.push(block.text);
        break;
      case 'thinking':
        // Сохраняем текст для отдельной virtual thinking ноды.
        // В text родителя НЕ дублируем — иначе двойное отображение.
        if (typeof block.thinking === 'string' && block.thinking.trim()) {
          thinkings.push(block.thinking);
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
        if (block.tool_use_id) {
          toolResults.push({
            toolUseId: block.tool_use_id,
            isError: !!block.is_error,
          });
        }
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
  return { text: textParts.join('\n\n'), toolUses, toolResults, thinkings };
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

    const { text: msgText, toolUses, toolResults, thinkings } = classifyContent(obj.message && obj.message.content);
    const baseId = obj.uuid || `gen-${nodes.length}`;
    const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
    const parentId = obj.parentUuid || null;
    // Если у ассистента нет текста, но есть tool_use или thinking —
    // формируем summary. Приоритет: tool_use → thinking-фраза.
    let finalText = msgText;
    if (t === 'assistant' && !finalText) {
      if (toolUses.length) finalText = buildAssistantSummary(toolUses);
      else if (thinkings.length) finalText = '💭 ' + thinkings[0].slice(0, 80);
    }

    // На user-нодах сохраняем массив tool_use_id из tool_result блоков и
    // флаг наличия error — для visualization pair-edges и red error-ring.
    // На assistant-нодах сохраняем usage (для метрик-бейджей).
    const node = {
      id: baseId,
      parentId,
      role: t,
      ts,
      text: finalText,
      textLen: finalText.length,
    };
    if (t === 'user' && toolResults.length) {
      node.toolResultIds = toolResults.map(r => r.toolUseId);
      node.hasError = toolResults.some(r => r.isError);
    }
    if (t === 'assistant' && obj.message && obj.message.usage) {
      const u = obj.message.usage;
      const inT = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      const outT = u.output_tokens || 0;
      node.tokensIn = inT;
      node.tokensOut = outT;
      node.tokensTotal = inT + outT;
    }
    nodes.push(node);
    kept++;

    if (t === 'assistant') {
      // Thinking ноды идут раньше tool_use (с малым шагом ts), чтобы в
      // timeline они появлялись «между» mind ассистента и его действиями.
      for (let i = 0; i < thinkings.length; i++) {
        const tk = thinkings[i];
        nodes.push({
          id: `${baseId}#th${i}`,
          parentId: baseId,
          role: 'thinking',
          ts: ts + (i + 1) * Math.max(50, Math.floor(CFG.toolUseTsStepMs / 4)),
          text: tk,
          textLen: tk.length,
        });
        kept++;
      }
      for (let i = 0; i < toolUses.length; i++) {
        const tu = toolUses[i];
        const inputStr = safeStringify(tu.input);
        const subText = `${tu.name}\n${inputStr}`;
        nodes.push({
          id: `${baseId}#tu${i}`,
          parentId: baseId,
          role: 'tool_use',
          // Сдвигаем после thinking-блоков, чтобы порядок был
          // assistant → thinking* → tool_use*
          ts: ts + (thinkings.length + i + 1) * CFG.toolUseTsStepMs,
          text: subText,
          textLen: subText.length,
          toolName: tu.name,
          toolUseId: tu.id, // Real API tool_use_id для pair-edges с tool_result
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

  const { text: msgText, toolUses, thinkings } = classifyContent(obj.message && obj.message.content);
  const baseId = obj.uuid || `gen-${seedCounter != null ? seedCounter : Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
  const parentId = obj.parentUuid || null;
  let finalText = msgText;
  if (t === 'assistant' && !finalText) {
    if (toolUses.length) finalText = buildAssistantSummary(toolUses);
    else if (thinkings.length) finalText = '💭 ' + thinkings[0].slice(0, 80);
  }

  const out = [{
    id: baseId,
    parentId,
    role: t,
    ts,
    text: finalText,
    textLen: finalText.length,
  }];
  if (t === 'assistant') {
    for (let i = 0; i < thinkings.length; i++) {
      const tk = thinkings[i];
      out.push({
        id: `${baseId}#th${i}`,
        parentId: baseId,
        role: 'thinking',
        ts: ts + (i + 1) * Math.max(50, Math.floor(CFG.toolUseTsStepMs / 4)),
        text: tk,
        textLen: tk.length,
      });
    }
    for (let i = 0; i < toolUses.length; i++) {
      const tu = toolUses[i];
      const inputStr = safeStringify(tu.input);
      const subText = `${tu.name}\n${inputStr}`;
      out.push({
        id: `${baseId}#tu${i}`,
        parentId: baseId,
        role: 'tool_use',
        ts: ts + (thinkings.length + i + 1) * CFG.toolUseTsStepMs,
        text: subText,
        textLen: subText.length,
        toolName: tu.name,
      });
    }
  }
  return out;
}
