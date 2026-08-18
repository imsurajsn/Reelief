import * as storage from '../shared/storage.js';
import { COPY } from '../shared/copy.js';
import { BRAND, iconMarkup } from '../shared/branding.js';

const PLATFORM_ID = 'youtube'; // V1a ships one platform; v1b/v1c widen this to a list.

const app = document.getElementById('app');

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
  const { mode, counters, onboardingSeen, health } = state;
  const minutes = Math.floor(counters.seconds / 60);
  const isZero = counters.opens === 0;

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
        <div class="sectionLabel">${COPY.popup.sectionToday}</div>
        <div class="statRow">
          ${opensCard(counters.opens, isZero)}
          ${timeCard(minutes, isZero)}
        </div>
        ${renderTodayFootnote(mode, counters, isZero)}
      </div>
      ${health !== 'ok' ? renderDegraded() : ''}
      <div class="divider"></div>
      <div>
        <div class="sectionLabel">MODE</div>
        <div class="modeSwitch" role="group" aria-label="Mode">
          <button type="button" data-tone="friction" aria-pressed="${mode === 'friction'}">Friction</button>
          <button type="button" data-tone="block" aria-pressed="${mode === 'block'}">Block</button>
        </div>
        <div class="helperText">${mode === 'friction' ? COPY.popup.modeFriction : COPY.popup.modeBlock}</div>
      </div>
    </div>
    <div class="footer">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" stroke="#5C5A50" stroke-width="1.4"/><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" stroke="#5C5A50" stroke-width="1.4" stroke-linecap="round"/></svg>
      <span class="privacy">${COPY.popup.privacy}</span>
      <span class="version">v${chrome.runtime.getManifest().version}</span>
    </div>
    ${!onboardingSeen ? renderOnboarding(mode) : ''}
  `;

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

function renderDegraded() {
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
  const [mode, counters, onboardingSeen, health] = await Promise.all([
    storage.getMode(),
    storage.getTodayCounters(PLATFORM_ID),
    storage.getOnboardingSeen(),
    storage.getHealth(PLATFORM_ID),
  ]);
  return { mode, counters, onboardingSeen, health };
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
