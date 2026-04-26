import { CFG } from './config.js';

// Regex для CLI-meta тегов которые Claude Code CLI вставляет в user-message
// при slash-командах и system reminders. В публичных JSONL они обычно
// отсутствуют, но при работе через CLI или экспорте сырых сессий — могут
// пробрасываться и засорять отображаемый текст.
const CLI_META_REGEX = /<(system-reminder|command-name|command-message|command-args|local-command-stdout|local-command-caveat)>[\s\S]*?<\/\1>/g;
const CLI_META_DETECT = /<(system-reminder|command-name|command-message|command-args|local-command-stdout|local-command-caveat)>/;

/**
 * Удаляет CLI-meta теги из user-текста и схлопывает множественные пустые
 * строки оставшиеся после удаления. Возвращает очищенный текст.
 * Идемпотентна.
 */
export function stripCliMeta(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(CLI_META_REGEX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
  // blockCounts — сколько блоков каждого типа было в content (нужно чтобы
  // отличить "user-message с tool_result + текстом" от "pure tool_result").
  const emptyCounts = { text: 0, image: 0, toolUse: 0, toolResult: 0, thinking: 0 };
  if (typeof content === 'string') {
    const stripped = stripCliMeta(content);
    return {
      text: stripped,
      toolUses: [], toolResults: [], thinkings: [],
      blockCounts: { ...emptyCounts, text: stripped ? 1 : 0 },
      hasCliMeta: CLI_META_DETECT.test(content),
    };
  }
  if (!Array.isArray(content)) {
    return { text: '', toolUses: [], toolResults: [], thinkings: [], blockCounts: emptyCounts, hasCliMeta: false };
  }
  const textParts = [];
  const toolUses = [];
  // toolResults — массив объектов с полями toolUseId (string) и isError (bool)
  const toolResults = [];
  // thinkings — массив текстов для отдельных virtual thinking nodes
  const thinkings = [];
  const blockCounts = { ...emptyCounts };
  let hasCliMeta = false;
  for (const block of content) {
    if (!block) continue;
    switch (block.type) {
      case 'text':
        if (typeof block.text === 'string') {
          if (CLI_META_DETECT.test(block.text)) hasCliMeta = true;
          const cleaned = stripCliMeta(block.text);
          if (cleaned) {
            textParts.push(cleaned);
            blockCounts.text++;
          }
          // Если после strip остался пустой текст — блок был чисто meta,
          // не считаем его как text-блок (важно для pure tool_result detection).
        }
        break;
      case 'thinking':
        // Сохраняем текст для отдельной virtual thinking ноды.
        // В text родителя НЕ дублируем — иначе двойное отображение.
        if (typeof block.thinking === 'string' && block.thinking.trim()) {
          thinkings.push(block.thinking);
          blockCounts.thinking++;
        }
        break;
      case 'tool_use':
        toolUses.push({
          id: block.id || null,
          name: typeof block.name === 'string' ? block.name : 'tool',
          input: block.input || {},
        });
        blockCounts.toolUse++;
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
        blockCounts.toolResult++;
        break;
      }
      case 'image':
        textParts.push('[image]');
        blockCounts.image++;
        break;
      default:
        // неизвестный тип — пропускаем
        break;
    }
  }
  return { text: textParts.join('\n\n'), toolUses, toolResults, thinkings, blockCounts, hasCliMeta };
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
  let parsed = 0, kept = 0, skipped = 0, errors = 0, compactions = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    parsed++;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { errors++; continue; }

    const t = obj.type;
    if (t === 'summary') compactions++;
    if (t !== 'user' && t !== 'assistant') {
      if (t && !SERVICE_TYPES.has(t)) unknownTypes.set(t, (unknownTypes.get(t) || 0) + 1);
      skipped++;
      continue;
    }

    const { text: msgText, toolUses, toolResults, thinkings, blockCounts, hasCliMeta } = classifyContent(obj.message && obj.message.content);
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

    // Pure tool_result detection: user-message содержит ≥1 tool_result блок
    // и НЕТ блоков text/thinking/image — это чистый «возврат от tool'а»,
    // не реальный пользовательский ввод. Получает отдельную роль.
    // (Mixed: user с текстом + tool_result — оставляем role='user', т.к.
    // там есть и реальный комментарий пользователя.)
    let role = t;
    if (t === 'user' && toolResults.length > 0
        && blockCounts.text === 0 && blockCounts.thinking === 0 && blockCounts.image === 0) {
      role = 'tool_result';
    }

    // На user/tool_result нодах сохраняем массив tool_use_id из tool_result
    // блоков и флаг наличия error — для visualization pair-edges и red ring
    // на parent assistant'е (graph.js buildPairEdges использует n.hasError).
    // На assistant-нодах сохраняем usage (для метрик-бейджей).
    const node = {
      id: baseId,
      parentId,
      role,
      ts,
      text: finalText,
      textLen: finalText.length,
    };
    if (hasCliMeta) node._hasCliMeta = true;
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

  // Post-pass: помечаем user-ноды которые на самом деле — subagent prompts.
  // В Claude Code тред саб-агента начинается с user-message чей parentUuid
  // указывает на virtual tool_use ID родительского ассистента (Task tool).
  // Семантически это машинно-сгенерированный prompt от Lead-агента к
  // саб-агенту, а не ввод человека — отображаем отдельным цветом.
  markSubagentInputs(nodes);
  // Post-pass: помечаем virtual tool_use ноды которые остались без ответа
  // (нет matching tool_result в каком-либо tool_result-message).
  // Может случаться при truncated сессиях или если CLI прервался.
  markPendingToolUses(nodes);

  if (unknownTypes.size && typeof console !== 'undefined') {
    console.warn('[parseJSONL] skipped types:', JSON.stringify(Object.fromEntries(unknownTypes)));
  }

  return { nodes, stats: { parsed, kept, skipped, errors, compactions } };
}

