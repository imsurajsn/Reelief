/**
 * Daily budget & streak (FR-44, issue #29): pure decision logic, no imports,
 * no chrome.* API — same shape as shared/review-prompt.js and
 * shared/time-avoided.js, so storage.js, the background worker, the popup
 * and content/entry.js can all run the same rules, and so this is directly
 * node-checkable.
 *
 * The rules, in one place:
 *   - Metric is minutes only, aggregated across all platforms — never opens.
 *   - A day "passes" when that day's total minutes are at or under the
 *     stored budget. Any single day over budget resets the streak to zero.
 *   - Enabling mid-week doesn't wait: tracking starts immediately, but only
 *     as a preview — `anchorDate` is the next Monday on/after the enable
 *     date (today itself, if today already is a Monday), and only days on
 *     or after `anchorDate` count toward the streak.
 *   - The daily budget is suggested from the person's own trailing average
 *     minutes on days they actually used Reelief (usage days, not calendar
 *     days — matches review-prompt.js's own convention) — never a population
 *     constant — once there are at least STREAK_MIN_HISTORY_DAYS of them.
 *   - The nudge (for people who haven't enabled Streak) fires at most once a
 *     day, and only when today's total already runs STREAK_HEAVY_MULTIPLIER
 *     times past that same trailing average. Cadence mirrors FR-39's review
 *     nudge: STREAK_NUDGE_MAX_ASKS ever, STREAK_NUDGE_COOLDOWN_DAYS calendar
 *     days AND STREAK_NUDGE_COOLDOWN_USAGE_DAYS more usage days between
 *     them. Enabling Streak stops it, and so does its own quiet "don't ask
 *     again" dismiss link on the friction screen (`done`) — same
 *     respect-the-no principle as FR-39's review card.
 */

export const STREAK_MIN_HISTORY_DAYS = 5;
export const STREAK_HEAVY_MULTIPLIER = 1.5;
export const STREAK_NUDGE_MAX_ASKS = 3;
export const STREAK_NUDGE_COOLDOWN_DAYS = 21;
export const STREAK_NUDGE_COOLDOWN_USAGE_DAYS = 3;
export const STREAK_YELLOW_RATIO = 0.8;

export function emptyStreak() {
  return { enabled: false, dailyBudgetMinutes: null, streakCount: 0, anchorDate: null };
}

export function emptyStreakNudge() {
  return { asks: 0, lastAskDate: null, done: false };
}

function dateParts(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return { y, m, d };
}

function toUTCDate(dateKey) {
  const { y, m, d } = dateParts(dateKey);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTCDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole calendar days from one 'YYYY-MM-DD' key to a later one. */
export function daysBetween(fromKey, toKey) {
  return Math.round((toUTCDate(toKey) - toUTCDate(fromKey)) / 86400000);
}

/** 0 = Monday … 6 = Sunday — the Mon–Sun week this feature anchors to. */
export function weekdayIndex(dateKey) {
  const jsDay = toUTCDate(dateKey).getUTCDay(); // 0 = Sunday … 6 = Saturday
  return (jsDay + 6) % 7;
}

/** The Monday on/after dateKey — dateKey itself when it's already a Monday. */
export function nextMondayOnOrAfter(dateKey) {
  const offset = (7 - weekdayIndex(dateKey)) % 7;
  const date = toUTCDate(dateKey);
  date.setUTCDate(date.getUTCDate() + offset);
  return fromUTCDate(date);
}

/** Today's total minutes across every platform — the only metric this feature uses. */
export function sumTodayMinutes(today) {
  return Object.values(today?.platforms ?? {}).reduce(
    (sum, c) => sum + Math.floor((c?.seconds ?? 0) / 60),
    0,
  );
}

/**
 * Per-date total minutes across all platforms: archived `history` rows (one
 * per platform per day) summed by date, plus today's live totals. Mirrors
 * popup.js's buildDailySeries() but minutes-only and not clipped to the
 * trend chart's own window, since the trailing average needs the full
 * 30-day retention.
 */
function dailyMinutesByDate(history, today) {
  const byDate = new Map();
  for (const row of history ?? []) {
    if (!row?.date) continue;
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.minutes ?? 0));
  }
  if (today?.date) {
    const todayMinutes = sumTodayMinutes(today);
    if (todayMinutes > 0) byDate.set(today.date, todayMinutes);
  }
  return byDate;
}

/**
 * The person's own average minutes on days they actually used Reelief
 * (nonzero days only — a day nobody opened a feed on says nothing about
 * "typical" usage). Null below STREAK_MIN_HISTORY_DAYS of those, same
 * shape as FR-40's avgSessionMinutes: never a population assumption.
 */
export function averageDailyMinutes(history, today) {
  const usageMinutes = [...dailyMinutesByDate(history, today).values()].filter((m) => m > 0);
  if (usageMinutes.length < STREAK_MIN_HISTORY_DAYS) return null;
  const total = usageMinutes.reduce((a, b) => a + b, 0);
  return Math.round(total / usageMinutes.length);
}

