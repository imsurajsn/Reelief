import { COPY } from '../../shared/copy.js';
import { watchHostTheme } from '../../shared/host-theme.js';
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

// Collapsed-row height, in px. The post's own <article> is clipped to
// exactly this height while collapsed (max-height + overflow:hidden) so a
// hidden Reel takes up one slim row in the feed instead of reserving its
// full portrait-video height — several in a row no longer reads as a wall
// of blank cards. The row (below) is sized to match, so it fully occludes
// the clipped sliver of the real post underneath.
const ROW_HEIGHT_PX = 48;

// Instagram's own verified design tokens (standard, stable values Instagram
// has shipped for years, not an invented brand palette) — this is what
// makes the treatment read as part of Instagram's own UI instead of an
// extension bolted on, same reasoning as youtube-shorts.js's SHELF_CSS.
//   light: frame/row bg #F0F0F0, hover #E4E4E4, border #DBDBDB, text #262626, secondary #8E8E8E
//   dark:  frame/row bg #1E1E1E, hover #292929, border #333333, text #F5F5F5, secondary #A8A8A8
// Flat grey, not a gradient or the video's own thumbnail colors: an earlier
// version left the row's own background transparent, meaning it only ever
// relied on the *shelf* underneath for fill — but the shelf's fill sits
// behind the post's own real children (avatar, username, follow button,
// the video frame itself), which are still fully rendered in that same
// band and were never actually occluded, hence bleeding straight through
// under the "Reel hidden" text. The row needs its own solid, flat-colored
// fill to actually hide what's behind it — it's given the exact same
// color as the shelf's frame (SHELF_BG below) purely so the two visually
// read as one continuous surface; the shape/rounding still comes only
// from the shelf's own border-radius + overflow:hidden (giving the row
// its own border-radius here previously produced a corner clipping seam
// where the two roundings didn't quite agree).
const SHELF_BG = { light: '#f6f6f6', dark: '#1e1e1e' };
const SHELF_HOVER_BG = { light: '#ececec', dark: '#292929' };
const SHELF_BORDER = { light: '#e8e8e8', dark: '#2a2a2a' };
const SHELF_RADIUS_PX = 6;

