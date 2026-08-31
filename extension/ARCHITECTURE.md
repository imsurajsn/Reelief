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
│   ├── platforms.js            per-platform displayName/homeLabel — read by both adapters and the popup
│   ├── storage.js
│   ├── time.js
│   ├── copy.js
│   ├── overlay.js
│   ├── branding.js
│   ├── video-guard.js          pauses/resumes the host's <video> element behind the overlay
│   └── host-theme.js           detects the host page's own light/dark theme (not just OS)
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

## The platform-adapter pattern — how v1c/v1.5 get added

`shared/platform-adapter.js` documents the shape every site-specific
module implements (see the JSDoc `PlatformAdapter` typedef in that file):
an id, a hostname, a Shorts/Reels URL pattern, a home URL, and the DOM
methods (`findShelves`, `collapseShelf`, `removeShelf`, optional
`restoreShelf`, `findSidebarEntries` / `hideSidebarEntry`).

Everything platform-agnostic — SPA-navigation detection, overlay mount/
dismiss lifecycle, mode-change races, the health-check watchdog, session
timing — lives in `content/entry.js` and `shared/*.js`. Those files know
nothing about any one platform specifically; they only call adapter
methods, matched to the current page via each adapter's own `hostname`
field (`content/entry.js`'s `ADAPTERS.find((a) =>
location.hostname.endsWith(a.hostname))`).

`entry.js`'s `applyInPageTreatments` is the mutation loop that applies those
methods. It runs (rAF-throttled) on every DOM mutation and keeps a
`treatedShelves` map of what it has touched. Each pass **reconciles**: a
tracked node that `findShelves` no longer returns — Instagram and Facebook
recycle a small pool of feed `<article>` nodes as you scroll, so one can
come back holding an ordinary post — gets its treatment reverted
(`collapseShelf`'s `restore()` / the adapter's `restoreShelf`) rather than
staying stranded. Mode is read from a cached `currentMode` (seeded at start,
updated on `storage.onChanged`), not an `await` per mutation.

**Instagram Reels (v1b) is implemented** in
`content/platforms/instagram-reels.js` and is the reference example for
adding the next platform (v1c/Facebook), alongside `youtube-shorts.js`.
Its file header explains where it diverges from `youtube-shorts.js`'s
conventions and why: Instagram's class names are hashed/regenerated on
every deploy (so lookups are href/ARIA-only, no class-name fallback),
FR-18 collapses at individual-feed-post granularity rather than a shelf,
and `collapseShelf`/`removeShelf` cover or hide posts in place instead of
moving/removing their children — React (which Instagram is built on) can
crash on reconciliation if a content script detaches nodes it still holds
a reference to.

Adding a third platform means repeating that recipe: write
`content/platforms/<name>.js` implementing the `PlatformAdapter` shape
with selectors verified against that site's live DOM, add its entry to
`shared/platforms.js` (`displayName`/`siteName`/`homeLabel`/`feedLabel`/
`feedPath`), add it to the `ADAPTERS` array in `content/entry.js`, add its
`matches` entry to `manifest.template.json`'s `content_scripts`,
`web_accessible_resources`, and `host_permissions`, then regenerate
`manifest.json`. No change to `shared/storage.js` or `shared/overlay.js`
is needed — `storage.js`'s schema is already keyed by platform id
(`today.platforms.youtube`, `today.platforms.instagram`, ...), so a new
platform's counters just appear the first time it records an event, and
the popup's `PLATFORM_IDS` list (`popup/popup.js`) is derived from
`shared/platforms.js` rather than hardcoded, so it also picks up a new
platform automatically — including the FR-19 per-platform breakdown line.

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

## Recurring re-friction (FR-15a)

Opt-in, off by default. `content/entry.js`'s `maybeTriggerRecurringFriction`
piggybacks on `SessionTimer`'s own flush callback (the same one that
writes daily minutes via `storage.addSeconds`) rather than running a
second independent timer — it inherits the session timer's
visibility-aware pause behavior for free. When the configured interval is
crossed, it calls `stopSession()` from *inside* that flush callback, which
made `SessionTimer.flush()` re-entrant (the callback firing again,
synchronously, before the outer call had finished). Fixed in
`shared/time.js` by decrementing `accumulatedSeconds` before invoking the
callback instead of after — worth knowing if you're ever debugging a
mismatch between recorded minutes and observed watch time in that file.

## What's deliberately not built yet

- Options page, accounts, sync, per-platform toggles, i18n — all out of
  scope for V1 per the PRD.
- A bundler — revisit only if a future platform genuinely needs npm
  dependencies (e.g., a heavier DOM diffing need); don't add one
  preemptively.