/**
 * Live ring state for today, against the stored budget — used by both the
 * friction-screen ring and the ⋮ → Streak panel's progress row. Null when
 * Streak isn't enabled or no budget has been saved yet (nothing to render).
 */
export function evaluateStreakRing(streak, todayMinutes) {
  const s = { ...emptyStreak(), ...(streak ?? {}) };
  if (!s.enabled || !s.dailyBudgetMinutes) return null;
  const ratio = todayMinutes / s.dailyBudgetMinutes;
  const state = ratio >= 1 ? 'red' : ratio >= STREAK_YELLOW_RATIO ? 'yellow' : 'green';
  return { ratio: Math.min(ratio, 1), percent: Math.round(Math.min(ratio, 1) * 100), state };
}

/**
 * Whether dateKey falls in the pre-Monday "preview" window — tracked and
 * shown, but not yet counted toward the streak (see nextMondayOnOrAfter).
 */
export function isPreviewDay(streak, dateKey) {
  const s = { ...emptyStreak(), ...(streak ?? {}) };
  return Boolean(s.anchorDate) && dateKey < s.anchorDate;
}

/**
 * Called once per day as storage.js's archiveThrough() finalizes it
 * (including zero-row gap days from a multi-day catch-up, which trivially
 * pass at 0 minutes — not touching the device at all is the ideal outcome,
 * same direction as the streak itself). A day at or under budget extends
 * the streak; a single day over it is a hard reset, matching Duolingo's own
 * streak mechanic. No-op before Streak is enabled/configured, or still
 * inside the pre-Monday preview window.
 */
export function applyStreakDay(streak, dateKey, totalMinutes) {
  const s = { ...emptyStreak(), ...(streak ?? {}) };
  if (!s.enabled || !s.dailyBudgetMinutes) return s;
  if (isPreviewDay(s, dateKey)) return s;
  const withinBudget = totalMinutes <= s.dailyBudgetMinutes;
  return { ...s, streakCount: withinBudget ? s.streakCount + 1 : 0 };
}

/**
 * Enabling Streak: `dailyBudgetMinutes` is whatever the Streak panel saved
 * (its own suggested-from-history default, or an edited value — this
 * function doesn't pick one). `enableDateKey` sets `anchorDate` to the next
 * Monday on/after it (today itself when today already is a Monday) and
 * resets streakCount to 0 — a fresh opt-in has no history to speak of yet.
 */
export function enableStreak(dailyBudgetMinutes, enableDateKey) {
  return {
    enabled: true,
    dailyBudgetMinutes,
    streakCount: 0,
    anchorDate: nextMondayOnOrAfter(enableDateKey),
  };
}

/** Usage days (nonzero total minutes) strictly after `afterKey`. */
function usageDateKeysAfter(history, today, afterKey) {
  const byDate = dailyMinutesByDate(history, today);
  let n = 0;
  for (const [date, minutes] of byDate) {
    if (minutes > 0 && (!afterKey || date > afterKey)) n += 1;
  }
  return n;
}

/**
 * Whether to show the "noticed you're going over your usual pace" nudge on
 * the friction screen right now. `nudgeState` is the stored `streakNudge`
 * object ({ asks, lastAskDate }); `todayKey` is today's local date.
 * `showNow: true` fires at most once per calendar day even while eligible
 * every time — the caller (content/entry.js) is responsible for recording
 * it shown via the storage write that bumps `asks`/`lastAskDate`.
 */
export function evaluateStreakNudge({ history, today, streak, nudgeState, todayKey }) {
  const s = { ...emptyStreak(), ...(streak ?? {}) };
  if (s.enabled) return { eligible: false, showNow: false };

  const avg = averageDailyMinutes(history, today);
  if (avg == null) return { eligible: false, showNow: false };

  const todayMinutes = sumTodayMinutes(today);
  const eligible = todayMinutes >= avg * STREAK_HEAVY_MULTIPLIER;
  if (!eligible) return { eligible: false, showNow: false };

  const n = { ...emptyStreakNudge(), ...(nudgeState ?? {}) };
  if (n.done) return { eligible: true, showNow: false };
  if (n.lastAskDate === todayKey) return { eligible: true, showNow: false };
  if (n.asks >= STREAK_NUDGE_MAX_ASKS) return { eligible: true, showNow: false };
  if (n.lastAskDate !== null) {
    const cooledDown =
      daysBetween(n.lastAskDate, todayKey) >= STREAK_NUDGE_COOLDOWN_DAYS &&
      usageDateKeysAfter(history, today, n.lastAskDate) >= STREAK_NUDGE_COOLDOWN_USAGE_DAYS;
    if (!cooledDown) return { eligible: true, showNow: false };
  }
  return { eligible: true, showNow: true };
}
