import { COPY } from '../../shared/copy.js';
import { PLATFORM_INFO } from '../../shared/platforms.js';

/**
 * TikTok adapter (implements shared/platform-adapter.js's PlatformAdapter shape).
 *
 * Verified live against tiktok.com (issue #31). Unlike the other three
 * platforms, TikTok has no separate "long-form home feed with a short-form
 * shelf embedded in it" — the whole product is short-form video, so the
 * shelf/immersive-player split this adapter pattern assumes has to be found
 * somewhere else:
 *   - The immersive, autoplaying scroller — home ("/", "/foryou"),
 *     "/following", and an individual video's own permalink
 *     ("/@user/video/<id>") — all render the exact same component
 *     (data-e2e="feed-video" inside "recommend-list-item-container",
 *     verified identical across all three route shapes). That's the
 *     friction/block target, via shortsPathPattern below, same as YouTube's
 *     /shorts/<id> or an Instagram Reel permalink.
 *   - "/explore" and a profile page ("/@handle") are real, static thumbnail
 *     grids — click a thumbnail and it opens the same immersive player via
 *     the permalink above. These are TikTok's equivalent of "a page that
 *     isn't itself the addictive scroll," so they're what findShelves/
 *     collapseShelf treat — but since the *entire* grid on these pages is
 *     short-form thumbnails (no surrounding unrelated content the way a
 *     YouTube search page or an Instagram feed has), the whole grid is
 *     treated as one shelf, not one shelf per thumbnail.
 *   - "/live" (livestreams) and "/shortdrama" (serialized drama episodes)
 *     exist but are deliberately out of scope for v1 — livestreams aren't
 *     the short-clip pattern this extension targets, and short-drama is a
 *     newer, smaller surface; both can be added later without changing this
 *     file's shape.
 *
 * TikTok exposes stable data-e2e attributes almost everywhere (nav-foryou,
 * feed-video, explore-item, videos-tab, ...) — unlike Instagram/Facebook,
 * which have no stable selectors at all, these are meant for automated
 * testing and are the primary lookup below. TikTok's own CSS classes are
 * still hashed/regenerated per deploy (a styled-components-style
 * "css-<hash>-<hash>--ComponentName" pattern, verified live) — never relied
 * on directly, except where noted (the profile grid has no data-e2e of its
 * own, so its component-name suffix, which changes far less often than the
 * hash prefix, is the fallback signal).
 *
 * DOM technique follows instagram-reels.js/facebook-reels.js (only ever add
 * sibling elements and resize via max-height/overflow, never touch TikTok's
 * own children): the hashed classes point to the same React/CSS-in-JS style
 * of app, and the feed list looks virtualized (items are individually
 * wrapped in "recommend-list-item-container"), so detaching real children
 * the way youtube-shorts.js does (safe only for YouTube's Polymer/lit custom
 * elements) is not a safe assumption here.
 *
 * Verified live, logged out, light theme only: body background #ffffff,
 * body text #161823, brand accent #fe2c55 (the "Log in" button's fill).
 * TikTok's web app shows no dark-mode attribute or toggle in this state —
 * unlike YouTube/Instagram/Facebook it may not have one for a logged-out
 * visitor at all. Not verified logged in / with an OS dark preference, so
 * the injected CSS below is light-theme-only for now, same honest gap
 * called out for anything not yet confirmed live.
 */

const SHORTS_PATH_PATTERN = /^\/(?:foryou\/?|following\/?|@[^/]+\/video\/\d+\/?)?$/;

// The inverse of the norm for this adapter: entry.js's own HOME_PATH_PATTERN
// assumes the home feed is where a health check should find a shelf, true
// for the other three platforms but backwards for TikTok (home *is* the
// immersive feed, never a shelf page — see the file header). /explore and a
// profile page ("/@handle", not a video permalink) are what actually carry
// the grids findShelves() looks for.
const SHELF_CHECK_PATH_PATTERN = /^\/(?:explore\/?|@[^/]+\/?)$/;

// The profile grid ("/@handle") has no data-e2e of its own — verified live,
// only its component-name suffix survives across the hashed class prefix.
// Matched with a substring, not an exact class, since the hash prefix is
// exactly what's expected to change on the next TikTok deploy.
const PROFILE_GRID_CLASS_FRAGMENT = 'UserCardListContainer';

