import * as storage from '../shared/storage.js';
import { COPY } from '../shared/copy.js';
import { BRAND, iconMarkup } from '../shared/branding.js';
import { PLATFORM_INFO } from '../shared/platforms.js';

// Derived from shared/platforms.js so a new platform (v1c/Facebook) needs
// no change here — adding one PLATFORM_INFO entry is enough.
const PLATFORM_IDS = Object.keys(PLATFORM_INFO);

// Recurring re-friction interval: 0 = off (default), 5-minute steps,
// capped at 1 hour. No free-typing — stepping past the max clamps to it
// and shows a brief note (see RECURRING_CAP_NOTE_MS). Holding a stepper
// button down auto-repeats after HOLD_INITIAL_DELAY_MS, at
// HOLD_REPEAT_INTERVAL_MS per step, until released.
const RECURRING_MIN = 0;
const RECURRING_MAX = 60;
const RECURRING_STEP = 5;
const RECURRING_CAP_NOTE_MS = 2500;
const HOLD_INITIAL_DELAY_MS = 450;
const HOLD_REPEAT_INTERVAL_MS = 350;
let cappedNoteUntil = 0; // epoch ms; render() shows the cap note while Date.now() is before this

// FR-25 trend chart: pure UI state (not persisted — resets each time the
// popup opens, same as every other transient view choice here). Metric
// and zoom toggles repaint #trendBody directly (see repaintTrend()) rather
// than going through a storage write + refresh(), so the transition stays
// smooth instead of retriggering a full popup re-render.
const TREND_DAYS = 30;
const TREND_ZOOM_DAYS = 7;
const TREND_CHART_WIDTH = 320; // matches .main's content width (360px app − 20px padding × 2)
const TREND_CHART_HEIGHT = 56; // the bars' own plot height
const TREND_TOP_PAD = 10; // headroom above the plot so the "max" gridline's label isn't clipped by the SVG's top edge
const TREND_SVG_HEIGHT = TREND_CHART_HEIGHT + TREND_TOP_PAD; // must match .trendSvg's CSS height in popup.css
const TREND_MIN_BAR_HEIGHT = 3; // keeps a zero-value day visible as a baseline tick, not invisible
const TREND_LABEL_GUTTER = 26; // reserved left column for the 50%/max reference-line value labels
const TREND_BASELINE_INSET = 1; // nudges the 0-line up so its stroke isn't clipped by the SVG's bottom edge
let trendMetric = 'opens'; // 'opens' | 'minutes'
let trendZoomed = false; // false = 30 days, true = last 7

const app = document.getElementById('app');

function clampRecurring(rawValue) {
  const rounded = Math.round(rawValue);
  if (!Number.isFinite(rounded) || rounded < RECURRING_MIN) return { clamped: RECURRING_MIN, wasCapped: false };
  if (rounded > RECURRING_MAX) return { clamped: RECURRING_MAX, wasCapped: true };
  return { clamped: rounded, wasCapped: false };
}

async function commitRecurringMinutes(rawValue) {
  const { clamped, wasCapped } = clampRecurring(rawValue);
  if (wasCapped) {
    cappedNoteUntil = Date.now() + RECURRING_CAP_NOTE_MS;
    setTimeout(() => {
      cappedNoteUntil = 0;
      refresh();
    }, RECURRING_CAP_NOTE_MS);
  }
  await storage.setRecurringFrictionMinutes(clamped);
}

function statCard(valueHtml, caption, isZero, breakdownHtml, long = false) {
  return `
    <div class="statCard" data-zero="${isZero}">
      <div class="statMain">
        <div class="value"${long ? ' data-long="true"' : ''}>${valueHtml}</div>
        <div class="caption">${caption}</div>
      </div>
      ${breakdownHtml ? `<div class="statRule" aria-hidden="true"></div><div class="statBreakdown">${breakdownHtml}</div>` : ''}
    </div>
  `;
}

// Per-platform icon+value rows shown inside each stat card (moved out of a
// separate bottom text row so it scales past 3 platforms via scroll
// instead of wrapping/truncating a single line).
function renderBreakdownRows(breakdown, metric) {
  return breakdown
    .map((p) => {
      const info = PLATFORM_INFO[p.id];
      const value = metric === 'opens' ? p.opens : p.minutes;
      const unit = metric === 'opens' ? (value === 1 ? 'open' : 'opens') : 'min';
      return `
        <div class="statBreakdownRow" title="${COPY.popup.breakdownRow(p.siteName, value, unit)}">
          <span class="platformBadge" style="background:${info.iconColor}">${info.iconSvg}</span>
          <span class="statBreakdownValue">${value}</span>
        </div>
      `;
    })
    .join('');
}

