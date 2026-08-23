import * as storage from '../shared/storage.js';
import { COPY } from '../shared/copy.js';
import { BRAND, iconMarkup } from '../shared/branding.js';
import { PLATFORM_INFO } from '../shared/platforms.js';

const PLATFORM_ID = 'youtube'; // V1a ships one platform; v1b/v1c widen this to a list.
const PLATFORM = PLATFORM_INFO[PLATFORM_ID];

// Recurring re-friction interval: 0 = off (default), 1-minute steps,
// capped at 1 hour. Typing or stepping past the max clamps to it and
// shows a brief note (see RECURRING_CAP_NOTE_MS).
const RECURRING_MIN = 0;
const RECURRING_MAX = 60;
const RECURRING_CAP_NOTE_MS = 2500;
let cappedNoteUntil = 0; // epoch ms; render() shows the cap note while Date.now() is before this

const app = document.getElementById('app');

function clampRecurring(rawValue) {
  const rounded = Math.round(rawValue);
  if (!Number.isFinite(rounded) || rounded < RECURRING_MIN) return { clamped: RECURRING_MIN, wasCapped: false };
  if (rounded > RECURRING_MAX) return { clamped: RECURRING_MAX, wasCapped: true };
  return { clamped: rounded, wasCapped: false };
}

async function commitRecurringMinutes(rawValue) {
  const { clamped, wasCapped } = clampRecurring(rawValue);
  if (wasCapped) {
    cappedNoteUntil = Date.now() + RECURRING_CAP_NOTE_MS;
    setTimeout(() => {
      cappedNoteUntil = 0;
      refresh();
    }, RECURRING_CAP_NOTE_MS);
  }
  await storage.setRecurringFrictionMinutes(clamped);
}

function statCard(valueHtml, caption, isZero, long = false) {
  return `
    <div class="statCard" data-zero="${isZero}">
      <div class="value"${long ? ' data-long="true"' : ''}>${valueHtml}</div>
      <div class="caption">${caption}</div>
    </div>
  `;
}

function opensCard(opens, isZero) {
  return statCard(String(opens), 'opens', isZero);
}

function timeCard(minutes, isZero) {
  // <60m: "12" + "m" unit. >=60m: combined "4h 32m" in one line (design 4.3).
  if (minutes < 60) {
    return statCard(`${minutes}<span class="unit">m</span>`, 'on Shorts', isZero);
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return statCard(`${h}<span class="unit">h</span> ${m}<span class="unit">m</span>`, 'on Shorts', isZero, true);
}

function render(state) {
  const { mode, counters, onboardingSeen, healthBanner, recurringMinutes } = state;
  const minutes = Math.floor(counters.seconds / 60);
  const isZero = counters.opens === 0;

  // Every storage write re-renders the whole popup via storage.onChanged
  // (app.innerHTML replacement below) — without this, each click on the
  // stepper (or any control) reset .main's scroll to the top, forcing a
  // re-scroll after every single interaction.
  const prevMain = app.querySelector('.main');
  const scrollTop = prevMain ? prevMain.scrollTop : 0;

  app.innerHTML = `
    <div class="header">
      ${iconMarkup(22)}
      <span class="name">${BRAND.name}</span>
      <span class="pill" data-mode="${mode}">
        <span class="dot"></span>
        <span class="label">${mode.toUpperCase()}</span>
      </span>
    </div>
    <div class="main">
      <div>
        <div class="sectionLabel">${COPY.popup.sectionToday([PLATFORM.displayName])}</div>
        <div class="statRow">
          ${opensCard(counters.opens, isZero)}
          ${timeCard(minutes, isZero)}
        </div>
        ${renderTodayFootnote(mode, counters, isZero)}
      </div>
      ${healthBanner.visible ? renderDegraded(healthBanner.since) : ''}
      <div class="divider"></div>
      <div>
        <div class="sectionLabel">MODE</div>
        <div class="modeSwitch" role="group" aria-label="Mode">
          <button type="button" data-tone="friction" aria-pressed="${mode === 'friction'}">Friction</button>
          <button type="button" data-tone="block" aria-pressed="${mode === 'block'}">Block</button>
        </div>
        <div class="helperText">${mode === 'friction' ? COPY.popup.modeFriction : COPY.popup.modeBlock(PLATFORM.homeLabel)}</div>
      </div>
      ${mode === 'friction' ? renderRecurringStepper(recurringMinutes) : ''}
    </div>
    <div class="footer">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" stroke="#5C5A50" stroke-width="1.4"/><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" stroke="#5C5A50" stroke-width="1.4" stroke-linecap="round"/></svg>
      <span class="privacy">${COPY.popup.privacy}</span>
      <span class="version">v${chrome.runtime.getManifest().version}</span>
    </div>
    ${!onboardingSeen ? renderOnboarding(mode) : ''}
  `;

  const newMain = app.querySelector('.main');
  if (newMain) newMain.scrollTop = scrollTop;

  app.querySelectorAll('.modeSwitch button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await storage.setMode(btn.dataset.tone);
    });
  });

  const onboardBtn = app.querySelector('.onboardTip button');
  onboardBtn?.addEventListener('click', async () => {
    await storage.setOnboardingSeen();
  });

  app.querySelector('[data-action="check-for-update"]')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'reelief:check-for-update' });
  });
  app.querySelector('[data-action="report"]')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'reelief:report' });
  });
  app.querySelector('[data-action="dismiss-health"]')?.addEventListener('click', async (e) => {
    await storage.dismissHealthBanner(PLATFORM_ID, Number(e.currentTarget.dataset.since));
  });

  const stepperInput = app.querySelector('.stepperInput');

  app.querySelectorAll('.stepperBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Base off whatever's currently typed (even if not yet committed via
      // blur/Enter), not the last-saved value — so typing "45" then
      // clicking + gives 46, not state.recurringMinutes + 1.
      const typed = stepperInput ? Number(stepperInput.value) : NaN;
      const base = Number.isFinite(typed) ? typed : state.recurringMinutes;
      const delta = btn.dataset.step === 'up' ? 1 : -1;
      commitRecurringMinutes(base + delta);
    });
  });

  stepperInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      stepperInput.blur(); // blur triggers the commit below
    }
  });
  stepperInput?.addEventListener('blur', () => {
    commitRecurringMinutes(Number(stepperInput.value));
  });
}

