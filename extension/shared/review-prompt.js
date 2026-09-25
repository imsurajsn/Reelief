/**
 * Review nudge (FR-39): when to ask a regular user for a Chrome Web Store
 * review, and when to stop. This file only decides — it has no imports and
 * touches no chrome.* API, so the popup, the background worker and plain node
 * (used for the checks) all run the same rules.
 *
 * The rules, in one place:
 *   - Unlock: 3 distinct local days with at least one recorded open. Real
 *     usage days, not "3 days since install".
 *   - Ask (the popup card + amber toolbar dot): at most REVIEW_MAX_ASKS
 *     times ever. An ask is used up when the person answers "Maybe later" —
 *     the card simply stays until they answer, so nobody sees an ask vanish
 *     unanswered.
 *   - Between asks: REVIEW_COOLDOWN_DAYS calendar days AND
 *     REVIEW_COOLDOWN_USAGE_DAYS more usage days since the last "Maybe later".
 *   - Stop for good: "Leave a review" or "Don't ask again" (`done`). Chrome has
 *     no API that says whether a review was actually submitted, so the click
 *     itself is what counts as "reviewed".
 *   - The standing "Rate Reelief" row in the ⋮ menu (and the dot on ⋮) is not
 *     an ask: it is present from the unlock until `done`, and never spends one
 *     of the asks.
 */

export const REVIEW_UNLOCK_USAGE_DAYS = 3;
export const REVIEW_MAX_ASKS = 3;
export const REVIEW_COOLDOWN_DAYS = 21;
export const REVIEW_COOLDOWN_USAGE_DAYS = 3;

export function emptyReviewPrompt() {
  return { unlockedOn: null, asks: 0, lastAskDate: null, done: false, doneReason: null };
}

/** Whole calendar days from one 'YYYY-MM-DD' key to a later one. */
export function daysBetween(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

/**
 * Every local date with at least one recorded open: archived history rows
 * (30-day retention) plus today's live counters. Blocked opens count — they
 * are opens too (recordOpen bumps `opens` either way).
 */
export function usageDates(history, today) {
  const dates = new Set();
  for (const row of history ?? []) {
    if ((row?.opens ?? 0) > 0) dates.add(row.date);
  }
  if (today?.date) {
    const opensToday = Object.values(today.platforms ?? {}).reduce((sum, c) => sum + (c?.opens ?? 0), 0);
    if (opensToday > 0) dates.add(today.date);
  }
  return dates;
}

/** Usage days strictly after `afterKey` (all of them when it is null). */
export function countUsageDaysAfter(dates, afterKey) {
  let n = 0;
  for (const d of dates) if (!afterKey || d > afterKey) n += 1;
  return n;
}

/**
 * @returns {{
 *   unlockNow: boolean,   // 3 usage days reached but not yet recorded in `state.unlockedOn`
 *   unlocked: boolean,
 *   cardDue: boolean,     // show the popup card + amber toolbar dot
 *   doorVisible: boolean, // show the ⋮ dot + "Rate Reelief" row
 * }}
 */
export function evaluateReviewPrompt({ history, today, state, todayKey }) {
  const s = { ...emptyReviewPrompt(), ...(state ?? {}) };
  const dates = usageDates(history, today);

  const unlockNow = !s.unlockedOn && countUsageDaysAfter(dates, null) >= REVIEW_UNLOCK_USAGE_DAYS;
  const unlocked = Boolean(s.unlockedOn) || unlockNow;

  const coolDone =
    s.asks === 0 ||
    (s.lastAskDate !== null &&
      daysBetween(s.lastAskDate, todayKey) >= REVIEW_COOLDOWN_DAYS &&
      countUsageDaysAfter(dates, s.lastAskDate) >= REVIEW_COOLDOWN_USAGE_DAYS);

  return {
    unlockNow,
    unlocked,
    cardDue: unlocked && !s.done && s.asks < REVIEW_MAX_ASKS && coolDone,
    doorVisible: unlocked && !s.done,
  };
}

/** Same shape/validity idea as shared/uninstall.js: only a plain https URL is ever opened. */
export function isValidReviewUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}
