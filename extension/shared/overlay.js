import { COPY, ordinal } from './copy.js';
import { currentLanguageMeta } from './i18n.js';
import { formatMinutesLong } from './time.js';

const FRICTION_SECONDS = 5; // OQ-1 resolved: fixed, no settings/options page in V1a
const BLOCK_SECONDS = 6; // FR-09 (updated from the PRD's original 3s — felt too fast in testing)
const HEAVY_OPENS_THRESHOLD = 10;
const RING_RADIUS = 8.4;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const FOCUSABLE_SELECTOR = 'button, [href], [tabindex]:not([tabindex="-1"])';

let activeOverlay = null; // module-level singleton — only one overlay at a time

function css(strings, ...values) {
  return strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '');
}

const OVERLAY_STYLES = css`
  :host {
    all: initial;
  }
  * {
    box-sizing: border-box;
  }
  .cover {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    background: rgba(14, 21, 18, 0.96);
    backdrop-filter: blur(8px);
    color: var(--paper);
    font-family: var(--font-sans);
  }
  .cover[data-variant='block'] {
    background: var(--block-bg);
    backdrop-filter: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .cover {
      background: rgba(14, 21, 18, 0.99);
      backdrop-filter: none;
    }
  }
  .brandRow {
    padding: 22px 28px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brandRow .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--block-accent);
  }
  .brandRow .word {
    font: 500 12px/1 var(--font-mono);
    letter-spacing: 0.14em;
    color: rgba(242, 239, 232, 0.62);
  }
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    /* "safe" keeps the top of the content reachable when the intention tiles
       make it taller than a short window; ignored (plain center) elsewhere. */
    justify-content: safe center;
    overflow-y: auto;
    padding: 0 96px;
    max-width: 820px;
  }
  @media (max-width: 640px) {
    .body {
      padding: 0 28px;
    }
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    font: 500 11px/1 var(--font-mono);
    letter-spacing: 0.1em;
    color: var(--amber);
  }
  .badge .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #d98a2b;
  }
  .headline {
    font: 400 52px/1.12 var(--font-serif);
    letter-spacing: -0.01em;
    margin: 0;
  }
  @media (max-width: 640px) {
    .headline {
      font-size: 28px;
    }
  }
  .headline em {
    font-style: italic;
  }
  .sub {
    margin-top: 18px;
    display: flex;
    align-items: baseline;
    gap: 28px;
    flex-wrap: wrap;
    font: 400 16px/1.5 var(--font-sans);
    color: rgba(242, 239, 232, 0.72);
  }
  .sub .divider {
    width: 1px;
    height: 16px;
    background: rgba(242, 239, 232, 0.24);
  }
  .heavySub {
    margin-top: 12px;
    font: 400 15px/1.5 var(--font-sans);
    color: rgba(242, 239, 232, 0.72);
  }
  .actions {
    margin-top: 44px;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  @media (max-width: 640px) {
    .actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
  button {
    font-family: var(--font-sans);
    cursor: pointer;
    border-radius: var(--radius-control);
    transition: background var(--ease-button), color var(--ease-button), border-color var(--ease-button);
  }
  button:focus-visible {
    outline: 2px solid #8fd0be;
    outline-offset: 3px;
  }
  .btnLeave {
    height: 52px;
    padding: 0 26px;
    border: none;
    background: var(--paper);
    color: var(--ink);
    font: 600 15px/1 var(--font-sans);
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .btnLeave:hover {
    background: #fff;
  }
  .btnWait {
    height: 52px;
    padding: 0 22px;
    border: 1px solid rgba(242, 239, 232, 0.22);
    background: transparent;
    color: rgba(242, 239, 232, 0.45);
    font: 500 15px/1 var(--font-sans);
    display: inline-flex;
    align-items: center;
    gap: 12px;
    cursor: not-allowed;
  }
  .btnWait[data-ready='true'] {
    border-color: rgba(242, 239, 232, 0.55);
    color: var(--paper);
    cursor: pointer;
  }
  .btnWait[data-ready='true']:hover {
    background: rgba(242, 239, 232, 0.1);
  }
  .btnWait .waitLabel {
    font-variant-numeric: tabular-nums;
  }
  .ring {
    flex: none;
  }
  .ring circle.progress {
    transition: stroke-dashoffset 1000ms linear;
  }
  @media (prefers-reduced-motion: reduce) {
    .ring {
      display: none;
    }
  }
  .foot {
    margin-top: 26px;
    font: 400 13px/1.6 var(--font-sans);
    color: rgba(242, 239, 232, 0.42);
  }
  /* block mode */
  .blockSub {
    margin-top: 16px;
    font: 400 15px/1.5 var(--font-sans);
    color: rgba(242, 239, 232, 0.6);
  }
  .blockSub .n {
    font-family: var(--font-mono);
    color: var(--paper);
  }
  .progressTrack {
    margin-top: 26px;
    height: 4px;
    border-radius: 999px;
    background: rgba(242, 239, 232, 0.16);
    overflow: hidden;
  }
  .progressFill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: var(--block-accent);
    width: 0%;
    transition: width ${BLOCK_SECONDS * 1000}ms linear;
  }
  .blockActions {
    margin-top: 22px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .btnSkip {
    height: 40px;
    padding: 0 16px;
    border: 1px solid rgba(242, 239, 232, 0.22);
    background: transparent;
    color: rgba(242, 239, 232, 0.7);
    font: 500 13px/1 var(--font-sans);
  }
  .btnSkip:hover {
    background: rgba(242, 239, 232, 0.08);
  }
  .hint {
    font: 400 13px/1.5 var(--font-sans);
    color: rgba(242, 239, 232, 0.38);
  }
  /* FR-41 intention prompt: three icon tiles above the buttons. */
  .intent {
    margin-top: 34px;
  }
  .intent + .actions {
    margin-top: 30px;
  }
  .intentLabel {
    font: 500 11px/1 var(--font-mono);
    letter-spacing: 0.12em;
    color: rgba(242, 239, 232, 0.5);
  }
  .tiles {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 190px));
    gap: 12px;
  }
  @media (max-width: 640px) {
    .tiles {
      grid-template-columns: 1fr;
    }
  }
  .tile {
    min-height: 108px;
    padding: 16px;
    border: 1px solid rgba(242, 239, 232, 0.2);
    border-radius: 12px;
    background: rgba(242, 239, 232, 0.03);
    color: var(--paper);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    text-align: start;
    font: 500 14px/1.3 var(--font-sans);
  }
  .tile svg {
    flex: none;
    color: rgba(242, 239, 232, 0.75);
  }
  .tile:hover {
    border-color: rgba(242, 239, 232, 0.5);
  }
  .tile[aria-pressed='true'] {
    background: var(--paper);
    border-color: var(--paper);
    color: var(--ink);
  }
  .tile[aria-pressed='true'] svg {
    color: var(--ink);
  }
  @media (max-width: 640px) {
    .tile {
      min-height: 0;
      flex-direction: row;
      align-items: center;
    }
  }
`;

