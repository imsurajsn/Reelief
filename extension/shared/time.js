/**
 * Session timer for "time on short-form feeds" (design doc 6.3).
 *
 * Rules:
 *  - Counts only foreground time: pauses on visibilitychange -> hidden,
 *    resumes on visible. A backgrounded tab left open all day must not
 *    inflate the stat (Open Question 2, resolved).
 *  - A single session is capped at 90 minutes so a crashed/forgotten tab
 *    can't lose or invent a session.
 *  - Flushes to storage every 15s while visible, plus on hide/unload.
 *    beforeunload is unreliable in MV3; visibilitychange is primary.
 */

const FLUSH_INTERVAL_MS = 15_000;
const MAX_SESSION_SECONDS = 90 * 60;

export class SessionTimer {
  /** @param {(deltaSeconds: number) => void} onFlush */
  constructor(onFlush) {
    this.onFlush = onFlush;
    this.running = false;
    this.accumulatedSeconds = 0;
    this.segmentStart = null;
    this.flushHandle = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.segmentStart = Date.now();
    this.flushHandle = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  _onVisibilityChange = () => {
    if (document.hidden) {
      this._pauseSegment();
      this.flush();
    } else if (this.running) {
      this.segmentStart = Date.now();
    }
  };

  _pauseSegment() {
    if (this.segmentStart === null) return;
    const elapsed = (Date.now() - this.segmentStart) / 1000;
    this.accumulatedSeconds = Math.min(
      this.accumulatedSeconds + elapsed,
      MAX_SESSION_SECONDS,
    );
    this.segmentStart = null;
  }

  flush() {
    if (this.segmentStart !== null) this._pauseSegment();
    const whole = Math.floor(this.accumulatedSeconds);
    if (whole > 0) {
      this.onFlush(whole);
      this.accumulatedSeconds -= whole;
    }
    if (this.running && !document.hidden) {
      this.segmentStart = Date.now();
    }
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this._pauseSegment();
    this.flush();
    clearInterval(this.flushHandle);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  }
}

/** "12m" under an hour, "4h 32m" at/above an hour. Never bare minute counts over 60. */
export function formatMinutes(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

/** "12 minutes" / "1 hour 12 minutes" — long form used in the overlay copy. */
export function formatMinutesLong(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hPart = `${h} hour${h === 1 ? '' : 's'}`;
  if (m === 0) return hPart;
  return `${hPart} ${m} minute${m === 1 ? '' : 's'}`;
}
