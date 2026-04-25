// Формат-адаптеры. На входе — сырой текст файла, на выходе
// либо уже Claude JSONL (`type: user/assistant + parentUuid`),
// либо пустая строка. loader.js использует detectFormat()
// и вызывает соответствующий toClaudeJsonl().

// Известные тип-метки которые может содержать первая строка Claude JSONL.
const CLAUDE_JSONL_TYPE_MARKERS = new Set([
  'user', 'assistant', 'queue-operation', 'last-prompt',
]);

function tryParseJsonRoot(text) {
  if (text[0] !== '[' && text[0] !== '{') return null;
  try { return JSON.parse(text); } catch { return null; }
}

function detectByJsonRoot(obj) {
  const sample = Array.isArray(obj) ? obj[0] : obj;
  if (sample && sample.mapping) return 'chatgpt-export';
  if (Array.isArray(obj) && obj.length && obj[0].role && obj[0].content != null) {
    return 'anthropic-messages';
  }
  return null;
}

function detectByJsonlFirstLine(text) {
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (CLAUDE_JSONL_TYPE_MARKERS.has(obj.type) || obj.parentUuid !== undefined) {
        return 'claude-jsonl';
      }
    } catch { /* not parseable — not jsonl */ }
    return null; // первая непустая строка не подошла → не jsonl
  }
  return null;
}

export function detectFormat(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'unknown';
  const root = tryParseJsonRoot(trimmed);
  if (root) {
    const byRoot = detectByJsonRoot(root);
    if (byRoot) return byRoot;
  }
  const byJsonl = detectByJsonlFirstLine(trimmed);
  if (byJsonl) return byJsonl;
  return 'unknown';
}

// ---- ChatGPT export ----
// Структура: { conversation_id, mapping: { [nodeId]: { message, parent } } }
// либо массив таких объектов. Нас интересуют только user/assistant ноды
// с непустым текстом.

function extractChatGptText(content) {
  if (!content) return '';
  const parts = Array.isArray(content.parts)
    ? content.parts
    : (content.text ? [content.text] : []);
  return parts
    .map(p => (typeof p === 'string' ? p : (p && p.text) || ''))
    .filter(Boolean)
    .join('\n');
}

function chatGptIdWithConv(convId, id) {
  return convId ? `${convId}:${id}` : id;
}

function convertChatGptNode(id, node, convId) {
  const msg = node && node.message;
  if (!msg || !msg.author) return null;
  const role = msg.author.role;
  if (role !== 'user' && role !== 'assistant') return null;
  const text = extractChatGptText(msg.content);
  if (!text) return null;
  const ts = msg.create_time
    ? new Date(msg.create_time * 1000).toISOString()
    : new Date().toISOString();
  const parentId = node.parent || null;
  return {
    type: role,
    uuid: chatGptIdWithConv(convId, id),
    parentUuid: parentId ? chatGptIdWithConv(convId, parentId) : null,
    timestamp: ts,
    message: { role, content: text },
  };
}

export function chatgptToClaudeJsonl(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return ''; }
  const conversations = Array.isArray(obj) ? obj : [obj];
  const out = [];
  for (const conv of conversations) {
    const mapping = conv && conv.mapping;
    if (!mapping) continue;
    const convId = conv.id || conv.conversation_id || '';
    for (const [id, node] of Object.entries(mapping)) {
      const converted = convertChatGptNode(id, node, convId);
      if (converted) out.push(JSON.stringify(converted));
    }
  }
  return out.join('\n');
}

export function anthropicMessagesToClaudeJsonl(text) {
  let arr;
  try { arr = JSON.parse(text); } catch { return ''; }
  if (!Array.isArray(arr)) return '';
  const out = [];
  const baseTs = Date.now();
  let prevId = null;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    const role = m.role;
    if (role !== 'user' && role !== 'assistant') continue;
    let textBlock = '';
    if (typeof m.content === 'string') textBlock = m.content;
    else if (Array.isArray(m.content)) {
      textBlock = m.content
        .filter(b => b && b.type === 'text')
        .map(b => b.text)
        .join('\n');
    }
    const id = `msg-${i}`;
    const ts = new Date(baseTs + i * 15000).toISOString();
    out.push(JSON.stringify({
      type: role,
      uuid: id,
      parentUuid: prevId,
      timestamp: ts,
      message: { role, content: textBlock },
    }));
    prevId = id;
  }
  return out.join('\n');
}

export function normalizeToClaudeJsonl(text) {
  const fmt = detectFormat(text);
  if (fmt === 'chatgpt-export') {
    return { format: fmt, text: chatgptToClaudeJsonl(text) };
  }
  if (fmt === 'anthropic-messages') {
    return { format: fmt, text: anthropicMessagesToClaudeJsonl(text) };
  }
  return { format: fmt, text };
}