function opensCard(opens, isZero, breakdown) {
  return statCard(String(opens), 'opens', isZero, isZero ? '' : renderBreakdownRows(breakdown, 'opens'));
}

function timeCard(minutes, isZero, breakdown) {
  const breakdownHtml = isZero ? '' : renderBreakdownRows(breakdown, 'minutes');
  // <60m: "12" + "m" unit. >=60m: combined "4h 32m" in one line (design 4.3).
  if (minutes < 60) {
    return statCard(`${minutes}<span class="unit">m</span>`, 'spent', isZero, breakdownHtml);
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return statCard(`${h}<span class="unit">h</span> ${m}<span class="unit">m</span>`, 'spent', isZero, breakdownHtml, true);
}

// Builds a TREND_DAYS-long, chronologically-ordered, zero-filled series
// ending today. `history` only ever holds *past* days (shared/storage.js
// never archives the current date into it), so today's live totals are
// merged in separately rather than double-counted.
function buildDailySeries(history, todayDateKey, todayTotals) {
  const byDate = new Map();
  for (const row of history) {
    const cur = byDate.get(row.date) ?? { opens: 0, minutes: 0 };
    cur.opens += row.opens;
    cur.minutes += row.minutes;
    byDate.set(row.date, cur);
  }
  const todayMinutes = Math.floor(todayTotals.seconds / 60);
  byDate.set(todayDateKey, { opens: todayTotals.opens, minutes: todayMinutes });

  const series = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const date = storage.addDaysToDateKey(todayDateKey, -i);
    const agg = byDate.get(date) ?? { opens: 0, minutes: 0 };
    series.push({ date, ...agg });
  }
  return series;
}

function formatChartDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TREND_BAR_RADIUS = 4; // dataviz mark spec: 4px rounded data-end, square at the baseline