function renderRecurringStepper(recurringMinutes) {
  const atMin = recurringMinutes <= RECURRING_MIN;
  const atMax = recurringMinutes >= RECURRING_MAX;
  const isOff = recurringMinutes === 0;
  const showCapNote = Date.now() < cappedNoteUntil;

  return `
    <div>
      <div class="sectionLabel">${COPY.popup.recurringLabel}</div>
      <div class="stepperRow">
        <button type="button" class="stepperBtn" data-step="down" aria-label="Decrease interval"${atMin ? ' disabled' : ''}>−</button>
        <span class="stepperInputWrap">
          <input type="text" inputmode="numeric" class="stepperInput" value="${recurringMinutes}" aria-label="Reminder interval in minutes, 0 to ${RECURRING_MAX}">
          <span class="stepperUnit">m</span>
        </span>
        <button type="button" class="stepperBtn" data-step="up" aria-label="Increase interval"${atMax ? ' disabled' : ''}>+</button>
      </div>
      <div class="helperText">${isOff ? COPY.popup.recurringHelperOff : COPY.popup.recurringHelperOn(recurringMinutes)}</div>
      ${showCapNote ? `<div class="stepperNote">${COPY.popup.recurringCapped(RECURRING_MAX)}</div>` : ''}
    </div>
  `;
}

function renderTodayFootnote(mode, counters, isZero) {
  if (isZero) {
    return `<div class="helperText">${COPY.popup.zero}</div>`;
  }
  if (mode === 'block' && counters.blockedOpens > 0) {
    return `
      <div class="calloutRow" data-tone="red">
        <span class="dot"></span>
        <p>${COPY.popup.blockedSummary(counters.blockedOpens, counters.opens)}</p>
      </div>
    `;
  }
  return `<div class="helperText">${COPY.popup.stepAway(counters.stepAwayCount, counters.opens)}</div>`;
}

function renderDegraded(since) {
  return `
    <div class="calloutRow" data-tone="amber">
      <span class="dot"></span>
      <div>
        <p><b>${COPY.popup.degraded}</b> ${COPY.popup.degradedTitle}</p>
        <div class="degradedButtons">
          <button type="button" class="primary" data-action="check-for-update">${COPY.popup.checkForUpdate}</button>
          <button type="button" class="ghost" data-action="report">${COPY.popup.report}</button>
        </div>
      </div>
      <button type="button" class="closeBtn" data-action="dismiss-health" data-since="${since}" aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;
}

function renderOnboarding(mode) {
  return `
    <div class="onboardTip">
      <div class="title">${COPY.popup.onboardTitle}</div>
      <div class="body"><span class="friction">Friction</span> pauses you for 5 seconds before Shorts loads. <span class="block">Block</span> turns you around at the door. Switch any time — you're in ${mode === 'friction' ? 'Friction' : 'Block'} now.</div>
      <button type="button">${COPY.popup.onboardCta}</button>
      <span class="caret"></span>
    </div>
  `;
}

async function loadState() {
  const [mode, counters, onboardingSeen, healthBanner, recurringMinutes] = await Promise.all([
    storage.getMode(),
    storage.getTodayCounters(PLATFORM_ID),
    storage.getOnboardingSeen(),
    storage.getHealthBanner(PLATFORM_ID),
    storage.getRecurringFrictionMinutes(),
  ]);
  return { mode, counters, onboardingSeen, healthBanner, recurringMinutes };
}

async function refresh() {
  render(await loadState());
}

refresh();

storage.onChanged((changes, areaName) => {
  if (areaName === 'local') refresh();
});

// Design 4.2: "a user who closes the popup has seen it" — persist on close too.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) storage.setOnboardingSeen();
});
