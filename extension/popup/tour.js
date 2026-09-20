/**
 * First-run quick tour (FR-37). After the user accepts the offer card, this
 * steps through the popup's real sections one at a time: everything dims
 * except the current target, and a small card next to it explains that
 * section, with Next and Skip tour always visible.
 *
 * Steps are resolved from the live DOM, not hardcoded positions, so a step
 * whose target doesn't exist is simply left out — Block mode has no
 * "remind me every" stepper (FR-15a), so there the tour is one step shorter.
 *
 * Everything is appended to <body>, deliberately outside #app: popup.js
 * rebuilds #app's innerHTML on every storage change, which would delete an
 * overlay living inside it mid-step. A MutationObserver on #app re-finds the
 * target and re-positions the spotlight after each rebuild instead.
 */

import { COPY } from '../shared/copy.js';

const SPOTLIGHT_PAD = 8;
const CARD_MARGIN = 12; // gap between the spotlight and the card

// `id` keys the copy (tour.<id>.title / .body in shared/locales/*.js).
const STEPS = [
  { id: 'today', pick: (app) => app.querySelector('.statRow') },
  { id: 'language', pick: (app) => app.querySelector('.langSelect') },
  { id: 'trend', pick: (app) => app.querySelector('.trendChart') },
  // The whole MODE block (label + switch + helper text), so the explanation
  // sits beside the sentence that already describes the selected mode.
  { id: 'mode', pick: (app) => app.querySelector('.modeSwitch')?.parentElement },
  { id: 'reminder', pick: (app) => app.querySelector('.recurringProgress') },
  { id: 'more', pick: (app) => app.querySelector('.moreBtn') },
];

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/**
 * Runs the tour over `app` (the popup's #app element). Resolves when the
 * user finishes, skips, or presses Esc.
 */
export function startTour(app) {
  return new Promise((resolve) => {
    const steps = STEPS.filter((s) => s.pick(app));
    if (steps.length === 0) {
      resolve();
      return;
    }

    let index = 0;
    const opener = document.activeElement;

    // Transparent click-catcher so the highlighted control (and the rest of
    // the popup) can't be operated while the tour is up; the spotlight itself
    // is pointer-events:none.
    const shield = el('div', 'tourShield');
    const hole = el('div', 'tourHole');
    const card = el('div', 'tourCard', { role: 'dialog', 'aria-modal': 'true', 'aria-label': COPY.tour.aria });
    card.innerHTML = `
      <span class="tourArrow"></span>
      <div class="tourTop">
        <span class="tourStep"></span>
        <span class="tourDots" aria-hidden="true"></span>
      </div>
      <div aria-live="polite">
        <h4 class="tourTitle"></h4>
        <p class="tourBody"></p>
      </div>
      <div class="tourRow">
        <button type="button" class="tourSkip">${COPY.tour.skip}</button>
        <button type="button" class="tourNext"></button>
      </div>`;
    document.body.append(shield, hole, card);

    const $ = (sel) => card.querySelector(sel);
    const arrow = $('.tourArrow');
    const nextBtn = $('.tourNext');
    const skipBtn = $('.tourSkip');

    const currentTarget = () => steps[index].pick(app);

    function place() {
      const target = currentTarget();
      if (!target) return;
      const r = target.getBoundingClientRect();
      const height = Math.max(r.height, target.scrollHeight);
      Object.assign(hole.style, {
        left: `${r.left - SPOTLIGHT_PAD}px`,
        top: `${r.top - SPOTLIGHT_PAD}px`,
        width: `${r.width + SPOTLIGHT_PAD * 2}px`,
        height: `${height + SPOTLIGHT_PAD * 2}px`,
      });

      const cardH = card.offsetHeight;
      const cardW = card.offsetWidth;
      const below = r.top + height / 2 < window.innerHeight / 2;
      const top = below
        ? r.top + height + SPOTLIGHT_PAD + CARD_MARGIN
        : r.top - SPOTLIGHT_PAD - CARD_MARGIN - cardH;
      const left = Math.round((window.innerWidth - cardW) / 2);
      card.style.left = `${left}px`;
      card.style.top = `${Math.max(8, Math.min(top, window.innerHeight - cardH - 8))}px`;

      // Arrow points at the target's centre, kept inside the card's rounded ends.
      const arrowX = r.left + r.width / 2 - left - 6;
      arrow.style.left = `${Math.min(Math.max(arrowX, 16), cardW - 28)}px`;
      arrow.style.top = below ? '-6px' : 'auto';
      arrow.style.bottom = below ? 'auto' : '-6px';
    }

    let raf = 0;
    const schedulePlace = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };

    function show() {
      const step = steps[index];
      const last = index === steps.length - 1;
      $('.tourStep').textContent = COPY.tour.stepOf(index + 1, steps.length);
      $('.tourDots').innerHTML = steps
        .map((_, i) => `<i class="tourDot${i === index ? ' on' : i < index ? ' done' : ''}"></i>`)
        .join('');
      $('.tourTitle').textContent = COPY.tour.title(step.id);
      $('.tourBody').textContent = COPY.tour.body(step.id);
      nextBtn.textContent = last ? COPY.tour.done : COPY.tour.next;

      const target = currentTarget();
      // Instant, not smooth: the spotlight is measured right after, and a
      // smooth scroll would leave it pointing at a moving target.
      if (target?.closest('.main')) target.scrollIntoView({ block: 'center', behavior: 'instant' });
      place();
      nextBtn.focus({ preventScroll: true });
    }

    function finish() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', schedulePlace);
      shield.remove();
      hole.remove();
      card.remove();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      resolve();
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish();
      } else if (e.key === 'Tab') {
        // Keep focus inside the card: only Skip tour and Next are reachable.
        e.preventDefault();
        (document.activeElement === nextBtn ? skipBtn : nextBtn).focus();
      }
    }

    nextBtn.addEventListener('click', () => {
      if (index === steps.length - 1) finish();
      else {
        index += 1;
        show();
      }
    });
    skipBtn.addEventListener('click', finish);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', schedulePlace);

    // popup.js replaces #app's children on every storage write (a tab logging
    // an open, the recurring-progress ticker, ...). Re-find the target and
    // re-place the spotlight; the tour's own nodes live outside #app, so this
    // can't feed back on itself.
    const observer = new MutationObserver(schedulePlace);
    observer.observe(app, { childList: true, subtree: true });

    show();
  });
}
