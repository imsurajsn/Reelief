/**
 * Review nudge (FR-39): when to ask a regular user for a Chrome Web Store
 * review, and when to stop. This file only decides — it has no imports and
 * touches no chrome.* API, so the popup, the background worker and plain node
 * (used for the checks) all run the same rules.
 *
 * The rules, in one place:
 *   - The "Rate Reelief" row in the ⋮ menu is always there, from first open —
 *     same as Report an issue/About, no gate. Someone who finds and clicks it
 *     on their own marks it `done` immediately (see below), which is enough
 *     to suppress the rest of the nudge for good — exploring it yourself
 *     counts the same as being asked and answering.
 *   - Unlock: 3 distinct local days with at least one recorded open (real
 *     usage days, not "3 days since install"). This only gates the *active*
 *     nudge — the popup card and the row's amber highlight/dot — not the
 *     row's existence.
 *   - Ask (the popup card + amber toolbar dot): at most REVIEW_MAX_ASKS
 *     times ever, and only once unlocked. An ask is used up when the person
 *     answers "Maybe later" — the card simply stays until they answer, so
 *     nobody sees an ask vanish unanswered.
 *   - Between asks: REVIEW_COOLDOWN_DAYS calendar days AND
 *     REVIEW_COOLDOWN_USAGE_DAYS more usage days since the last "Maybe later".
 *   - Stop for good: "Leave a review" or "Don't ask again" (`done`), from
 *     either the card or the always-available menu row. Chrome has no API
 *     that says whether a review was actually submitted, so the click itself
 *     is what counts as "reviewed".
 *   - From the unlock until `done` the row is highlighted (amber row + dot
 *     on ⋮). Once `done` — whenever that happens, including a pre-unlock
 *     self-click — it stays for good as an ordinary menu row: no highlight,
 *     no dot, so anyone can still open the review page later.
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
 *   doorVisible: boolean, // highlight "Rate Reelief" (amber row) and put the dot on ⋮
 *   rateRowVisible: boolean, // always true — the row shows from first open, unlock or not
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
    rateRowVisible: true,
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
