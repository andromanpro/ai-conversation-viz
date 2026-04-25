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
  diffStats: null,     // { onlyA, onlyB, both }
  sessions: [],        // [{ id, name, size, content, meta, remoteUrl? }]
  sessionsOpen: false, // панель session-picker открыта
  isPlaying: false,    // зеркало timeline.playing (для story-mode без циклических импортов)
  annotations: new Map(), // nodeId → { text, starred, ts } (пользовательские заметки/закладки)
  renderBackend: 'webgl', // 'canvas2d' | 'webgl' — WebGL по умолчанию (красивее и быстрее; 2D как fallback)
  showPairEdges: true,    // лимонные пунктирные tool_use ↔ tool_result связи
  showErrorRings: true,   // красные пунктирные кольца у нод с tool error
};

export function resetInteractionState() {
  state.selected = null;
  state.hover = null;
  state.pathSet = new Set();
}
