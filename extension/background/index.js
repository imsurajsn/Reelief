import * as storage from '../shared/storage.js';
import { isValidUninstallUrl } from '../shared/uninstall.js';
import { evaluateReviewPrompt, isValidReviewUrl } from '../shared/review-prompt.js';
import { UNINSTALL_SURVEY_URL, REVIEW_URL } from './product-config.generated.js';

// Hardcoded, not read from config/product.config.json via shared/branding.js:
// importing branding.js into this service worker is exactly what broke
// background/index.js's own registration once already (JSON module import
// unsupported in the MV3 service worker's module graph — see the
// check-for-update/report button bug and shared/branding.js's own comment
// on this). Keep this file's import graph free of that dependency.
//
// The toolbar dots (see setToolbarDot()) are painted onto the dark-navy icon,
// so the update-ready dot is a light mint (the popup's own focus colour on dark
// surfaces) — the brand green #15574A all but disappears against the navy. The
// review nudge's dot (FR-39) is amber (tokens.css --amber), so the two read
// differently at a glance.
const UPDATE_DOT_COLOR = '#8FD0BE';
const REVIEW_DOT_COLOR = '#B4741A';

const ROLLOVER_ALARM = 'reelief-midnight-rollover';

function msUntilNextLocalMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  return next.getTime() - now.getTime();
}

async function scheduleRolloverAlarm() {
  await chrome.alarms.create(ROLLOVER_ALARM, {
    when: Date.now() + msUntilNextLocalMidnight(),
    periodInMinutes: 24 * 60,
  });
}

// FR-38: when the extension is removed, Chrome opens the feedback form in a
// new tab. The URL lives in config/product.config.json (`uninstallSurveyUrl`)
// and reaches this worker via the generated module above. Chrome remembers it
// per install, so setting it on install/update/startup keeps it current when
// the config changes in a release. Nothing is sent by the extension: Chrome
// simply opens the page after removal. Needs no extra permission. An empty
// or invalid config value switches the feature off rather than throwing.
async function syncUninstallUrl() {
  if (!isValidUninstallUrl(UNINSTALL_SURVEY_URL)) return;
  try {
    await chrome.runtime.setUninstallURL(UNINSTALL_SURVEY_URL.trim());
  } catch (err) {
    console.warn('Reelief: could not set the uninstall survey URL', err);
  }
}

// The one place that decides what the toolbar icon's badge dot says. Two
// things can want it, and the update-ready dot (brand green, FR-30) always
// wins: the review nudge (FR-39, amber) just waits — it neither spends one of
// its asks nor starts its cooldown while suppressed, exactly as if it had not
// fired yet. Mirrors popup.js's own "is an update banner showing" test so the
// dot and the banner never disagree. The popup no longer sets the badge
// itself (a click there used to clear it directly, which could wipe the amber
// dot right after this recomputed it) — it just writes storage and this runs.
async function refreshBadge() {
  const [updateAvailable, dismissed, reviewState, history, today] = await Promise.all([
    storage.getUpdateAvailable(),
    storage.getUpdateAvailableDismissed(),
    storage.getReviewPrompt(),
    storage.getHistory(),
    storage.ensureCurrentDay(),
  ]);

  const updateReady =
    updateAvailable &&
    updateAvailable.version !== chrome.runtime.getManifest().version &&
    updateAvailable.version !== dismissed;

  // An empty/invalid `reviewUrl` in the config switches the nudge off here too
  // (popup.js applies the same test), so the dot never shows without a card.
  const todayKey = storage.localDateKey();
  const review = isValidReviewUrl(REVIEW_URL)
    ? evaluateReviewPrompt({ history, today, state: reviewState, todayKey })
    : { unlockNow: false, cardDue: false };
  if (review.unlockNow) await storage.markReviewUnlocked(todayKey);

  // The dot is drawn into the icon, never as badge text (see setToolbarDot()),
  // so make sure no badge box is left over from an earlier version.
  await chrome.action.setBadgeText({ text: '' });
  await setToolbarDot(updateReady ? UPDATE_DOT_COLOR : review.cardDue ? REVIEW_DOT_COLOR : null);
}

// Chrome draws a badge as a fixed-size filled box behind its text and the API
// can't resize it (a "●" badge read as a big tile over half the icon, and a
// transparent box still gets a light backing). So the dot is painted straight
// onto the toolbar icon: the same icon files the manifest declares, plus a
// small dot in the top-right corner, set with action.setIcon(imageData).
// `color` null puts the plain icon back. The plain icon goes through the same
// canvas route on purpose: setIcon({ path }) resolves relative paths against
// this worker's own folder (background/), not the extension root, and failed
// with "Failed to fetch".
const ICON_SIZES = [16, 32, 48, 128];
let toolbarDot; // what setIcon last received: undefined (unknown), null (plain) or a colour

async function setToolbarDot(color) {
  if (toolbarDot === color) return;
  const icons = chrome.runtime.getManifest().action.default_icon;
  const imageData = {};
  for (const size of ICON_SIZES) {
    const response = await fetch(chrome.runtime.getURL(icons[size]));
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, size, size);
    if (color) {
      // Centred on the icon's own rounded top-right corner and smaller than
      // that corner's radius, so the dot sits wholly on the dark icon — no ring
      // or backing needed.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(size * 0.78, size * 0.22, size * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }
  await chrome.action.setIcon({ imageData });
  toolbarDot = color;
}

// Counters change on every flush while someone is watching, so coalesce the
// storage.onChanged bursts into one recompute.
let badgeTimer = null;
function scheduleBadgeRefresh() {
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => refreshBadge().catch((err) => console.warn('Reelief: badge refresh failed', err)), 250);
}

chrome.runtime.onInstalled.addListener(async () => {
  await syncUninstallUrl();
  await storage.ensureCurrentDay();
  await scheduleRolloverAlarm();
  scheduleBadgeRefresh();
});

// Catches the "browser was closed at midnight" case (design doc 6.2) as
// early as possible on browser start, ahead of any popup/content script.
chrome.runtime.onStartup.addListener(async () => {
  await syncUninstallUrl();
  await storage.ensureCurrentDay();
  await scheduleRolloverAlarm();
  scheduleBadgeRefresh();
});

storage.onChanged((changes, areaName) => {
  if (areaName !== 'local') return;
  if (
    changes.updateAvailable ||
    changes.updateAvailableDismissed ||
    changes.reviewPrompt ||
    changes.history ||
    changes.today
  ) {
    scheduleBadgeRefresh();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ROLLOVER_ALARM) {
    storage.runMidnightRollover();
  }
});

// Passive nudge (issue #26): Chrome already checks for updates on its own
// every ~5-6 hours and downloads them silently, but an update only
// *installs* once the extension goes idle, and nothing tells the user
// either way. Don't reload immediately — that would kill an active
// friction-pause overlay on a content-script tab — just record that one's
// ready; the popup surfaces it and reloads only when the user chooses to.
chrome.runtime.onUpdateAvailable.addListener((details) => {
  // The write fires storage.onChanged above, which recomputes the badge.
  storage.setUpdateAvailable(details.version);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'reelief:check-for-update') {
    chrome.runtime.requestUpdateCheck((status) => sendResponse({ status }));
    return true; // keep the channel open for the async sendResponse
  }
  if (message?.type === 'reelief:report') {
    chrome.tabs.create({ url: `${chrome.runtime.getManifest().homepage_url}/issues/new` });
  }
  return false;
});