// FR-41: the three reasons behind the intention tiles. The reason someone picks
// is never stored or sent anywhere — it only unlocks Continue.
const INTENTION_ICONS = {
  specific:
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
  noise:
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
  break:
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 10h11v4a5 5 0 01-5 5h-1a5 5 0 01-5-5v-4z"/><path d="M16 11h1.5a2.5 2.5 0 010 5H16"/><path d="M8 4v2M12 4v2"/></svg>',
};

function intentionTilesHtml() {
  const reasons = [
    ['specific', COPY.overlay.intentSpecific],
    ['noise', COPY.overlay.intentNoise],
    ['break', COPY.overlay.intentBreak],
  ];
  return `
    <div class="intent" role="group" aria-labelledby="reelief-intent-label">
      <div class="intentLabel" id="reelief-intent-label">${COPY.overlay.intentLabel}</div>
      <div class="tiles">
        ${reasons
          .map(
            ([id, label]) =>
              `<button type="button" class="tile" data-reason="${id}" aria-pressed="false">${INTENTION_ICONS[id]}<span>${label}</span></button>`,
          )
          .join('')}
      </div>
    </div>`;
}

function buildShell(tokensHref, fontsHref) {
  const host = document.createElement('div');
  host.id = 'reelief-overlay-host';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <link rel="stylesheet" href="${tokensHref}">
    <link rel="stylesheet" href="${fontsHref}">
    <style>${OVERLAY_STYLES}</style>
    <div class="cover" role="dialog" aria-modal="true" aria-labelledby="reelief-headline" dir="${currentLanguageMeta().dir}" lang="${currentLanguageMeta().code}">
      <div class="brandRow"><span class="dot"></span><span class="word">REELIEF</span></div>
      <div class="body"></div>
    </div>
  `;
  return { host, shadow, cover: shadow.querySelector('.cover'), body: shadow.querySelector('.body') };
}

function lockScroll() {
  document.documentElement.style.overflow = 'hidden';
}

function unlockScroll() {
  document.documentElement.style.overflow = '';
}

function trapFocus(container, initialFocusEl) {
  function onKeydown(e) {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.disabled,
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  container.addEventListener('keydown', onKeydown);
  initialFocusEl?.focus();
  return () => container.removeEventListener('keydown', onKeydown);
}

/**
 * Mounts the friction overlay (design 2.1-2.5). `model` describes today's
 * state; `handlers.onLeave`/`handlers.onContinue` are called on user choice.
 * Returns a destroy() to remove the overlay (also called internally once a
 * choice is made).
 *
 * `model.recurring: true` renders the recurring re-friction variant
 * instead — triggered by elapsed continuous watch time, not a new visit,
 * so it skips the ordinal/heavy-day framing entirely and uses
 * `model.elapsedMinutes` instead of `model.opens`/`model.minutes`. Same
 * countdown, buttons, focus trap and visibility-pause behavior either way.
 *
 * `model.intention: true` (FR-41, the opt-in "Ask why I'm here" setting) adds
 * three reason tiles above the buttons; Continue then needs the countdown to
 * finish AND one tile picked. The wait itself is unchanged, the pick is kept
 * only in memory, and the recurring variant never asks.
 */
export function showFrictionOverlay(model, handlers) {
  destroyActiveOverlay();

  const tokensHref = chrome.runtime.getURL('styles/tokens.css');
  const fontsHref = chrome.runtime.getURL('styles/fonts.css');
  const { host, shadow, cover, body } = buildShell(tokensHref, fontsHref);

  const isRecurring = Boolean(model.recurring);
  const askIntention = Boolean(model.intention) && !isRecurring;
  const isFirstOpen = !isRecurring && model.opens === 0;
  const isHeavy = !isRecurring && model.opens + 1 >= HEAVY_OPENS_THRESHOLD;
  const minutesLabel = !isRecurring && model.opens > 0 ? formatMinutesLong(model.minutes) : null;

  const headlineHtml = isRecurring
    ? COPY.overlay.recurringTitle(model.elapsedMinutes)
    : isFirstOpen
      ? COPY.overlay.titleFirst(model.feedLabel)
      : COPY.overlay.titleN(model.opens + 1, model.feedLabel).replace(
          ordinal(model.opens + 1),
          `<em>${ordinal(model.opens + 1)}</em>`,
        );

  body.innerHTML = `
    ${isHeavy ? `<div class="badge"><span class="dot"></span><span>${COPY.overlay.heavyBadge(model.opens + 1, formatMinutesLong(model.minutes))}</span></div>` : ''}
    <h1 class="headline" id="reelief-headline">${headlineHtml}</h1>
    ${
      isRecurring
        ? `<div class="sub"><span>${COPY.overlay.recurringSub}</span></div>`
        : isFirstOpen
          ? `<div class="sub"><span>${COPY.overlay.subFirst}</span></div>`
          : isHeavy
            ? `<div class="heavySub">${COPY.overlay.heavy(minutesLabel)}</div>`
            : `<div class="sub"><span>${COPY.overlay.subMinutes(minutesLabel)}</span><span class="divider"></span><span>${COPY.overlay.subTake}</span></div>`
    }
    ${askIntention ? intentionTilesHtml() : ''}
    <div class="actions">
      <button type="button" class="btnLeave">${COPY.overlay.ctaLeave}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button type="button" class="btnWait" data-ready="false" disabled aria-disabled="true">
        <svg class="ring" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="${RING_RADIUS}" stroke="rgba(242,239,232,.22)" stroke-width="2.2" fill="none"/>
          <circle class="progress" cx="10" cy="10" r="${RING_RADIUS}" stroke="rgba(242,239,232,.55)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="0" transform="rotate(-90 10 10)"/>
        </svg>
        <span class="waitLabel">${COPY.overlay.ctaWait(FRICTION_SECONDS)}</span>
      </button>
    </div>
    <div class="foot">${COPY.overlay.foot}</div>
  `;

  document.documentElement.append(host);
  lockScroll();

  const leaveBtn = shadow.querySelector('.btnLeave');
  const waitBtn = shadow.querySelector('.btnWait');
  const ringProgress = shadow.querySelector('.progress');
  const waitLabelEl = waitBtn.querySelector('.waitLabel');
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)';
  shadow.appendChild(liveRegion);

  let secondsRemaining = FRICTION_SECONDS;
  let intervalId = null;

  function announceIfNeeded() {
    if (secondsRemaining === 3 || secondsRemaining === 0) {
      liveRegion.textContent = COPY.overlay.secondsLeft(secondsRemaining);
    }
  }

  function tick() {
    secondsRemaining -= 1;
    ringProgress.setAttribute(
      'stroke-dashoffset',
      String(RING_CIRCUMFERENCE * (1 - secondsRemaining / FRICTION_SECONDS)),
    );
    if (secondsRemaining <= 0) {
      stopTicking();
      finishCountdown();
    } else {
      waitLabelEl.textContent = COPY.overlay.ctaWait(secondsRemaining);
      announceIfNeeded();
    }
  }

  // FR-41: with the intention prompt on, Continue needs the countdown AND a
  // picked reason. `countdownDone` / `reasonPicked` live only in this closure.
  let countdownDone = false;
  let reasonPicked = false;

  function unlockContinue() {
    waitBtn.dataset.ready = 'true';
    waitBtn.disabled = false;
    waitBtn.removeAttribute('aria-disabled');
    waitBtn.querySelector('.waitLabel').textContent = COPY.overlay.ctaReady;
    announceIfNeeded();
  }

  function finishCountdown() {
    countdownDone = true;
    if (askIntention && !reasonPicked) {
      // Wait is over but no reason yet: stay locked and say why.
      waitLabelEl.textContent = COPY.overlay.ctaPick;
      liveRegion.textContent = COPY.overlay.ctaPick;
      return;
    }
    unlockContinue();
  }

  const tileButtons = Array.from(shadow.querySelectorAll('.tile'));
  tileButtons.forEach((tile) => {
    tile.addEventListener('click', () => {
      tileButtons.forEach((t) => t.setAttribute('aria-pressed', String(t === tile)));
      reasonPicked = true;
      if (countdownDone) unlockContinue();
    });
  });

  // The countdown only advances while this tab is the visible/active one.
  // Without this, opening several Shorts links at once (e.g. middle-click
  // into background tabs) lets every overlay's countdown finish before the
  // user ever looks at them — "Continue anyway" is ready the instant they
  // switch tabs, so the pause never actually happens. A tab opened directly
  // in the background never starts ticking until it's first brought to
  // the front, which is exactly the intent: the wait only counts when
  // someone is actually looking at it.
  function startTicking() {
    if (intervalId) return;
    intervalId = setInterval(tick, 1000);
  }
  function stopTicking() {
    clearInterval(intervalId);
    intervalId = null;
  }
  function onVisibilityChange() {
    if (document.hidden) stopTicking();
    else startTicking();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);
  if (!document.hidden) startTicking();

  const cleanupFocusTrap = trapFocus(cover, leaveBtn);

  function onLeave() {
    handlers.onLeave?.();
    destroyActiveOverlay();
  }

  function onContinue() {
    if (waitBtn.dataset.ready !== 'true') return;
    handlers.onContinue?.();
    destroyActiveOverlay();
  }

  leaveBtn.addEventListener('click', onLeave);
  waitBtn.addEventListener('click', onContinue);

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onLeave();
    }
  }
  document.addEventListener('keydown', onKeydown, true);

  activeOverlay = {
    host,
    destroy() {
      stopTicking();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('keydown', onKeydown, true);
      cleanupFocusTrap();
      host.remove();
      unlockScroll();
    },
  };

  return () => destroyActiveOverlay();
}

/**
 * Mounts the block-mode overlay (design 3.1). Never offers a continue path.
 * `platform.homeLabel` (e.g. "youtube.com") is interpolated into the
 * "returning to X" copy — see shared/platforms.js for where it comes from.
 */
export function showBlockOverlay(handlers, platform) {
  destroyActiveOverlay();

  const tokensHref = chrome.runtime.getURL('styles/tokens.css');
  const fontsHref = chrome.runtime.getURL('styles/fonts.css');
  const { host, shadow, cover, body } = buildShell(tokensHref, fontsHref);
  cover.dataset.variant = 'block';
  cover.querySelector('.word').textContent = `REELIEF · ${COPY.block.badge}`;
  cover.querySelector('.brandRow .dot').style.background = 'var(--block-accent)';

  const subText = COPY.block.sub(BLOCK_SECONDS, platform.homeLabel);
  body.innerHTML = `
    <h1 class="headline" id="reelief-headline">${COPY.block.title}</h1>
    <div class="blockSub">${subText.replace(String(BLOCK_SECONDS), `<span class="n">${BLOCK_SECONDS}</span>`)}</div>
    <div class="progressTrack"><span class="progressFill"></span></div>
    <div class="blockActions">
      <button type="button" class="btnSkip">${COPY.block.skip}</button>
      <span class="hint">${COPY.block.hint}</span>
    </div>
  `;

  document.documentElement.append(host);
  lockScroll();

  const fill = shadow.querySelector('.progressFill');
  const skipBtn = shadow.querySelector('.btnSkip');
  const subEl = shadow.querySelector('.blockSub .n');

  // Force a layout flush so the width transition actually animates from 0.
  requestAnimationFrame(() => {
    fill.style.width = '100%';
  });

  let secondsRemaining = BLOCK_SECONDS;
  const intervalId = setInterval(() => {
    secondsRemaining -= 1;
    if (subEl) subEl.textContent = String(Math.max(secondsRemaining, 0));
    if (secondsRemaining <= 0) clearInterval(intervalId);
  }, 1000);

  const redirectTimeout = setTimeout(() => {
    handlers.onRedirect?.();
  }, BLOCK_SECONDS * 1000);

  skipBtn.addEventListener('click', () => {
    clearTimeout(redirectTimeout);
    clearInterval(intervalId);
    handlers.onRedirect?.();
  });

  trapFocus(cover, skipBtn);

  activeOverlay = {
    host,
    destroy() {
      clearInterval(intervalId);
      clearTimeout(redirectTimeout);
      host.remove();
      unlockScroll();
    },
  };
}

export function destroyActiveOverlay() {
  if (activeOverlay) {
    activeOverlay.destroy();
    activeOverlay = null;
  }
}
