import { COPY } from '../../shared/copy.js';
import { watchHostTheme } from '../../shared/host-theme.js';

/**
 * YouTube adapter (implements shared/platform-adapter.js's PlatformAdapter shape).
 *
 * YouTube's DOM changes without notice (PRD Risk 1), so every lookup tries
 * several independent strategies — URL/attribute based first, text-content
 * based as a last resort — rather than a single CSS class. If YOU are
 * patching this file after a YouTube redesign broke it: add a new
 * strategy to the relevant array below, don't replace the old ones (a
 * strategy that stops matching is harmless; one that's missing breaks
 * detection for whoever's browser hasn't rolled out the new design yet).
 */

const SHELF_STYLE_ID = 'reelief-shelf-style';

// Real YouTube design tokens (verified against youtube.com's own dark/light
// theme, not an invented brand palette) — this is what makes the "Shorts
// hidden" row read as part of the page instead of an extension bolted on.
//   dark:  page #0F0F0F, chip/rest #272727, chip/hover #3F3F3F, text #F1F1F1, secondary #AAAAAA
//   light: page #FFFFFF, chip/rest #F2F2F2, chip/hover #E5E5E5, text #0F0F0F, secondary #606060
// YouTube's own filter chips (the "All / Music / Gaming" pills under the
// search bar) carry that grey fill *at rest*, not only on hover — a plain
// shelf-header row is transparent at rest, but a status/toggle affordance
// like this one is closer to a chip than a shelf header, and a fully
// transparent rest state made it nearly invisible against a light page
// (a real bug, not just a style choice — see host-theme.js's fix). So this
// treats the whole collapsed+expanded construct as a chip: a visible tint
// at rest, a stronger tint on hover/focus, never fully flush.
const SHELF_CSS = `
.reelief-shelf-row {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-family: Roboto, Arial, sans-serif;
  transition: background-color 150ms ease;
}
.reelief-shelf-row[data-reelief-theme='dark'] {
  color: #f1f1f1;
  background: #272727;
}
.reelief-shelf-row[data-reelief-theme='light'] {
  color: #0f0f0f;
  background: #f2f2f2;
}
.reelief-shelf-row[data-reelief-theme='dark']:hover,
.reelief-shelf-row[data-reelief-theme='dark']:focus-visible {
  background: #3f3f3f;
}
.reelief-shelf-row[data-reelief-theme='light']:hover,
.reelief-shelf-row[data-reelief-theme='light']:focus-visible {
  background: #e5e5e5;
}
.reelief-shelf-row:focus-visible {
  outline: 2px solid #3ea6ff;
  outline-offset: -2px;
}
.reelief-shelf-row[aria-expanded='true'] {
  border-radius: 8px 8px 0 0;
}
.reelief-shelf-label {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
}
.reelief-shelf-chevron {
  margin-left: auto;
  flex: none;
  display: flex;
  transition: transform 150ms ease;
}
.reelief-shelf-row[data-reelief-theme='dark'] .reelief-shelf-chevron {
  color: #aaaaaa;
}
.reelief-shelf-row[data-reelief-theme='light'] .reelief-shelf-chevron {
  color: #606060;
}
.reelief-shelf-panel {
  box-sizing: border-box;
  padding: 12px;
  border-radius: 0 0 8px 8px;
}
.reelief-shelf-panel[data-reelief-theme='dark'] {
  background: #272727;
}
.reelief-shelf-panel[data-reelief-theme='light'] {
  background: #f2f2f2;
}
`;

