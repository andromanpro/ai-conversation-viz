// 3D-варианты layout-функций. Аналог core/layout.js (computeRadialLayout,
// computeSwimLanes), но в 3D-пространстве (X, Y, Z).
//
// API:
//   compute3DRadialLayout(nodes, byId)
//     Концентрические сферические оболочки вокруг root. Ноды глубины d
//     помещаются на оболочке радиуса d × ringR. На каждой — Fibonacci
//     spiral (золотое сечение) для равномерного покрытия сферы.
//     Родительский ракурс наследуется: дочерние ноды попадают в cone
//     вокруг направления parent от центра (получается естественное
//     ветвление вместо «звёздного хаоса»).
//
//   compute3DSwimLanes(nodes)
//     Длинная река вдоль X. Y разносит роли (3 lane). Z даёт
//     дополнительную глубину (thinking за ассистентом, tool_use слегка
//     ниже). X считается по рангу (порядку ts), не сырому ts — равномерно
//     распределяется на любом intervalе.
//
// Возвращают Map<nodeId, {x, y, z}> с целевыми координатами. Вызывающая
// сторона интерполирует между текущими и target в кадрах transition'а.

const RING_R_3D = 220;       // расстояние между уровнями в 3D radial
const SWIM_X_PER_NODE = 70;  // X-шаг между нодами в swim
const SWIM_LANE = 320;       // расстояние между role-lane'ами по Y
const SWIM_THINKING_Z = 180; // подъём thinking-нод по Z (parallax-эффект)
const SWIM_TOOL_Z = -120;    // tool_use чуть глубже

// ---------- 3D Radial ----------

function buildParentChildIndex(nodes, byId) {
  const children = new Map();
  const roots = [];
  for (const n of nodes) children.set(n.id, []);
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) children.get(n.parentId).push(n.id);
    else roots.push(n.id);
  }
  const byTs = (a, b) => (byId.get(a)?.ts || 0) - (byId.get(b)?.ts || 0);
  for (const arr of children.values()) arr.sort(byTs);
  roots.sort(byTs);
  return { children, roots };
}

