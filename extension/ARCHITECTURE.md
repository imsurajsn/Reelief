# Reelief — Architecture

This is the map of how the extension is put together and, more
importantly, how it's meant to grow. Read this before touching the
codebase; update it if you change the shape of something described here.

## Design constraints this respects

- **Manifest V3.** No `webRequest` blocking, background is a service
  worker, no remotely hosted code.
- **No bundler.** The PRD calls for vanilla JS/CSS/HTML with zero build
  pipeline for V1. We still get modularity by using *real* ES modules
  (`import`/`export`) everywhere the platform allows it, and a
  `chrome.runtime.getURL()` + dynamic `import()` trick where it doesn't
  (see "Why content scripts use dynamic import" below). No webpack/rollup,
  no `node_modules` at runtime.
- **Config-driven branding.** Name, tagline, description, and icon paths
  live in one JSON file, not scattered across `manifest.json` and UI code.

## Directory layout

```
extension/
├── manifest.json               generated — do not hand-edit, see below
├── manifest.template.json      the real source: static structure + __PLACEHOLDERS__
├── config/
│   └── product.config.json     name/tagline/description/version/icons/brand color
├── scripts/
│   ├── generate-manifest.mjs   fills manifest.template.json from product.config.json
│   └── generate-icons.sh       rasterizes assets/icons/icon.svg -> PNG sizes
├── background/
│   └── index.js                MV3 service worker (type:"module" — real static imports)
├── content/
│   ├── entry.js                classic script, run_at:document_start, the only
│   │                           file listed in manifest content_scripts
│   └── platforms/
│       └── youtube-shorts.js   the only platform adapter that ships in V1a
├── shared/                     real ES modules, loaded via dynamic import() from
│   ├── platform-adapter.js     content scripts and via static import from background/popup
│   ├── storage.js
│   ├── time.js
│   ├── copy.js
│   ├── overlay.js
│   └── branding.js
├── popup/
│   ├── popup.html              extension page — supports <script type="module"> natively
│   ├── popup.js
│   └── popup.css
├── styles/
│   ├── tokens.css              design tokens as CSS custom properties (colors/type/space/motion)
│   └── fonts.css               local @font-face rules
└── assets/
    ├── icons/                  icon.svg source + generated PNGs
    └── fonts/                  self-hosted woff2s
```

## The config-driven branding system

`config/product.config.json` is the single source of truth for the
product's name, tagline, description, version, brand color, and icon
paths. Two things read it:

1. **Runtime UI** (`shared/branding.js`) imports it directly as a JSON
   module (`import product from '../config/product.config.json' with {
   type: 'json' }`) — the popup header, overlay wordmark, and tooltip text
   all pull from `BRAND.name` / `BRAND.tagline`, never a hardcoded string.
2. **`manifest.json`** can't do that — Chrome reads `name`/`icons` as
   literal JSON before any of our code runs, so there's no way for the
   manifest to "import" a config at load time. Instead,
   `manifest.template.json` holds `__NAME__`, `__DESCRIPTION__`,
   `__VERSION__`, `__ICONS__` placeholders, and `scripts/generate-manifest.mjs`
   (zero dependencies) fills them in from `product.config.json` to produce
   the real `manifest.json`.

**To rebrand:** edit `config/product.config.json`, run
`node scripts/generate-manifest.mjs`, and if the icon/color changed also
edit `assets/icons/icon.svg` and run `scripts/generate-icons.sh`. That's
the entire surface area — nothing else in the codebase references the
product name or icon paths directly.

## Why content scripts use dynamic import

`background/index.js` is declared with `"type": "module"` in the
manifest, so it uses plain static `import` statements. Chrome doesn't
support a `type: module` field for `content_scripts`, so `content/entry.js`
is a small classic script whose entire body is:

```js
const [storage, timeModule, overlayModule, { youtubeShorts }] = await Promise.all([
  import(chrome.runtime.getURL('shared/storage.js')),
  ...
]);
```

Every file it imports is a genuine ES module (`shared/*.js`,
`content/platforms/*.js`) — this isn't a bundler-free hack, it's the
standard extension pattern for getting real modularity in content-script
context. Those paths must be listed under `web_accessible_resources` in
`manifest.template.json` (scoped to the same `matches` as the content
script) or the dynamic `import()` calls will be blocked.

## The platform-adapter pattern — how v1b/v1c/v1.5 get added

`shared/platform-adapter.js` documents the shape every site-specific
module implements (see the JSDoc `PlatformAdapter` typedef in that file):
an id, a Shorts/Reels URL pattern, a home URL, and four DOM methods
(`findShelves`, `collapseShelf`, `removeShelf`, `findSidebarEntries` /
`hideSidebarEntry`).

Everything platform-agnostic — SPA-navigation detection, overlay mount/
dismiss lifecycle, mode-change races, the health-check watchdog, session
timing — lives in `content/entry.js` and `shared/*.js`. Those files know
nothing about YouTube specifically; they only call adapter methods.

**To add Instagram Reels (v1b):**

1. Write `content/platforms/instagram-reels.js` implementing the
   `PlatformAdapter` shape (its own selector strategies for Instagram's
   DOM — see the comment at the top of `youtube-shorts.js` for the
   "multiple independent strategies" convention this follows, which
   exists because platform DOMs change without notice).
2. In `content/entry.js`, add it to the `ADAPTERS` array and extend the
   hostname match.
3. In `manifest.template.json`, add an `instagram.com` entry to
   `content_scripts.matches` and `host_permissions` (and to
   `web_accessible_resources.matches`).
4. Regenerate `manifest.json`.

No change to `shared/storage.js`, `shared/overlay.js`, or the popup is
needed — `storage.js`'s schema is already keyed by platform id
(`today.platforms.youtube`, `today.platforms.instagram`, ...), so a new
platform's counters just appear the first time it records an event.

**v1c (Facebook)** is the same recipe. **v1.5 (Firefox/Edge)** is a
manifest-compatibility pass — those browsers share the WebExtensions API,
so it's the same codebase with browser-specific manifest keys handled in
`manifest.template.json`, not a fork.

## Storage schema

Everything lives in `chrome.storage.local`, wrapped by `shared/storage.js`
— no other file touches `chrome.storage` directly. See the schema comment
at the top of that file for the exact shape (`today`, `history`, `mode`,
`health`, etc). Every counter is keyed by platform id, which is what makes
the platform-adapter pattern above schema-migration-free.

## What's deliberately not built yet

- Options page, accounts, sync, per-platform toggles, i18n — all out of
  scope for V1 per the PRD.
- A bundler — revisit only if a future platform genuinely needs npm
  dependencies (e.g., a heavier DOM diffing need); don't add one
  preemptively.
