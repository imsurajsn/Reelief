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
│   ├── index.js                MV3 service worker (type:"module" — real static imports)
│   └── product-config.generated.js   generated from product.config.json (uninstall survey + review URLs) — do not hand-edit
├── content/
│   ├── entry.js                classic script, run_at:document_start, the only
│   │                           file listed in manifest content_scripts
│   └── platforms/
│       └── youtube-shorts.js   the only platform adapter that ships in V1a
├── shared/                     real ES modules, loaded via dynamic import() from
│   ├── platform-adapter.js     content scripts and via static import from background/popup
│   ├── platforms.js            per-platform displayName/homeLabel — read by both adapters and the popup
│   ├── storage.js
│   ├── uninstall.js            validates the uninstall-survey URL before it is given to Chrome (FR-38)
│   ├── review-prompt.js        pure rules for the review nudge: unlock, cooldown, cap, stop (FR-39)
│   ├── time-avoided.js         pure "time avoided" estimate: personal avg session length (FR-40)
│   ├── time.js
│   ├── copy.js                 maps call shapes -> message keys; words live in locales/
│   ├── i18n.js                 active-locale state, t(), direction; loads locales/ on demand
│   ├── languages.js            the language registry — the one place a new language is added
│   ├── locales/                one file per language (en.js is the base; others merge over it)
│   ├── overlay.js
│   ├── branding.js
│   ├── video-guard.js          pauses/resumes the host's <video> element behind the overlay
│   └── host-theme.js           detects the host page's own light/dark theme (not just OS)
├── popup/
│   ├── popup.html              extension page — supports <script type="module"> natively
│   ├── popup.js
│   ├── tour.js                 first-run quick tour (FR-37) — spotlight + step card, lives outside #app
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

**Uninstall survey (FR-38).** `product.config.json`'s `uninstallSurveyUrl` is
handed to `chrome.runtime.setUninstallURL()` by the background worker, so Chrome
opens that page in a new tab when the extension is removed. The worker can't
import the JSON config itself (a JSON module in its import graph once stopped it
registering — see the comment at the top of `background/index.js`), so
`scripts/generate-manifest.mjs` also writes `background/product-config.generated.js`
from the same config. `shared/uninstall.js` only lets a plain `https:` URL through;
an empty or invalid value switches the feature off instead of throwing. It needs no
extra permission and the extension sends nothing — Chrome just opens the page.

**Review nudge (FR-39).** `shared/review-prompt.js` is pure decision logic (no
imports, no `chrome.*`): `evaluateReviewPrompt()` turns history + today's counters
+ the stored `reviewPrompt` object into `{ cardDue, doorVisible, unlockNow }`, so the
popup and the background worker apply identical rules. `storage.js` only stores the
state (`getReviewPrompt` / `markReviewUnlocked` / `snoozeReviewPrompt` /
`resolveReviewPrompt`). The popup renders the card (an `.onboardTip` variant) and the
standing "Rate Reelief" ⋮-menu row. The toolbar dot is owned by
`refreshBadge()` in `background/index.js`, which recomputes from storage on every
relevant `storage.onChanged`: update-ready (mint green) always wins, otherwise the
review nudge shows amber — the popup never sets the toolbar dot itself. The dot is
painted onto the icon with `action.setIcon(imageData)` (`setToolbarDot()`), not shown
as badge text: Chrome's badge is a fixed-size box that can't be shrunk. `reviewUrl` reaches
the worker through `background/product-config.generated.js`, like the uninstall URL.

**Time avoided (FR-40).** `shared/time-avoided.js` is pure decision logic, same
shape as `review-prompt.js`: `evaluateTimeAvoided(history, today)` returns
`{ avgSessionMinutes, minutesAvoidedToday }`, both `null` until there's enough
data to be meaningful. No storage functions of its own — it only reads
`history` (already exposed by `storage.getHistory()`) and today's per-platform
totals the popup already computes. `popup.js` renders the result as two small
badges pinned to the TODAY stat cards (`statBadge`/`statBadgeTip` in
`popup.css`) instead of the old step-away footnote sentence, which
`renderTodayFootnote()` no longer emits in friction mode. The badges' hover
tooltips copy `.trendTooltip`'s visual rules under a new selector rather than
reusing that class directly, since `.trendTooltip` expects JS to position it
per chart bar — these two are static, so a plain CSS `:hover` toggle is
enough. Deliberately hover-only, not `:focus` too: the badge has
`tabindex="0"` for keyboard reachability, and if focus also triggered the
tooltip, clicking a badge (which focuses it) would leave the tooltip stuck
open after the mouse moved away — inconsistent with plain hover, which
always clears on mouseout. The badge's `aria-label` carries the same text
the tooltip shows, so keyboard/screen-reader users aren't missing anything.
Each badge leads with a small icon (`AWAY_ICON`/`AVOIDED_ICON` in `popup.js`)
— the same icon-per-row idea the ⋮ menu now uses on every row (`STAR_ICON`,
`BUG_ICON`, `INFO_ICON`, all permanent rather than conditional) — as plain
inline SVGs rather than the shared `chevronIcon()` helper, since that one's
`.chevron` class hardcodes ink-mute as its color and would fight the
badge's own white text, or the danger row's red, or the review row's amber
highlight. The menu rows share one generic `.rowLabel`/`.rowLabel svg` CSS
rule (ink-mute default) with `.rowLabelDanger svg`/`.reviewRow svg`
overriding it — both defined later in `popup.css` than the generic rule, so
equal-specificity cascade order picks them correctly.