// Размещение точек на сферическом сегменте через Fibonacci spiral.
// При полном sphere (когда coneAxis=null): покрытие всей сферы.
// При наличии coneAxis: ограничиваем точки в cone вокруг axis с углом
// halfAngle. Используется при размещении детей вокруг направления parent.
//
// Special case для count ∈ {1, 2, 3}: при простой Fibonacci с малым count
// точки выходят строго вдоль cone-axis (count=1 — на середине, count=2 —
// на yMin/yMax, count=3 — на yMin/mid/yMax). Для линейного графа (basic
// sample) каждый узел имеет 1-2 детей → все ноды цепляются по одной оси →
// плоская линия. Решение: для count ≤ 3 фиксируем y на «экваторе» cone'а
// (cos(halfAngle/2)) и распределяем точки по азимуту вокруг axis. Это
// гарантирует разворот по 3D даже на цепочечных графах.
export function fibonacciOnSphere(count, radius, coneAxis, halfAngle) {
  const points = [];
  if (count === 0) return points;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  // Для cone'а ограничиваем y-диапазон. Cone угла halfAngle вокруг +Z имеет
  // y ∈ [cos(halfAngle), 1]. Мы потом повернём к coneAxis.
  const yMin = coneAxis ? Math.cos(halfAngle) : -1;
  const yMax = 1;

  // Готовим pre-computed (x, y, z) точки в локальной системе (y-вверх).
  // Затем (если coneAxis) повернём в систему coneAxis.
  const localPoints = [];
  if (coneAxis && count <= 3) {
    // Special case — азимутальное распределение на «экваторе» cone'а
    const yEq = Math.cos(halfAngle * 0.5); // cos(halfAngle/2) — середина высоты cone
    const rEq = Math.sqrt(Math.max(0, 1 - yEq * yEq));
    const azimuths = count === 1 ? [0]
                   : count === 2 ? [0, Math.PI]
                   : [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
    for (const az of azimuths) {
      localPoints.push({ x: Math.cos(az) * rEq, y: yEq, z: Math.sin(az) * rEq });
    }
  } else {
    // Стандартный Fibonacci spiral
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const y = yMin + t * (yMax - yMin);
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      localPoints.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }
  }

  for (let i = 0; i < count; i++) {
    let x = localPoints[i].x;
    let yy = localPoints[i].y;
    let z = localPoints[i].z;
    // Если есть coneAxis — поворачиваем (0,1,0) → coneAxis
    if (coneAxis) {
      // Композиция: rotate from (0, 0, 1) to coneAxis. Нам нужно (0, 1, 0)
      // выровнять с coneAxis. Это простое поворот через два orthogonal vectors.
      const axis = coneAxis; // {x,y,z}, нормализованный
      // Если axis ≈ (0, 0, 1), не нужно поворачивать (но генерили вокруг y).
      // Разница: на нашей сфере «наверх» (cone center) — это +y. Заменим
      // на: cone center направлен на axis.
      // Build basis: tangent1 ⊥ axis. Если axis ≠ y → up
      const upX = 0, upY = 1, upZ = 0;
      // tangent1 = up × axis (если параллельны, возьмём другой fallback)
      let tx = upY * axis.z - upZ * axis.y;
      let ty = upZ * axis.x - upX * axis.z;
      let tz = upX * axis.y - upY * axis.x;
      let tlen = Math.hypot(tx, ty, tz);
      if (tlen < 1e-6) {
        // axis параллелен y — берём (1,0,0) как tangent1
        tx = 1; ty = 0; tz = 0; tlen = 1;
      }
      tx /= tlen; ty /= tlen; tz /= tlen;
      // tangent2 = axis × tangent1
      const t2x = axis.y * tz - axis.z * ty;
      const t2y = axis.z * tx - axis.x * tz;
      const t2z = axis.x * ty - axis.y * tx;
      // Берём наши координаты (x, yy, z) где «наверх» = +y → axis,
      // tangent1 → (1,0,0), tangent2 → (0,0,1)
      const px = tx * x + axis.x * yy + t2x * z;
      const py = ty * x + axis.y * yy + t2y * z;
      const pz = tz * x + axis.z * yy + t2z * z;
      x = px; yy = py; z = pz;
    }
    points.push({ x: x * radius, y: yy * radius, z: z * radius });
  }
  return points;
}

function placeChildren3D(parentId, parentPos, parentAxis, depth, ctx) {
  const { children, byId, positions, ringR } = ctx;
  const kids = children.get(parentId) || [];
  if (!kids.length) return;
  // Радиус следующей оболочки. Дети parent'а лежат на dirsphere сдвинутой
  // от parent в сторону parentAxis (вокруг направления «наружу» от центра).
  const r = ringR;
  // halfAngle 120° — почти полусфера. Узкий 60° cone давал линию для
  // count ≤ 3 (a в большинстве деревьев именно такие fan-outs). 120° +
  // small-count special case в fibonacciOnSphere дают объёмное
  // распределение даже для линейных графов.
  const halfAngle = (2 * Math.PI) / 3;
  const points = fibonacciOnSphere(kids.length, r, parentAxis, halfAngle);
  for (let i = 0; i < kids.length; i++) {
    const id = kids[i];
    const p = points[i];
    // child position = parent position + p (offset)
    const cx = parentPos.x + p.x;
    const cy = parentPos.y + p.y;
    const cz = parentPos.z + p.z;
    positions.set(id, { x: cx, y: cy, z: cz });
    const n = byId.get(id);
    if (n) { n._radial3X = cx; n._radial3Y = cy; n._radial3Z = cz; }
    // Axis для child = direction от parent → child (нормализованный)
    const ax = p.x / r, ay = p.y / r, az = p.z / r;
    placeChildren3D(id, { x: cx, y: cy, z: cz }, { x: ax, y: ay, z: az }, depth + 1, ctx);
  }
}

