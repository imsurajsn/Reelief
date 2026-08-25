/**
 * Every user-visible string in V1a, keyed as in the design doc's copy
 * deck (section 07). PRD-verbatim strings are marked. Never scold, never
 * say "wasted", no emoji (design doc 2.1 copy rules).
 */

const ORDINALS = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth'];

export function ordinal(n) {
  return ORDINALS[n] ?? `${n}th`;
}

export const COPY = {
  overlay: {
    titleN: (n, feedLabel) => `This is your ${ordinal(n)} time on ${feedLabel} today.`,
    titleFirst: (feedLabel) => `First ${feedLabel} of the day.`,
    subMinutes: (time) => `${time} so far`,
    subFirst: "Five seconds, then it's your call.",
    ctaLeave: 'Not now — go back', // FR-02d, verbatim
    ctaWait: (n) => `Continue anyway · ${n}s`,
    ctaReady: 'Continue anyway', // FR-02c, verbatim
    foot: 'Esc also takes you back. Nothing about this visit leaves your device.',
    heavy: (time) => `${time} so far. Block mode is one tap away in the popup.`,
    heavyBadge: (opens, time) => `${opens} OPENS · ${time}`,
    // Recurring re-friction: triggered by elapsed continuous watch time,
    // not a new visit — PROPOSED, opt-in, off by default.
    recurringTitle: (minutes) => `You've been watching for ${minutes} minutes straight.`,
    recurringSub: "Take five seconds, then keep going or step away.",
  },
  block: {
    title: 'Block mode is on — taking you back.', // FR-09, verbatim
    sub: (n, homeLabel) => `Returning to ${homeLabel} in ${n}s`,
    skip: 'Go now',
    hint: 'Switch to Friction mode from the toolbar icon.',
  },
  shelf: {
    label: 'Shorts hidden',
    expandedLabel: 'Shorts',
    expand: 'Expand Shorts shelf',
    collapse: 'Collapse Shorts shelf',
  },
  // FR-18: Instagram (and later Facebook) hide Reels at individual-post
  // granularity, not a shelf, so this is kept distinct from COPY.shelf
  // above rather than reused/replacing it.
  reelItem: {
    label: 'Reel hidden',
    expand: 'Show this Reel',
    collapse: 'Hide this Reel',
  },
  popup: {
    // Single platform (V1a): "TODAY · YOUTUBE SHORTS". Multiple platforms
    // (v1b/v1c): drops to plain "TODAY" — the per-platform breakdown line
    // (FR-19/FR-24) carries the platform names instead, so this heading
    // never has to enumerate them.
    sectionToday: (platformLabels) =>
      platformLabels.length === 1 ? `TODAY · ${platformLabels[0].toUpperCase()}` : 'TODAY',
    zero: 'Nothing yet today. Numbers appear the first time a feed opens.',
    stepAway: (a, b) => `You stepped away ${a} of ${b} times today.`,
    // Mode is a single global setting shared across every active platform
    // (shared/storage.js's `mode` key isn't platform-keyed), so this can't
    // name one specific feed/home — kept generic on purpose.
    modeFriction: 'A 5-second pause before a feed loads. You can always continue.',
    modeBlock: "Feeds won't open. You'll be returned home after 6 seconds.",
    blockedSummary: (blocked, total) => `${blocked} of those ${total} were turned around by Block mode.`,
    // FR-19: per-platform breakdown line, e.g.
    // "YouTube: 3 opens, 12 min | Instagram: 2 opens, 8 min | Total: 5 opens, 20 min"
    breakdownPart: (label, opens, minutes) => `${label}: ${opens} opens, ${minutes} min`,
    breakdownTotal: (opens, minutes) => `Total: ${opens} opens, ${minutes} min`,
    // Recurring re-friction interval control: editable 0-60 minute stepper, Friction mode only.
    recurringLabel: 'REMIND ME EVERY',
    recurringHelperOn: (m) => `A 5-second pause every ${m} minutes while you're watching.`,
    recurringHelperOff: "Only the first pause per visit. Turn this on for a reminder while you're still scrolling.",
    recurringCapped: (max) => `Capped at ${max} minutes.`,
    onboardTitle: 'Two ways to use Reelief',
    onboardCta: 'Got it',
    privacy: 'Nothing leaves this device',
    degraded: (feedLabel, feedPath) => `Reelief can't find the ${feedLabel} shelf. The pause on ${feedPath} still works.`,
    degradedTitle: (feedLabel) => `${feedLabel} page changed — a fix is usually a few days out.`,
    checkForUpdate: 'Check for update',
    report: 'Report',
  },
};