// Помечает user-ноды как 'subagent_input' если их parent — virtual tool_use
// с toolName='Task'. Идемпотентна — может вызываться дважды без эффекта.
// Экспортируется для appendRawNodes (live-mode incremental parsing) — после
// добавления новых нод вызываем этот пост-проход чтобы перевести user→subagent_input.
export function markSubagentInputs(nodes) {
  const taskToolUseIds = new Set();
  for (const n of nodes) {
    if (n.role === 'tool_use' && n.toolName === 'Task') {
      taskToolUseIds.add(n.id);
    }
  }
  for (const n of nodes) {
    if (n.role === 'user' && n.parentId && taskToolUseIds.has(n.parentId)) {
      n.role = 'subagent_input';
    }
  }
}

/**
 * Помечает virtual tool_use ноды флагом `_isPendingToolUse=true` если для
 * их `toolUseId` нигде в графе нет matching tool_result (ни в одной user/
 * tool_result ноде через `toolResultIds`).
 *
 * Бывает при:
 *  - truncated JSONL (сессия оборвалась пока tool ещё работал)
 *  - максимальный лимит CFG.maxMessages дошёл до tool_use, но не до result
 *  - саб-агенский tool_use чья tool_result-нода обрезана
 *
 * Идемпотентна. Renderer'ы могут использовать флаг для приглушённого
 * отображения (визуально «не закрытый вызов»), но это polish.
 */
export function markPendingToolUses(nodes) {
  const respondedToolUseIds = new Set();
  for (const n of nodes) {
    if (n.toolResultIds) {
      for (const tuid of n.toolResultIds) respondedToolUseIds.add(tuid);
    }
  }
  for (const n of nodes) {
    if (n.role === 'tool_use' && n.toolUseId && !respondedToolUseIds.has(n.toolUseId)) {
      n._isPendingToolUse = true;
    } else if (n.role === 'tool_use' && n._isPendingToolUse) {
      // Если ранее был помечен, а теперь tool_result появился (live-mode) —
      // снимаем флаг. Поддерживает идемпотентность при повторных вызовах.
      n._isPendingToolUse = false;
    }
  }
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

  const { text: msgText, toolUses, toolResults, thinkings, blockCounts, hasCliMeta } = classifyContent(obj.message && obj.message.content);
  const baseId = obj.uuid || `gen-${seedCounter != null ? seedCounter : Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
  const parentId = obj.parentUuid || null;
  let finalText = msgText;
  if (t === 'assistant' && !finalText) {
    if (toolUses.length) finalText = buildAssistantSummary(toolUses);
    else if (thinkings.length) finalText = '💭 ' + thinkings[0].slice(0, 80);
  }

  // Pure tool_result detection (тот же критерий что в parseJSONL).
  let role = t;
  if (t === 'user' && toolResults && toolResults.length > 0
      && blockCounts.text === 0 && blockCounts.thinking === 0 && blockCounts.image === 0) {
    role = 'tool_result';
  }

  const baseNode = {
    id: baseId,
    parentId,
    role,
    ts,
    text: finalText,
    textLen: finalText.length,
  };
  if (hasCliMeta) baseNode._hasCliMeta = true;
  if (t === 'user' && toolResults && toolResults.length) {
    baseNode.toolResultIds = toolResults.map(r => r.toolUseId);
    baseNode.hasError = toolResults.some(r => r.isError);
  }
  const out = [baseNode];
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
