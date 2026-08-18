import { COPY } from '../../shared/copy.js';

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

    const content = document.createElement('div');
    while (shelf.firstChild) content.appendChild(shelf.firstChild);
    // Panel styling makes the expanded content read as attached to the bar
    // above it (an accordion body), not an unrelated block of thumbnails
    // floating below a chip.
    content.style.cssText =
      'display:none;padding:16px;box-sizing:border-box;background:#F8FAF9;' +
      'border:1px dashed rgba(21,87,74,.4);border-top:none;border-radius:0 0 10px 10px;';

    // Force the shelf itself to span the full content column. YouTube's
    // own renderer may apply an inline-ish/centered layout to the custom
    // element; without this override the placeholder inherits that and
    // renders as a small centered chip instead of a full-width bar.
    // margin-bottom lives on the shelf (not the bar) so spacing to the
    // next row stays constant whether the panel is collapsed or expanded.
    shelf.style.display = 'block';
    shelf.style.width = '100%';
    shelf.style.boxSizing = 'border-box';
    shelf.style.marginBottom = '20px';

    const bar = document.createElement('div');
    bar.setAttribute('data-reelief-placeholder', 'shelf');
    bar.style.cssText =
      'width:100%;box-sizing:border-box;height:52px;border-radius:10px;' +
      'border:1px dashed rgba(21,87,74,.4);background:#EDF3F0;cursor:pointer;' +
      'display:flex;align-items:center;padding:0 16px;gap:12px;font-family:system-ui,sans-serif;';

    const label = document.createElement('span');
    label.style.cssText = 'font-weight:500;font-size:13px;color:#15574A';
    label.textContent = COPY.shelf.label;

    // A real <button> for keyboard/screen-reader operability; the click
    // handler lives on `bar` so the whole row is also a click target
    // (design feedback: chevron-only was too small a hit area).
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label', COPY.shelf.expand);
    toggleBtn.style.cssText =
      'margin-left:auto;width:32px;height:32px;border:1px solid rgba(21,87,74,.35);' +
      'border-radius:7px;background:#fff;color:#15574A;cursor:pointer;pointer-events:none;' +
      'display:flex;align-items:center;justify-content:center;transition:transform 120ms ease;';
    toggleBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<path d="M4 6.5 8 10.5 12 6.5" stroke="#15574A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    bar.append(label, toggleBtn);
    shelf.appendChild(bar);
    shelf.appendChild(content);

    let expanded = false;
    function setExpanded(next) {
      expanded = next;
      content.style.display = expanded ? 'block' : 'none';
      bar.style.borderRadius = expanded ? '10px 10px 0 0' : '10px';
      toggleBtn.style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
      toggleBtn.setAttribute('aria-expanded', String(expanded));
      toggleBtn.setAttribute('aria-label', expanded ? COPY.shelf.collapse : COPY.shelf.expand);
      label.textContent = expanded ? COPY.shelf.expandedLabel : COPY.shelf.label;
      shelf.dataset.reeliefCollapsed = String(!expanded);
      if (expanded) onReveal?.();
    }
    // pointer-events:none on the button means mouse clicks land on `bar`
    // directly; keyboard activation (Enter/Space while the button is
    // focused) still dispatches the button's own 'click' event, which
    // bubbles up to this same listener — so every path fires setExpanded
    // exactly once, never twice.
    bar.addEventListener('click', () => setExpanded(!expanded));

    return function restore() {
      shelf.style.marginBottom = '';
      bar.remove();
      while (content.firstChild) shelf.appendChild(content.firstChild);
      content.remove();
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
