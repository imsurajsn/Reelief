import * as storage from '../shared/storage.js';
import { BRAND } from '../shared/branding.js';

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

chrome.runtime.onInstalled.addListener(async () => {
  await storage.ensureCurrentDay();
  await scheduleRolloverAlarm();
});

// Catches the "browser was closed at midnight" case (design doc 6.2) as
// early as possible on browser start, ahead of any popup/content script.
chrome.runtime.onStartup.addListener(async () => {
  await storage.ensureCurrentDay();
  await scheduleRolloverAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ROLLOVER_ALARM) {
    storage.runMidnightRollover();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'reelief:check-for-update') {
    chrome.runtime.requestUpdateCheck((status) => sendResponse({ status }));
    return true; // keep the channel open for the async sendResponse
  }
  if (message?.type === 'reelief:report') {
    chrome.tabs.create({ url: `${BRAND.homepage}/issues/new` });
  }
  return false;
});