// A <rect rx> rounds all four corners; the spec calls for rounding only the
// top (data) end and keeping the baseline square, so this draws that
// shape as a path instead. Radius is capped to the bar's own half-width/
// height so a very short or very thin bar can't produce a malformed arc.
function topRoundedBarPath(x, y, w, h) {
  const r = Math.min(TREND_BAR_RADIUS, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

// Rounds up to a "clean" axis value (1/2/5 × 10^n) — the standard
// y-axis-tick convention (dataviz skill: "round to clean numbers") so the
// reference lines read a round figure rather than an exact-but-arbitrary one.
function niceMax(value) {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

// Bar geometry only — shared by the initial paint and by repaintTrend()'s
// in-place morph, so both always compute the exact same path data. Scaled
// against `scaleMax` (a nice-rounded value, not the slice's raw max) so
// the tallest bar doesn't necessarily touch the chart's top edge — the top
// gridline represents scaleMax, not "whatever today's peak happens to be".
function computeBars(slice, scaleMax) {
  const gap = 2; // dataviz spacer spec: 2px surface gap between adjacent bars
  const plotWidth = TREND_CHART_WIDTH - TREND_LABEL_GUTTER;
  const barWidth = (plotWidth - gap * (slice.length - 1)) / slice.length;
  return slice.map((d, i) => {
    const value = d[trendMetric];
    const h = Math.max(TREND_MIN_BAR_HEIGHT, Math.round((value / scaleMax) * TREND_CHART_HEIGHT));
    const x = TREND_LABEL_GUTTER + i * (barWidth + gap);
    const y = TREND_TOP_PAD + TREND_CHART_HEIGHT - h;
    const isToday = i === slice.length - 1;
    const unit = trendMetric === 'opens' ? (value === 1 ? 'open' : 'opens') : 'min';
    return { d: topRoundedBarPath(x, y, barWidth, h), isToday, title: `${formatChartDate(d.date)}: ${value} ${unit}` };
  });
}

function trendSlice(dailySeries) {
  return trendZoomed ? dailySeries.slice(-TREND_ZOOM_DAYS) : dailySeries;
}

// Two solid, recessive, uniform-weight hairlines at 50% and 100% of
// scaleMax — never dashed (dashing a plain scale line reads as a
// "threshold"/"target", which this isn't) and never emphasized on one line
// over the other (a gridline's job is to stay quiet; the number carries
// the meaning, not extra ink). Their y-positions are fixed by chart
// geometry, not by scaleMax — only the two labels' text changes with data.
function renderGridlines(scaleMax) {
  const midY = TREND_TOP_PAD + TREND_CHART_HEIGHT / 2;
  const topY = TREND_TOP_PAD;
  const labelX = TREND_LABEL_GUTTER - 6;
  // scaleMax 1 is the degenerate "no data yet" axis — round(0.5) would print
  // "1" on both lines, so pin the midline to 0.
  const midLabel = scaleMax === 1 ? 0 : Math.round(scaleMax / 2);
  return `
    <line class="trendGridline" x1="${TREND_LABEL_GUTTER}" y1="${midY}" x2="${TREND_CHART_WIDTH}" y2="${midY}" />
    <line class="trendGridline" x1="${TREND_LABEL_GUTTER}" y1="${topY}" x2="${TREND_CHART_WIDTH}" y2="${topY}" />
    <text class="trendGridLabel" x="${labelX}" y="${midY}" text-anchor="end" dominant-baseline="middle">${midLabel}</text>
    <text class="trendGridLabel" x="${labelX}" y="${topY}" text-anchor="end" dominant-baseline="middle">${scaleMax}</text>
  `;
}

function renderTrendBody(dailySeries) {
  const slice = trendSlice(dailySeries);
  // The chart always renders — even on a fresh install with no history it
  // shows the axis and a flat baseline (bars sit at TREND_MIN_BAR_HEIGHT),
  // which reads as "nothing yet" without hiding the chart behind copy.
  const scaleMax = niceMax(Math.max(...slice.map((d) => d[trendMetric]), 1));
  const bars = computeBars(slice, scaleMax);
  // Recessive hairline baseline (dataviz spec: one-step-off-surface gray, 1px, solid) grounds the bars.
  const baselineY = TREND_TOP_PAD + TREND_CHART_HEIGHT - TREND_BASELINE_INSET;
  const baseline = `<line class="trendBaseline" x1="${TREND_LABEL_GUTTER}" y1="${baselineY}" x2="${TREND_CHART_WIDTH}" y2="${baselineY}" />`;
  const paths = bars
    .map(
      (b) =>
        `<path d="${b.d}" class="bar"${b.isToday ? ' data-today="true"' : ''} data-tooltip="${b.title}"><title>${b.title}</title></path>`,
    )
    .join('');
  return `
    <svg class="trendSvg" viewBox="0 0 ${TREND_CHART_WIDTH} ${TREND_SVG_HEIGHT}" preserveAspectRatio="none" role="img" aria-label="${slice.length}-day ${trendMetric} trend">${renderGridlines(scaleMax)}${baseline}${paths}</svg>
    <div class="trendAxis" style="padding-left:${TREND_LABEL_GUTTER}px"><span>${formatChartDate(slice[0].date)}</span><span>Today</span></div>
  `;
}

function renderTrendChart(dailySeries) {
  return `
    <div class="trendChart">
      <div class="trendHeader">
        <div class="sectionLabel">${COPY.popup.trendLabel}</div>
        <div class="chartControls">
          <div class="chartToggle" role="group" aria-label="Date range">
            <button type="button" data-zoom="true" aria-pressed="${trendZoomed}">${COPY.popup.trendRangeShort}</button>
            <button type="button" data-zoom="false" aria-pressed="${!trendZoomed}">${COPY.popup.trendRangeLong}</button>
          </div>
          <div class="chartToggle" role="group" aria-label="Chart metric">
            <button type="button" data-metric="opens" aria-pressed="${trendMetric === 'opens'}">${COPY.popup.trendMetricOpens}</button>
            <button type="button" data-metric="minutes" aria-pressed="${trendMetric === 'minutes'}">${COPY.popup.trendMetricMinutes}</button>
          </div>
        </div>
      </div>
      <div id="trendBody">${renderTrendBody(dailySeries)}</div>
      <div class="trendTooltip" role="tooltip" hidden></div>
    </div>
  `;
}

// Toggle clicks update trendMetric/trendZoomed and repaint only #trendBody
// in place, instead of going through refresh() (which re-fetches state and
// replaces the whole app.innerHTML) — that's what makes the transition
// smooth rather than an abrupt full-popup redraw.
function updateTrendControls() {
  app.querySelectorAll('[data-metric]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.metric === trendMetric));
  });
  app.querySelectorAll('[data-zoom]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String((btn.dataset.zoom === 'true') === trendZoomed));
  });
}

function repaintTrend(dailySeries, { morph }) {
  const body = app.querySelector('#trendBody');
  if (!body) return;
  const slice = trendSlice(dailySeries);
  const existingBars = body.querySelectorAll('.bar');

  // Same bar count (metric toggle) morphs each path's `d` in place — Chrome
  // animates the attribute via popup.css's `transition: d`. A bar-count
  // change (zoom toggle) can't be morphed meaningfully, so it crossfades.
  if (morph && existingBars.length === slice.length) {
    const scaleMax = niceMax(Math.max(...slice.map((d) => d[trendMetric]), 1));
    const bars = computeBars(slice, scaleMax);
    existingBars.forEach((path, i) => {
      path.setAttribute('d', bars[i].d);
      path.toggleAttribute('data-today', bars[i].isToday);
      path.setAttribute('data-tooltip', bars[i].title);
      const title = path.querySelector('title');
      if (title) title.textContent = bars[i].title;
    });
    // Gridline geometry is fixed (50%/100% of chart height); only the two
    // labels' numbers change when the metric (opens vs minutes) changes.
    const labels = body.querySelectorAll('.trendGridLabel');
    if (labels.length === 2) {
      labels[0].textContent = String(scaleMax === 1 ? 0 : Math.round(scaleMax / 2));
      labels[1].textContent = String(scaleMax);
    }
    return;
  }

  body.style.opacity = '0';
  setTimeout(
    () => {
      body.innerHTML = renderTrendBody(dailySeries);
      body.style.opacity = '1';
    },
    existingBars.length ? 130 : 0,
  );
}

// Chrome extension popups are a special borderless window, not a normal
// tab — the browser's native tooltip renderer doesn't reliably fire an
// SVG <title> inside one, so a custom on-hover tooltip is the dependable
// path (the <title> stays too, for screen readers). Listens on
// .trendChart rather than the individual bars: .trendChart's own element
// identity survives every repaintTrend() (only #trendBody's children get
// replaced), so this only needs binding once per full render().
function attachTrendTooltip() {
  const chart = app.querySelector('.trendChart');
  const tooltip = app.querySelector('.trendTooltip');
  if (!chart || !tooltip) return;

  // Left position is clamped to the chart's own width rather than always
  // centered on the bar — centering unconditionally pushes the tooltip past
  // the popup's right edge for the last few bars, which was forcing a
  // horizontal scrollbar on the whole popup.
  function showFor(bar) {
    const chartRect = chart.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    tooltip.textContent = bar.dataset.tooltip;
    tooltip.hidden = false;
    const margin = 4;
    const tooltipWidth = tooltip.offsetWidth;
    const barCenterX = barRect.left + barRect.width / 2 - chartRect.left;
    const minLeft = margin;
    const maxLeft = chartRect.width - tooltipWidth - margin;
    const left = Math.min(Math.max(barCenterX - tooltipWidth / 2, minLeft), maxLeft);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${barRect.top - chartRect.top}px`;
  }

  chart.addEventListener('mouseover', (e) => {
    const bar = e.target.closest('.bar');
    if (bar) showFor(bar);
  });
  chart.addEventListener('mousemove', (e) => {
    const bar = e.target.closest('.bar');
    if (bar) showFor(bar);
  });
  chart.addEventListener('mouseout', (e) => {
    const stillOnABar = e.relatedTarget?.closest?.('.bar');
    if (!stillOnABar) tooltip.hidden = true;
  });
}

function render(state) {
  const { mode, totals, breakdown, onboardingSeen, healthBanner, recurringMinutes, recurringProgress, dailySeries } = state;
  const minutes = Math.floor(totals.seconds / 60);
  const isZero = totals.opens === 0;

  // Every storage write re-renders the whole popup via storage.onChanged
  // (app.innerHTML replacement below) — without this, each click on the
  // stepper (or any control) reset .main's scroll to the top, forcing a
  // re-scroll after every single interaction.
  const prevMain = app.querySelector('.main');
  const scrollTop = prevMain ? prevMain.scrollTop : 0;

  app.innerHTML = `
    <div class="header">
      ${iconMarkup(22)}
      <span class="name">${BRAND.name}</span>
      <span class="pill" data-mode="${mode}">
        <span class="dot"></span>
        <span class="label">${mode.toUpperCase()}</span>
      </span>
    </div>
    <div class="main">
      <div>
        <div class="sectionLabel">${COPY.popup.sectionToday(breakdown.map((p) => p.displayName))}</div>
        <div class="statRow">
          ${opensCard(totals.opens, isZero, breakdown)}
          ${timeCard(minutes, isZero, breakdown)}
        </div>
        ${renderTodayFootnote(mode, totals, isZero)}
      </div>
      <div class="divider"></div>
      ${renderTrendChart(dailySeries)}
      ${healthBanner.visible ? renderDegraded(healthBanner) : ''}
      <div class="divider"></div>
      <div>
        <div class="sectionLabel">MODE</div>
        <div class="modeSwitch" role="group" aria-label="Mode">
          <button type="button" data-tone="friction" aria-pressed="${mode === 'friction'}">Friction</button>
          <button type="button" data-tone="block" aria-pressed="${mode === 'block'}">Block</button>
        </div>
        <div class="helperText">${mode === 'friction' ? COPY.popup.modeFriction : COPY.popup.modeBlock}</div>
      </div>
      ${mode === 'friction' ? renderRecurringStepper(recurringMinutes, recurringProgress) : ''}
    </div>
    <div class="footer">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" stroke="#5C5A50" stroke-width="1.4"/><path d="M5.6 7V5.2a2.4 2.4 0 0 1 4.8 0V7" stroke="#5C5A50" stroke-width="1.4" stroke-linecap="round"/></svg>
      <span class="privacy">${COPY.popup.privacy}</span>
      <span class="version">v${chrome.runtime.getManifest().version}</span>
    </div>
    ${!onboardingSeen ? renderOnboarding(mode) : ''}
  `;

  const newMain = app.querySelector('.main');
  if (newMain) newMain.scrollTop = scrollTop;

  app.querySelectorAll('.modeSwitch button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await storage.setMode(btn.dataset.tone);
    });
  });

  // Metric/zoom are pure UI state, not written to storage. Unlike every
  // other control here, these deliberately do NOT call refresh() — a full
  // re-render would tear down and rebuild #trendBody, making a smooth
  // transition impossible. Instead they repaint just the chart body.
  app.querySelectorAll('[data-metric]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.metric === trendMetric) return;
      trendMetric = btn.dataset.metric;
      updateTrendControls();
      repaintTrend(dailySeries, { morph: true });
    });
  });
  app.querySelectorAll('[data-zoom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.zoom === 'true';
      if (next === trendZoomed) return;
      trendZoomed = next;
      updateTrendControls();
      repaintTrend(dailySeries, { morph: false });
    });
  });
  attachTrendTooltip();

  const onboardBtn = app.querySelector('.onboardTip button');
  onboardBtn?.addEventListener('click', async () => {
    await storage.setOnboardingSeen();
  });

  app.querySelector('[data-action="check-for-update"]')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'reelief:check-for-update' });
  });
  app.querySelector('[data-action="report"]')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'reelief:report' });
  });
  app.querySelector('[data-action="dismiss-health"]')?.addEventListener('click', async (e) => {
    await storage.dismissHealthBanner(e.currentTarget.dataset.platformId, Number(e.currentTarget.dataset.since));
  });

  const stepperValueEl = app.querySelector('.stepperValue');

  app.querySelectorAll('.stepperBtn').forEach((btn) => {
    const sign = btn.dataset.step === 'up' ? 1 : -1;
    // A full render() (and therefore a fresh set of buttons/listeners)
    // happens on every storage write, via storage.onChanged — so a
    // multi-tick hold gesture can't write to storage on every tick
    // without its own interval getting torn out from under it mid-hold.
    // Instead this walks a local `current` value and paints it directly
    // via textContent, only committing to storage once, on release.
    let current = state.recurringMinutes;
    let holdTimeout = null;
    let holdInterval = null;

    function applyStep() {
      const { clamped } = clampRecurring(current + sign * RECURRING_STEP);
      if (clamped === current) return false; // already at the boundary
      current = clamped;
      if (stepperValueEl) stepperValueEl.textContent = String(current);
      return true;
    }

    function stopHold() {
      clearTimeout(holdTimeout);
      clearInterval(holdInterval);
      holdTimeout = null;
      holdInterval = null;
    }

    function startPress() {
      if (btn.disabled) return;
      current = state.recurringMinutes;
      applyStep();
      holdTimeout = setTimeout(() => {
        holdInterval = setInterval(() => {
          if (!applyStep()) stopHold();
        }, HOLD_REPEAT_INTERVAL_MS);
      }, HOLD_INITIAL_DELAY_MS);
    }

    function endPress() {
      if (holdTimeout === null && holdInterval === null) return; // no press in progress
      stopHold();
      commitRecurringMinutes(current);
    }

    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('mouseup', endPress);
    btn.addEventListener('mouseleave', endPress);
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault(); // avoid a synthetic mousedown/click firing a second step
      startPress();
    });
    btn.addEventListener('touchend', endPress);
    btn.addEventListener('touchcancel', endPress);
  });
}

// A bit more than content/entry.js's 15s flush cadence — a progress write
// older than this means the tab stopped reporting (closed uncleanly,
// crashed) rather than that it's just between flushes.
const RECURRING_PROGRESS_STALE_MS = 20_000;

function recurringProgressStatus(pct) {
  if (pct >= 90) return 'critical';
  if (pct >= 80) return 'warning';
  return 'good';
}

// Human-readable ("1m", "45s") — used only for the aria-label, not the
// visible UI (see formatClock below for that).
function formatElapsedShort(totalSeconds) {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  return `${Math.floor(totalSeconds / 60)}m`;
}

// MM:SS — the interval never exceeds RECURRING_MAX (60 minutes), so there's
// no case where an hour digit would ever carry information.
function formatClock(totalSeconds) {
  const whole = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderRecurringStepper(recurringMinutes, progress) {
  const atMin = recurringMinutes <= RECURRING_MIN;
  const atMax = recurringMinutes >= RECURRING_MAX;
  const isOff = recurringMinutes === 0;
  const showCapNote = Date.now() < cappedNoteUntil;

  // Deliberately doesn't gate on progress.intervalMinutes matching
  // recurringMinutes: elapsedSeconds is just a raw count, still true
  // regardless of what target the content script had in mind when it wrote
  // it — recomputing the percentage against whatever the stepper shows
  // *right now* (recurringMinutes, not the content script's stale echo of
  // it) means the bar updates instantly when the interval changes instead
  // of blanking out for up to 15s until the next flush confirms it, which
  // read exactly like the watch clock had been reset even though it hadn't.
  const isLive = !isOff && progress && Date.now() - progress.updatedAt < RECURRING_PROGRESS_STALE_MS;
  const pct = isLive ? Math.min(100, (progress.elapsedSeconds / (recurringMinutes * 60)) * 100) : 0;
  const status = isLive ? recurringProgressStatus(pct) : 'good';

  return `
    <div class="recurringProgress" data-status="${status}">
      <div class="sectionLabel">${COPY.popup.recurringLabel}</div>
      <div class="stepperRow${isLive ? ' fillHost' : ''}"${isLive ? ` style="--pct:${pct}%"` : ''}>
        ${isLive ? '<div class="hostFill"></div>' : ''}
        <button type="button" class="stepperBtn" data-step="down" aria-label="Decrease interval"${atMin ? ' disabled' : ''}>−</button>
        <span class="stepperInputWrap" role="status" aria-label="Reminder interval in minutes">
          <span class="stepperValue">${recurringMinutes}</span>
          <span class="stepperUnit">m</span>
        </span>
        <button type="button" class="stepperBtn" data-step="up" aria-label="Increase interval"${atMax ? ' disabled' : ''}>+</button>
      </div>
      ${
        isLive
          ? `<div class="hostTimeRow" role="status" aria-label="${COPY.popup.recurringWatchingPrefix}${COPY.popup.recurringProgress(formatElapsedShort(progress.elapsedSeconds), recurringMinutes)}${COPY.popup.recurringWatchingSuffix}"><span class="elapsed">${formatClock(progress.elapsedSeconds)}</span><span class="total">${formatClock(recurringMinutes * 60)}</span></div>`
          : `<div class="helperText">${isOff ? COPY.popup.recurringHelperOff : COPY.popup.recurringHelperOn(recurringMinutes)}</div>`
      }
      ${showCapNote ? `<div class="stepperNote">${COPY.popup.recurringCapped(RECURRING_MAX)}</div>` : ''}
    </div>
  `;
}

function renderTodayFootnote(mode, totals, isZero) {
  if (isZero) {
    return `<div class="helperText">${COPY.popup.zero}</div>`;
  }
  if (mode === 'block' && totals.blockedOpens > 0) {
    return `
      <div class="calloutRow" data-tone="red">
        <span class="dot"></span>
        <p>${COPY.popup.blockedSummary(totals.blockedOpens, totals.opens)}</p>
      </div>
    `;
  }
  return `<div class="helperText">${COPY.popup.stepAway(totals.stepAwayCount, totals.opens)}</div>`;
}

function renderDegraded(healthBanner) {
  const { since, platformId, feedLabel, feedPath } = healthBanner;
  return `
    <div class="calloutRow" data-tone="amber">
      <span class="dot"></span>
      <div>
        <p><b>${COPY.popup.degraded(feedLabel, feedPath)}</b> ${COPY.popup.degradedTitle(feedLabel)}</p>
        <div class="degradedButtons">
          <button type="button" class="primary" data-action="check-for-update">${COPY.popup.checkForUpdate}</button>
          <button type="button" class="ghost" data-action="report">${COPY.popup.report}</button>
        </div>
      </div>
      <button type="button" class="closeBtn" data-action="dismiss-health" data-since="${since}" data-platform-id="${platformId}" aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;
}

function renderOnboarding(mode) {
  return `
    <div class="onboardTip">
      <div class="title">${COPY.popup.onboardTitle}</div>
      <div class="body"><span class="friction">Friction</span> pauses you for 5 seconds before a feed loads. <span class="block">Block</span> turns you around at the door. Switch any time — you're in ${mode === 'friction' ? 'Friction' : 'Block'} now.</div>
      <button type="button">${COPY.popup.onboardCta}</button>
      <span class="caret"></span>
    </div>
  `;
}

async function loadState() {
  const [mode, perPlatformCounters, onboardingSeen, perPlatformHealth, recurringMinutes, recurringProgress, history] =
    await Promise.all([
      storage.getMode(),
      Promise.all(PLATFORM_IDS.map((id) => storage.getTodayCounters(id))),
      storage.getOnboardingSeen(),
      Promise.all(PLATFORM_IDS.map((id) => storage.getHealthBanner(id))),
      storage.getRecurringFrictionMinutes(),
      storage.getRecurringProgress(),
      storage.getHistory(),
    ]);

  const totals = perPlatformCounters.reduce(
    (acc, c) => ({
      opens: acc.opens + c.opens,
      blockedOpens: acc.blockedOpens + c.blockedOpens,
      seconds: acc.seconds + c.seconds,
      stepAwayCount: acc.stepAwayCount + c.stepAwayCount,
    }),
    { opens: 0, blockedOpens: 0, seconds: 0, stepAwayCount: 0 },
  );

  const breakdown = PLATFORM_IDS.map((id, i) => ({
    id,
    displayName: PLATFORM_INFO[id].displayName,
    siteName: PLATFORM_INFO[id].siteName,
    opens: perPlatformCounters[i].opens,
    minutes: Math.floor(perPlatformCounters[i].seconds / 60),
  }));

  // Only one health banner slot in the popup UI — if more than one
  // platform is degraded at once, the first (PLATFORM_IDS order) wins.
  const degradedIndex = perPlatformHealth.findIndex((h) => h.visible);
  const healthBanner =
    degradedIndex === -1
      ? { visible: false }
      : {
          visible: true,
          since: perPlatformHealth[degradedIndex].since,
          platformId: PLATFORM_IDS[degradedIndex],
          feedLabel: PLATFORM_INFO[PLATFORM_IDS[degradedIndex]].feedLabel,
          feedPath: PLATFORM_INFO[PLATFORM_IDS[degradedIndex]].feedPath,
        };

  const dailySeries = buildDailySeries(history, storage.localDateKey(), totals);

  return { mode, totals, breakdown, onboardingSeen, healthBanner, recurringMinutes, recurringProgress, dailySeries };
}

async function refresh() {
  render(await loadState());
}

refresh();

storage.onChanged((changes, areaName) => {
  if (areaName === 'local') refresh();
});

// Design 4.2: "a user who closes the popup has seen it" — persist on close too.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) storage.setOnboardingSeen();
});