export function compute3DRadialLayout(nodes, byId) {
  const positions = new Map();
  if (!nodes.length) return positions;
  const { children, roots } = buildParentChildIndex(nodes, byId);
  const ctx = { children, byId, positions, ringR: RING_R_3D };

  if (roots.length === 1) {
    const r = roots[0];
    positions.set(r, { x: 0, y: 0, z: 0 });
    const root = byId.get(r);
    if (root) { root._radial3X = 0; root._radial3Y = 0; root._radial3Z = 0; }
    // Дети root распределены на полной сфере — coneAxis=null, halfAngle=π
    const kids = children.get(r) || [];
    const fullPoints = fibonacciOnSphere(kids.length, RING_R_3D, null, Math.PI);
    for (let i = 0; i < kids.length; i++) {
      const id = kids[i];
      const p = fullPoints[i];
      positions.set(id, { x: p.x, y: p.y, z: p.z });
      const n = byId.get(id);
      if (n) { n._radial3X = p.x; n._radial3Y = p.y; n._radial3Z = p.z; }
      const len = Math.hypot(p.x, p.y, p.z) || 1;
      placeChildren3D(id, p, { x: p.x / len, y: p.y / len, z: p.z / len }, 2, ctx);
    }
  } else {
    // Несколько roots — разносим их по сфере как «дети virtual root»
    const rootPoints = fibonacciOnSphere(roots.length, RING_R_3D, null, Math.PI);
    for (let i = 0; i < roots.length; i++) {
      const id = roots[i];
      const p = rootPoints[i];
      positions.set(id, { x: p.x, y: p.y, z: p.z });
      const n = byId.get(id);
      if (n) { n._radial3X = p.x; n._radial3Y = p.y; n._radial3Z = p.z; }
      const len = Math.hypot(p.x, p.y, p.z) || 1;
      placeChildren3D(id, p, { x: p.x / len, y: p.y / len, z: p.z / len }, 2, ctx);
    }
  }
  return positions;
}

// ---------- 3D Swim lanes ----------

const LANE_Y = {
  user: SWIM_LANE,        // верхний lane
  assistant: 0,            // средний
  tool_use: -SWIM_LANE,    // нижний
  thinking: 0,             // на одном уровне с assistant, но отнесён по z
};

const LANE_Z = {
  user: 0,
  assistant: 0,
  tool_use: SWIM_TOOL_Z,
  thinking: SWIM_THINKING_Z,
};

export function compute3DSwimLanes(nodes) {
  const positions = new Map();
  if (!nodes.length) return positions;
  // Сортируем по ts — рангуем. Это аналог 2D-варианта.
  const sorted = [...nodes].sort((a, b) => a.ts - b.ts);
  const rankById = new Map();
  sorted.forEach((n, i) => rankById.set(n.id, i));
  const lastRank = Math.max(1, sorted.length - 1);
  // Длина «реки» по X
  const totalLen = lastRank * SWIM_X_PER_NODE;
  const xLeft = -totalLen / 2;
  for (const n of nodes) {
    const rank = rankById.get(n.id) || 0;
    const t = rank / lastRank;
    const x = xLeft + t * totalLen;
    const baseY = LANE_Y[n.role] != null ? LANE_Y[n.role] : 0;
    const baseZ = LANE_Z[n.role] != null ? LANE_Z[n.role] : 0;
    // jitter внутри lane'а — чтобы ноды с близким рангом не накладывались
    const jY = ((n._seedDy || 0) - 0.5) * SWIM_LANE * 0.35;
    const jZ = ((n._seedDx || 0) - 0.5) * 60;
    const y = baseY + jY;
    const z = baseZ + jZ;
    positions.set(n.id, { x, y, z });
    if (n) { n._swim3X = x; n._swim3Y = y; n._swim3Z = z; }
  }
  return positions;
}
