/**
 * Every user-visible string, as a stable API the rest of the codebase
 * calls (`COPY.overlay.titleN(3, 'Reels')`, `COPY.overlay.ctaLeave`). The
 * actual words live in `shared/locales/<code>.js` and resolve through
 * `shared/i18n.js` — this file only maps call shapes to message keys, so
 * adding a language never touches a call site.
 *
 * Constant strings are getters, not values: they re-resolve on every read,
 * so a language switch takes effect on the next render without any caller
 * change. Parameterised strings are methods.
 *
 * `initI18n()` (i18n.js) must have run before a non-English UI; until then
 * every string is English. Design-doc copy rules (2.1): never scold, never
 * say "wasted", no emoji.
 */

import { t, meta } from './i18n.js';

/** Active-locale ordinal word, e.g. ordinal(3) -> "3rd". */
export function ordinal(n) {
  return meta().ordinal(n);
}

/** Pick a plural form for `n`: plural(n, { one, other }). */
export function plural(n, forms) {
  return meta().plural(n, forms);
}

export const COPY = {
  overlay: {
    titleN: (n, feedLabel) => t('overlay.titleN', { ord: ordinal(n), feed: feedLabel }),
    titleFirst: (feedLabel) => t('overlay.titleFirst', { feed: feedLabel }),
    subMinutes: (time) => t('overlay.subMinutes', { time }),
    get subFirst() {
      return t('overlay.subFirst');
    },
    get subTake() {
      return t('overlay.subTake');
    },
    secondsLeft: (n) => t('overlay.secondsLeft', { n }),
    get ctaLeave() {
      return t('overlay.ctaLeave');
    },
    ctaWait: (n) => t('overlay.ctaWait', { n }),
    get ctaReady() {
      return t('overlay.ctaReady');
    },
    get foot() {
      return t('overlay.foot');
    },
    // FR-41 intention prompt
    get intentLabel() {
      return t('overlay.intentLabel');
    },
    get intentSpecific() {
      return t('overlay.intentSpecific');
    },
    get intentNoise() {
      return t('overlay.intentNoise');
    },
    get intentBreak() {
      return t('overlay.intentBreak');
    },
    get ctaPick() {
      return t('overlay.ctaPick');
    },
    heavy: (time) => t('overlay.heavy', { time }),
    heavyBadge: (opens, time) => t('overlay.heavyBadge', { opens, time }),
    recurringTitle: (minutes) => t('overlay.recurringTitle', { minutes }),
    get recurringSub() {
      return t('overlay.recurringSub');
    },
  },
  block: {
    get title() {
      return t('block.title');
    },
    sub: (n, homeLabel) => t('block.sub', { n, home: homeLabel }),
    get skip() {
      return t('block.skip');
    },
    get hint() {
      return t('block.hint');
    },
    get badge() {
      return t('block.badge');
    },
  },
  shelf: {
    label: (feedLabel) => t('shelf.label', { feed: feedLabel }),
    expandedLabel: (feedLabel) => t('shelf.expandedLabel', { feed: feedLabel }),
    expand: (feedLabel) => t('shelf.expand', { feed: feedLabel }),
    collapse: (feedLabel) => t('shelf.collapse', { feed: feedLabel }),
  },
  reelItem: {
    get label() {
      return t('reelItem.label');
    },
    get expandedLabel() {
      return t('reelItem.expandedLabel');
    },
    get expand() {
      return t('reelItem.expand');
    },
    get collapse() {
      return t('reelItem.collapse');
    },
    get open() {
      return t('reelItem.open');
    },
  },
  units: {
    // plural noun for a count of opens ("1 open" / "3 opens")
    opens: (n) => t(n === 1 ? 'units.open' : 'units.opens'),
    minutes: () => t('units.min'),
  },
  popup: {
    sectionToday: (platformLabels) =>
      platformLabels.length === 1
        ? t('popup.sectionTodayOne', { label: String(platformLabels[0]).toUpperCase() })
        : t('popup.sectionToday'),
    get zero() {
      return t('popup.zero');
    },
    // FR-40: the opens card's "N away" badge + its hover tooltip.
    stepAwayBadge: (n) => t('popup.stepAwayBadge', { n }),
    stepAwayTip: (n, total) => t('popup.stepAwayTip', { n, total }),
    // FR-40: the spent card's "+Nm" badge + its hover tooltip.
    avoidedBadge: (n) => t('popup.avoidedBadge', { n }),
    avoidedTip: (n) => t('popup.avoidedTip', { n }),
    get modeLabel() {
      return t('popup.modeLabel');
    },
    get modeGroupAria() {
      return t('popup.modeGroupAria');
    },
    get modeFrictionLabel() {
      return t('popup.modeFrictionLabel');
    },
    get modeBlockLabel() {
      return t('popup.modeBlockLabel');
    },
    get modeFriction() {
      return t('popup.modeFriction');
    },
    get modeBlock() {
      return t('popup.modeBlock');
    },
    pill: (mode) => t(mode === 'block' ? 'popup.pillBlock' : 'popup.pillFriction'),
    blockedSummary: (blocked, total) => t('popup.blockedSummary', { blocked, total }),
    breakdownRow: (siteName, value, unit) => t('popup.breakdownRow', { site: siteName, value, unit }),
    get recurringLabel() {
      return t('popup.recurringLabel');
    },
    recurringHelperOn: (m) => t('popup.recurringHelperOn', { m }),
    get recurringHelperOff() {
      return t('popup.recurringHelperOff');
    },
    recurringCapped: (max) => t('popup.recurringCapped', { max }),
    get recurringWatchingPrefix() {
      return t('popup.recurringWatchingPrefix');
    },
    recurringProgress: (elapsedLabel, intervalMinutes) =>
      t('popup.recurringProgress', { elapsed: elapsedLabel, mins: intervalMinutes }),
    get recurringWatchingSuffix() {
      return t('popup.recurringWatchingSuffix');
    },
    get decreaseInterval() {
      return t('popup.decreaseInterval');
    },
    get increaseInterval() {
      return t('popup.increaseInterval');
    },
    get intervalAria() {
      return t('popup.intervalAria');
    },
    get minutesUnit() {
      return t('popup.minutesUnit');
    },
    get privacy() {
      return t('popup.privacy');
    },
    degraded: (feedLabel, feedPath) => t('popup.degraded', { feed: feedLabel, path: feedPath }),
    degradedTitle: (feedLabel) => t('popup.degradedTitle', { feed: feedLabel }),
    get checkForUpdate() {
      return t('popup.checkForUpdate');
    },
    get report() {
      return t('popup.report');
    },
    get dismiss() {
      return t('popup.dismiss');
    },
    // FR-39 review nudge
    get reviewTitle() {
      return t('popup.reviewTitle');
    },
    get reviewBody() {
      return t('popup.reviewBody');
    },
    get reviewCta() {
      return t('popup.reviewCta');
    },
    get reviewLater() {
      return t('popup.reviewLater');
    },
    get reviewDecline() {
      return t('popup.reviewDecline');
    },
    get reviewMenuLabel() {
      return t('popup.reviewMenuLabel');
    },
    // FR-41 intention prompt setting
    get intentionTitle() {
      return t('popup.intentionTitle');
    },
    get intentionBody() {
      return t('popup.intentionBody');
    },
    get updateChecking() {
      return t('popup.updateChecking');
    },
    get updateAvailable() {
      return t('popup.updateAvailable');
    },
    get updateNone() {
      return t('popup.updateNone');
    },
    get updateThrottled() {
      return t('popup.updateThrottled');
    },
    get updateError() {
      return t('popup.updateError');
    },
    get updateReadyTitle() {
      return t('popup.updateReadyTitle');
    },
    updateReadyBody: (version) => t('popup.updateReadyBody', { version }),
    get updateReadyCta() {
      return t('popup.updateReadyCta');
    },
    get trendLabel() {
      return t('popup.trendLabel');
    },
    get trendMetricOpens() {
      return t('popup.trendMetricOpens');
    },
    get trendMetricMinutes() {
      return t('popup.trendMetricMinutes');
    },
    get trendRangeShort() {
      return t('popup.trendRangeShort');
    },
    get trendRangeLong() {
      return t('popup.trendRangeLong');
    },
    trendAria: (days, metric) => t('popup.trendAria', { days, metric }),
    get trendToday() {
      return t('popup.trendToday');
    },
    get trendDateRangeAria() {
      return t('popup.trendDateRangeAria');
    },
    get trendMetricAria() {
      return t('popup.trendMetricAria');
    },
    get opensLabel() {
      return t('popup.opensLabel');
    },
    get spentLabel() {
      return t('popup.spentLabel');
    },
    get languageLabel() {
      return t('popup.languageLabel');
    },
    get settingsLabel() {
      return t('popup.settingsLabel');
    },
    get moreAria() {
      return t('popup.moreAria');
    },
    get settingsBack() {
      return t('popup.settingsBack');
    },
    get reportLabel() {
      return t('popup.reportLabel');
    },
    get aboutLabel() {
      return t('popup.aboutLabel');
    },
    aboutVersion: (version) => t('popup.aboutVersion', { version }),
    get aboutLink() {
      return t('popup.aboutLink');
    },
  },
  // FR-15 / FR-37: the first-run offer and the quick tour (popup/tour.js).
  tour: {
    get offerTitle() {
      return t('tour.offerTitle');
    },
    get offerBody() {
      return t('tour.offerBody');
    },
    get start() {
      return t('tour.start');
    },
    get skipOffer() {
      return t('tour.skipOffer');
    },
    get aria() {
      return t('tour.aria');
    },
    stepOf: (n, total) => t('tour.stepOf', { n, total }),
    get next() {
      return t('tour.next');
    },
    get done() {
      return t('tour.done');
    },
    get skip() {
      return t('tour.skip');
    },
    // A step's copy is keyed by its id in tour.js's STEPS (today, language,
    // trend, mode, reminder, more) — tour.<id>.title / tour.<id>.body.
    title: (id) => t(`tour.${id}.title`),
    body: (id) => t(`tour.${id}.body`),
  },
};
