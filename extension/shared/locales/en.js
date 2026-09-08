/**
 * English — the base locale. Every other file under this directory is
 * merged over this one per-key, so any key a translation omits shows the
 * English text here rather than a blank (see shared/i18n.js).
 *
 * Values are strings with `{name}` placeholders, filled by `t()`.
 * `meta.ordinal` / `meta.plural` are language rules, so each locale carries
 * its own; the ones here are English.
 *
 * Design-doc copy rules (2.1): never scold, never say "wasted", no emoji.
 */

export default {
  meta: {
    // "1st", "2nd", "3rd" ... for overlay.titleN
    ordinal: (n) => {
      const words = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth'];
      if (words[n]) return words[n];
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
    },
    // pick a plural form: plural(n, { one, other })
    plural: (n, forms) => (n === 1 ? forms.one : forms.other),
  },

  // --- friction overlay (FR-01..FR-05, FR-16, FR-21) ---
  'overlay.titleN': 'This is your {ord} time on {feed} today.',
  'overlay.titleFirst': 'First {feed} of the day.',
  'overlay.subMinutes': '{time} so far',
  'overlay.subFirst': "Five seconds, then it's your call.",
  'overlay.subTake': 'Take the pause, then choose.',
  'overlay.secondsLeft': '{n} seconds',
  'overlay.ctaLeave': 'Not now — go back',
  'overlay.ctaWait': 'Continue anyway · {n}s',
  'overlay.ctaReady': 'Continue anyway',
  'overlay.foot': 'Esc also takes you back. Nothing about this visit leaves your device.',
  'overlay.heavy': '{time} so far. Block mode is one tap away in the popup.',
  'overlay.heavyBadge': '{opens} OPENS · {time}',
  'overlay.recurringTitle': "You've been watching for {minutes} minutes straight.",
  'overlay.recurringSub': 'Take five seconds, then keep going or step away.',

  // --- block overlay (FR-09, FR-20, FR-23) ---
  'block.title': 'Block mode is on — taking you back.',
  'block.sub': 'Returning to {home} in {n}s',
  'block.skip': 'Go now',
  'block.hint': 'Switch to Friction mode from the toolbar icon.',

  // --- collapsible shelf (YouTube / Facebook) ---
  'shelf.label': '{feed} hidden',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': 'Expand {feed} shelf',
  'shelf.collapse': 'Collapse {feed} shelf',

  // --- inline Reel post (Instagram / Facebook, FR-18 / FR-22) ---
  'reelItem.label': 'Reel hidden',
  'reelItem.expandedLabel': 'Reel',
  'reelItem.expand': 'Show this Reel',
  'reelItem.collapse': 'Hide this Reel',
  'reelItem.open': 'Open this Reel',

  // --- popup ---
  'popup.sectionToday': 'TODAY',
  'popup.sectionTodayOne': 'TODAY · {label}',
  'popup.zero': 'Nothing yet today. Numbers appear the first time a feed opens.',
  'popup.stepAway': 'You stepped away {a} of {b} times today.',
  'popup.modeLabel': 'MODE',
  'popup.modeGroupAria': 'Mode',
  'popup.modeFrictionLabel': 'Friction',
  'popup.modeBlockLabel': 'Block',
  'popup.modeFriction': 'A 5-second pause before a feed loads. You can always continue.',
  'popup.modeBlock': "Feeds won't open. You'll be returned home after 6 seconds.",
  'popup.pillFriction': 'FRICTION',
  'popup.pillBlock': 'BLOCK',
  'popup.blockedSummary': '{blocked} of those {total} were turned around by Block mode.',
  'popup.breakdownRow': '{site}: {value} {unit}',
  'popup.recurringLabel': 'REMIND ME EVERY',
  'popup.recurringHelperOn': "A 5-second pause every {m} minutes while you're watching.",
  'popup.recurringHelperOff':
    "Only the first pause per visit. Turn this on for a reminder while you're still scrolling.",
  'popup.recurringCapped': 'Capped at {max} minutes.',
  'popup.recurringWatchingPrefix': 'Watching now — ',
  'popup.recurringProgress': '{elapsed} of {mins} min',
  'popup.recurringWatchingSuffix': ' before the next pause.',
  'popup.decreaseInterval': 'Decrease interval',
  'popup.increaseInterval': 'Increase interval',
  'popup.intervalAria': 'Reminder interval in minutes',
  'popup.minutesUnit': 'm',
  'popup.privacy': 'Nothing leaves this device',
  'popup.degraded': "Reelief can't find the {feed} shelf. The pause on {path} still works.",
  'popup.degradedTitle': '{feed} page changed — a fix is usually a few days out.',
  'popup.checkForUpdate': 'Check for update',
  'popup.report': 'Report',
  'popup.dismiss': "Dismiss",
  'popup.trendLabel': 'TREND',
  'popup.trendMetricOpens': 'Opens',
  'popup.trendMetricMinutes': 'Minutes',
  'popup.trendRangeShort': '7D',
  'popup.trendRangeLong': '30D',
  'popup.trendAria': '{days}-day {metric} trend',
  'popup.trendToday': 'Today',
  'popup.trendDateRangeAria': 'Date range',
  'popup.trendMetricAria': 'Chart metric',

  // --- language selector (FR-32 / FR-33) ---
  'popup.languageLabel': 'LANGUAGE',
  'popup.languageMenuAria': 'Language',
  'popup.moreAria': 'More',

  // --- onboarding (FR-15 / FR-33) ---
  'popup.onboardTitle': 'Two ways to use Reelief',
  'popup.onboardBody':
    "{friction} pauses you for 5 seconds before a feed loads. {block} turns you around at the door. Switch any time — you're in {mode} now.",
  'popup.onboardCta': 'Got it',

  // --- shared units ---
  'units.open': 'open',
  'units.opens': 'opens',
  'units.min': 'min',
};
