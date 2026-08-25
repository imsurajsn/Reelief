import { COPY } from '../../shared/copy.js';
import { PLATFORM_INFO } from '../../shared/platforms.js';

/**
 * Instagram adapter (implements shared/platform-adapter.js's PlatformAdapter shape).
 *
 * Verified live against instagram.com: Instagram's own class names are
 * hashed/atomic ("x1i10hfl xjbqb8w ...", regenerated on every deploy) and
 * carry no meaning, so unlike youtube-shorts.js there is no class-name
 * fallback to reach for here — none would survive a single redeploy. Every
 * lookup below is href/ARIA based instead, which is also what verified live:
 * a feed Reel post is a plain <article> (same element a photo post uses)
 * distinguished only by an "/reels/<shortcode>/" permalink inside it, and
 * the dedicated full-screen /reels/ player route uses neither <article> nor
 * that permalink shape at all — so findShelves naturally never matches
 * there, with no route check needed to keep it out of the friction-gated
 * player.
 */

const REEL_PERMALINK_PATTERN = /^\/reels?\/[^/]+\/?$/;

function isReelPermalink(href) {
  if (!href) return false;
  try {
    return REEL_PERMALINK_PATTERN.test(new URL(href, location.origin).pathname);
  } catch {
    return false;
  }
}

// A post's Reel-ness is read from its own permalink, not a class: verified
// live, a plain photo/video post that merely *uses* trending Reels audio
// also links to "/reels/audio/<id>/" (an extra path segment) — matching
// "/reels/" as a bare prefix would misfire on those. Only an exact
// "/reels/<shortcode>/" (or legacy "/reel/<shortcode>/") permalink counts.
function findReelPermalinks(root) {
  return Array.from(root.querySelectorAll('a[href^="/reel/"], a[href^="/reels/"]')).filter((a) =>
    isReelPermalink(a.getAttribute('href')),
  );
}

function findReelsNavLink(root) {
  const direct = root.querySelector('a[href="/reels/"]');
  if (direct) return direct;
  // Fallback: the nav icon's aria-label survives even if the href format
  // changes (e.g. a locale prefix).
  const bySvg = Array.from(root.querySelectorAll('svg[aria-label="Reels"]'))
    .map((svg) => svg.closest('a'))
    .find(Boolean);
  return bySvg ?? null;
}

const REEL_STYLE_ID = 'reelief-reel-style';

// Instagram's dark-theme palette couldn't be independently verified live in
// this session (no in-page toggle; OS-level prefers-color-scheme wasn't
// switchable here either) — rather than hardcode a guessed hex pair the way
// youtube-shorts.js's SHELF_CSS does for YouTube's verified tokens, this
// reads the live cascade instead: `Canvas` is the CSS system-color keyword
// for the page's own background and `currentColor` inherits the post's own
// text color, so the cover reads correctly in either theme without this
// file ever having to know which one is active.
const REEL_CSS = `
.reelief-reel-cover {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: color-mix(in srgb, currentColor 6%, Canvas);
  color: currentColor;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.reelief-reel-cover:hover,
.reelief-reel-cover:focus-visible {
  background: color-mix(in srgb, currentColor 10%, Canvas);
}
.reelief-reel-cover:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
.reelief-reel-cover-label {
  font-size: 14px;
  font-weight: 600;
}
.reelief-nav-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  /* Reelief's own brand accent (config/product.config.json's brand.color)
     — deliberately not matched to Instagram's palette, since this badge is
     meant to read as "Reelief did this", unlike the feed cover above which
     is meant to blend in. */
  background: #15574a;
  color: #fff;
  font: 700 9px/14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-align: center;
  pointer-events: none;
}
`;

