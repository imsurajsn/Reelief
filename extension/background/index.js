import * as storage from '../shared/storage.js';
import { isValidUninstallUrl } from '../shared/uninstall.js';
import { UNINSTALL_SURVEY_URL } from './product-config.generated.js';

// Hardcoded, not read from config/product.config.json via shared/branding.js:
// importing branding.js into this service worker is exactly what broke
// background/index.js's own registration once already (JSON module import
// unsupported in the MV3 service worker's module graph — see the
// check-for-update/report button bug and shared/branding.js's own comment
// on this). Keep this file's import graph free of that dependency.
const BRAND_COLOR = '#15574A';

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

chrome.runtime.onInstalled.addListener(async () => {
  await syncUninstallUrl();
  await storage.ensureCurrentDay();
  await scheduleRolloverAlarm();
});

// Catches the "browser was closed at midnight" case (design doc 6.2) as
// early as possible on browser start, ahead of any popup/content script.
chrome.runtime.onStartup.addListener(async () => {
  await syncUninstallUrl();
  await storage.ensureCurrentDay();
  await scheduleRolloverAlarm();
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
  storage.setUpdateAvailable(details.version);
  chrome.action.setBadgeText({ text: '●' });
  chrome.action.setBadgeBackgroundColor({ color: BRAND_COLOR });
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
