// TF-IDF topic clustering. Для каждой ноды считаем top-слово по TF-IDF,
// хешируем его в hue → ноды с похожей темой окрашены в похожий оттенок.
// Без LLM, без внешних зависимостей. Stopwords — минимальный набор RU/EN.

const STOPWORDS = new Set([
  // English
  'the','a','an','and','or','but','if','then','else','of','to','in','on','at','for','with','by','as','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','should','could','can','may','might','must','shall','this','that','these','those','i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their','what','which','who','whom','where','when','why','how','no','not','so','all','any','each','few','more','most','other','some','such','only','own','same','than','too','very','just','now','also','one','two','three',
  // Russian
  'и','а','но','или','если','то','что','как','так','да','нет','он','она','оно','они','я','ты','мы','вы','это','этот','эта','эти','тот','та','те','же','ли','бы','был','была','были','есть','будет','был','не','ни','для','про','с','к','по','у','во','на','о','об','от','до','из','за','над','под','между','через','при','перед','после','без','при','может','можно','нужно','надо','очень','ещё','еще','уже','только','также','когда','где','кто','чей','какой','который','всё','все','весь','сам','себя','свой','мой','твой','наш','ваш','их','ему','его','её','нас','вас',
  // Code-noise
  'function','const','let','var','return','if','else','for','while','true','false','null','undefined','this','new','class','import','export','from','default','async','await',
]);

function tokenize(text) {
  if (!text) return [];
  // Убираем URL, пунктуацию; оставляем буквы, цифры, дефис
  const cleaned = String(text).replace(/https?:\/\/\S+/g, ' ').toLowerCase();
  return cleaned.split(/[^\p{L}\p{N}-]+/u)
    .filter(w => w.length >= 3 && w.length <= 24 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Анализирует ноды, для каждой возвращает top-1 TF-IDF слово.
 * @param {Array} nodes — state.nodes
 * @returns {Map<nodeId, { topWord: string, score: number }>}
 */
export function computeTopics(nodes) {
  const result = new Map();
  if (!nodes || !nodes.length) return result;
  const N = nodes.length;
  // DF — в скольких документах встречается слово
  const df = new Map();
  const nodeTokens = new Map();
  for (const n of nodes) {
    const toks = tokenize(n.text || '');
    nodeTokens.set(n.id, toks);
    const seen = new Set(toks);
    for (const w of seen) df.set(w, (df.get(w) || 0) + 1);
  }
  // IDF
  const idf = new Map();
  for (const [w, d] of df) idf.set(w, Math.log((N + 1) / (d + 1)) + 1);

  for (const n of nodes) {
    const toks = nodeTokens.get(n.id) || [];
    if (!toks.length) { result.set(n.id, null); continue; }
    // TF
    const tf = new Map();
    for (const w of toks) tf.set(w, (tf.get(w) || 0) + 1);
    let best = null, bestScore = 0;
    for (const [w, c] of tf) {
      const s = (c / toks.length) * (idf.get(w) || 1);
      // приоритет более частым в документе, но с редкостью
      if (s > bestScore) { bestScore = s; best = w; }
    }
    result.set(n.id, best ? { topWord: best, score: bestScore } : null);
  }
  return result;
}

// FNV-1a hash → 0..1 для hue
export function hashHue(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967296);
}

/**
 * Применяет topic colors к нодам — сохраняет на n._topicHue (0..1).
 * Если у ноды нет topic — _topicHue = null.
 */
export function applyTopicsToNodes(nodes) {
  const topics = computeTopics(nodes);
  for (const n of nodes) {
    const t = topics.get(n.id);
    if (t && t.topWord) {
      n._topicWord = t.topWord;
      n._topicHue = hashHue(t.topWord);
    } else {
      n._topicWord = null;
      n._topicHue = null;
    }
  }
  // Top-5 тем в корпусе
  const wordScores = new Map();
  for (const n of nodes) {
    if (!n._topicWord) continue;
    wordScores.set(n._topicWord, (wordScores.get(n._topicWord) || 0) + 1);
  }
  return [...wordScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

/** HSL → hex helper. */
export function hueToRgbaString(hue, saturation = 0.65, lightness = 0.6, alpha = 1) {
  const h = hue * 360;
  const s = saturation;
  const l = lightness;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}
