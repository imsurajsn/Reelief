# Changelog

All notable changes to Reelief are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); version numbers
follow [Semantic Versioning](https://semver.org/). See `RELEASING.md` for
how a release gets cut, and how to decide the version bump.

## [Unreleased]

- Added a "time avoided" estimate to the TODAY stats (FR-40): the opens card
  now shows a small "N away" badge whenever you've stepped away today, and
  the spent card shows "+Nm" — an estimate based on your own average session
  length, not a generic assumption — once you've built up enough history for
  it to be meaningful (5+ continued sessions). Hovering either badge shows
  how it was worked out. Replaces the old "You stepped away X of Y times
  today" line. No new tracking — computed entirely from existing counters.
  Translated in all 12 shipped languages.
- The "Rate Reelief" row in the ⋮ menu no longer disappears after someone has
  reviewed (or chosen "Don't ask again"): it stays for good as an ordinary
  plain-text row, without the amber bar or the dot on ⋮, and still opens the
  review page.
- Added a gentle review nudge (FR-39): after 3 days of real use, an amber dot
  appears on the toolbar icon and the popup shows a "Been useful?" card with
  Leave a review / Maybe later / Don't ask again, and a "Rate Reelief" row
  appears in the ⋮ menu. At most 3 asks ever, spaced 21 days and 3 more
  usage days apart; leaving a review or "Don't ask again" stops it for good.
  The update-ready dot keeps priority on the toolbar. The Store link is the new
  `reviewUrl` field in `config/product.config.json`; leave it empty to switch
  the nudge off. Nothing is sent by the extension — the Store page only opens
  when someone clicks. Translated in all 12 languages.
- Added an uninstall feedback survey: removing Reelief now opens a short,
  anonymous Google Form in a new tab asking why (optional, no email
  collected, nothing is sent by the extension itself). The link is the new
  `uninstallSurveyUrl` field in `config/product.config.json`; leave it empty
  to switch the feature off. `PRIVACY.md` updated to disclose it.

## [1.1.0] - 2026-09-20

- Added a passive nudge for when Chrome has already downloaded a pending
  update: the popup shows an "Update ready" banner (dismissible, with a
  toolbar-icon badge) with an "Update now" button that reloads the
  extension, instead of the update sitting silently until the browser next
  restarts (#26).
- Backfilled all 11 non-English locales for strings added since PR #19
  (Report/About labels, all "Check for update" result messages, the update-
  ready nudge) — these had only ever been added to English, silently
  falling back for every other language.
- Added a first-run quick tour: the onboarding card now offers "Want a quick tour?"
  (Skip always visible) and, if accepted, spotlights the popup's real
  sections one at a time — Today, language, Trend, Mode, the reminder stepper
  (Friction mode only) and the ⋮ menu — ending in "Done". Localized into all
  12 languages.
- Localized the popup UI into 14 languages, with RTL layout support
  (PR #18).
- Fixed the degraded-shelf banner's "Check for update" and "Report"
  buttons, both dead since a background-service-worker loading bug;
  "Check for update" now shows its actual result instead of nothing (#14,
  PR #19).
- Moved the language picker out of onboarding/settings and into a pill on
  the main page next to TODAY; added "Report an issue" and "About" to the
  ⋮ settings menu (PR #19).

## [1.0.0] - 2026-09-02

Initial public (V1.0) Chrome Web Store release.

- Friction pause and hard-block modes on YouTube Shorts, Instagram Reels,
  and Facebook Reels.
- Popup stats: today's opens/time spent, 7-day/30-day trend chart,
  per-platform breakdown.
- Optional recurring re-friction reminder after N minutes of continuous
  watching.
- Health-check watchdog that shows a "can't find the Shorts shelf" banner
  if a platform's page layout changes.

[Unreleased]: https://github.com/imsurajsn/Reelief/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/imsurajsn/Reelief/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/imsurajsn/Reelief/releases/tag/v1.0.0
