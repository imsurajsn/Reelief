# Reelief — Product Requirements Document

**Tagline:** Get Reelief from endless scrolling  
**Document status:** V0.2 — Updated after author review  
**Last updated:** August 2026

---

## 1. What We're Building

Reelief is a browser extension that helps users reduce their consumption of short-form video content (YouTube Shorts, Instagram Reels, Facebook Reels) without cutting them off from the platforms entirely. Instead of hard-blocking, Reelief inserts a brief friction pause before short-form feeds load — breaking the automatic reflex loop that drives mindless scrolling. Users can toggle to full blocking if they prefer. A lightweight stats dashboard shows how many times they've opened short-form feeds today and how much time they've reclaimed.

---

## 2. Who It's For & What Problem It Solves

**Primary user:** Self-aware adults aged 22–40 who recognise they spend too much time on short-form video feeds and want a lightweight, low-friction tool to help them stop. They are not looking for heavy-handed parental controls or an app that locks them out of their phone — they want a nudge, not a cage.

**The problem:** Short-form video platforms (YouTube Shorts, Instagram Reels, TikTok, Facebook Reels) are algorithmically optimised to trigger dopamine loops that bypass conscious decision-making. Users open a platform with a purpose (check a message, watch a specific video) and find themselves 40 minutes deep in Reels without having chosen to be there. Existing tools either block entire apps/sites (too nuclear, users uninstall) or are too generic (screen time apps that cover everything, nothing specifically). No tool is focused specifically on short-form video feeds with a behavioural-science-backed friction approach.

**What Reelief does differently:** It targets only short-form feeds, not entire platforms. It uses friction (a pause that breaks the reflex) rather than blocking as the default, which research shows reduces usage by ~57% without the resentment that hard blocking creates. It keeps stats simple — just enough to create awareness, not enough to overwhelm.

---

## 3. Scope

### V1a — YouTube Shorts (initial ship)
Chrome extension. Friction mechanic on YouTube Shorts only. Basic daily stats in popup. Settings toggle (friction vs. block). No backend, no account required.

### V1b — Instagram Reels
Extend content scripts to cover Instagram Reels (feed and dedicated Reels tab). Stats update to track across both platforms.

### V1c — Facebook Reels (public V1.0 launch)
Extend to Facebook Reels. This is the version that gets listed publicly on the Chrome Web Store and announced on Product Hunt / Reddit. All three platforms covered, stats unified.

### V1.5 — Browser Expansion
Port Reelief to Firefox and Microsoft Edge. No new features — parity with V1c on both browsers.

### V2 — Mobile Companion + Paid Tier (future)
Mobile app (iOS + Android) with Screen Time API integration. Cross-platform unified dashboard showing total short-form time across all platforms and devices. Weekly summary emails. Streak tracking. Social accountability (optional — share goals with a friend).

### Explicitly Out of Scope for V1 / V1.5
- TikTok (primarily mobile-app consumption; web version is low-usage — defer to V2)
- Safari extension (requires Xcode and Apple Developer account — defer to V1.5 or V2)
- Per-platform friction/block toggle (global toggle only in V1 — add per-platform if users request it)
- Backend / user accounts / cloud sync (everything is local in V1)
- Scheduled modes ("block Reels only between 9am–6pm") — defer to V2
- Any form of paywall or paid tier in V1 or V1.5

---

## 4. Functional Requirements

Requirements are numbered and grouped by release. All are written as user-observable behaviours.

### 4.1 V1a — YouTube Shorts

**FR-01:** When a user navigates to `youtube.com/shorts/*`, Reelief intercepts the page load and displays a friction overlay before the Shorts feed renders.

**FR-02:** The friction overlay shows: (a) the number of times the user has opened Shorts today, (b) the total minutes spent on Shorts today, (c) a "Continue anyway" button, (d) a "Not now — go back" button.

**FR-03:** The friction overlay has a default delay of 5 seconds before the "Continue anyway" button becomes active. The countdown is visible to the user.

**FR-04:** If the user clicks "Not now — go back", the browser navigates back to the previous page (or to youtube.com homepage if there is no previous page).

