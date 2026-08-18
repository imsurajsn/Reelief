/**
 * The contract every platform module under content/platforms/ implements.
 * This file has no runtime logic — it exists so the shape is documented
 * in one place. content/entry.js owns everything platform-agnostic
 * (SPA-navigation detection, overlay mounting, storage, messaging);
 * an adapter only knows how to find and manipulate one site's DOM.
 *
 * Adding v1b (Instagram) or v1c (Facebook) means writing one new file
 * that satisfies this shape and adding one `matches` entry + one
 * `content_scripts` block to manifest.template.json. Nothing else in the
 * codebase changes.
 *
 * @typedef {Object} PlatformAdapter
 * @property {string} id                          Stable id, used as the storage key (e.g. 'youtube').
 * @property {RegExp} shortsPathPattern            Matched against location.pathname to detect the Shorts/Reels feed.
 * @property {string} homeUrl                      Redirect target for Block mode and "Not now" with no history.
 * @property {string} homeLabel                    Short label for copy interpolation, e.g. "youtube.com".
 * @property {(root?: ParentNode) => HTMLElement[]} findShelves          Locate inline Shorts/Reels shelf(s) in the current DOM.
 * @property {(shelf: HTMLElement, onReveal: () => void) => () => void} collapseShelf
 *   Friction mode: replace a shelf with a "hidden — click to reveal" placeholder in its own
 *   grid slot. Calls onReveal() when the user reveals it. Returns a restore() cleanup.
 * @property {(shelf: HTMLElement) => void} removeShelf                 Block mode: remove the shelf with no placeholder, no trace.
 * @property {(root?: ParentNode) => HTMLElement[]} findSidebarEntries  Locate the nav entry/entries linking to Shorts/Reels.
 * @property {(entry: HTMLElement) => void} hideSidebarEntry            Remove the row entirely (not just grey it out).
 */

export {};
