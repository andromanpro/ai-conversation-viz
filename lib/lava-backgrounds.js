/**
 * Lava Orb Backgrounds — drop-in WebGL2 background library
 *
 * Usage:
 *   LavaBackgrounds.init(canvasElement, { mode: 'embers', dark: true });
 *   LavaBackgrounds.setMode('aurora' | 'embers' | 'grid' | 'none');
 *   LavaBackgrounds.setTheme('dark' | 'light');
 *   LavaBackgrounds.destroy();
 *
 * Modes: 'embers' (warm lava-lamp), 'aurora' (polar lights), 'grid' (synthwave),
 *        'rain' (fog-blue rainfall), 'ocean' (deep blue with caustics + bubbles),
 *        'space' (stars + nebula), 'abstract' (hue-rotating blobs).
 * Требует WebGL2. Без fallback — для старых браузеров используй CSS gradient.
 *
 * Zero dependencies. ES5 compatible.
 */
(function(global) {
  'use strict';

  var BG_VS = '#version 300 es\n\
in vec2 aPos;\n\
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }\n';

  var BG_FS_EMBERS = '#version 300 es\n\
precision highp float;\n\
uniform float uTime;\n\
uniform vec2 uResolution;\n\
uniform float uDark;\n\
out vec4 fragColor;\n\
\n\
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n\
\n\
float vnoise(vec2 p) {\n\
  vec2 i = floor(p), f = fract(p);\n\
  f = f * f * (3.0 - 2.0 * f);\n\
  float a = hash(i), b = hash(i + vec2(1,0));\n\
  float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));\n\
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);\n\
}\n\
\n\
float fbm(vec2 p) {\n\
  float v = 0.0, a = 0.5;\n\
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.0; a *= 0.5; }\n\
  return v;\n\
}\n\
\n\
void main() {\n\
  vec2 uv = gl_FragCoord.xy / uResolution;\n\
  float t = uTime * 0.08;\n\
  float aspect = uResolution.x / uResolution.y;\n\
  vec2 p = vec2(uv.x * aspect, uv.y);\n\
\n\
  vec3 baseDark = mix(vec3(0.08, 0.02, 0.05), vec3(0.02, 0.005, 0.01), uv.y * 0.8);\n\
  vec3 baseLight = mix(vec3(1.00, 0.95, 0.88), vec3(0.97, 0.88, 0.80), uv.y * 0.7);\n\
  vec3 bg = mix(baseLight, baseDark, uDark);\n\
\n\
  float flow1 = fbm(p * 2.5 + vec2(t * 0.6, -t * 0.3));\n\
  float flow2 = fbm(p * 4.0 + vec2(-t * 0.4, t * 0.5) + 10.0);\n\
  float flow = flow1 * 0.65 + flow2 * 0.35;\n\
  flow = smoothstep(0.35, 0.85, flow);\n\
\n\
  vec3 warmCoreDark = vec3(0.95, 0.35, 0.10);\n\
  vec3 warmEdgeDark = vec3(0.55, 0.12, 0.30);\n\
  vec3 warmCoreLight = vec3(1.00, 0.70, 0.45);\n\
  vec3 warmEdgeLight = vec3(0.95, 0.80, 0.85);\n\
\n\
  vec3 warmCore = mix(warmCoreLight, warmCoreDark, uDark);\n\
  vec3 warmEdge = mix(warmEdgeLight, warmEdgeDark, uDark);\n\
  vec3 flowColor = mix(warmEdge, warmCore, flow);\n\
\n\
  float vFade = 1.0 - smoothstep(0.0, 0.9, uv.y);\n\
  vFade = vFade * vFade * 0.6 + 0.15;\n\
\n\
  float strength = mix(0.35, 0.60, uDark) * vFade;\n\
  bg = mix(bg, flowColor, flow * strength);\n\
\n\
  for (int i = 0; i < 3; i++) {\n\
    float fi = float(i);\n\
    float phase = fi * 2.1 + t * 0.3;\n\
    vec2 center = vec2(\n\
      aspect * 0.5 + sin(phase * 0.7 + fi) * aspect * 0.35,\n\
      0.4 + cos(phase * 0.5 + fi * 1.3) * 0.25\n\
    );\n\
    float d = length(p - center);\n\
    float radius = 0.18 + fract(fi * 1.7) * 0.12;\n\
    float blob = smoothstep(radius, radius * 0.3, d);\n\
    vec3 blobCol = mix(vec3(1.0, 0.55, 0.25), vec3(1.0, 0.3, 0.1), fract(fi * 2.3));\n\
    blobCol = mix(vec3(1.0, 0.75, 0.55), blobCol, uDark);\n\
    bg += blobCol * blob * mix(0.12, 0.25, uDark) * vFade;\n\
  }\n\
\n\
  float bottomGlow = smoothstep(0.0, 0.35, 1.0 - uv.y);\n\
  bg += vec3(0.8, 0.25, 0.05) * bottomGlow * bottomGlow * 0.15 * mix(0.3, 1.0, uDark);\n\
\n\
  float vig = smoothstep(1.3, 0.3, length(uv - vec2(0.5, 0.55)) * 1.5);\n\
  bg *= mix(0.75, 1.0, vig);\n\
\n\
  fragColor = vec4(clamp(bg, 0.0, 1.0), 1.0);\n\
}\n';

  var BG_FS_AURORA = '#version 300 es\n\
precision highp float;\n\
uniform float uTime;\n\
uniform vec2 uResolution;\n\
uniform float uDark;\n\
out vec4 fragColor;\n\
\n\
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n\
\n\
float vnoise(vec2 p) {\n\
  vec2 i = floor(p), f = fract(p);\n\
  f = f * f * (3.0 - 2.0 * f);\n\
  float a = hash(i), b = hash(i + vec2(1,0));\n\
  float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));\n\
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);\n\
}\n\
\n\
float fbm(vec2 p) {\n\
  float v = 0.0, a = 0.5;\n\
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.0; a *= 0.5; }\n\
  return v;\n\
}\n\
\n\
void main() {\n\
  vec2 uv = gl_FragCoord.xy / uResolution;\n\
  float t = uTime * 0.15;\n\
\n\
  vec3 skyDark = mix(vec3(0.10, 0.04, 0.20), vec3(0.01, 0.01, 0.05), uv.y * uv.y);\n\
  vec3 skyLight = mix(vec3(0.78, 0.85, 0.95), vec3(0.92, 0.95, 1.00), uv.y * uv.y);\n\
  vec3 bg = mix(skyLight, skyDark, uDark);\n\
\n\
  if (uv.y > 0.35) {\n\
    vec2 sg = floor(gl_FragCoord.xy / 3.0);\n\
    float sv = hash(sg);\n\
    float star = step(0.992, sv);\n\
    float twinkle = sin(t * 6.0 + sv * 30.0) * 0.5 + 0.5;\n\
    bg += vec3(0.85, 0.9, 1.0) * star * (0.4 + 0.6 * twinkle) * uDark * smoothstep(0.35, 0.8, uv.y);\n\
  }\n\
\n\
  float auroraMask = smoothstep(0.15, 0.45, uv.y) * smoothstep(0.95, 0.55, uv.y);\n\
  if (auroraMask > 0.01) {\n\
    float wave1 = fbm(vec2(uv.x * 2.5 + t * 0.4, uv.y * 5.0));\n\
    float wave2 = fbm(vec2(uv.x * 3.5 - t * 0.3, uv.y * 4.0 + 5.0));\n\
    float waveMix = wave1 * 0.6 + wave2 * 0.4;\n\
\n\
    float band1Y = 0.55 + waveMix * 0.15;\n\
    float band1 = smoothstep(0.08, 0.0, abs(uv.y - band1Y));\n\
    vec3 col1 = mix(vec3(0.3, 0.9, 0.6), vec3(0.1, 0.8, 0.7), wave1);\n\
\n\
    float band2Y = 0.40 + wave2 * 0.12;\n\
    float band2 = smoothstep(0.1, 0.0, abs(uv.y - band2Y));\n\
    vec3 col2 = mix(vec3(0.6, 0.3, 0.9), vec3(0.9, 0.3, 0.7), wave2);\n\
\n\
    float rays = fbm(vec2(uv.x * 20.0, t * 0.3)) * 0.5 + 0.5;\n\
    rays = smoothstep(0.4, 0.8, rays);\n\
\n\
    float intensity = mix(0.35, 0.75, uDark) * auroraMask;\n\
    bg += col1 * band1 * rays * intensity;\n\
    bg += col2 * band2 * rays * intensity * 0.8;\n\
\n\
    float glowY1 = smoothstep(0.25, 0.0, abs(uv.y - band1Y));\n\
    float glowY2 = smoothstep(0.28, 0.0, abs(uv.y - band2Y));\n\
    bg += col1 * glowY1 * 0.12 * intensity;\n\
    bg += col2 * glowY2 * 0.10 * intensity;\n\
  }\n\
\n\
  fragColor = vec4(clamp(bg, 0.0, 1.0), 1.0);\n\
}\n';

  var BG_FS_GRID = '#version 300 es\n\
precision highp float;\n\
uniform float uTime;\n\
uniform vec2 uResolution;\n\
uniform float uDark;\n\
out vec4 fragColor;\n\
\n\
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n\
\n\
void main() {\n\
  vec2 uv = gl_FragCoord.xy / uResolution;\n\
  float t = uTime * 0.6;\n\
  float aspect = uResolution.x / uResolution.y;\n\
\n\
  float horizon = 0.55;\n\
  vec3 bg;\n\
\n\
  if (uv.y > horizon) {\n\
    float skyT = (uv.y - horizon) / (1.0 - horizon);\n\
    vec3 skyTopD = vec3(0.03, 0.01, 0.15);\n\
    vec3 skyHorD = vec3(0.55, 0.10, 0.45);\n\
    vec3 skyTopL = vec3(0.92, 0.88, 0.98);\n\
    vec3 skyHorL = vec3(0.98, 0.80, 0.85);\n\
    vec3 skyTop = mix(skyTopL, skyTopD, uDark);\n\
    vec3 skyHor = mix(skyHorL, skyHorD, uDark);\n\
    bg = mix(skyHor, skyTop, skyT * skyT);\n\
\n\
    vec2 sunCenter = vec2(aspect * 0.5, horizon + 0.18);\n\
    vec2 p = vec2(uv.x * aspect, uv.y);\n\
    float sunDist = length((p - sunCenter) * vec2(1.0, 1.3));\n\
    float sun = smoothstep(0.22, 0.16, sunDist);\n\
    float stripePhase = (sunCenter.y - uv.y) * 45.0;\n\
    float stripes = step(0.5, fract(stripePhase));\n\
    float stripeMask = smoothstep(sunCenter.y, sunCenter.y - 0.18, uv.y);\n\
    sun *= mix(1.0, stripes, stripeMask * 0.8);\n\
    vec3 sunCol = mix(vec3(1.0, 0.85, 0.35), vec3(1.0, 0.35, 0.55), smoothstep(0.05, 0.22, sunDist));\n\
    bg += sunCol * sun * mix(0.7, 1.0, uDark);\n\
\n\
    vec2 sg = floor(gl_FragCoord.xy / 3.5);\n\
    float sv = hash(sg);\n\
    float star = step(0.993, sv);\n\
    float twinkle = sin(t * 4.0 + sv * 40.0) * 0.5 + 0.5;\n\
    bg += vec3(1.0, 0.95, 1.0) * star * (0.4 + 0.6 * twinkle) * uDark * skyT;\n\
\n\
  } else {\n\
    vec3 groundD = mix(vec3(0.15, 0.02, 0.30), vec3(0.03, 0.01, 0.08), (horizon - uv.y) / horizon);\n\
    vec3 groundL = mix(vec3(0.98, 0.85, 0.92), vec3(0.88, 0.75, 0.85), (horizon - uv.y) / horizon);\n\
    bg = mix(groundL, groundD, uDark);\n\
\n\
    float zDist = (horizon - uv.y);\n\
    float z = 1.0 / (zDist + 0.02);\n\
\n\
    float hLine = fract(z * 0.5 - t * 0.8);\n\
    float hBrightness = smoothstep(0.92, 1.0, hLine) + smoothstep(0.08, 0.0, hLine);\n\
    hBrightness = max(0.0, hBrightness);\n\
\n\
    float centerX = 0.5;\n\
    float vCoord = (uv.x - centerX) * z;\n\
    float vLine = fract(vCoord * 2.2 + 0.5);\n\
    float vBrightness = smoothstep(0.96, 1.0, vLine) + smoothstep(0.04, 0.0, vLine);\n\
    vBrightness = max(0.0, vBrightness);\n\
\n\
    float gridBrightness = max(hBrightness, vBrightness);\n\
\n\
    float depthFade = smoothstep(0.0, horizon * 0.9, horizon - uv.y);\n\
    gridBrightness *= depthFade;\n\
\n\
    vec3 gridCol = mix(vec3(0.85, 0.45, 0.70), vec3(1.0, 0.30, 0.85), uDark);\n\
    bg += gridCol * gridBrightness * mix(0.5, 0.9, uDark);\n\
\n\
    float reflection = smoothstep(0.15, 0.0, abs(uv.x - 0.5)) * smoothstep(0.0, 0.4, horizon - uv.y);\n\
    reflection *= (sin(uv.y * 60.0 + t * 2.0) * 0.5 + 0.5);\n\
    bg += vec3(1.0, 0.55, 0.45) * reflection * 0.15 * mix(0.4, 1.0, uDark);\n\
  }\n\
\n\
  float horizonGlow = smoothstep(0.015, 0.0, abs(uv.y - horizon));\n\
  bg += vec3(1.0, 0.6, 0.7) * horizonGlow * mix(0.5, 0.9, uDark);\n\
\n\
  fragColor = vec4(clamp(bg, 0.0, 1.0), 1.0);\n\
}\n';

  var BG_FS_RAIN = '#version 300 es\n\
precision highp float;\n\
uniform float uTime;\n\
uniform vec2 uResolution;\n\
uniform float uDark;\n\
out vec4 fragColor;\n\
\n\
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n\
\n\
void main() {\n\
  vec2 uv = gl_FragCoord.xy / uResolution;\n\
  float t = uTime;\n\
  float aspect = uResolution.x / uResolution.y;\n\
\n\
  // Fog-blue gradient — влажная атмосфера\n\
  vec3 bgDark = mix(vec3(0.05, 0.09, 0.14), vec3(0.02, 0.04, 0.08), uv.y * 0.7);\n\
  vec3 bgLight = mix(vec3(0.72, 0.80, 0.88), vec3(0.82, 0.88, 0.94), uv.y * 0.7);\n\
  vec3 bg = mix(bgLight, bgDark, uDark);\n\
\n\
  // Цвет дождя — холодный стальной\n\
  vec3 rainColor = mix(vec3(0.55, 0.68, 0.82), vec3(0.70, 0.82, 0.95), uDark);\n\
\n\
  // Три слоя дождя для parallax\n\
  for (int layer = 0; layer < 3; layer++) {\n\
    float fl = float(layer);\n\
    float speed = 2.5 + fl * 1.5;\n\
    float scale = 35.0 + fl * 25.0;\n\
    float tilt = 0.08;\n\
\n\
    vec2 rp = vec2(\n\
      uv.x * aspect * scale + uv.y * tilt * scale + fl * 3.7,\n\
      uv.y * scale * 1.5 + t * speed + fl * 5.0\n\
    );\n\
    vec2 cell = floor(rp);\n\
    vec2 fracP = fract(rp);\n\
    float seed = hash(cell);\n\
\n\
    if (seed > 0.72) {\n\
      float dropX = 0.3 + fract(seed * 13.7) * 0.4;\n\
      float dx = abs(fracP.x - dropX);\n\
      float streakWidth = 0.04 + fl * 0.01;\n\
      float streak = smoothstep(streakWidth, 0.0, dx);\n\
      float streakLen = 0.5 + fract(seed * 31.0) * 0.4;\n\
      float lenMask = smoothstep(1.0, 1.0 - streakLen, fracP.y);\n\
      streak *= lenMask;\n\
      float head = smoothstep(0.05, 0.0, length(vec2(dx * 2.0, fracP.y - 0.95)));\n\
      float brightness = (streak * 0.5 + head * 0.8) * (1.0 - fl * 0.25);\n\
      bg += rainColor * brightness * mix(0.5, 0.8, uDark);\n\
    }\n\
  }\n\
\n\
  // Брызги внизу\n\
  if (uv.y < 0.12) {\n\
    vec2 sp = vec2(uv.x * aspect * 25.0, uv.y * 30.0);\n\
    vec2 scell = floor(sp);\n\
    float sseed = hash(scell + 19.0);\n\
    if (sseed > 0.85) {\n\
      float splashPhase = fract(t * 1.2 + sseed * 10.0);\n\
      if (splashPhase < 0.5) {\n\
        vec2 sfrac = fract(sp) - 0.5;\n\
        float sd = length(sfrac * vec2(1.0, 2.0));\n\
        float radius = splashPhase * 0.6;\n\
        float ring = smoothstep(radius + 0.08, radius, sd) - smoothstep(radius, radius - 0.04, sd);\n\
        ring *= (1.0 - splashPhase / 0.5);\n\
        float yFade = smoothstep(0.12, 0.0, uv.y);\n\
        bg += rainColor * max(0.0, ring) * 0.6 * yFade;\n\
      }\n\
    }\n\
  }\n\
\n\
  // Мягкий туман\n\
  vec3 fogCol = mix(vec3(0.7, 0.78, 0.85), vec3(0.1, 0.15, 0.22), uDark);\n\
  bg = mix(bg, fogCol, 0.08);\n\
\n\
  float vig = smoothstep(1.3, 0.4, length(uv - 0.5) * 1.4);\n\
  bg *= mix(0.82, 1.0, vig);\n\
\n\
  fragColor = vec4(clamp(bg, 0.0, 1.0), 1.0);\n\
}\n';

  var BG_FS_OCEAN = '#version 300 es\n\
precision highp float;\n\
uniform float uTime;\n\
uniform vec2 uResolution;\n\
uniform float uDark;\n\
out vec4 fragColor;\n\
\n\
void main() {\n\
  vec2 uv = gl_FragCoord.xy / uResolution;\n\
  float aspect = uResolution.x / uResolution.y;\n\
\n\
  // Deep blue-to-teal gradient (dark) / light aqua (light)\n\
  vec3 topDark = vec3(0.04, 0.086, 0.157);\n\
  vec3 midDark = vec3(0.047, 0.165, 0.29);\n\
  vec3 botDark = vec3(0.04, 0.29, 0.35);\n\
  vec3 topLight = vec3(0.82, 0.91, 0.95);\n\
  vec3 midLight = vec3(0.66, 0.84, 0.92);\n\
  vec3 botLight = vec3(0.54, 0.78, 0.85);\n\
  vec3 top = mix(topLight, topDark, uDark);\n\
  vec3 mid = mix(midLight, midDark, uDark);\n\
  vec3 bot = mix(botLight, botDark, uDark);\n\
  vec3 col = mix(top, mid, smoothstep(0.0, 0.5, uv.y));\n\
  col = mix(col, bot, smoothstep(0.4, 1.0, uv.y));\n\
\n\
  // Caustic patterns — pixel-space frequency, resolution-independent\n\
  vec2 cp = gl_FragCoord.xy / 80.0;\n\
  float caustic = 0.0;\n\
  for (int i = 0; i < 6; i++) {\n\
    float fi = float(i);\n\
    float freq = 2.0 + fi * 1.5;\n\
    float ph = fi * 1.3;\n\
    caustic += sin(cp.x * freq + uTime * 0.5 + ph) * sin(cp.y * freq * 0.7 + uTime * 0.3 + ph * 2.0);\n\
  }\n\
  caustic = caustic / 6.0 * 0.5 + 0.5;\n\
  col += vec3(0.1, 0.2, 0.25) * caustic * mix(0.15, 0.08, uDark);\n\
\n\
  // Light rays from top\n\
  for (int r = 0; r < 4; r++) {\n\
    float fr = float(r);\n\
    float rayX = 0.2 + fr * 0.2 + sin(uTime * 0.3 + fr * 2.1) * 0.06;\n\
    float spread = 0.03 + uv.y * 0.15;\n\
    float ray = exp(-pow((uv.x - rayX) / spread, 2.0) * 2.0);\n\
    ray *= (1.0 - uv.y) * 0.08;\n\
    col += vec3(0.6, 0.86, 1.0) * ray;\n\
  }\n\
\n\
  // Bubbles (procedural, aspect-corrected)\n\
  for (int b = 0; b < 25; b++) {\n\
    float fb = float(b);\n\
    float bx = fract(sin(fb * 43.758) * 0.5 + 0.5 + sin(uTime * 0.5 + fb * 2.3) * 0.015);\n\
    float by = 1.0 - fract(fract(sin(fb * 17.34) * 0.5 + 0.5) + uTime * (0.01 + fract(sin(fb * 7.89)) * 0.015));\n\
    float bs = (1.0 + fract(sin(fb * 91.12)) * 3.0) / uResolution.y * 2.0;\n\
    float bd = length((uv - vec2(bx, by)) * vec2(aspect, 1.0));\n\
    float bubble = smoothstep(bs, bs * 0.3, bd) * 0.2;\n\
    col += vec3(0.6, 0.86, 1.0) * bubble;\n\
  }\n\
\n\
  fragColor = vec4(col, 1.0);\n\
}\n';

  var BG_FS_SPACE = '#version 300 es\n\
precision highp float;\n\
uniform float uTime;\n\
uniform vec2 uResolution;\n\
uniform float uDark;\n\
out vec4 fragColor;\n\
\n\
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n\
\n\
void main() {\n\
  vec2 uv = gl_FragCoord.xy / uResolution;\n\
  float aspect = uResolution.x / uResolution.y;\n\
\n\
  // Dark vignette gradient (space is always-ish dark, but lighten slightly when uDark=0)\n\
  float d = length((uv - 0.5) * vec2(aspect, 1.0));\n\
  vec3 bgDark = mix(vec3(0.04, 0.04, 0.1), vec3(0.01, 0.01, 0.03), smoothstep(0.0, 0.7, d));\n\
  vec3 bgLight = mix(vec3(0.18, 0.18, 0.30), vec3(0.08, 0.08, 0.16), smoothstep(0.0, 0.7, d));\n\
  vec3 col = mix(bgLight, bgDark, uDark);\n\
\n\
  // Stars (150) — deterministic via hash, no CPU array needed\n\
  for (int i = 0; i < 150; i++) {\n\
    float fi = float(i);\n\
    vec2 sp = vec2(hash(vec2(fi, 1.3)), hash(vec2(fi, 7.7)));\n\
    float sd = hash(vec2(fi, 13.17)) * 4.0 + hash(vec2(fi, 91.3));\n\
    float phase = fract(sd) * 6.283;\n\
    float speed = 0.5 + fract(sd * 7.13) * 2.0;\n\
    float sz = (0.5 + fract(sd * 3.17) * 2.0) / uResolution.y * 2.0;\n\
    float twinkle = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * speed + phase));\n\
    float dist = length((uv - sp) * vec2(aspect, 1.0));\n\
    float star = smoothstep(sz, 0.0, dist) * twinkle;\n\
    col += vec3(1.0) * star;\n\
  }\n\
\n\
  // Nebula clouds — aspect-corrected\n\
  vec3 nebColors[3];\n\
  nebColors[0] = vec3(0.31, 0.16, 0.47);\n\
  nebColors[1] = vec3(0.16, 0.24, 0.55);\n\
  nebColors[2] = vec3(0.39, 0.12, 0.31);\n\
  for (int n = 0; n < 3; n++) {\n\
    float fn = float(n);\n\
    vec2 nc = vec2(0.3 + fn * 0.25, 0.3 + fn * 0.2);\n\
    nc.x += sin(uTime * 0.1 + fn * 2.5) * 0.08;\n\
    nc.y += cos(uTime * 0.08 + fn * 1.7) * 0.06;\n\
    float nr = 0.15 + 0.05 * sin(uTime * 0.15 + fn);\n\
    float nd = length((uv - nc) * vec2(aspect, 1.0)) / nr;\n\
    float nebula = exp(-nd * nd * 2.0);\n\
    float alpha = 0.08 + 0.03 * sin(uTime * 0.2 + fn * 3.0);\n\
    col += nebColors[n] * nebula * alpha;\n\
  }\n\
\n\
  fragColor = vec4(col, 1.0);\n\
}\n';

  var BG_FS_ABSTRACT = '#version 300 es\n\
precision highp float;\n\
uniform float uTime;\n\
uniform vec2 uResolution;\n\
uniform float uDark;\n\
out vec4 fragColor;\n\
\n\
vec3 hsl2rgb(float h, float s, float l) {\n\
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;\n\
  float x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0));\n\
  float m = l - c * 0.5;\n\
  vec3 rgb;\n\
  if (h < 60.0) rgb = vec3(c,x,0);\n\
  else if (h < 120.0) rgb = vec3(x,c,0);\n\
  else if (h < 180.0) rgb = vec3(0,c,x);\n\
  else if (h < 240.0) rgb = vec3(0,x,c);\n\
  else if (h < 300.0) rgb = vec3(x,0,c);\n\
  else rgb = vec3(c,0,x);\n\
  return rgb + m;\n\
}\n\
\n\
void main() {\n\
  vec2 uv = gl_FragCoord.xy / uResolution;\n\
  float aspect = uResolution.x / uResolution.y;\n\
\n\
  // Background: near-black for dark, very-light-gray for light theme\n\
  vec3 col = mix(vec3(0.94, 0.94, 0.96), vec3(0.04, 0.04, 0.05), uDark);\n\
\n\
  // 4 animated hue-rotating blobs — aspect-corrected\n\
  float blobCx[4]; float blobCy[4]; float blobR[4]; float blobHue[4];\n\
  float blobSx[4]; float blobSy[4];\n\
  blobCx[0]=0.3; blobCy[0]=0.4; blobR[0]=0.25; blobHue[0]=0.0;   blobSx[0]=0.7; blobSy[0]=0.5;\n\
  blobCx[1]=0.7; blobCy[1]=0.6; blobR[1]=0.30; blobHue[1]=90.0;  blobSx[1]=0.5; blobSy[1]=0.8;\n\
  blobCx[2]=0.5; blobCy[2]=0.3; blobR[2]=0.20; blobHue[2]=180.0; blobSx[2]=0.9; blobSy[2]=0.6;\n\
  blobCx[3]=0.6; blobCy[3]=0.7; blobR[3]=0.22; blobHue[3]=270.0; blobSx[3]=0.6; blobSy[3]=0.4;\n\
\n\
  // On light theme — boost alpha so pastel blobs read against the near-white background\n\
  float baseAlpha = mix(0.28, 0.12, uDark);\n\
  float alphaWobble = mix(0.06, 0.04, uDark);\n\
  float saturation = mix(0.55, 0.7, uDark);\n\
  float lightness = mix(0.65, 0.5, uDark);\n\
\n\
  for (int i = 0; i < 4; i++) {\n\
    float fi = float(i);\n\
    vec2 bc;\n\
    bc.x = blobCx[i] + sin(uTime * 0.15 * blobSx[i] + fi * 1.5) * 0.2;\n\
    bc.y = blobCy[i] + cos(uTime * 0.12 * blobSy[i] + fi * 2.1) * 0.2;\n\
    float br = blobR[i] * (0.8 + 0.2 * sin(uTime * 0.1 + fi));\n\
    float hue = mod(blobHue[i] + uTime * 8.0, 360.0);\n\
    float bd = length((uv - bc) * vec2(aspect, 1.0)) / br;\n\
    float blob = exp(-bd * bd * 1.5);\n\
    float alpha = baseAlpha + alphaWobble * sin(uTime * 0.3 + fi * 1.7);\n\
    vec3 blobCol = hsl2rgb(hue, saturation, lightness) * blob * alpha;\n\
    col += blobCol;\n\
  }\n\
\n\
  fragColor = vec4(col, 1.0);\n\
}\n';

  var SHADERS = {
    embers: BG_FS_EMBERS,
    aurora: BG_FS_AURORA,
    grid: BG_FS_GRID,
    rain: BG_FS_RAIN,
    ocean: BG_FS_OCEAN,
    space: BG_FS_SPACE,
    abstract: BG_FS_ABSTRACT
  };

  var state = {
    canvas: null, gl: null, programs: {}, quadBuf: null,
    mode: 'none', dark: true, animId: null, startTime: 0
  };

  function compileShader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[bg shader]', gl.getShaderInfoLog(s));
      gl.deleteShader(s); return null;
    }
    return s;
  }

  function compileProgram(gl, name, fsSrc) {
    var vs = compileShader(gl, gl.VERTEX_SHADER, BG_VS);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[bg link]', gl.getProgramInfoLog(prog)); return null;
    }
    return {
      program: prog,
      aPos: gl.getAttribLocation(prog, 'aPos'),
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uRes: gl.getUniformLocation(prog, 'uResolution'),
      uDark: gl.getUniformLocation(prog, 'uDark')
    };
  }

  function resize() {
    if (!state.canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var maxDim = 1920;
    var w = Math.min(window.innerWidth, maxDim);
    var h = Math.min(window.innerHeight, maxDim);
    state.canvas.width = w * dpr;
    state.canvas.height = h * dpr;
    if (state.gl) state.gl.viewport(0, 0, state.canvas.width, state.canvas.height);
  }

  function renderFrame(time) {
    var info = state.programs[state.mode];
    if (!info) return;
    var gl = state.gl;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(info.program);
    gl.uniform1f(info.uTime, time);
    gl.uniform2f(info.uRes, state.canvas.width, state.canvas.height);
    gl.uniform1f(info.uDark, state.dark ? 1.0 : 0.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuf);
    gl.enableVertexAttribArray(info.aPos);
    gl.vertexAttribPointer(info.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function loop(timestamp) {
    if (state.mode === 'none') { state.animId = null; return; }
    var elapsed = (timestamp - state.startTime) / 1000.0;
    renderFrame(elapsed);
    state.animId = requestAnimationFrame(loop);
  }

  function start() {
    if (!state.canvas) return;
    state.canvas.style.display = 'block';
    state.startTime = performance.now();
    resize();
    if (!state.animId) state.animId = requestAnimationFrame(loop);
  }

  function stop() {
    if (state.animId) { cancelAnimationFrame(state.animId); state.animId = null; }
    if (state.canvas) state.canvas.style.display = 'none';
  }

  var api = {
    init: function(canvas, opts) {
      opts = opts || {};
      state.canvas = canvas;
      state.gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false });
      if (!state.gl) {
        console.warn('[LavaBackgrounds] WebGL2 not available — rendering skipped');
        return;
      }
      var verts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
      state.quadBuf = state.gl.createBuffer();
      state.gl.bindBuffer(state.gl.ARRAY_BUFFER, state.quadBuf);
      state.gl.bufferData(state.gl.ARRAY_BUFFER, verts, state.gl.STATIC_DRAW);
      for (var k in SHADERS) {
        var prog = compileProgram(state.gl, k, SHADERS[k]);
        if (prog) state.programs[k] = prog;
      }
      state.dark = opts.dark !== undefined ? !!opts.dark : true;
      window.addEventListener('resize', resize);
      if (opts.mode && opts.mode !== 'none') api.setMode(opts.mode); else stop();
    },
    setMode: function(mode) {
      state.mode = mode;
      if (mode === 'none') stop(); else start();
    },
    setTheme: function(theme) {
      state.dark = theme === 'dark';
    },
    destroy: function() {
      stop();
      window.removeEventListener('resize', resize);
      state = { canvas: null, gl: null, programs: {}, quadBuf: null, mode: 'none', dark: true, animId: null, startTime: 0 };
    },
    listModes: function() { return ['none', 'embers', 'aurora', 'grid', 'rain', 'ocean', 'space', 'abstract']; }
  };

  global.LavaBackgrounds = api;
})(typeof window !== 'undefined' ? window : this);