**FR-05:** If the user clicks "Continue anyway" (after the countdown), the overlay dismisses and Shorts loads normally.

**FR-06:** Reelief also detects and intercepts the Shorts shelf on the YouTube homepage (the horizontal row of Shorts thumbnails). By default, it replaces the shelf with a collapsed placeholder ("Shorts hidden — click to reveal") rather than applying the full friction overlay for inline shelf content.

**FR-07:** Reelief detects and removes the "Shorts" entry from the YouTube left-sidebar navigation to reduce the visual temptation trigger.

**FR-08:** The extension popup (accessible by clicking the Reelief icon in the browser toolbar) shows: (a) today's Shorts open count, (b) today's estimated time on Shorts (in minutes), (c) the current mode (Friction / Block), (d) a toggle to switch between Friction mode and Block mode.

**FR-09:** In Block mode, navigating to `youtube.com/shorts/*` triggers a full-page overlay injected by the content script before Shorts content renders. The overlay displays the message "Block mode is on — taking you back" with a 6-second visible countdown progress bar. After 6 seconds, the browser redirects programmatically to the YouTube homepage. A "Go now" control lets the user skip the wait and redirect immediately. The Shorts page content never renders beneath the overlay. Note: this uses a content script overlay + `window.location` redirect, not `declarativeNetRequest`, since the animated countdown UX requires DOM control.

**FR-10:** In Block mode, the Shorts shelf on the YouTube homepage is fully hidden (not collapsed — removed entirely).

**FR-11:** All stats data (daily counts and time) is stored locally using the Chrome Storage API. No data leaves the user's device.

**FR-12:** At midnight (local time), today's stats are written to a historical log (one record per day, per platform, storing opens count and minutes) and today's counters reset to zero. Records are retained for 30 days before being pruned. Historical records are stored locally in Chrome Storage — no data leaves the device. This data powers the trend chart in the popup (FR-25). The midnight archive is triggered via the Chrome Alarms API; if the browser is closed at midnight, the archive fires on next browser open if midnight has passed.

**FR-13:** The extension works without requiring any user account, sign-in, or internet connection (beyond what the sites themselves require).

**FR-14:** The default mode on fresh install is Friction mode.

**FR-15:** On first install, Reelief shows a brief onboarding tooltip on the popup explaining what it does and the two modes. This is a one-time tooltip, not a separate onboarding flow.

**FR-15a (PROPOSED, added post-launch):** In Friction mode only, the popup includes a configurable "remind me every" interval: an editable numeric control (±1-minute step buttons, or type a value directly) ranging from 0 (**off**, the default) to 60 minutes; typing or stepping past 60 clamps to 60 with a brief on-screen note. Hidden entirely in Block mode, where no session ever starts and the setting has no meaning. When set above 0, Reelief re-shows the friction overlay (same 5-second countdown, same "Not now" / "Continue anyway" choice) after that many minutes of continuous watching within a single visit — distinct from FR-01's entry friction, which fires only once per visit. A recurring prompt is logged as an `interruption`, a separate daily counter from `opens` (FR-08) — it is not a new visit and must not inflate that count. Off by default: this is a more assertive intervention than the PRD's baseline single-entry friction, and per the product's "nudge, not cage" principle (section 2), a second-stage timer should be opt-in, not silently enabled for existing users.

---

### 4.2 V1b — Instagram Reels

**FR-16:** When a user navigates to `instagram.com/reels/*`, Reelief applies the same friction overlay (FR-01 through FR-05) as on YouTube Shorts, with the same countdown and the same "Continue anyway" / "Not now" options.

**FR-17:** Reelief detects the Reels tab in the Instagram bottom navigation bar (on web) and replaces the Reels icon with a visual indicator (greyed out icon + small "R" badge) to reduce temptation trigger. The tab remains clickable but triggers the overlay.

**FR-18:** When the Instagram main feed surfaces Reels videos inline (video posts that auto-play as Reels in the feed), Reelief replaces those video thumbnails with a static placeholder ("Reel hidden") rather than applying a full overlay for each inline video. The user can click the placeholder to reveal that specific video.

