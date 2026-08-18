import { COPY, ordinal } from './copy.js';
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
  .btnWait .secs {
    font-family: var(--font-mono);
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
    .ring + .waitLabel::before {
      content: 'Continue anyway in ';
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
`;

function buildShell(tokensHref, fontsHref) {
  const host = document.createElement('div');
  host.id = 'reelief-overlay-host';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <link rel="stylesheet" href="${tokensHref}">
    <link rel="stylesheet" href="${fontsHref}">
    <style>${OVERLAY_STYLES}</style>
    <div class="cover" role="dialog" aria-modal="true" aria-labelledby="reelief-headline">
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
 */
export function showFrictionOverlay(model, handlers) {
  destroyActiveOverlay();

  const tokensHref = chrome.runtime.getURL('styles/tokens.css');
  const fontsHref = chrome.runtime.getURL('styles/fonts.css');
  const { host, shadow, cover, body } = buildShell(tokensHref, fontsHref);

  const isFirstOpen = model.opens === 0;
  const isHeavy = model.opens + 1 >= HEAVY_OPENS_THRESHOLD;
  const minutesLabel = model.opens > 0 ? formatMinutesLong(model.minutes) : null;

  const headlineHtml = isFirstOpen
    ? COPY.overlay.titleFirst
    : COPY.overlay.titleN(model.opens + 1).replace(
        ordinal(model.opens + 1),
        `<em>${ordinal(model.opens + 1)}</em>`,
      );

  body.innerHTML = `
    ${isHeavy ? `<div class="badge"><span class="dot"></span><span>${COPY.overlay.heavyBadge(model.opens + 1, formatMinutesLong(model.minutes))}</span></div>` : ''}
    <h1 class="headline" id="reelief-headline">${headlineHtml}</h1>
    ${
      isFirstOpen
        ? `<div class="sub"><span>${COPY.overlay.subFirst}</span></div>`
        : isHeavy
          ? `<div class="heavySub">${COPY.overlay.heavy(minutesLabel)}</div>`
          : `<div class="sub"><span>${COPY.overlay.subMinutes(minutesLabel)}</span><span class="divider"></span><span>Take the pause, then choose.</span></div>`
    }
    <div class="actions">
      <button type="button" class="btnLeave">${COPY.overlay.ctaLeave}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button type="button" class="btnWait" data-ready="false" disabled aria-disabled="true">
        <svg class="ring" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="${RING_RADIUS}" stroke="rgba(242,239,232,.22)" stroke-width="2.2" fill="none"/>
          <circle class="progress" cx="10" cy="10" r="${RING_RADIUS}" stroke="rgba(242,239,232,.55)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="0" transform="rotate(-90 10 10)"/>
        </svg>
        <span class="waitLabel">Continue anyway · <span class="secs">${FRICTION_SECONDS}</span>s</span>
      </button>
    </div>
    <div class="foot">${COPY.overlay.foot}</div>
  `;

  document.documentElement.append(host);
  lockScroll();

  const leaveBtn = shadow.querySelector('.btnLeave');
  const waitBtn = shadow.querySelector('.btnWait');
  const ringProgress = shadow.querySelector('.progress');
  const secsEl = shadow.querySelector('.secs');
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)';
  shadow.appendChild(liveRegion);

  let secondsRemaining = FRICTION_SECONDS;
  let intervalId = null;

  function announceIfNeeded() {
    if (secondsRemaining === 3 || secondsRemaining === 0) {
      liveRegion.textContent = `${secondsRemaining} seconds`;
    }
  }

  function tick() {
    secondsRemaining -= 1;
    ringProgress.setAttribute(
      'stroke-dashoffset',
      String(RING_CIRCUMFERENCE * (1 - secondsRemaining / FRICTION_SECONDS)),
    );
    if (secondsRemaining <= 0) {
      clearInterval(intervalId);
      finishCountdown();
    } else {
      secsEl.textContent = String(secondsRemaining);
      announceIfNeeded();
    }
  }

  function finishCountdown() {
    waitBtn.dataset.ready = 'true';
    waitBtn.disabled = false;
    waitBtn.removeAttribute('aria-disabled');
    waitBtn.querySelector('.waitLabel').textContent = COPY.overlay.ctaReady;
    announceIfNeeded();
  }

  intervalId = setInterval(tick, 1000);

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
      clearInterval(intervalId);
      document.removeEventListener('keydown', onKeydown, true);
      cleanupFocusTrap();
      host.remove();
      unlockScroll();
    },
  };

  return () => destroyActiveOverlay();
}

/** Mounts the block-mode overlay (design 3.1). Never offers a continue path. */
export function showBlockOverlay(handlers) {
  destroyActiveOverlay();

  const tokensHref = chrome.runtime.getURL('styles/tokens.css');
  const fontsHref = chrome.runtime.getURL('styles/fonts.css');
  const { host, shadow, cover, body } = buildShell(tokensHref, fontsHref);
  cover.dataset.variant = 'block';
  cover.querySelector('.word').textContent = 'REELIEF · BLOCK MODE';
  cover.querySelector('.brandRow .dot').style.background = 'var(--block-accent)';

  body.innerHTML = `
    <h1 class="headline" id="reelief-headline">${COPY.block.title}</h1>
    <div class="blockSub">${COPY.block.sub(BLOCK_SECONDS).replace(String(BLOCK_SECONDS), `<span class="n">${BLOCK_SECONDS}</span>`)}</div>
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
