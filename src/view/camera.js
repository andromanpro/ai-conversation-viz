export function worldToScreen(wx, wy, cam) {
  return { x: (wx - cam.x) * cam.scale, y: (wy - cam.y) * cam.scale };
}

export function screenToWorld(sx, sy, cam) {
  return { x: sx / cam.scale + cam.x, y: sy / cam.scale + cam.y };
}

export function applyZoom(cam, factor, anchorSx, anchorSy, min, max) {
  const before = screenToWorld(anchorSx, anchorSy, cam);
  cam.scale *= factor;
  if (cam.scale < min) cam.scale = min;
  if (cam.scale > max) cam.scale = max;
  const after = screenToWorld(anchorSx, anchorSy, cam);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
}
