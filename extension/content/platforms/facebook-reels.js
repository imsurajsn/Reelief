import { COPY } from '../../shared/copy.js';
import { PLATFORM_INFO } from '../../shared/platforms.js';

/**
 * Facebook adapter (implements shared/platform-adapter.js's PlatformAdapter shape).
 *
 * Verified live against facebook.com: Facebook's own class names are
 * hashed/atomic ("x1n2onr6 x1ja2u2z ...", the same Comet/React build system
 * Instagram uses), so like instagram-reels.js there is no class-name
 * fallback to reach for — every lookup below is text/href based instead.
 *
 * Unlike YouTube or Instagram, Facebook exposes its real design tokens as
 * live CSS custom properties on <html> (--card-background, --primary-text,
 * --secondary-text, --divider, --card-corner-radius, all verified in both
 * themes by toggling Facebook's own dark-mode setting) — so this file's
 * injected CSS references var(--card-background) etc. directly instead of
 * hardcoding colors or running its own theme-watcher: it tracks Facebook's
 * live theme automatically, for free.
 *
 * The inline "Reels" card in the News Feed is structurally one shelf (a
 * header + a horizontal row of thumbnails), same shape as YouTube's Shorts
 * shelf and unlike Instagram's per-post model — so this reuses the shared
 * shelf/expand copy (shared/copy.js's COPY.shelf) and a single-toggle UX.
 * But Facebook, like Instagram, is a React app: moving or removing its
 * real children risks a reconciliation error, so the DOM technique below
 * follows instagram-reels.js's proven approach (only ever add a sibling
 * row on top and resize via max-height/overflow, never touch the
 * shelf's own children) rather than youtube-shorts.js's (which detaches
 * and reattaches the shelf's children — safe there only because YouTube's
 * shelf is a Polymer/lit custom element, not a React-owned subtree).
 */

const REEL_PATH_PATTERN = /^\/reel\//;

function isReelPermalink(href) {
  if (!href) return false;
  try {
    return REEL_PATH_PATTERN.test(new URL(href, location.origin).pathname);
  } catch {
    return false;
  }
}

function findReelLinks(root) {
  return Array.from(root.querySelectorAll('a[href*="/reel/"]')).filter((a) =>
    isReelPermalink(a.getAttribute('href')),
  );
}

// Text-based only: verified live, the inline shelf card has no stable
// structural marker, just a header whose text is exactly "Reels" ("Reels
// hidden" etc. copy strings never collide with this since none of them are
// the bare word alone). Walking up from that header to the nearest
// ancestor containing 2+ reel permalinks lands on the shelf card itself
// (verified live: depth 7 from the header span) — capped well past that so
// a future DOM change has room to still resolve, without walking so far up
// it risks crossing into an unrelated ancestor.
const SHELF_WALK_DEPTH = 14;
const MIN_SHELF_REEL_LINKS = 2;

function findReelsShelf(root) {
  const headers = Array.from(root.querySelectorAll('span, div')).filter(
    (el) => el.children.length === 0 && el.textContent.trim() === 'Reels',
  );
  const shelves = new Set();
  for (const header of headers) {
    let el = header;
    for (let i = 0; i < SHELF_WALK_DEPTH && el; i++) {
      if (findReelLinks(el).length >= MIN_SHELF_REEL_LINKS) {
        shelves.add(el);
        break;
      }
      el = el.parentElement;
    }
  }
  return Array.from(shelves);
}

// Verified live: Facebook's left-nav "Reels" entry links to exactly this
// URL (the query param is what distinguishes it from an individual reel's
// own permalink, which carries an id instead). Text-based fallback below
// covers a URL-shape change — the shelf's own "Reels" header text is a
// <span>/<div>, never an <a>, so filtering to anchors alone already rules
// out matching the shelf by accident.
//
// Returns *all* matches, not just the first: verified live that Facebook
// renders two separate <li> nav entries with this same href (apparently
// one per responsive layout variant), both present in the DOM
// simultaneously — treating only one left the other one fully visible.
function findReelsNavLinks(root) {
  const byUrl = Array.from(root.querySelectorAll('a[href*="/reel/?s=tab"]'));
  if (byUrl.length > 0) return byUrl;
  return Array.from(root.querySelectorAll('a')).filter((a) => a.textContent.trim() === 'Reels');
}

const SHELF_STYLE_ID = 'reelief-fb-shelf-style';
const ROW_HEIGHT_PX = 48;

// color-mix() against Facebook's own live tokens gives a theme-adaptive
// hover tint (darkens in light mode, lightens in dark mode, since
// --primary-text is dark-on-light / light-on-dark) without hardcoding a
// separate hover color per theme the way youtube-shorts.js's SHELF_CSS
// has to.
const SHELF_CSS = `
.reelief-fb-shelf-row {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: ${ROW_HEIGHT_PX}px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  cursor: pointer;
  background: var(--card-background, #ffffff);
  color: var(--primary-text, #050505);
  border-bottom: 1px solid var(--divider, #d0d3d7);
}
.reelief-fb-shelf-row:hover,
.reelief-fb-shelf-row:focus-visible {
  background: color-mix(in srgb, var(--card-background, #ffffff) 90%, var(--primary-text, #050505) 10%);
}
.reelief-fb-shelf-row:focus-visible {
  outline: 2px solid var(--accent, #0866ff);
  outline-offset: -2px;
}
.reelief-fb-shelf-label {
  font-size: 15px;
  font-weight: 600;
}
.reelief-fb-shelf-chevron {
  margin-left: auto;
  flex: none;
  display: flex;
  color: var(--secondary-text, #65686c);
  transition: transform 150ms ease;
}
.reelief-fb-shelf-row[aria-expanded='true'] .reelief-fb-shelf-chevron {
  transform: rotate(180deg);
}
`;