function findGridShelves(root) {
  const shelves = [];
  const explore = root.querySelector('[data-e2e="explore-item-list"]');
  if (explore) shelves.push(explore);
  const profile = Array.from(root.querySelectorAll('div')).find((el) =>
    (el.className || '').toString().includes(PROFILE_GRID_CLASS_FRAGMENT),
  );
  if (profile) shelves.push(profile);
  return shelves;
}

const SHELF_STYLE_ID = 'reelief-tt-shelf-style';
const ROW_HEIGHT_PX = 48;

const SHELF_CSS = `
.reelief-tt-shelf-row {
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
  background: #ffffff;
  color: #161823;
  border-bottom: 1px solid #e4e6eb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.reelief-tt-shelf-row:hover,
.reelief-tt-shelf-row:focus-visible {
  background: #f5f5f5;
}
.reelief-tt-shelf-row:focus-visible {
  outline: 2px solid #fe2c55;
  outline-offset: -2px;
}
.reelief-tt-shelf-label {
  font-size: 15px;
  font-weight: 600;
}
.reelief-tt-shelf-chevron {
  margin-left: auto;
  flex: none;
  display: flex;
  color: #75757a;
  transition: transform 150ms ease;
}
.reelief-tt-shelf-row[aria-expanded='true'] .reelief-tt-shelf-chevron {
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

export const tiktok = {
  id: 'tiktok',
  hostname: 'tiktok.com',
  shortsPathPattern: SHORTS_PATH_PATTERN,
  shelfCheckPathPattern: SHELF_CHECK_PATH_PATTERN,
  // Not tiktok.com's bare domain root: "/" *is* the immersive feed here (see
  // file header), so it's not a safe redirect target the way every other
  // platform's homeUrl is. "/explore" is the closest TikTok equivalent of a
  // non-addictive landing page — a static grid one click away from anything,
  // not an autoplaying scroll.
  homeUrl: 'https://www.tiktok.com/explore',
  ...PLATFORM_INFO.tiktok, // displayName, siteName, homeLabel, feedLabel, feedPath

  // Whole-grid granularity, not per-thumbnail (see file header) — unlike
  // Instagram's one-shelf-per-post model, every item on these pages is
  // TikTok short-form content, so there's no "rest of the page" to leave
  // alone the way there is on a mixed Instagram feed.
  findShelves(root = document) {
    return findGridShelves(root);
  },

  // Same technique as instagram-reels.js/facebook-reels.js: a persistent
  // opaque row pinned at the shelf's top, clipping the rest via
  // max-height/overflow while collapsed. Grid thumbnails are static
  // previews (not autoplaying inline), same as Facebook's shelf, so there's
  // no inline-autoplay path to guard against and no click-catcher needed —
  // revealing the grid just shows TikTok's own real thumbnails, and
  // clicking any of them navigates into the normal friction/block gate.
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
    shelf.style.overflowAnchor = 'none';
    pauseVideos(shelf);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'reelief-tt-shelf-row';
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-label', COPY.shelf.expand(feedLabel));
    row.innerHTML = `
      <span class="reelief-tt-shelf-label">${COPY.shelf.label(feedLabel)}</span>
      <span class="reelief-tt-shelf-chevron">
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
      row.querySelector('.reelief-tt-shelf-label').textContent = expanded
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

  // Block mode / true zero footprint — same technique as the other two
  // React-owned adapters (collapsing to height:0 with overflow-anchor:none
  // avoids the scroll-jump that reserving space or a small visible gap
  // caused when first tried on Instagram).
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

  // "For You" (nav-foryou) is TikTok's home/logo link, not a separate
  // shorts-specific nav item the way YouTube/Instagram/Facebook each have —
  // there's no "safe" home nav entry distinct from it to leave alone, so
  // hiding it would remove basic navigation entirely, which no existing
  // adapter does. "Following" is a second, avoidable entry point into the
  // same immersive scroller (it also matches shortsPathPattern), so it's
  // the one treated here, the same way Instagram/Facebook dim their single
  // Reels nav icon rather than remove it in friction mode.
  findSidebarEntries(root = document) {
    const entry = root.querySelector('[data-e2e="nav-following"]');
    return entry ? [entry] : [];
  },

  // Friction mode dims but keeps it clickable — clicking still navigates to
  // /following, which content/entry.js's normal friction gate intercepts.
  // Block mode removes it entirely, same as every other platform.
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
