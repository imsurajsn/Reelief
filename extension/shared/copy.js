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
    titleN: (n) => `This is your ${ordinal(n)} time on Shorts today.`,
    titleFirst: 'First Shorts of the day.',
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
  popup: {
    // Single platform (V1a): "TODAY · YOUTUBE SHORTS". Multiple platforms
    // (v1b/v1c): drops to plain "TODAY" — the per-platform breakdown line
    // (FR-19/FR-24) carries the platform names instead, so this heading
    // never has to enumerate them.
    sectionToday: (platformLabels) =>
      platformLabels.length === 1 ? `TODAY · ${platformLabels[0].toUpperCase()}` : 'TODAY',
    zero: 'Nothing yet today. Numbers appear the first time Shorts opens.',
    stepAway: (a, b) => `You stepped away ${a} of ${b} times today.`,
    modeFriction: 'A 5-second pause before Shorts loads. You can always continue.',
    modeBlock: (homeLabel) => `Shorts won't open. You'll be returned to ${homeLabel} after 6 seconds.`,
    blockedSummary: (blocked, total) => `${blocked} of those ${total} were turned around by Block mode.`,
    // Recurring re-friction interval control: editable 0-60 minute stepper, Friction mode only.
    recurringLabel: 'REMIND ME EVERY',
    recurringHelperOn: (m) => `A 5-second pause every ${m} minutes while you're watching.`,
    recurringHelperOff: "Only the first pause per visit. Turn this on for a reminder while you're still scrolling.",
    recurringCapped: (max) => `Capped at ${max} minutes.`,
    onboardTitle: 'Two ways to use Reelief',
    onboardBody:
      'Friction pauses you for 5 seconds before Shorts loads. Block turns you around at the door. Switch any time — you\'re in Friction now.',
    onboardCta: 'Got it',
    privacy: 'Nothing leaves this device',
    degraded: "Reelief can't find the Shorts shelf. The pause on /shorts/ still works.",
    degradedTitle: "YouTube changed its page — a fix is usually a few days out.",
    checkForUpdate: 'Check for update',
    report: 'Report',
  },
};
