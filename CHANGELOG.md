# Changelog

All notable changes to Reelief are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); version numbers
follow [Semantic Versioning](https://semver.org/). See `RELEASING.md` for
how a release gets cut, and how to decide the version bump.

## [Unreleased]

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

[Unreleased]: https://github.com/imsurajsn/Reelief/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/imsurajsn/Reelief/releases/tag/v1.0.0
