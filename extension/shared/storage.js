/**
 * Typed wrapper over chrome.storage.local — the only place in the codebase
 * that touches the storage schema directly. Every context (background,
 * content scripts, popup) reads/writes stats through this module, and gets
 * cross-context sync for free via chrome.storage.onChanged.
 *
 * Schema:
 *   today: {
 *     date: 'YYYY-MM-DD',            // local date these counters belong to
 *     platforms: {
 *       [platformId]: { opens, blockedOpens, seconds, stepAwayCount }
 *     }
 *   }
 *   mode: 'friction' | 'block'
 *   onboardingSeen: boolean
 *   lastArchivedDate: 'YYYY-MM-DD'
 *   history: [{ date, platform, opens, blockedOpens, minutes }]  // 30-day retention
 *   health: { [platformId]: { shelf: 'ok' | 'missing' } }
 *
 * Adding a platform (v1b, v1c) never requires a schema migration — every
 * counter object is keyed by platform id and created on first use.
 */

const HISTORY_RETENTION_DAYS = 30;

function emptyCounters() {
  return { opens: 0, blockedOpens: 0, seconds: 0, stepAwayCount: 0 };
}

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

async function get(keys) {
  return chrome.storage.local.get(keys);
}

async function set(items) {
  return chrome.storage.local.set(items);
}

async function getToday() {
  const { today } = await get('today');
  if (today && today.date) return today;
  const fresh = { date: localDateKey(), platforms: {} };
  await set({ today: fresh });
  return fresh;
}

function platformCounters(today, platformId) {
  return today.platforms[platformId] ?? emptyCounters();
}

/**
 * Archives every day strictly between lastArchivedDate and targetDate
 * (exclusive/exclusive) as zero-rows, then archives targetDate's real
 * counters, then resets `today` to newDate with empty counters. Handles
 * both the ordinary midnight rollover and the "browser was closed for N
 * days" catch-up case (design doc 6.2).
 */
async function archiveThrough(targetDateKey, newDateKey) {
  const { today, lastArchivedDate, history = [] } = await get([
    'today',
    'lastArchivedDate',
    'history',
  ]);

  const rows = [...history];
  const platformIds = new Set(Object.keys(today?.platforms ?? {}));

  let cursor = lastArchivedDate ? addDaysToDateKey(lastArchivedDate, 1) : targetDateKey;
  while (cursor < targetDateKey) {
    for (const id of platformIds) {
      rows.push({ date: cursor, platform: id, opens: 0, blockedOpens: 0, minutes: 0 });
    }
    cursor = addDaysToDateKey(cursor, 1);
  }

  for (const id of platformIds) {
    const c = platformCounters(today, id);
    rows.push({
      date: targetDateKey,
      platform: id,
      opens: c.opens,
      blockedOpens: c.blockedOpens,
      minutes: Math.floor(c.seconds / 60),
    });
  }

  const cutoff = addDaysToDateKey(localDateKey(), -HISTORY_RETENTION_DAYS);
  const pruned = rows.filter((row) => row.date >= cutoff);

  await set({
    today: { date: newDateKey, platforms: {} },
    lastArchivedDate: targetDateKey,
    history: pruned,
  });
}

/**
 * Call at the start of any read/write flow. Self-heals the day rollover
 * even if the background alarm was missed (browser closed at midnight) —
 * cheap enough to call from content scripts and the popup too.
 */
export async function ensureCurrentDay() {
  const today = await getToday();
  const currentKey = localDateKey();
  if (today.date === currentKey) return today;
  await archiveThrough(today.date, currentKey);
  return getToday();
}

export async function getTodayCounters(platformId) {
  const today = await ensureCurrentDay();
  return platformCounters(today, platformId);
}

async function updateToday(platformId, updater) {
  const today = await ensureCurrentDay();
  const current = platformCounters(today, platformId);
  const next = updater(current);
  const platforms = { ...today.platforms, [platformId]: next };
  await set({ today: { date: today.date, platforms } });
  return next;
}

export async function recordOpen(platformId, { blocked = false } = {}) {
  return updateToday(platformId, (c) => ({
    ...c,
    opens: c.opens + 1,
    blockedOpens: c.blockedOpens + (blocked ? 1 : 0),
  }));
}

export async function recordStepAway(platformId) {
  return updateToday(platformId, (c) => ({ ...c, stepAwayCount: c.stepAwayCount + 1 }));
}

export async function addSeconds(platformId, deltaSeconds) {
  if (deltaSeconds <= 0) return getTodayCounters(platformId);
  return updateToday(platformId, (c) => ({ ...c, seconds: c.seconds + deltaSeconds }));
}

export async function getMode() {
  const { mode } = await get('mode');
  return mode ?? 'friction';
}

export async function setMode(mode) {
  await set({ mode });
}

export async function getOnboardingSeen() {
  const { onboardingSeen } = await get('onboardingSeen');
  return Boolean(onboardingSeen);
}

export async function setOnboardingSeen() {
  await set({ onboardingSeen: true });
}

export async function getHistory() {
  const { history = [] } = await get('history');
  return history;
}

export async function getHealth(platformId) {
  const { health = {} } = await get('health');
  return health[platformId]?.shelf ?? 'ok';
}

export async function setHealth(platformId, shelfStatus) {
  const { health = {} } = await get('health');
  await set({ health: { ...health, [platformId]: { shelf: shelfStatus } } });
}

/** Runs the midnight rollover unconditionally — called by the alarm handler. */
export async function runMidnightRollover() {
  const today = await getToday();
  await archiveThrough(today.date, localDateKey());
}

export function onChanged(listener) {
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
