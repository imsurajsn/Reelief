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
 *       [platformId]: { opens, blockedOpens, seconds, stepAwayCount, interruptions }
 *     }
 *   }
 *   mode: 'friction' | 'block'
 *   recurringFrictionMinutes: number  // 0 = off, 15 = default for a fresh
 *     // install (RECURRING_FRICTION_DEFAULT_MINUTES below — 10-15 min is
 *     // the range cited by short-form-scrolling intervention research for
 *     // minimal-disruption effectiveness; 15 also matches YouTube's own
 *     // historical first-tier "take a break" preset). Re-shows the
 *     // friction overlay after this many minutes of continuous watching
 *     // within one visit — separate from FR-01's entry friction. Tracked
 *     // as `interruptions`, not `opens`: it's not a new visit.
 *   onboardingSeen: boolean
 *   lastArchivedDate: 'YYYY-MM-DD'
 *   history: [{ date, platform, opens, blockedOpens, minutes }]  // 30-day retention
 *   health: { [platformId]: { shelf: 'ok' | 'missing', since: epochMs } }
 *   healthDismissed: { [platformId]: { at: epochMs, since: epochMs } }
 *     // `since` mirrors the health.since it was dismissed for — lets
 *     // getHealthBanner() tell "still the same unresolved incident" from
 *     // "recovered, then broke again" (a fresh incident always resurfaces
 *     // immediately; an unresolved one resurfaces after HEALTH_SNOOZE_DAYS).
 *
 * Adding a platform (v1b, v1c) never requires a schema migration — every
 * counter object is keyed by platform id and created on first use.
 */

const HISTORY_RETENTION_DAYS = 30;
const HEALTH_SNOOZE_DAYS = 7;
const HEALTH_SNOOZE_MS = HEALTH_SNOOZE_DAYS * 24 * 60 * 60 * 1000;

function emptyCounters() {
  return { opens: 0, blockedOpens: 0, seconds: 0, stepAwayCount: 0, interruptions: 0 };
}

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateKey(dateKey, days) {
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

/** A recurring re-friction prompt fired — not a new visit, so tracked separately from `opens`. */
export async function recordInterruption(platformId) {
  // `?? 0` guards counters objects written before this field existed.
  return updateToday(platformId, (c) => ({ ...c, interruptions: (c.interruptions ?? 0) + 1 }));
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

// 15 min: inside the 10-15 min range short-form-scrolling intervention
// research cites for minimal-disruption effectiveness, and matches
// YouTube's own historical first-tier "take a break" preset — see the
// schema comment above. 0 = off; a user who explicitly sets it to 0 gets
// an explicit 0 back here, not this default (nullish coalescing only
// falls back on a never-set value, not a deliberately-chosen falsy one).
const RECURRING_FRICTION_DEFAULT_MINUTES = 15;

/** Minutes of continuous watching before a recurring re-friction prompt fires. 0 = off. */
export async function getRecurringFrictionMinutes() {
  const { recurringFrictionMinutes } = await get('recurringFrictionMinutes');
  return recurringFrictionMinutes ?? RECURRING_FRICTION_DEFAULT_MINUTES;
}

export async function setRecurringFrictionMinutes(minutes) {
  await set({ recurringFrictionMinutes: minutes });
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

export async function setHealth(platformId, shelfStatus) {
  const { health = {} } = await get('health');
  const prev = health[platformId];
  const changed = !prev || prev.shelf !== shelfStatus;
  await set({
    health: {
      ...health,
      [platformId]: { shelf: shelfStatus, since: changed ? Date.now() : prev.since },
    },
  });
}

/**
 * Whether the "Reelief can't find the Shorts shelf" banner should show
 * right now. A dismiss hides it, but it resurfaces immediately if this
 * turns out to be a *fresh* incident (recovered, then broke again), or
 * automatically after HEALTH_SNOOZE_DAYS if the same incident is still
 * unresolved — a periodic reminder without nagging on every popup open
 * once acknowledged.
 */
export async function getHealthBanner(platformId) {
  const [{ health = {} }, { healthDismissed = {} }] = await Promise.all([
    get('health'),
    get('healthDismissed'),
  ]);
  const status = health[platformId];
  if (!status || status.shelf === 'ok') return { visible: false };

  const dismissal = healthDismissed[platformId];
  if (!dismissal || dismissal.since !== status.since) {
    return { visible: true, since: status.since };
  }
  return { visible: Date.now() - dismissal.at >= HEALTH_SNOOZE_MS, since: status.since };
}

export async function dismissHealthBanner(platformId, since) {
  const { healthDismissed = {} } = await get('healthDismissed');
  await set({
    healthDismissed: { ...healthDismissed, [platformId]: { at: Date.now(), since } },
  });
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