const REEL_CSS = `
.reelief-reel-row {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: ${ROW_HEIGHT_PX}px;
  z-index: 2147483001;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.reelief-reel-row[data-reelief-theme='light'] {
  color: #262626;
  background: ${SHELF_BG.light};
}
.reelief-reel-row[data-reelief-theme='dark'] {
  color: #f5f5f5;
  background: ${SHELF_BG.dark};
}
.reelief-reel-row[data-reelief-theme='light']:hover,
.reelief-reel-row[data-reelief-theme='light']:focus-visible {
  background: ${SHELF_HOVER_BG.light};
}
.reelief-reel-row[data-reelief-theme='dark']:hover,
.reelief-reel-row[data-reelief-theme='dark']:focus-visible {
  background: ${SHELF_HOVER_BG.dark};
}
.reelief-reel-row:focus-visible {
  outline: 2px solid #0095f6;
  outline-offset: -2px;
}
.reelief-reel-row-label {
  font-size: 14px;
  font-weight: 600;
}
.reelief-reel-chevron {
  margin-left: auto;
  flex: none;
  display: flex;
  transition: transform 150ms ease;
}
.reelief-reel-row[data-reelief-theme='light'] .reelief-reel-chevron {
  color: #8e8e8e;
}
.reelief-reel-row[data-reelief-theme='dark'] .reelief-reel-chevron {
  color: #a8a8a8;
}
.reelief-reel-row[aria-expanded='true'] .reelief-reel-chevron {
  transform: rotate(180deg);
}
.reelief-reel-catcher {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  inset: ${ROW_HEIGHT_PX}px 0 0 0;
  z-index: 2147483000;
  cursor: pointer;
}
/* Sits over the whole post, below the row/catcher, pointer-events:none so
   it never blocks a click. Instagram's own action bar and caption block
   below the video paint their own opaque background (white in light theme
   even when everything around it is dark-adapted) — we have no stable
   selector to target that specific element directly (see file header:
   Instagram's classes are hashed and regenerate on every deploy), so this
   tints the whole area uniformly from above instead, which works
   regardless of what's underneath and keeps the expanded post reading as
   one "Reelief-touched" section rather than grey-frame-then-white-patch.
   z-index needs to be very high, not a small number like 1-3: verified
   live that Instagram's own engagement-bar element sits at a z-index high
   enough to paint over a low z-index sibling regardless of DOM order —
   every earlier color-tuning round was invisible on that area because the
   tint was never actually winning the paint order there at all. */
.reelief-reel-tint {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  inset: 0;
  z-index: 2147482999;
  pointer-events: none;
}
.reelief-reel-tint[data-reelief-theme='light'] {
  background: rgba(0, 0, 0, 0.1);
}
.reelief-reel-tint[data-reelief-theme='dark'] {
  background: rgba(255, 255, 255, 0.12);
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

export const instagramReels = {
  id: 'instagram',
  hostname: 'instagram.com',
  // Matches both /reels/ and legacy singular /reel/, same as
  // REEL_PERMALINK_PATTERN above — a permalink in either form must be
  // recognized as "in a Reel" here too, or entry.js's session tracking
  // (and everything hung off it: friction, video-pause-on-exit) silently
  // never engages for whichever form a given post happens to use.
  shortsPathPattern: /^\/reels?\//,
  homeUrl: 'https://www.instagram.com/',
  ...PLATFORM_INFO.instagram, // displayName, siteName, homeLabel, feedLabel, feedPath

  // FR-18 granularity: one inline feed post, not a shelf — see the file
  // header comment for how a Reel post is told apart from a photo post.
  findShelves(root = document) {
    return findReelPermalinks(root)
      .map((a) => a.closest('article') ?? a.closest('li') ?? a)
      .filter((el, i, arr) => arr.indexOf(el) === i);
  },

  // Friction mode: clip the post to a slim toggle row in place, rather
  // than youtube-shorts.js's approach of moving the shelf's own children
  // into a wrapper. Instagram is a React app that keeps its own reference
  // to every DOM node it renders; moving or removing its children from
  // outside React risks a reconciliation error the next time React
  // re-renders that subtree. Only ever adding sibling elements on top and
  // resizing via max-height/overflow (never touching the original
  // children) never conflicts with React's own bookkeeping.
  //
  // Expanding never autoplays: the underlying video is actively kept
  // paused (Instagram's own autoplay-on-scroll-into-view can otherwise
  // resume it behind our row), and a click anywhere on the revealed post
  // forwards to the post's own permalink anchor — which navigates to the
  // dedicated /reels/<id>/ page, where entry.js's normal friction/block
  // gate applies. There is no inline "just play it" path.
  collapseShelf(shelf, onReveal) {
    if (shelf.dataset.reeliefCollapsed === 'true') return () => {};
    shelf.dataset.reeliefCollapsed = 'true';
    ensureStyleInjected();

    const priorPosition = shelf.style.position;
    const priorMaxHeight = shelf.style.maxHeight;
    const priorOverflow = shelf.style.overflow;
    const priorMarginBottom = shelf.style.marginBottom;
    const priorBoxSizing = shelf.style.boxSizing;
    const priorBorderRadius = shelf.style.borderRadius;
    const priorBackground = shelf.style.background;
    const priorBorder = shelf.style.border;
    if (getComputedStyle(shelf).position === 'static') {
      shelf.style.position = 'relative';
    }
    // Consecutive Reels from the same account can render back to back with
    // no gap of their own (unlike regular feed posts, which Instagram
    // separates visually via each one's differing content) — set
    // explicitly, in both collapsed and expanded state, so spacing to
    // whatever comes next never depends on that.
    shelf.style.marginBottom = '16px';
    shelf.style.boxSizing = 'border-box';
    shelf.style.borderRadius = `${SHELF_RADIUS_PX}px`;
    // overflow:hidden is persistent (not toggled with expand/collapse):
    // when collapsed it's what clips the post down to the row's height;
    // when expanded, maxHeight below reverts to auto so the shelf grows to
    // fit its content and overflow:hidden clips nothing — but it keeps
    // rounded-corner clipping consistent in both states instead of only
    // while collapsed.
    shelf.style.overflow = 'hidden';
    pauseVideos(shelf);

    // Capture-phase so it catches Instagram (re)starting a <video> it owns,
    // for as long as this shelf is collapsed or expanded-but-not-opened —
    // scoped to this post only, unlike shared/video-guard.js's page-wide
    // guard used for the full overlay.
    function onPlaying(e) {
      if (e.target instanceof HTMLVideoElement) e.target.pause();
    }
    shelf.addEventListener('playing', onPlaying, true);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'reelief-reel-row';
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-label', COPY.reelItem.expand);
    row.innerHTML = `
      <span class="reelief-reel-row-label">${COPY.reelItem.label}</span>
      <span class="reelief-reel-chevron">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    `;

    const catcher = document.createElement('button');
    catcher.type = 'button';
    catcher.className = 'reelief-reel-catcher';
    catcher.style.display = 'none';
    catcher.setAttribute('aria-label', COPY.reelItem.open);
    catcher.addEventListener('click', () => {
      findReelPermalinks(shelf)[0]?.click();
    });

    const tint = document.createElement('div');
    tint.className = 'reelief-reel-tint';

    shelf.appendChild(tint);
    shelf.appendChild(row);
    shelf.appendChild(catcher);

    const stopWatchingTheme = watchHostTheme(row, {
      onChange: (theme) => {
        row.setAttribute('data-reelief-theme', theme);
        tint.setAttribute('data-reelief-theme', theme);
        shelf.style.background = SHELF_BG[theme];
        shelf.style.border = `1px solid ${SHELF_BORDER[theme]}`;
      },
    });

    let expanded = false;
    function setExpanded(next) {
      expanded = next;
      shelf.style.maxHeight = expanded ? priorMaxHeight : `${ROW_HEIGHT_PX}px`;
      catcher.style.display = expanded ? 'block' : 'none';
      row.setAttribute('aria-expanded', String(expanded));
      row.setAttribute('aria-label', expanded ? COPY.reelItem.collapse : COPY.reelItem.expand);
      row.querySelector('.reelief-reel-row-label').textContent = expanded
        ? COPY.reelItem.expandedLabel
        : COPY.reelItem.label;
      shelf.dataset.reeliefCollapsed = String(!expanded);
      if (!expanded) pauseVideos(shelf);
      if (expanded) onReveal?.();
    }
    setExpanded(false);
    row.addEventListener('click', () => setExpanded(!expanded));

    return function restore() {
      stopWatchingTheme();
      shelf.removeEventListener('playing', onPlaying, true);
      row.remove();
      catcher.remove();
      tint.remove();
      shelf.style.position = priorPosition;
      shelf.style.maxHeight = priorMaxHeight;
      shelf.style.overflow = priorOverflow;
      shelf.style.marginBottom = priorMarginBottom;
      shelf.style.boxSizing = priorBoxSizing;
      shelf.style.borderRadius = priorBorderRadius;
      shelf.style.background = priorBackground;
      shelf.style.border = priorBorder;
      delete shelf.dataset.reeliefCollapsed;
    };
  },

  // Block mode / FR-20: "fully hidden, not collapsed" — no placeholder, no
  // click-to-reveal, no label, no trace at all — true zero footprint.
  // Reserving each blocked post's full portrait height (via
  // visibility:hidden) avoided an earlier scroll-jump bug, but traded it
  // for a worse one on Reels-heavy accounts: several consecutive
  // full-height blanks made most of the page read as broken/empty. A
  // shrunk-but-still-visible strip was tried next and fixed that, but even
  // a small persistent gap still read as clutter once several stacked up
  // in a row — the goal is genuinely nothing there, not a smaller
  // something.
  //
  // Collapsing all the way to zero — verified live against a real
  // Reels-heavy feed in Block mode — does NOT reintroduce the scroll-jump:
  // that bug was the browser's native scroll-anchoring reacting to a
  // shrinking element near/above the viewport, and overflow-anchor:none is
  // the standard, purpose-built opt-out for exactly that, independent of
  // which height it shrinks to (rather than the blunter "never change
  // height at all" this used to rely on).
  removeShelf(shelf) {
    pauseVideos(shelf);
    // height:0 (not just max-height) + flex-shrink:0: Instagram's feed
    // items are flex children, and overflow:hidden resets a flex item's
    // automatic minimum size to 0 on its own anyway here — but pinning it
    // explicitly keeps this correct even if that browser quirk didn't
    // apply, rather than depending on it.
    shelf.style.height = '0';
    shelf.style.maxHeight = '0';
    shelf.style.flexShrink = '0';
    shelf.style.overflow = 'hidden';
    shelf.style.overflowAnchor = 'none';
    shelf.style.pointerEvents = 'none';
    shelf.style.marginBottom = '0';
  },

  findSidebarEntries(root = document) {
    const entry = findReelsNavLink(root);
    return entry ? [entry] : [];
  },

  // FR-17: friction mode greys out, stays clickable — unlike YouTube's full
  // display:none removal. Clicking still navigates to /reels/, which
  // content/entry.js's own SPA-navigation detection intercepts with the
  // normal friction overlay, so this only needs to change how the icon
  // looks, not how it behaves.
  //
  // Block mode instead removes the entry outright (same as YouTube's
  // treatment): there's nothing to click through to in block mode besides
  // an immediate redirect, so leaving a visible (even greyed) icon is just
  // a dangling temptation trigger with no corresponding affordance.
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
