/**
 * Pauses whatever <video> is playing while an overlay covers the page,
 * and resumes only the videos it paused when the guard is released with
 * resume:true. The overlay visually hides Shorts, but the underlying
 * player kept autoplaying with audio underneath it — this closes that
 * gap so "paused" actually means paused, not just occluded.
 *
 * Generic HTML5 <video> pause/play — no YouTube-specific selectors — so
 * the same guard works unchanged for Instagram/Facebook's <video>-based
 * Reels players in v1b/v1c.
 */
export function createVideoGuard() {
  const pausedByUs = new Set();
  let watching = false;

  function pauseVideo(video) {
    if (!video.paused) {
      pausedByUs.add(video);
      video.pause();
    }
  }

  function pauseAllPlaying() {
    document.querySelectorAll('video').forEach(pauseVideo);
  }

  function onPlaying(e) {
    if (e.target instanceof HTMLVideoElement) pauseVideo(e.target);
  }

  return {
    /** Pauses all currently-playing videos and keeps re-pausing any that try to (re)start. */
    start() {
      if (watching) return;
      watching = true;
      pauseAllPlaying();
      // The Shorts player is a SPA: it may (re)create or retry-autoplay a
      // <video> element after our initial pause. Capture-phase 'playing'
      // listener catches that for as long as the guard is active.
      document.addEventListener('playing', onPlaying, true);
    },
    /** Stops guarding; resumes exactly the videos this guard paused when resume is true. */
    stop({ resume = false } = {}) {
      if (!watching) return;
      watching = false;
      document.removeEventListener('playing', onPlaying, true);
      if (resume) {
        pausedByUs.forEach((video) => {
          video.play().catch(() => {
            /* autoplay may be rejected without a user gesture in the resumed frame — non-fatal */
          });
        });
      }
      pausedByUs.clear();
    },
  };
}
