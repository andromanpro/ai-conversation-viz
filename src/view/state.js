export const state = {
  nodes: [],
  edges: [],
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
};

export function resetInteractionState() {
  state.selected = null;
  state.hover = null;
  state.pathSet = new Set();
}
