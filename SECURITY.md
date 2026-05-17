# Security

## Threat model

This is a **client-side static visualization** of conversation logs. It runs
in the browser, reads JSONL/JSON files the user explicitly drops or loads by
URL, and never sends data to any server (no analytics, no telemetry). Anything
the user loads stays on their machine.

The most realistic risks are therefore:

- **XSS via hostile JSONL** — message text could contain `<script>` tags. If
  such text ended up in `innerHTML` anywhere we'd have an exploit.
- **SSRF via user-supplied URLs** — `?jsonl=` / `?sessions=` / live-stream
  URL from the input field → browser fetches intranet endpoints.
- **Supply chain** — any script the page loads from third-party CDN.

## What has been audited (v0.14.4)

A focused audit (found in git history of `0.14.4`) verified:

- **No XSS vector**. All message text renders through `textContent`, never
  `innerHTML`. Search results, tooltips, detail-panel, story-mode phone,
  session-picker previews, bookmarks — every surface that shows user text
  uses `textContent`. There is no Markdown/HTML renderer.
- **No `eval`, `new Function`, string-form `setTimeout/setInterval`,
  `document.write`, `outerHTML`, `insertAdjacentHTML`** anywhere.
- **URL schemes are gated** via `src/core/url-safety.js` → `safeFetch()`.
  Only `http:`, `https:` and relative URLs pass. `javascript:`, `data:`,
  `file:`, `blob:`, `ftp:` are rejected before any fetch is issued.
- **Query param `?hide=`** whitelists roles (`user | assistant | tool_use`)
  before using them in a CSS selector — prevents selector injection.
- **`fetch()` uses `credentials: 'same-origin'`** everywhere; cookies never
  leak to third-party origins.
- **npm package `files` whitelist** (`dist`, `src`, HTMLs, README, LICENSE)
  means `.env` / `node_modules` / secrets cannot be published.
- **Zero runtime dependencies** in `package.json`. Only Three.js is pulled
  in via importmap for the 3D mode (see "Accepted risks" below).
- **sessionStorage quota-guard** in `src/core/session-bridge.js` —
  oversized payloads are skipped, not crashed.

## Accepted risks

### Three.js loaded from unpkg without Subresource Integrity (SRI)

`3d.html` imports Three.js and OrbitControls/postprocessing passes from
`https://unpkg.com/three@0.160.0/…` without `integrity=` hashes.

**Why not fixed:** adding SRI to ES modules loaded via `<script type="importmap">`
is not supported by the spec. The only real fix is **vendoring** Three.js
(~650 KB) into `vendor/three/` — this inflates the repo and the npm package
significantly for what is a convenience feature.

**Risk tolerance for this project:** this is a personal-use pet-project
(visualizing my own Claude Code sessions). A supply-chain attack on
`unpkg.com` + the `three` package simultaneously is possible but extremely
high-profile — it would be publicly known within minutes. The 3D viewer
has no access to anything beyond the user's own dropped JSONL file; a
compromise could at worst read the currently-open conversation. The 2D
viewer (`index.html`, `standalone.html`) has **zero** CDN dependencies.

If you need to deploy this on a public-facing site at scale where this
matters, bundle Three.js locally.

### Third-party sessions pulled from `?sessions=<index-url>`

The Session Picker optionally fetches a JSON index you point it at. The
content is parsed as JSONL; it does not end up in `innerHTML` anywhere,
but the fetch itself goes through the browser as a cross-origin request
(subject to CORS). If the index you load is malicious, worst it can do
is waste your quota or return junk that fails to parse.

## Session card sharing (redaction model)

The "session card" exports a PNG **built for public posting**, so redaction
is part of the threat model.

- **Default mode is structurally safe, not regex-safe.** When "Include text
  snippets" is OFF (the default), message text never enters the card model
  at all — only a numeric `textLen`, remapped node ids (`n0..nN`, original
  UUIDs dropped), role/tool counts and aggregate stats. There is no message
  text to leak, by construction.
- **Opt-in snippet mode is best-effort.** When the user explicitly enables
  snippets, text is passed through `sanitizeCardText`, which strips
  Windows/POSIX/UNC file paths, emails and `working_dir=` values, and clips
  length. It **does not and cannot reliably catch**: secrets / API tokens,
  IP addresses, hostnames, bare client/person/codenames, base64 blobs, or
  `KEY=value` env-style secrets. The UI shows a standing warning; users
  must review the card before posting. This is a known, documented limit —
  pattern-based PII stripping is inherently incomplete; the structural
  default is the real guarantee.
- The card is never uploaded anywhere — generation and download are fully
  client-side (same no-network posture as the rest of the tool).

## Reporting

Open an issue at <https://github.com/andromanpro/ai-conversation-viz/issues>
with the details — no secret handling needed given the client-side nature
of the project.