**Intention prompt (FR-41).** One boolean, `intentionPromptEnabled`, in
`shared/storage.js` (`getIntentionPromptEnabled` / `setIntentionPromptEnabled`).
The popup's `renderIntentionRow()` shows it as a `role="switch"` button in the
MODE section (Friction mode only). `content/entry.js` reads it in
`enterShorts()` and passes `intention` in the model to `showFrictionOverlay()`
— and nowhere else, so the recurring re-friction overlay never asks.
`shared/overlay.js` renders the three tiles (`intentionTilesHtml()`) and gates
Continue on two closure variables, `countdownDone` and `reasonPicked`; the
picked reason lives only in that closure and is never stored. No new files, so
no `web_accessible_resources` change.

**To rebrand:** edit `config/product.config.json`, run
`node scripts/generate-manifest.mjs`, and if the icon/color changed also
edit `assets/icons/icon.svg` and run `scripts/generate-icons.sh`. That's
the entire surface area — nothing else in the codebase references the
product name or icon paths directly.

**`name` vs `shortName`.** The Chrome Web Store's listing title and summary
are pulled directly from the manifest's `name`/`description` — there's no
separate, independently-editable Store title field in the Developer
Dashboard. That makes `name` a real SEO lever (Store search relevance
weighs title matches heavily), which can pull it toward something longer
and keyword-bearing than what reads well as an in-app brand mark. `shortName`
(→ manifest `short_name`, Chrome's own fallback for space-constrained UI)
exists precisely for that split: `popup.js`'s header and About panel read
`BRAND.shortName`, not `BRAND.name`, so the two can diverge on purpose —
e.g. `name: "Reelief: Stop Shorts & Reels Scrolling"` for Store search,
`shortName: "Reelief"` for everything the person actually sees day to day.

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
an id, a hostname, a Shorts/Reels URL pattern, a home URL, and four DOM
methods (`findShelves`, `collapseShelf`, `removeShelf`,
`findSidebarEntries` / `hideSidebarEntry`).

Everything platform-agnostic — SPA-navigation detection, overlay mount/
dismiss lifecycle, mode-change races, the health-check watchdog, session
timing — lives in `content/entry.js` and `shared/*.js`. Those files know
nothing about any one platform specifically; they only call adapter
methods, matched to the current page via each adapter's own `hostname`
field (`content/entry.js`'s `ADAPTERS.find((a) =>
location.hostname.endsWith(a.hostname))`).

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

## First-run quick tour (FR-37)

The first-run card (FR-15) offers a tour. Accepting it (`popup.js` marks
`onboardingSeen`, re-renders, then calls `startTour(app)` in `popup/tour.js`)
spotlights the popup's real sections in turn: everything dims except the
current target, and a small card next to it explains that section, with Next
and Skip tour always visible. Steps are resolved from the live DOM, so a
missing target is simply skipped — Block mode has no reminder stepper, so the
tour is one step shorter there.

Two constraints shape it. `popup.js` rebuilds `#app`'s `innerHTML` on every
storage change, so the tour's nodes are appended to `<body>` (outside `#app`)
and a `MutationObserver` re-finds the target and re-places the spotlight after
each rebuild. And it stores nothing of its own: the existing `onboardingSeen`
flag is the only state. All tour text is `tour.*` in `shared/locales/*.js`,
read via `COPY.tour`; the card centres on the viewport, so it needs no RTL
special-casing beyond the inherited `dir`.

## Localization (V1.5, PRD FR-32–FR-36)

Custom, dependency-free — not Chrome's `_locales`/`chrome.i18n`, which has
no plural rules and forces `$1`-style placeholders. The pieces:

- **`shared/languages.js`** — the registry. `LANGUAGES` is an ordered list
  of `{ code, name, endonym, tier, dir }`. The popup's ⋮ menu (FR-32) and
  onboarding picker (FR-33) render straight from it. **Adding a language =
  one entry here + one `shared/locales/<code>.js` file. Nothing else.**
- **`shared/locales/<code>.js`** — a flat `{ key: 'template with
  {placeholders}' }` map plus `meta.ordinal` / `meta.plural` (language
  rules). `en.js` is the base; every other file is spread *over* `en`, so
  a missing key (or a whole untranslated stub) falls back to English —
  never a blank (FR-36).
- **`shared/i18n.js`** — holds the active messages, exposes `t(key,
  params)` (synchronous — callers render synchronously) and `setLanguage()`
  / `initI18n()` (async — only the *switch* is async). `en.js` is a static
  import so `t()` always has a value even before init. `applyDirection()`
  stamps `lang`/`dir` on the popup's `<html>` and is a deliberate no-op in
  content scripts (that `<html>` is the host page's).
- **`shared/copy.js`** — unchanged public shape (`COPY.overlay.titleN(3,
  'Reels')`). Constant strings are *getters* so they re-resolve after a
  language switch with no caller change; parameterised strings are methods.
- The stored preference is `storage.getLanguage()`; unset means "resolve
  from `chrome.i18n.getUILanguage()`, else English". Both the popup and
  `content/entry.js` call `initI18n()` before their first render.

RTL (Arabic, Tier 3) sets `dir="rtl"` — the popup layout is mostly
flex + CSS logical properties and needs little; a full RTL polish pass on
the overlays is still pending (the PRD gates Arabic on that work).

## What's deliberately not built yet

- Options page, accounts, sync, per-platform toggles — out of scope for
  the V1 series per the PRD.
- A bundler — revisit only if a future platform genuinely needs npm
  dependencies (e.g., a heavier DOM diffing need); don't add one
  preemptively.
