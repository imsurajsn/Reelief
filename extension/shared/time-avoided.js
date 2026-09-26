/**
 * "Time avoided" (FR-40 / issue #23): today's estimated minutes avoided by
 * stepping away from the friction pause, using the person's own measured
 * continued-session length instead of an external assumed constant. Pure
 * decision logic — no imports, no chrome.* API — built entirely from data
 * shared/storage.js already keeps: the 30-day `history` archive and today's
 * live per-platform totals. No new storage fields.
 *
 * The rule, in one place:
 *   - A "continued session" is a friction-mode open that wasn't immediately
 *     abandoned: `opens - blockedOpens` per row. Block-mode opens never
 *     accumulate watch time (recordOpen() shares one `opens` counter across
 *     both modes), so they're excluded or they'd silently drag the average
 *     down.
 *   - avgSessionMinutes = total minutes / total continued sessions, summed
 *     across the trailing 30-day history plus today. Only once there are
 *     MIN_CONTINUED_SESSIONS of them — fewer than that and one unusually
 *     short or long session could swing the average wildly.
 *   - minutesAvoidedToday = today.stepAwayCount × that average, rounded to
 *     the nearest whole minute. It's an estimate of a counterfactual, not a
 *     measurement — the UI frames it as one ("~X min"), not a hard figure.
 */

export const MIN_CONTINUED_SESSIONS = 5;

/**
 * Mean continued-session length in minutes, friction-mode only, across
 * `history` (30-day archive rows: `{ opens, blockedOpens, minutes }`, any
 * platform) plus `today` (`{ opens, blockedOpens, minutes }` already
 * aggregated across platforms — pass `Math.floor(totals.seconds / 60)` for
 * its `minutes`, the same conversion the rest of the popup already uses).
 *
 * Returns null before MIN_CONTINUED_SESSIONS continued sessions exist —
 * too few data points for a stable personal average, not a real zero.
 */
export function averageSessionMinutes(history, today) {
  let minutes = 0;
  let sessions = 0;
  for (const row of history ?? []) {
    minutes += row.minutes;
    sessions += row.opens - row.blockedOpens;
  }
  minutes += today.minutes;
  sessions += today.opens - today.blockedOpens;
  return sessions < MIN_CONTINUED_SESSIONS ? null : minutes / sessions;
}

/**
 * @returns {{ avgSessionMinutes: number|null, minutesAvoidedToday: number|null }}
 * Both null when there's nothing to show: no step-aways today, or the
 * average isn't stable yet. `avgSessionMinutes` is rounded for display
 * (e.g. the "Your own 6m avg" tooltip), not used unrounded anywhere.
 */
export function evaluateTimeAvoided(history, today) {
  if (!today.stepAwayCount) return { avgSessionMinutes: null, minutesAvoidedToday: null };
  const avg = averageSessionMinutes(history, today);
  if (avg == null) return { avgSessionMinutes: null, minutesAvoidedToday: null };
  return {
    avgSessionMinutes: Math.round(avg),
    minutesAvoidedToday: Math.round(today.stepAwayCount * avg),
  };
}