function ensureStyleInjected() {
  if (document.getElementById(REEL_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = REEL_STYLE_ID;
  style.textContent = REEL_CSS;
  document.head.appendChild(style);
}

function pauseVideos(root) {
  root.querySelectorAll('video').forEach((v) => v.pause());
}

function resumeVideos(root) {
  root.querySelectorAll('video').forEach((v) => {
    v.play().catch(() => {}); // autoplay can be rejected without a user gesture — harmless here, the click that triggered this was one
  });
}

export const instagramReels = {
  id: 'instagram',
  hostname: 'instagram.com',
  shortsPathPattern: /^\/reels\//,
  homeUrl: 'https://www.instagram.com/',
  ...PLATFORM_INFO.instagram, // displayName, siteName, homeLabel, feedLabel, feedPath

  // FR-18 granularity: one inline feed post, not a shelf — see the file
  // header comment for how a Reel post is told apart from a photo post.
  findShelves(root = document) {
    return findReelPermalinks(root)
      .map((a) => a.closest('article') ?? a.closest('li') ?? a)
      .filter((el, i, arr) => arr.indexOf(el) === i);
  },

  // Friction mode: cover the post in place with a "Reel hidden" card,
  // rather than youtube-shorts.js's approach of moving the shelf's own
  // children into a wrapper. Instagram is a React app that keeps its own
  // reference to every DOM node it renders; moving or removing its
  // children from outside React risks a reconciliation error the next time
  // React re-renders that subtree. Leaving the original content untouched
  // and only adding a sibling cover on top (removed again on reveal/
  // restore) never conflicts with React's own bookkeeping.
  collapseShelf(shelf, onReveal) {
    if (shelf.dataset.reeliefCollapsed === 'true') return () => {};
    shelf.dataset.reeliefCollapsed = 'true';
    ensureStyleInjected();

    const priorPosition = shelf.style.position;
    if (getComputedStyle(shelf).position === 'static') {
      shelf.style.position = 'relative';
    }
    pauseVideos(shelf);

    const cover = document.createElement('button');
    cover.type = 'button';
    cover.className = 'reelief-reel-cover';
    cover.setAttribute('aria-label', COPY.reelItem.expand);
    cover.innerHTML = `<span class="reelief-reel-cover-label">${COPY.reelItem.label}</span>`;
    shelf.appendChild(cover);

    function reveal() {
      cover.remove();
      delete shelf.dataset.reeliefCollapsed;
      resumeVideos(shelf);
      onReveal?.();
    }
    cover.addEventListener('click', reveal);

    return function restore() {
      cover.remove();
      shelf.style.position = priorPosition;
      delete shelf.dataset.reeliefCollapsed;
      resumeVideos(shelf);
    };
  },

  // Block mode / FR-20: "fully hidden, not collapsed" — no placeholder, no
  // click-to-reveal. display:none (not youtube-shorts.js's .remove()) for
  // the same React-safety reason as collapseShelf above: it reaches the
  // same "no trace" visual result without detaching a node React still
  // holds a reference to.
  removeShelf(shelf) {
    pauseVideos(shelf);
    shelf.style.display = 'none';
  },

  findSidebarEntries(root = document) {
    const entry = findReelsNavLink(root);
    return entry ? [entry] : [];
  },

  // FR-17: friction mode greys out + small badge, stays clickable — unlike
  // YouTube's full display:none removal. Clicking still navigates to
  // /reels/, which content/entry.js's own SPA-navigation detection
  // intercepts with the normal friction overlay, so this only needs to
  // change how the icon looks, not how it behaves.
  //
  // Block mode instead removes the entry outright (same as YouTube's
  // treatment): there's nothing to click through to in block mode besides
  // an immediate redirect, so leaving a visible (even greyed) icon is just
  // a dangling temptation trigger with no corresponding affordance.
  hideSidebarEntry(entry, mode) {
    entry.querySelector('.reelief-nav-badge')?.remove();

    if (mode === 'block') {
      entry.style.display = 'none';
      entry.style.opacity = '';
      return;
    }

    entry.style.display = '';
    if (getComputedStyle(entry).position === 'static') {
      entry.style.position = 'relative';
    }
    entry.style.opacity = '0.45';

    ensureStyleInjected();
    const badge = document.createElement('span');
    badge.className = 'reelief-nav-badge';
    badge.textContent = 'R';
    badge.setAttribute('aria-hidden', 'true');
    entry.appendChild(badge);
  },
};
