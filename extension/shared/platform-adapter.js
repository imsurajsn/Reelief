/**
 * The contract every platform module under content/platforms/ implements.
 * This file has no runtime logic — it exists so the shape is documented
 * in one place. content/entry.js owns everything platform-agnostic
 * (SPA-navigation detection, overlay mounting, storage, messaging);
 * an adapter only knows how to find and manipulate one site's DOM.
 *
 * Adding a new platform means writing one new file that satisfies this
 * shape, adding one entry to shared/platforms.js (displayName/homeLabel/
 * feedLabel/feedPath, which this file's `...PLATFORM_INFO[id]` spread
 * picks up), and adding the new host to manifest.template.json's
 * `content_scripts`/`web_accessible_resources`/`host_permissions`
 * (regenerate manifest.json afterward via scripts/generate-manifest.mjs).
 * Nothing else in the codebase changes.
 *
 * @typedef {Object} PlatformAdapter
 * @property {string} id                          Stable id, used as the storage key (e.g. 'youtube').
 * @property {string} hostname                    Domain suffix matched against location.hostname (e.g. 'youtube.com') to select this adapter.
 * @property {RegExp} shortsPathPattern            Matched against location.pathname to detect the Shorts/Reels feed.
 * @property {string} homeUrl                      Redirect target for Block mode and "Not now" with no history.
 * @property {string} homeLabel                    Short label for copy interpolation, e.g. "youtube.com" — from shared/platforms.js.
 * @property {string} displayName                  Human-readable platform name, e.g. "YouTube Shorts" — from shared/platforms.js.
 * @property {string} feedLabel                    Short feed-type word for copy, e.g. "Shorts"/"Reels" — from shared/platforms.js.
 * @property {string} feedPath                     URL path fragment shown in health-banner copy, e.g. "/shorts/" — from shared/platforms.js.
 * @property {(root?: ParentNode) => HTMLElement[]} findShelves          Locate inline Shorts/Reels shelf(s) in the current DOM. YouTube and
 *   Facebook find one shelf-shaped card (a header + a horizontal row of thumbnails); Instagram instead repurposes this at
 *   individual-post granularity, one shelf per Reel post — see FR-18.
 * @property {(shelf: HTMLElement, onReveal: () => void) => () => void} collapseShelf
 *   Friction mode: replace a shelf with a "hidden — click to reveal" placeholder in its own
 *   grid slot. Calls onReveal() when the user reveals it. Returns a restore() cleanup.
 * @property {(shelf: HTMLElement) => void} removeShelf                 Block mode: hide the shelf with no placeholder, no trace. Must be idempotent.
 * @property {((shelf: HTMLElement) => void)=} restoreShelf            Optional. Reverses removeShelf. entry.js calls it on a mode switch, or when a
 *   previously-treated node is no longer a shelf — Instagram/Facebook feeds recycle a small pool of <article> nodes while scrolling. Omit it
 *   (YouTube) when removeShelf detaches the node outright and nothing needs undoing.
 * @property {(root?: ParentNode) => HTMLElement[]} findSidebarEntries  Locate the nav entry/entries linking to Shorts/Reels.
 * @property {(entry: HTMLElement, mode: 'friction' | 'block') => void} hideSidebarEntry
 *   YouTube: remove the row entirely, regardless of mode. Instagram (FR-17) and Facebook instead
 *   grey out the icon and keep it clickable in friction mode (clicking still hits the normal
 *   friction gate); block mode removes it entirely on all three, since there's nothing to click
 *   through to besides an immediate redirect.
 */

export {};
