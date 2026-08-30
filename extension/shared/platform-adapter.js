/**
 * The contract every platform module under content/platforms/ implements.
 * This file has no runtime logic — it exists so the shape is documented
 * in one place. content/entry.js owns everything platform-agnostic
 * (SPA-navigation detection, overlay mounting, storage, messaging);
 * an adapter only knows how to find and manipulate one site's DOM.
 *
 * Adding v1b (Instagram) or v1c (Facebook) means writing one new file
 * that satisfies this shape, adding one entry to shared/platforms.js
 * (displayName/homeLabel/feedLabel/feedPath, which this file's
 * `...PLATFORM_INFO[id]` spread picks up), and adding one `matches` entry +
 * one `content_scripts` block to manifest.template.json. Nothing else in
 * the codebase changes.
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
 * @property {(root?: ParentNode) => HTMLElement[]} findShelves          Locate inline Shorts/Reels shelf(s) in the current DOM. (Instagram/Facebook repurpose this at individual-post granularity — see FR-18.)
 * @property {(shelf: HTMLElement, onReveal: () => void) => () => void} collapseShelf
 *   Friction mode: replace a shelf with a "hidden — click to reveal" placeholder in its own
 *   grid slot. Calls onReveal() when the user reveals it. Returns a restore() cleanup.
 * @property {(shelf: HTMLElement) => void} removeShelf                 Block mode: remove the shelf with no placeholder, no trace.
 * @property {(root?: ParentNode) => HTMLElement[]} findSidebarEntries  Locate the nav entry/entries linking to Shorts/Reels.
 * @property {(entry: HTMLElement, mode: 'friction' | 'block') => void} hideSidebarEntry
 *   YouTube: remove the row entirely (not just grey it out), regardless of mode. Instagram
 *   (FR-17) diverges intentionally: friction mode greys out + badges the icon and keeps it
 *   clickable; block mode instead removes it entirely, matching YouTube — see instagram-reels.js.
 */

export {};
