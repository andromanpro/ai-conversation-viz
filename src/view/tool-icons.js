// Unicode-символы (одноцветные, без emoji — стабильный рендер в canvas)
const TOOL_ICON_MAP = {
  bash: '▶',
  powershell: '▶',
  shell: '▶',
  read: '≡',
  grep: '⌕',
  glob: '✱',
  find: '⌕',
  write: '✎',
  edit: '✎',
  multiedit: '✎',
  notebookedit: '✎',
  task: '◇',
  agent: '◇',
  skill: '✦',
  webfetch: '↗',
  websearch: '↗',
  todowrite: '☑',
  exitplanmode: '✓',
  enterplanmode: '☰',
  askuserquestion: '?',
  schedulewakeup: '⏱',
  toolsearch: '⌘',
};

export function toolIcon(toolName) {
  if (!toolName) return '•';
  const key = String(toolName).toLowerCase().replace(/[^a-z]/g, '');
  if (TOOL_ICON_MAP[key]) return TOOL_ICON_MAP[key];
  // Попробуем распознать по содержимому (mcp__server__foo_bar → foo_bar)
  const tail = key.replace(/^mcp/, '').replace(/^[a-z]+?(?=[A-Z])/, '');
  if (TOOL_ICON_MAP[tail]) return TOOL_ICON_MAP[tail];
  // Fallback — первая буква в uppercase
  return String(toolName).trim().charAt(0).toUpperCase() || '•';
}
