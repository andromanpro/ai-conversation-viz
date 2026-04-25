// Pure 3D scatter helpers — без Three.js dependency, тестируемо.

/**
 * Раскидывает ноды по сферической Fibonacci-spirale. Мутирует n.x/y/z
 * и сбрасывает n.vx/vy в 0. Это initial 3D-positioning перед физикой —
 * physics дальше двигает x/y/z в естественные позиции, но стартовать
 * нужно с unique-неперекрытых coords.
 *
 * Radius пропорционален sqrt(N) — даёт постоянную плотность independent
 * от размера графа.
 */
export function applySphericalScatter(nodes) {
  const N = nodes.length;
  if (!N) return;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const radius = Math.max(120, Math.sqrt(N) * 30);
  for (let i = 0; i < N; i++) {
    const n = nodes[i];
    const idx = i + 0.5;
    const y = 1 - (idx / N) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i + (n._seedDx || 0) * 0.5;
    n.x = Math.cos(theta) * r * radius;
    n.y = y * radius;
    n.z = Math.sin(theta) * r * radius;
    n.vx = 0;
    n.vy = 0;
  }
}
