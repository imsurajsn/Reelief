/**
 * Content script entry point (classic script, run_at document_start).
 * Everything else is a real ES module, dynamically imported via
 * chrome.runtime.getURL so no bundler is needed — see ARCHITECTURE.md.
 *
 * This file owns everything platform-agnostic: SPA-navigation detection,
 * overlay lifecycle, mode-change/race handling, and the shelf/sidebar
 * mutation loop. It delegates all DOM knowledge of a specific site to the
 * matched platform adapter (shared/platform-adapter.js shape).
 */

(async () => {
  const [
    storage,
    { SessionTimer },
    { showFrictionOverlay, showBlockOverlay, destroyActiveOverlay },
    { createVideoGuard },
    { youtubeShorts },
    { instagramReels },
  ] = await Promise.all([
    import(chrome.runtime.getURL('shared/storage.js')),
    import(chrome.runtime.getURL('shared/time.js')),
    import(chrome.runtime.getURL('shared/overlay.js')),
    import(chrome.runtime.getURL('shared/video-guard.js')),
    import(chrome.runtime.getURL('content/platforms/youtube-shorts.js')),
    import(chrome.runtime.getURL('content/platforms/instagram-reels.js')),
  ]);

  // Registry of adapters whose host matches this page. v1c adds another
  // entry here (and a matches/content_scripts block in the manifest)
  // without touching anything below.
  const ADAPTERS = [youtubeShorts, instagramReels];
  const adapter = ADAPTERS.find((a) => location.hostname.endsWith(a.hostname));
  if (!adapter) return;

  const HEALTH_CHECK_DELAY_MS = 4000;
  const HOME_PATH_PATTERN = /^\/(feed\/?.*)?$/;

  let previousPath = null;
  let isInShortsSession = false;
  let navStack = readNavStack();
  let sessionTimer = null;
  let secondsSinceLastFriction = 0; // resets on entry/exit and on each friction prompt of either kind
  const videoGuard = createVideoGuard();

  function readNavStack() {
    try {
      return JSON.parse(sessionStorage.getItem('reelief-nav-stack') ?? '[]');
    } catch {
      return [];
    }
  }

  function pushNavStack(path) {
    navStack.push(path);
    if (navStack.length > 5) navStack = navStack.slice(-5);
    try {
      sessionStorage.setItem('reelief-nav-stack', JSON.stringify(navStack));
    } catch {
      /* sessionStorage unavailable (rare) — nav stack degrades to in-memory only */
    }
  }

  function isExtensionAlive() {
    return Boolean(chrome.runtime?.id);
  }

  function goBackOrHome() {
    const prev = navStack[navStack.length - 2];
    const noHistory = window.history.length <= 1;
    const prevWasShorts = prev && adapter.shortsPathPattern.test(prev);
    if (noHistory || prevWasShorts) {
      window.location.assign(adapter.homeUrl);
    } else {
      window.history.back();
    }
  }

  function stopSession() {
    if (sessionTimer) {
      sessionTimer.stop();
      sessionTimer = null;
    }
  }

  function startSession() {
    stopSession();
    sessionTimer = new SessionTimer((deltaSeconds) => {
      if (!isExtensionAlive()) {
        stopSession();
        return;
      }
      storage.addSeconds(adapter.id, deltaSeconds);
      maybeTriggerRecurringFriction(deltaSeconds);
    });
    sessionTimer.start();
  }

  /**
   * Recurring re-friction (PROPOSED, opt-in, off by default): re-shows the
   * friction overlay after N continuous minutes of watching within one
   * visit — distinct from FR-01's entry friction, which only fires once
   * per visit. Piggybacks on the session timer's own flush cadence, so it
   * inherits the same visibility-aware pause behavior for free rather than
   * running a second independent timer.
   */
  async function maybeTriggerRecurringFriction(deltaSeconds) {
    const minutes = await storage.getRecurringFrictionMinutes();
    if (!minutes) return; // off
    secondsSinceLastFriction += deltaSeconds;
    if (secondsSinceLastFriction < minutes * 60) return;
    secondsSinceLastFriction = 0;

    stopSession();
    videoGuard.start();
    storage.recordInterruption(adapter.id); // not a new visit — tracked separately from `opens`
    showFrictionOverlay(
      { recurring: true, elapsedMinutes: minutes },
      {
        onLeave: () => {
          videoGuard.stop({ resume: false });
          goBackOrHome();
        },
        onContinue: () => {
          videoGuard.stop({ resume: true });
          startSession();
        },
      },
    );
  }

  async function enterShorts() {
    isInShortsSession = true;
    secondsSinceLastFriction = 0;
    const mode = await storage.getMode();

    if (mode === 'block') {
      await storage.recordOpen(adapter.id, { blocked: true });
      videoGuard.start();
      showBlockOverlay(
        {
          onRedirect: () => {
            videoGuard.stop({ resume: false });
            window.location.replace(adapter.homeUrl);
          },
        },
        adapter,
      );
      return;
    }

    const before = await storage.getTodayCounters(adapter.id);
    await storage.recordOpen(adapter.id);
    videoGuard.start();
    showFrictionOverlay(
      { opens: before.opens, minutes: Math.floor(before.seconds / 60), feedLabel: adapter.feedLabel },
      {
        onLeave: () => {
          videoGuard.stop({ resume: false });
          storage.recordStepAway(adapter.id);
          goBackOrHome();
        },
        onContinue: () => {
          videoGuard.stop({ resume: true });
          startSession();
        },
      },
    );
  }

  function hardPauseAllVideos() {
    document.querySelectorAll('video').forEach((v) => v.pause());
  }

  function exitShorts() {
    isInShortsSession = false;
    secondsSinceLastFriction = 0;
    stopSession();
    videoGuard.stop({ resume: false }); // safety net if we're leaving mid-overlay via an unusual nav path
    // Hard stop, independent of the guard above: once the user has continued
    // past friction, the guard is no longer "watching" (it already resumed
    // and let go of the video it was tracking), so if the user then leaves
    // via the host's own UI (e.g. Instagram's close button on /reels/,
    // rather than our overlay's "Not now") that legitimately-playing video
    // is never told to stop — it can keep playing audibly after landing
    // back on the feed. Leaving the session should always mean no video
    // plays, regardless of how the guard's own tracking state got here.
    hardPauseAllVideos();
    // Instagram's own feed autoplay (intersection-observer driven) can
    // (re)start that same post's video shortly *after* the route/modal
    // transition settles, on its own next paint — not synchronously with
    // this navigation event — so a single immediate pause() can lose that
    // race. Two short delayed follow-ups catch a late autoplay without
    // needing a persistent listener kept alive past the session.
    setTimeout(hardPauseAllVideos, 150);
    setTimeout(hardPauseAllVideos, 500);
    destroyActiveOverlay();
  }

  async function handleNavigation() {
    const path = location.pathname;
    if (path === previousPath) return;
    pushNavStack(path);

    const wasShorts = previousPath !== null && adapter.shortsPathPattern.test(previousPath);
    const isShorts = adapter.shortsPathPattern.test(path);
    previousPath = path;

    if (isShorts && !wasShorts) {
      // Edge-trigger only: swiping Shorts-to-Shorts keeps isShorts true on
      // both sides of the transition, so it never re-enters here — one
      // session, not one open per video (design doc 6.4).
      await enterShorts();
    } else if (!isShorts && wasShorts) {
      exitShorts();
    }

    if (HOME_PATH_PATTERN.test(path)) {
      scheduleHealthCheck();
    }
    applyInPageTreatments();
  }

  let healthCheckTimeout = null;
  function scheduleHealthCheck() {
    clearTimeout(healthCheckTimeout);
    healthCheckTimeout = setTimeout(async () => {
      if (!isExtensionAlive()) return;
      const shelves = adapter.findShelves();
      await storage.setHealth(adapter.id, shelves.length > 0 ? 'ok' : 'missing');
    }, HEALTH_CHECK_DELAY_MS);
  }

  const shelfRestorers = new WeakMap();

  async function applyInPageTreatments() {
    if (!isExtensionAlive()) return;
    const mode = await storage.getMode();

    for (const shelf of adapter.findShelves()) {
      if (shelf.dataset.reeliefTreated === 'true') continue;
      shelf.dataset.reeliefTreated = 'true';
      if (mode === 'block') {
        adapter.removeShelf(shelf);
      } else {
        const restore = adapter.collapseShelf(shelf, () => {
          /* revealing a shelf is not an open — nothing to record */
        });
        shelfRestorers.set(shelf, restore);
      }
    }

    // FR-07: sidebar entry treatment is unconditional, both modes (YouTube
    // always fully removes it; Instagram's treatment instead varies by mode
    // — see platform-adapter.js). Keyed by mode, not a plain boolean, so a
    // mode switch mid-session (popup toggle) re-applies the right treatment
    // instead of leaving the first one it ever saw stuck in place.
    for (const entry of adapter.findSidebarEntries()) {
      if (entry.dataset.reeliefHiddenMode === mode) continue;
      entry.dataset.reeliefHiddenMode = mode;
      adapter.hideSidebarEntry(entry, mode);
    }
  }

  // --- SPA navigation wiring -------------------------------------------------
  // YouTube fires 'yt-navigate-finish' on client-side navigations; popstate
  // and a cheap URL-diff observer are defensive fallbacks in case that event
  // is renamed or dropped in a future YouTube release (PRD Risk 1).
  window.addEventListener('yt-navigate-finish', handleNavigation);
  window.addEventListener('popstate', handleNavigation);

  const mutationObserver = new MutationObserver(() => {
    if (location.pathname !== previousPath) handleNavigation();
    else applyInPageTreatments();
  });

  function start() {
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    handleNavigation();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }

  // --- mode-change races (design 6.4) ----------------------------------------
  storage.onChanged((changes, areaName) => {
    if (areaName !== 'local' || !changes.mode) return;
    // Re-run the shelf/sidebar loop so a popup toggle updates in-page
    // treatments (e.g. Instagram's sidebar icon) immediately, without
    // waiting for the next navigation or DOM mutation to trigger it.
    applyInPageTreatments();
    if (!isInShortsSession) return;
    const newMode = changes.mode.newValue;
    if (newMode === 'block') {
      stopSession();
      destroyActiveOverlay();
      videoGuard.start(); // video may have resumed after an earlier "Continue anyway" — pause it again for the block overlay
      showBlockOverlay(
        {
          onRedirect: () => {
            videoGuard.stop({ resume: false });
            window.location.replace(adapter.homeUrl);
          },
        },
        adapter,
      );
    } else {
      // Block -> Friction mid-session: dismiss, don't retro-fire friction.
      // The video was paused for the block overlay's countdown and the
      // user explicitly cancelled out of it, so resume playback.
      destroyActiveOverlay();
      videoGuard.stop({ resume: true });
    }
  });

  // --- extension reload/update watchdog (design 6.4 "connection loss") -------
  setInterval(() => {
    if (!isExtensionAlive()) {
      destroyActiveOverlay();
      videoGuard.stop({ resume: false });
      stopSession();
      mutationObserver.disconnect();
    }
  }, 5000);
})();