**FR-19:** The extension popup stats update to show combined stats across YouTube Shorts and Instagram Reels. Platform breakdown is shown (e.g., "YouTube: 3 opens, 12 min | Instagram: 2 opens, 8 min | Total: 5 opens, 20 min").

**FR-20:** Block mode on Instagram: navigating to `instagram.com/reels/*` triggers the same 6-second overlay + redirect pattern as FR-09, with the message "Block mode is on — taking you back" and redirect to the Instagram homepage. Inline Reels in the feed are fully hidden (not collapsed).

---

### 4.3 V1c — Facebook Reels (Public V1.0)

**FR-21:** When a user navigates to `facebook.com/reels/` or any Facebook URL that surfaces the Reels feed, Reelief applies the friction overlay (same behaviour as FR-01 through FR-05).

**FR-22:** Reelief detects Reels videos surfaced inline in the Facebook News Feed and replaces them with a static placeholder, consistent with FR-18 behaviour for Instagram.

**FR-23:** Block mode on Facebook: navigating to Facebook Reels triggers the same 6-second overlay + redirect pattern as FR-09, with the message "Block mode is on — taking you back" and redirect to the Facebook homepage. Inline Reels in the News Feed are fully hidden.

**FR-24:** The extension popup stats update to show combined stats across all three platforms (YouTube, Instagram, Facebook). Platform breakdown visible in popup.

**FR-25:** The extension popup shows a 30-day trend bar chart (one bar per day, showing total opens or total minutes — user can toggle between the two views). A "Last 7 days" zoom button is available for a tighter view. This gives users both a daily snapshot and a longer arc of their habit over time, making progress feel visible and motivating.

**FR-26:** The extension icon badge shows the user's total short-form opens for today as a number (e.g., "7"). Badge turns from grey to amber at 5+ opens and red at 10+ opens to create ambient awareness.

---

### 4.4 V1.5 — Browser Ports

**FR-27:** Reelief is available as a Firefox add-on with feature parity to V1c (all three platforms, both modes, popup stats, 30-day chart).

**FR-28:** Reelief is available as a Microsoft Edge extension (via the Edge Add-ons store) with feature parity to V1c.

**FR-29:** No features are added in V1.5 beyond browser parity. The codebase is the same; only manifest and browser API compatibility differences are handled.

---

## 5. Technical Approach

### 5.1 Architecture

Reelief is a standard browser extension built to Manifest V3 (MV3) specification. MV3 is required for Chrome extensions going forward — MV2 is deprecated and no longer accepted for new extensions on the Chrome Web Store.

The extension has three components:

**Content Scripts** — JavaScript injected into matching pages. Responsible for DOM manipulation: detecting Shorts/Reels feeds, injecting the friction overlay, hiding/replacing shelves and inline content, and tracking time spent on short-form pages.

**Background Service Worker** — Handles Chrome Storage reads/writes for stats persistence, listens for messages from content scripts, handles the midnight stats reset via Chrome Alarms API.

**Extension Popup** — HTML/CSS/JS rendered when the user clicks the Reelief toolbar icon. Reads stats from Chrome Storage and renders the dashboard. Handles the friction/block mode toggle.

### 5.2 Key Technical Decisions

**Decision: Manifest V3 (not V2)**
MV2 extensions are no longer accepted on the Chrome Web Store as of 2024. MV3 has stricter rules (no remotely hosted code, service workers instead of background pages, declarativeNetRequest for network blocking). We build to MV3 from day one.

**Decision: No backend in V1/V1.5**
All data stored locally via Chrome Storage API. No user accounts, no sync, no analytics collection. Reasons: (a) fastest to ship, (b) strongest privacy story ("your data never leaves your device"), (c) no server costs, (d) no GDPR/data compliance overhead for V1.