function ensureShelfStyleInjected() {
  if (document.getElementById(SHELF_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SHELF_STYLE_ID;
  style.textContent = SHELF_CSS;
  document.head.appendChild(style);
}

const SHELF_SELECTOR_STRATEGIES = [
  'ytd-rich-shelf-renderer[is-shorts]',
  'ytd-reel-shelf-renderer',
  'ytd-rich-shelf-renderer:has(a[href^="/shorts/"])',
];

const SIDEBAR_ENTRY_SELECTOR_STRATEGIES = [
  'ytd-guide-entry-renderer a[title="Shorts"]',
  'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
  'a[href="/shorts"]',
];

const SIDEBAR_ROW_SELECTOR = 'ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, tp-yt-paper-item';

function queryAllStrategies(selectors, root) {
  const found = new Set();
  for (const selector of selectors) {
    let matches;
    try {
      matches = root.querySelectorAll(selector);
    } catch {
      continue; // :has() unsupported in old engines — skip, other strategies cover it
    }
    matches.forEach((el) => found.add(el));
  }
  return Array.from(found);
}

function findShelvesByText(root) {
  // Last-resort strategy: any shelf-like renderer whose header text is
  // exactly "Shorts", independent of attributes/classes.
  const candidates = root.querySelectorAll('ytd-rich-shelf-renderer, ytd-reel-shelf-renderer');
  return Array.from(candidates).filter((el) => {
    const header = el.querySelector('#title, .ytd-shelf-renderer, h2');
    return header?.textContent?.trim() === 'Shorts';
  });
}

export const youtubeShorts = {
  id: 'youtube',
  shortsPathPattern: /^\/shorts\//,
  homeUrl: 'https://www.youtube.com/',
  homeLabel: 'youtube.com',

  findShelves(root = document) {
    const structural = queryAllStrategies(SHELF_SELECTOR_STRATEGIES, root);
    if (structural.length > 0) return structural;
    return findShelvesByText(root);
  },

  collapseShelf(shelf, onReveal) {
    if (shelf.dataset.reeliefCollapsed === 'true') return () => {};
    shelf.dataset.reeliefCollapsed = 'true';
    ensureShelfStyleInjected();

    const content = document.createElement('div');
    while (shelf.firstChild) content.appendChild(shelf.firstChild);

    // Shares the row's resting tint (set below via data-reelief-theme) so
    // the header + expanded thumbnails read as one continuous chip-like
    // unit, not two unrelated things stacked on top of each other.
    const panel = document.createElement('div');
    panel.className = 'reelief-shelf-panel';
    panel.style.display = 'none';
    panel.appendChild(content);

    // Force the shelf itself to span the full content column. YouTube's
    // own renderer may apply an inline-ish/centered layout to the custom
    // element; without this override the row inherits that and renders
    // narrow and centered instead of full-width. margin-bottom lives on
    // the shelf (not the row) so spacing to the next row stays constant
    // whether the panel is collapsed or expanded.
    shelf.style.display = 'block';
    shelf.style.width = '100%';
    shelf.style.boxSizing = 'border-box';
    shelf.style.marginBottom = '20px';

    // The whole row is one control — a single <button aria-expanded>,
    // styled like a YouTube filter chip (visible tint at rest, stronger
    // tint on hover/focus — see SHELF_CSS above) so it stays discoverable
    // instead of blending all the way into the page.
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'reelief-shelf-row';
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-label', COPY.shelf.expand);
    row.innerHTML = `
      <span class="reelief-shelf-label">${COPY.shelf.label}</span>
      <span class="reelief-shelf-chevron">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    `;

    shelf.appendChild(row);
    shelf.appendChild(panel);

    // watchHostTheme also stamps its own data-md-theme attribute on `row`
    // (a leftover of its general-purpose API) — harmless here since no CSS
    // in this file selects on it; only data-reelief-theme (set below) drives
    // this component's styling. Stamped on both row and panel so they stay
    // in sync if the user flips YouTube's own theme toggle mid-session.
    const stopWatchingTheme = watchHostTheme(row, {
      onChange: (theme) => {
        row.setAttribute('data-reelief-theme', theme);
        panel.setAttribute('data-reelief-theme', theme);
      },
    });

    let expanded = false;
    function setExpanded(next) {
      expanded = next;
      panel.style.display = expanded ? 'block' : 'none';
      row.setAttribute('aria-expanded', String(expanded));
      row.setAttribute('aria-label', expanded ? COPY.shelf.collapse : COPY.shelf.expand);
      row.querySelector('.reelief-shelf-label').textContent = expanded
        ? COPY.shelf.expandedLabel
        : COPY.shelf.label;
      row.querySelector('.reelief-shelf-chevron').style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
      shelf.dataset.reeliefCollapsed = String(!expanded);
      if (expanded) onReveal?.();
    }
    row.addEventListener('click', () => setExpanded(!expanded));

    return function restore() {
      stopWatchingTheme();
      shelf.style.marginBottom = '';
      row.remove();
      while (content.firstChild) shelf.appendChild(content.firstChild);
      panel.remove();
      delete shelf.dataset.reeliefCollapsed;
    };
  },

  removeShelf(shelf) {
    shelf.remove();
  },

  findSidebarEntries(root = document) {
    const anchors = queryAllStrategies(SIDEBAR_ENTRY_SELECTOR_STRATEGIES, root);
    return anchors
      .map((a) => a.closest(SIDEBAR_ROW_SELECTOR) ?? a)
      .filter((el, i, arr) => arr.indexOf(el) === i);
  },

  hideSidebarEntry(entry) {
    entry.style.display = 'none';
  },
};