function ensureStyleInjected() {
  if (document.getElementById(SHELF_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SHELF_STYLE_ID;
  style.textContent = SHELF_CSS;
  document.head.appendChild(style);
}

function pauseVideos(root) {
  root.querySelectorAll('video').forEach((v) => v.pause());
}

export const facebookReels = {
  id: 'facebook',
  hostname: 'facebook.com',
  // Singular /reel/ — verified live, unlike Instagram's plural /reels/.
  shortsPathPattern: REEL_PATH_PATTERN,
  homeUrl: 'https://www.facebook.com/',
  ...PLATFORM_INFO.facebook, // displayName, siteName, homeLabel, feedLabel, feedPath

  findShelves(root = document) {
    return findReelsShelf(root);
  },

  // Friction mode: a persistent opaque row pinned at the shelf's top,
  // clipping the rest of the card via max-height/overflow while collapsed
  // — same technique instagram-reels.js settled on after live testing
  // (only ever add siblings, resize via max-height, never touch the
  // shelf's own React-owned children). Facebook's shelf thumbnails are
  // static/looping previews a user clicks through to /reel/<id> to watch
  // (unlike Instagram's full per-post video player), so unlike
  // instagram-reels.js's collapseShelf there's no inline-autoplay path to
  // guard against and no click-catcher needed — revealing the shelf just
  // shows Facebook's own real thumbnails, and clicking any of them
  // navigates normally into the friction/block gate.
  collapseShelf(shelf, onReveal) {
    if (shelf.dataset.reeliefCollapsed === 'true') return () => {};
    shelf.dataset.reeliefCollapsed = 'true';
    ensureStyleInjected();
    const feedLabel = this.feedLabel;

    const priorPosition = shelf.style.position;
    const priorHeight = shelf.style.height;
    const priorMaxHeight = shelf.style.maxHeight;
    const priorOverflow = shelf.style.overflow;
    if (getComputedStyle(shelf).position === 'static') {
      shelf.style.position = 'relative';
    }
    // flex-shrink:0 + explicit height (not just max-height): Facebook's
    // feed units are flex children, and overflow:hidden resets a flex
    // item's automatic minimum size to 0 (verified live while building
    // the Instagram adapter) — without pinning both, the flex algorithm
    // can shrink this shelf past the row's own height, clipping the row.
    shelf.style.flexShrink = '0';
    shelf.style.overflowAnchor = 'none';
    pauseVideos(shelf);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'reelief-fb-shelf-row';
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-label', COPY.shelf.expand(feedLabel));
    row.innerHTML = `
      <span class="reelief-fb-shelf-label">${COPY.shelf.label(feedLabel)}</span>
      <span class="reelief-fb-shelf-chevron">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    `;
    shelf.appendChild(row);

    let expanded = false;
    function setExpanded(next) {
      expanded = next;
      shelf.style.height = expanded ? priorHeight : `${ROW_HEIGHT_PX}px`;
      shelf.style.maxHeight = expanded ? priorMaxHeight : `${ROW_HEIGHT_PX}px`;
      shelf.style.overflow = expanded ? priorOverflow : 'hidden';
      row.setAttribute('aria-expanded', String(expanded));
      row.setAttribute('aria-label', expanded ? COPY.shelf.collapse(feedLabel) : COPY.shelf.expand(feedLabel));
      row.querySelector('.reelief-fb-shelf-label').textContent = expanded
        ? COPY.shelf.expandedLabel(feedLabel)
        : COPY.shelf.label(feedLabel);
      shelf.dataset.reeliefCollapsed = String(!expanded);
      if (!expanded) pauseVideos(shelf);
      if (expanded) onReveal?.();
    }
    setExpanded(false);
    row.addEventListener('click', () => setExpanded(!expanded));

    return function restore() {
      row.remove();
      shelf.style.position = priorPosition;
      shelf.style.height = priorHeight;
      shelf.style.maxHeight = priorMaxHeight;
      shelf.style.overflow = priorOverflow;
      delete shelf.dataset.reeliefCollapsed;
    };
  },

  // Block mode / true zero footprint — same technique instagram-reels.js
  // arrived at after live scroll-stability testing: collapsing all the way
  // to height:0 with overflow-anchor:none (rather than reserving space or
  // a small visible gap) doesn't reintroduce a scroll-jump, because that
  // bug was the browser's native scroll-anchoring reacting to a shrinking
  // element near the viewport, independent of which height it shrinks to.
  removeShelf(shelf) {
    pauseVideos(shelf);
    shelf.style.height = '0';
    shelf.style.maxHeight = '0';
    shelf.style.flexShrink = '0';
    shelf.style.overflow = 'hidden';
    shelf.style.overflowAnchor = 'none';
    shelf.style.pointerEvents = 'none';
    shelf.style.marginBottom = '0';
  },

  findSidebarEntries(root = document) {
    return findReelsNavLinks(root);
  },

  // Friction mode: dim rather than remove, matching instagram-reels.js's
  // treatment — clicking still navigates to /reel/, which the normal
  // friction gate intercepts, so nothing is lost by leaving it clickable.
  // Block mode: remove entirely, same as every other platform (nothing to
  // click through to besides an immediate redirect).
  hideSidebarEntry(entry, mode) {
    if (mode === 'block') {
      entry.style.display = 'none';
      entry.style.opacity = '';
      return;
    }
    entry.style.display = '';
    entry.style.opacity = '0.45';
  },
};
