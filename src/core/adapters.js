// Формат-адаптеры. На входе — сырой текст файла, на выходе
// либо уже Claude JSONL (`type: user/assistant + parentUuid`),
// либо пустая строка. loader.js использует detectFormat()
// и вызывает соответствующий toClaudeJsonl().

export function detectFormat(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'unknown';
  if (trimmed[0] === '[' || trimmed[0] === '{') {
    try {
      const obj = JSON.parse(trimmed);
      const sample = Array.isArray(obj) ? obj[0] : obj;
      if (sample && sample.mapping) return 'chatgpt-export';
      if (Array.isArray(obj) && obj.length && obj[0].role && obj[0].content != null) return 'anthropic-messages';
    } catch { /* might be JSONL */ }
  }
  // Первая непустая строка — валидный JSON c типом/полями Claude Code
  for (const line of trimmed.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (obj.type === 'user' || obj.type === 'assistant'
          || obj.type === 'queue-operation' || obj.type === 'last-prompt'
          || obj.parentUuid !== undefined) {
        return 'claude-jsonl';
      }
    } catch {}
    break;
  }
  return 'unknown';
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
      const msg = node && node.message;
      if (!msg || !msg.author) continue;
      const role = msg.author.role;
      if (role !== 'user' && role !== 'assistant') continue;
      const c = msg.content || {};
      const parts = Array.isArray(c.parts) ? c.parts : (c.text ? [c.text] : []);
      const textJoined = parts
        .map(p => (typeof p === 'string' ? p : (p && p.text) || ''))
        .filter(Boolean)
        .join('\n');
      if (!textJoined) continue;
      const ts = msg.create_time
        ? new Date(msg.create_time * 1000).toISOString()
        : new Date().toISOString();
      const parentId = node.parent || null;
      out.push(JSON.stringify({
        type: role,
        uuid: convId ? `${convId}:${id}` : id,
        parentUuid: parentId ? (convId ? `${convId}:${parentId}` : parentId) : null,
        timestamp: ts,
        message: { role, content: textJoined },
      }));
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
