# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Reelief is a Chrome (MV3) extension that inserts a brief, dismissable friction
pause before short-form video feeds load (YouTube Shorts, Instagram Reels,
Facebook Reels), plus an optional hard-block mode. All product requirements
live in `PRD/reelief-prd.md`, numbered `FR-XX` — code comments and commit
messages reference these numbers; check the PRD before changing behavior it
describes. The extension itself lives entirely under `extension/`.

## Git workflow rules

- **Never run `git commit` without the user's explicit approval for that
  specific commit.** Staging files and drafting a message is fine; do not
  execute the commit itself until the user has said to go ahead — a
  standing "yes" earlier in the conversation does not carry forward to
  later commits.
- **Never include a Claude session link** (e.g.
  `Claude-Session: https://claude.ai/code/session_...`) in commit messages,
  PR descriptions, or anywhere else — the user considers this a privacy
  concern. A commit message needs only the description of the change plus
  a `Co-Authored-By:` trailer; nothing session-identifying.

## Commands

There is no build step, bundler, package.json, linter, or test suite — the
extension runs directly from source (vanilla JS/CSS/HTML, real ES modules).
Validate changes with:

```sh
node --check extension/path/to/file.js   # syntax check a single file (no test framework exists)
node extension/scripts/generate-manifest.mjs   # regenerate manifest.json after editing manifest.template.json or config/product.config.json — do not hand-edit manifest.json
extension/scripts/generate-icons.sh            # rasterize assets/icons/icon.svg to PNGs (needs `rsvg-convert`, e.g. `brew install librsvg`)
```

To manually test: `chrome://extensions` → enable Developer mode → **Load
unpacked** → select `extension/`. After editing `content/entry.js`
specifically, a plain page refresh is *not* enough — Chrome caches
`content_scripts`-declared files more aggressively than the dynamically
`import()`-ed modules under `shared/` and `content/platforms/`, which do
pick up edits on a normal reload. Use the reload icon on the extension's
card in `chrome://extensions` to be sure `entry.js` changes are live.

If testing via Claude-in-Chrome browser automation: that automation tab
reports `document.hidden === true` continuously, which silently breaks
anything gated on page-visibility (video autoplay, `SessionTimer`'s flush
loop, the friction countdown's tick). Treat timing-dependent flows as
untestable in that environment and verify DOM/logic effects instead (or ask
the user to test the real-time behavior themselves).

## Architecture

**The platform-adapter pattern is the core extensibility mechanism.**
`shared/platform-adapter.js` documents the shape (JSDoc `PlatformAdapter`
typedef) every file under `content/platforms/*.js` implements: an `id`, a
`hostname`, a Shorts/Reels URL pattern, a home URL, and DOM methods
(`findShelves`, `collapseShelf`, `removeShelf`, optional `restoreShelf`,
`findSidebarEntries`, `hideSidebarEntry`). Everything platform-agnostic —
SPA-navigation detection, overlay mount/dismiss, mode-change races, session
timing, the health-check watchdog — lives in `content/entry.js` and
`shared/*.js`, which know nothing about any specific site; they only call
adapter methods, selected via
`ADAPTERS.find((a) => location.hostname.endsWith(a.hostname))`.
`entry.js`'s `applyInPageTreatments` mutation loop is rAF-throttled, reads a
cached `currentMode` (not an `await` per mutation), and each pass
**reconciles** its `treatedShelves` map: a tracked node that `findShelves`
stops returning (Instagram/Facebook recycle feed `<article>` nodes while
scrolling) has its treatment reverted via `restore()`/`restoreShelf` after a
short grace, instead of staying stranded and hidden.
Adding a platform means: write `content/platforms/<name>.js`, add an entry
to `shared/platforms.js` (read by both the adapter and the popup — the
popup's platform list is derived from it, never hardcoded), add it to the
`ADAPTERS` array in `entry.js`, add its host to `manifest.template.json`'s
`content_scripts`/`web_accessible_resources`/`host_permissions`, then
regenerate `manifest.json`. `shared/storage.js`'s schema is already keyed by
platform id, so no storage migration is needed.

The three shipped adapters intentionally diverge in DOM technique, and the
divergence matters when writing a new one or debugging an existing one:
- **YouTube** (`youtube-shorts.js`): custom elements (Polymer/lit), so
  `collapseShelf` safely detaches and reattaches the shelf's own children
  into a wrapper.
- **Instagram / Facebook** (`instagram-reels.js`, `facebook-reels.js`): both
  React-owned DOM. Detaching/moving children there risks a reconciliation
  crash, so these only ever add sibling elements on top and resize via
  `max-height`/`overflow` — never touch the original children. Both also
  have no stable CSS class names (hashed, regenerated per deploy), so
  element-finding is href/ARIA/text-content based, with multiple fallback
  strategies rather than one selector.
- Design tokens (colors, spacing) are verified live against each site's
  actual DOM/computed styles or CSS custom properties, never invented —
  see the top-of-file comments in each adapter for what was verified and
  how. Facebook uniquely exposes real design tokens as CSS custom
  properties on `<html>` (`--card-background`, `--primary-text`, etc., in
  both themes), so its adapter reads `var(...)` directly instead of running
  its own theme-detector like the other two do (`shared/host-theme.js`).

**Config-driven branding.** `config/product.config.json` is the single
source of truth for name/tagline/description/version/icons/brand color.
Runtime UI imports it directly as a JSON module (`shared/branding.js`).
`manifest.json` can't do that (Chrome reads it as literal JSON before any
code runs), so it's generated from `manifest.template.json`'s
`__PLACEHOLDER__` tokens via `scripts/generate-manifest.mjs` — never edit
`manifest.json` by hand.

**Why content scripts use dynamic import.** Chrome doesn't support
`"type": "module"` for `content_scripts`. `content/entry.js` is a classic
script whose body dynamically `import(chrome.runtime.getURL(...))`s the
real ES modules under `shared/` and `content/platforms/`. Every such path
must also be listed under `web_accessible_resources` in
`manifest.template.json` (scoped to the same `matches`) or the import is
blocked. `background/index.js` is declared `"type": "module"` and uses
plain static imports instead.

**Storage** is entirely in `chrome.storage.local`, wrapped by
`shared/storage.js` — no other file touches `chrome.storage` directly. The
schema comment at the top of that file is authoritative.

**Recurring re-friction** (`entry.js`'s `maybeTriggerRecurringFriction`)
piggybacks on `SessionTimer`'s existing flush callback rather than running
a second timer. Calling `stopSession()` from inside that callback makes
`SessionTimer.flush()` re-entrant; `shared/time.js` handles this by
decrementing `accumulatedSeconds` *before* invoking the callback, not after
— relevant if debugging a mismatch between recorded minutes and observed
watch time in that file.

See `extension/ARCHITECTURE.md` for the full directory layout and more
detail on any of the above.
