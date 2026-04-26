export const state = {
  nodes: [],
  edges: [],
  pairEdges: [], // tool_use → tool_result связи (через tool_use_id), пунктиром
  byId: new Map(),
  selected: null,
  hover: null,
  camera: { x: 0, y: 0, scale: 1 },
  stats: null,
  running: true,
  timelineMax: 1,
  pathSet: new Set(),
  stars: [],
  cameraTarget: null,
  searchMatches: new Set(),
  searchActive: null,
  hiddenRoles: new Set(),
  layoutMode: 'force', // 'force' | 'radial'
  perfMode: 'normal',  // 'normal' | 'degraded' | 'minimal'
  sim: null,           // Physics simulation state (createSim)
  playSpeed: 1,        // 0.5 | 1 | 2 | 5
  connectOrphans: false, // B+D по умолчанию: orphan forest + маркеры
  collapsed: new Set(), // nodeId → tool_use-дети скрыты
  topicsMode: false, // TF-IDF topic coloring
  topicFilter: null, // string | null — если задан, подсвечиваем только ноды с таким _topicWord
  diffMode: false,     // сравнение двух сессий
  // diffStats — объект со счётчиками: onlyA, onlyB, both
  diffStats: null,
  // sessions — массив объектов с полями id, name, size, content, meta, remoteUrl?
  sessions: [],
  sessionsOpen: false, // панель session-picker открыта
  isPlaying: false,    // зеркало timeline.playing (для story-mode без циклических импортов)
  annotations: new Map(), // nodeId → { text, starred, ts } (пользовательские заметки/закладки)
  renderBackend: 'webgl', // 'canvas2d' | 'webgl' — WebGL по умолчанию (красивее и быстрее; 2D как fallback)
  showReverseSignal: true,// анимированный обратный импульс tool_result → tool_use
  showForwardSignal: true,// частицы вдоль обычных edges (parent → child) в 3D
  showErrorRings: true,   // красные пунктирные кольца у нод с tool error
  showThinking: true,     // фиолетовые thinking-ноды как virtual children
  showMetrics: false,     // бейджи: tokens на assistant, ⏱ на долгих ожиданиях
  useCanvas2D: false,     // сила Canvas 2D fallback (продвинутая опция в Settings)
  timelineByCount: false, // play slider — равномерно по count нод (true) или по ts (false, default)
  show3DHoverPreview: false, // в 3D — показывать tooltip при hover на ноду (по умолчанию off, чтобы не отвлекало при панорамировании)
};

export function resetInteractionState() {
  state.selected = null;
  state.hover = null;
  state.pathSet = new Set();
}