**Decision: Friction via DOM overlay, not network interception**
We could block the network request to short-form URLs using `declarativeNetRequest` (MV3's replacement for `webRequest`). We deliberately do NOT do this for Friction mode — network blocking would show a browser error page, which is jarring and bypasses our custom overlay UI. Instead, content scripts intercept after page load begins and inject the overlay before the feed renders. This gives us full control over the UX.

Block mode uses a content script overlay + `window.location` programmatic redirect — not `declarativeNetRequest` — because the animated countdown (FR-09) requires DOM control that network-level blocking cannot provide.

**Decision: CSS/JS only, no framework**
No React, no Vue. The popup and overlay are plain HTML/CSS/JS. Reasons: (a) smaller bundle size (extensions have size limits and load on every matching page), (b) no build pipeline needed for V1, (c) fewer dependencies to maintain when platforms change their DOM.

**Decision: Vanilla JS for content scripts**
Same reasoning. Content scripts run in the context of the target page — a heavy framework increases load time and risks conflicts with the host page's own JS.

**Decision: MutationObserver for dynamic content**
YouTube, Instagram, and Facebook are single-page apps (SPAs). URLs change without full page reloads, and content is injected dynamically via JavaScript. Content scripts use MutationObserver to watch for DOM changes and re-apply Reelief's hiding/overlay logic when the SPA navigation occurs.

**Decision: Defer Safari to V1.5 or later**
Safari extensions require an Xcode project wrapper, Apple Developer Program membership ($99/year), and a separate App Store submission. The effort is disproportionate to V1 priorities. Firefox and Edge share the same WebExtensions API as Chrome and are much faster to port.

### 5.3 Time Tracking Approach

Reelief tracks "time on short-form feeds" using a simple session timer in the content script: a timestamp is recorded when the friction overlay is dismissed (user clicks "Continue anyway"), and another timestamp is recorded when the user navigates away (via `visibilitychange` or `beforeunload` events). The delta is added to the day's total in Chrome Storage. This is approximate but accurate enough for the dashboard's purpose.

### 5.4 Stack Summary

| Layer | Choice | Reason |
|---|---|---|
| Extension spec | Manifest V3 | Required for Chrome Web Store |
| Content scripts | Vanilla JS | Small, fast, no conflicts |
| Popup UI | HTML/CSS/Vanilla JS | No build pipeline, small bundle |
| Storage | Chrome Storage API (local) | No backend, privacy-first |
| Block mode redirect | Content script + window.location | Needed for 6-sec animated overlay before redirect |
| Alarms / scheduling | Chrome Alarms API | Midnight stats archive + reset |
| Dynamic content detection | MutationObserver | SPA navigation handling |
| Build tooling | None for V1 (manual bundling) | Simplicity; add webpack/rollup if needed for V1.5 |
| Browser ports | WebExtensions API (Firefox, Edge) | Same codebase, minor manifest differences |

### 5.5 Rejected Alternatives

**React/framework for popup** — Rejected. Adds ~40–100KB to bundle, requires build pipeline, no meaningful benefit for a popup with <5 UI states.

**Backend + user accounts in V1** — Rejected. Adds weeks of build time, hosting cost, compliance overhead. No feature in V1 requires it.

**Full webRequest blocking (MV2 approach)** — Rejected. MV2 is deprecated; webRequest blocking is not available in MV3. declarativeNetRequest is the correct MV3 approach.

**Time tracking via screenshot/ML approach** — Rejected as massively over-engineered. Simple session timer is sufficient for V1's needs.

---

## 6. Constraints & Assumptions

- **Builder:** Assumed solo developer or very small team (1–2 people). No large engineering org.
- **Budget:** Near-zero for V1. No backend hosting costs. No paid tooling required. Chrome Developer account: one-time $5 fee.
- **Platform stability:** YouTube, Instagram, and Facebook change their DOM structures regularly. Content scripts that target CSS class names or DOM structure will break when platforms update. This is an ongoing maintenance cost — assume at least one content script fix needed per month per platform.
- **Chrome Web Store review:** New extensions go through a review process that can take 1–3 weeks. Plan for this in the V1a launch timeline.
- **No iOS/Android in V1/V1.5:** Short-form video consumption is primarily mobile, but iOS and Android are explicitly deferred. V1 targets the desktop browser use case.
- **Privacy:** No user data is collected, stored remotely, or shared. The privacy policy for the Chrome Web Store listing should explicitly state this.
- **Monetisation:** Zero in V1 and V1.5. The product is fully free. No ads, no upsells, no email capture.
- **Language:** English only for V1. Internationalisation (i18n) deferred.

---

## 7. Known Risks & Open Questions

**Risk 1 — Platform DOM changes break content scripts (HIGH likelihood, MEDIUM impact)**
YouTube, Instagram, and Facebook update their frontend code frequently. CSS class names used to identify the Shorts shelf, Reels tab, or inline Reels videos will change without notice. Reelief's content scripts will silently stop working until patched. Mitigation: use multiple selector strategies (URL patterns, ARIA roles, data attributes) rather than relying on a single CSS class. Monitor user reports and set up a personal test routine after major platform updates.

**Risk 2 — Platforms actively fight blockers (MEDIUM likelihood, HIGH impact)**
YouTube has previously taken steps to detect and break ad blockers. They could apply similar techniques to detect content-manipulation extensions. Instagram/Facebook (Meta) have also shown adversarial behaviour toward extensions modifying their DOM. If this happens, Reelief's core mechanic breaks. No easy mitigation — this is an arms race risk inherent to the product category.

**Risk 3 — Low 30-day retention (HIGH likelihood if not mitigated)**
Wellness apps lose ~80% of users within 30 days. If Reelief doesn't show clear value quickly, users will disable or uninstall it. Mitigation: the badge icon (FR-26) creating ambient daily awareness is important here — it makes the product "present" even on days users don't open the popup. The 30-day chart (FR-25) gives a sense of progress over time that brings users back to the popup and makes improvement feel visible.

**Risk 4 — Users circumvent the friction mechanic (MEDIUM likelihood)**
The friction overlay is designed to break the reflex, not to be an unbreakable wall. Users who are strongly motivated to watch Reels will just click "Continue anyway" every time and the product adds no value for them. This is partially by design (we're not trying to lock people out), but it means the product's value is limited to users in the "want to change but need a nudge" bucket — not the deeply addicted. That's actually fine for V1's target user.

**Risk 5 — Chrome Web Store rejection**
Extensions that manipulate third-party sites face closer scrutiny. Chrome Web Store may request clarification on permissions. Mitigation: request the minimum permissions necessary (activeTab, storage, alarms — no broad host permissions unless required), write a clear privacy policy, and be descriptive in the store listing about exactly what the extension does and why each permission is needed.

**Open Question 1:** Should the 5-second countdown be configurable (e.g., user can set it to 3s, 5s, 10s)? Keeping it fixed at 5s simplifies V1. Add configurability if users request it.

**Open Question 2:** Should "time on Shorts" tracking count time when the browser tab is backgrounded (user switched to another tab but Shorts is still open)? Likely no — only count active foreground time. Needs a decision before FR-02 implementation.

**Open Question 3:** ~~What happens on the Stats reset at midnight if the browser is closed?~~ Resolved in FR-12: Chrome Alarms fire on next browser open if midnight has passed. The archive runs then, which is acceptable for V1.

---

## 8. Success Criteria

### V1a (YouTube Shorts only — internal/soft launch)
- Extension installs and works correctly on at least 10 personal test sessions across Chrome versions
- Friction overlay appears within 300ms of Shorts navigation
- Block mode redirect works without showing a browser error page
- Stats persist across browser restarts
- Chrome Web Store submission accepted

### V1c (Public V1.0 launch)
- 100 installs within 30 days of Product Hunt launch
- 40% of installed users still active (have opened the popup or triggered the overlay) at day 14
- Zero critical bugs (extension breaking entirely) for more than 48 hours after a platform DOM update
- At least 10 organic reviews on the Chrome Web Store with average 4+ stars
- At least one Reddit post in r/nosurf or r/productivity with positive community response

### V1.5 (Browser parity)
- Firefox and Edge versions achieve parity with V1c within 4 weeks of V1c launch
- Combined installs across Chrome + Firefox + Edge: 500+

### V2 (Paid tier launch — future)
- Freemium conversion rate of 3–5% of monthly active users to paid tier
- Mobile app retention at day 30: 25%+ (higher bar than extension because mobile requires more commitment to install)