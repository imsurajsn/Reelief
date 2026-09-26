import * as storage from '../shared/storage.js';
import { COPY } from '../shared/copy.js';
import { BRAND, iconMarkup } from '../shared/branding.js';
import { PLATFORM_INFO } from '../shared/platforms.js';
import { LANGUAGES, matchLanguage } from '../shared/languages.js';
import { initI18n, setLanguage, currentLanguage } from '../shared/i18n.js';
import { startTour } from './tour.js';
import { evaluateReviewPrompt, isValidReviewUrl } from '../shared/review-prompt.js';
import { evaluateTimeAvoided } from '../shared/time-avoided.js';

// FR-39: the standing "Rate Reelief" menu row. `visible` = show it at all (from
// the 3-day unlock, for good); `highlighted` = amber row + dot on ⋮, only until
// the nudge is done — afterwards it stays as an ordinary row. Set by render()
// before it builds the settings menu, so the menu's own in-place repaints
// (paintMenu) can read it too — same pattern as the other module-level view
// flags below.
let reviewRow = { visible: false, highlighted: false };

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

// "Check for update" feedback (renderDegraded reads these directly, same
// pattern as cappedNoteUntil above): chrome.runtime.requestUpdateCheck()
// gives no UI of its own, so this surfaces its result as a note under the
// degraded-shelf buttons for a few seconds instead of silently discarding it.
const UPDATE_STATUS_MS = 3500;
let updateStatusKey = ''; // '' | 'checking' | 'update_available' | 'no_update' | 'throttled' | 'error'
let updateStatusUntil = 0;

// FR-25 trend chart: metric/zoom are persisted (storage.trendMetric /
// storage.trendZoomed — sticky across popup opens and tabs, see
// shared/storage.js), loaded into these two module vars once in boot()
// below. Toggling one repaints #trendBody directly (see repaintTrend())
// rather than going through a full refresh(), so the transition stays
// smooth; the storage write happens alongside it purely for persistence.
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
let trendZoomed = true; // false = 30 days, true = last 7 (default: less noisy on a light-usage popup)

// FR-32: which panel of the header ⋮ menu is showing. Reset to 'root'
// whenever the menu (re)opens (see wireSettingsMenu's openMenu()).
let settingsView = 'root'; // 'root' | 'language'
// Whether the ⋮ menu is open, kept outside the DOM because every storage
// write tears down and rebuilds the whole popup (see render()) — without
// this, picking a language would always force the menu shut along with
// that rebuild instead of landing back on the settings root still open.
let settingsMenuOpen = false;
// The outside-click/Escape listeners the *current* open menu instance has
// on `document` (or null) — a fresh wireSettingsMenu() call after a
// storage-triggered rebuild detaches these before attaching its own, so
// they don't pile up pointing at now-detached nodes.
let activeMenuDismissHandlers = null;

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

function statCard(valueHtml, caption, isZero, breakdownHtml, { long = false, badgeHtml = '' } = {}) {
  return `
    <div class="statCard" data-zero="${isZero}">
      ${badgeHtml}
      <div class="statMain">
        <div class="value"${long ? ' data-long="true"' : ''}>${valueHtml}</div>
        <div class="caption">${caption}</div>
      </div>
      ${breakdownHtml ? `<div class="statRule" aria-hidden="true"></div><div class="statBreakdown">${breakdownHtml}</div>` : ''}
    </div>
  `;
}

// FR-40: the "N away" / "+Nm" corner badges — same component on both stat
// cards, replacing the old step-away footnote sentence (see
// renderTodayFootnote() below). The tooltip is aria-hidden and folded into
// the badge's own aria-label instead, so keyboard/screen-reader users get
// the explanation in one stop rather than needing a separate hover.
function renderStatBadge(badgeText, tipText) {
  return `
    <div class="statBadge" tabindex="0" aria-label="${badgeText}. ${tipText}.">
      ${badgeText}
      <span class="statBadgeTip" aria-hidden="true">${tipText}</span>
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
      const unit = metric === 'opens' ? COPY.units.opens(value) : COPY.units.minutes();
      return `
        <div class="statBreakdownRow" title="${COPY.popup.breakdownRow(p.siteName, value, unit)}">
          <span class="platformBadge" style="background:${info.iconColor}">${info.iconSvg}</span>
          <span class="statBreakdownValue">${value}</span>
        </div>
      `;
    })
    .join('');
}

function opensCard(opens, isZero, breakdown, stepAwayCount) {
  const badgeHtml =
    stepAwayCount > 0
      ? renderStatBadge(COPY.popup.stepAwayBadge(stepAwayCount), COPY.popup.stepAwayTip(stepAwayCount, opens))
      : '';
  return statCard(String(opens), COPY.popup.opensLabel, isZero, isZero ? '' : renderBreakdownRows(breakdown, 'opens'), {
    badgeHtml,
  });
}

function timeCard(minutes, isZero, breakdown, timeAvoided) {
  const breakdownHtml = isZero ? '' : renderBreakdownRows(breakdown, 'minutes');
  const badgeHtml =
    timeAvoided.minutesAvoidedToday != null
      ? renderStatBadge(COPY.popup.avoidedBadge(timeAvoided.minutesAvoidedToday), COPY.popup.avoidedTip(timeAvoided.avgSessionMinutes))
      : '';
  // <60m: "12" + "m" unit. >=60m: combined "4h 32m" in one line (design 4.3).
  if (minutes < 60) {
    return statCard(`${minutes}<span class="unit">m</span>`, COPY.popup.spentLabel, isZero, breakdownHtml, { badgeHtml });
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return statCard(`${h}<span class="unit">h</span> ${m}<span class="unit">m</span>`, COPY.popup.spentLabel, isZero, breakdownHtml, {
    long: true,
    badgeHtml,
  });
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
  return new Date(y, m - 1, d).toLocaleDateString(currentLanguage(), { month: 'short', day: 'numeric' });
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
    const unit = trendMetric === 'opens' ? COPY.units.opens(value) : COPY.units.minutes();
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
    <svg class="trendSvg" viewBox="0 0 ${TREND_CHART_WIDTH} ${TREND_SVG_HEIGHT}" preserveAspectRatio="none" role="img" aria-label="${COPY.popup.trendAria(slice.length, trendMetric === 'opens' ? COPY.popup.trendMetricOpens : COPY.popup.trendMetricMinutes)}">${renderGridlines(scaleMax)}${baseline}${paths}</svg>
    <div class="trendAxis" style="padding-left:${TREND_LABEL_GUTTER}px"><span>${formatChartDate(slice[0].date)}</span><span>${COPY.popup.trendToday}</span></div>
  `;
}

function renderTrendChart(dailySeries) {
  return `
    <div class="trendChart">
      <div class="trendHeader">
        <div class="sectionLabel">${COPY.popup.trendLabel}</div>
        <div class="chartControls">
          <div class="chartToggle" role="group" aria-label="${COPY.popup.trendDateRangeAria}">
            <button type="button" data-zoom="true" aria-pressed="${trendZoomed}">${COPY.popup.trendRangeShort}</button>
            <button type="button" data-zoom="false" aria-pressed="${!trendZoomed}">${COPY.popup.trendRangeLong}</button>
          </div>
          <div class="chartToggle" role="group" aria-label="${COPY.popup.trendMetricAria}">
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

// The header ⋮ menu is a small drill-down: a root list of settings items,
// and a panel per item one level in. Today there's exactly one drill-down
// item (About) — a future setting is one more entry in SETTINGS_ITEMS, no
// restructuring needed. Language used to live here too (FR-32) but now has
// its own pill on the main page next to TODAY; Report is a direct action,
// not a drill-down item, so it's rendered separately in renderSettingsRoot()
// rather than going through SETTINGS_ITEMS.
const SETTINGS_ITEMS = [{ id: 'about', label: () => COPY.popup.aboutLabel }];

function chevronIcon(direction) {
  const d = direction === 'left' ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5';
  return `<svg class="chevron" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderSettingsRoot() {
  const rows = SETTINGS_ITEMS.map(
    (item) =>
      `<li role="none"><button type="button" role="menuitem" data-settings-item="${item.id}">` +
      `<span class="rowLabel">${item.label()}</span>${chevronIcon('right')}` +
      '</button></li>',
  ).join('');
  return `
    <div class="settingsMenuHead"><span>${COPY.popup.settingsLabel}</span></div>
    <ul>
      ${reviewRow.visible ? renderReviewMenuRow(reviewRow.highlighted) : ''}
      <li role="none"><button type="button" role="menuitem" data-settings-action="report">
        <span class="rowLabel rowLabelDanger">${COPY.popup.reportLabel}</span>
      </button></li>
      ${rows}
    </ul>
  `;
}

function renderAboutPanel() {
  return `
    <div class="settingsMenuHead">
      <button type="button" class="backBtn" aria-label="${COPY.popup.settingsBack}">${chevronIcon('left')}</button>
      <span>${COPY.popup.aboutLabel}</span>
    </div>
    <div class="aboutPanel">
      <div class="aboutIcon">${iconMarkup(40)}</div>
      <div class="aboutName">${BRAND.name}</div>
      <div class="aboutTagline">${BRAND.tagline}</div>
      <p class="aboutDescription">${BRAND.description}</p>
      <div class="aboutMeta">
        <span>${COPY.popup.aboutVersion(chrome.runtime.getManifest().version)}</span>
        <a href="${BRAND.homepage}" target="_blank" rel="noopener noreferrer">${COPY.popup.aboutLink}</a>
      </div>
    </div>
  `;
}

function renderMenuBody() {
  return settingsView === 'about' ? renderAboutPanel() : renderSettingsRoot();
}

function renderSettingsMenu() {
  return `<div class="settingsMenu" role="menu" aria-label="${COPY.popup.moreAria}"${settingsMenuOpen ? '' : ' hidden'}>${renderMenuBody()}</div>`;
}

// FR-32: the main page's language pill, next to the TODAY heading — a
// native <select> (styled as a pill) rather than a custom dropdown, so it
// gets keyboard/screen-reader support for free and reuses the same
// change-handling wireSettingsMenu() already had for this element.
function renderLanguageSelect(id) {
  const active = currentLanguage();
  const opts = LANGUAGES.map(
    (l) => `<option value="${l.code}"${l.code === active ? ' selected' : ''}>${l.endonym}</option>`,
  ).join('');
  return `<select id="${id}" class="langSelect" aria-label="${COPY.popup.languageLabel}">${opts}</select>`;
}

// Opens/closes the ⋮ menu, drills between its settings panels, and commits
// a language choice from either the menu's language panel (FR-32) or the
// onboarding select (FR-33). Writing storage.language fires
// storage.onChanged, which re-loads the locale and re-renders.
function wireSettingsMenu() {
  const moreBtn = app.querySelector('.moreBtn');
  const menu = app.querySelector('.settingsMenu');
  if (moreBtn && menu) {
    // A storage-triggered refresh() rebuilds this whole subtree even when
    // the menu was left open — detach whatever dismiss listeners the
    // previous instance left on `document` before this instance adds its
    // own, so they don't accumulate pointing at now-detached nodes.
    if (activeMenuDismissHandlers) {
      document.removeEventListener('click', activeMenuDismissHandlers.onOutside);
      document.removeEventListener('keydown', activeMenuDismissHandlers.onKey);
      activeMenuDismissHandlers = null;
    }

    const onOutside = (e) => {
      if (!menu.contains(e.target) && e.target !== moreBtn) closeMenu();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeMenu();
        moreBtn.focus();
      }
    };
    function wireMenuBody() {
      // Drilling in/back repaints the menu's own contents synchronously,
      // which detaches the clicked button from the DOM before the click
      // event finishes bubbling — stopPropagation keeps that from also
      // being read by onOutside (below) as a click outside the menu, which
      // would otherwise close it instantly.
      menu.querySelectorAll('[data-settings-item]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          settingsView = btn.dataset.settingsItem;
          paintMenu();
        });
      });
      menu.querySelector('.backBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsView = 'root';
        paintMenu();
      });
      menu.querySelector('[data-settings-action="report"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: 'reelief:report' });
        closeMenu();
      });
      menu.querySelector('[data-settings-action="review"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        handleReviewAction('review');
      });
    }
    // Repaints just the menu's own contents (root list <-> about panel)
    // in place, without closing the menu or touching the rest of the popup.
    function paintMenu() {
      menu.innerHTML = renderMenuBody();
      wireMenuBody();
    }
    function openMenu() {
      settingsView = 'root';
      settingsMenuOpen = true;
      paintMenu();
      menu.hidden = false;
      moreBtn.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onOutside);
      document.addEventListener('keydown', onKey);
      activeMenuDismissHandlers = { onOutside, onKey };
    }
    function closeMenu() {
      settingsMenuOpen = false;
      menu.hidden = true;
      moreBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onOutside);
      document.removeEventListener('keydown', onKey);
      activeMenuDismissHandlers = null;
    }
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden ? openMenu() : closeMenu();
    });

    // The menu was left open across a storage-triggered rebuild (e.g. just
    // picked a language) — pick up right where it was instead of forcing
    // it shut, re-showing the current panel and re-arming the dismiss
    // listeners on the new nodes.
    if (settingsMenuOpen) {
      paintMenu();
      document.addEventListener('click', onOutside);
      document.addEventListener('keydown', onKey);
      activeMenuDismissHandlers = { onOutside, onKey };
    } else {
      wireMenuBody();
    }
  }

  const select = app.querySelector('.langSelect');
  select?.addEventListener('change', async (e) => {
    if (e.target.value !== currentLanguage()) await storage.setLanguage(e.target.value);
  });
}

function render(state) {
  const { mode, totals, breakdown, onboardingSeen, healthBanner, recurringMinutes, recurringProgress, dailySeries, updateReady, review, timeAvoided } =
    state;
  reviewRow = { visible: review.rateRowVisible, highlighted: review.doorVisible };
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
        <span class="label">${COPY.popup.pill(mode)}</span>
      </span>
      <button type="button" class="moreBtn${review.doorVisible ? ' hasDot' : ''}" aria-haspopup="menu" aria-expanded="${settingsMenuOpen}" aria-label="${COPY.popup.moreAria}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="3" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="8" cy="13" r="1.4"/></svg>
      </button>
      ${renderSettingsMenu()}
    </div>
    <div class="main">
      <div>
        <div class="todayHeader">
          <div class="sectionLabel">${COPY.popup.sectionToday(breakdown.map((p) => p.displayName))}</div>
          ${renderLanguageSelect('todayLang')}
        </div>
        <div class="statRow">
          ${opensCard(totals.opens, isZero, breakdown, totals.stepAwayCount)}
          ${timeCard(minutes, isZero, breakdown, timeAvoided)}
        </div>
        ${renderTodayFootnote(mode, totals, isZero)}
      </div>
      ${updateReady ? renderUpdateReady(updateReady) : ''}
      <div class="divider"></div>
      ${renderTrendChart(dailySeries)}
      ${healthBanner.visible ? renderDegraded(healthBanner) : ''}
      <div class="divider"></div>
      <div>
        <div class="sectionLabel">${COPY.popup.modeLabel}</div>
        <div class="modeSwitch" role="group" aria-label="${COPY.popup.modeGroupAria}">
          <button type="button" data-tone="friction" aria-pressed="${mode === 'friction'}">${COPY.popup.modeFrictionLabel}</button>
          <button type="button" data-tone="block" aria-pressed="${mode === 'block'}">${COPY.popup.modeBlockLabel}</button>
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
    ${!onboardingSeen ? renderOnboarding() : review.cardDue ? renderReviewCard() : ''}
  `;

  const newMain = app.querySelector('.main');
  if (newMain) newMain.scrollTop = scrollTop;

  app.querySelectorAll('.modeSwitch button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await storage.setMode(btn.dataset.tone);
    });
  });

  wireSettingsMenu();

  // Metric/zoom repaint #trendBody directly rather than calling refresh()
  // themselves — a full re-render would tear down and rebuild it, making a
  // smooth transition impossible. The storage write (for persistence /
  // cross-open sync) still lands a moment later via storage.onChanged
  // below, but by then trendMetric/trendZoomed already match, so that
  // follow-up render() just reproduces the same state, not a visible jump.
  app.querySelectorAll('[data-metric]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.metric === trendMetric) return;
      trendMetric = btn.dataset.metric;
      updateTrendControls();
      repaintTrend(dailySeries, { morph: true });
      await storage.setTrendMetric(trendMetric);
    });
  });
  app.querySelectorAll('[data-zoom]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const next = btn.dataset.zoom === 'true';
      if (next === trendZoomed) return;
      trendZoomed = next;
      updateTrendControls();
      repaintTrend(dailySeries, { morph: false });
      await storage.setTrendZoomed(trendZoomed);
    });
  });
  attachTrendTooltip();

  // FR-15 / FR-37: the first-run offer. Either button marks onboarding seen,
  // so the offer never returns on its own; closing the popup without choosing
  // leaves it for next time, same as the card it replaces.
  app.querySelector('[data-tour-action="skip"]')?.addEventListener('click', async () => {
    await storage.setOnboardingSeen();
  });
  app.querySelector('[data-tour-action="start"]')?.addEventListener('click', async () => {
    await storage.setOnboardingSeen();
    // Re-render first so the offer card is gone and every step's target is in
    // the DOM before the tour resolves them.
    await refresh();
    startTour(app);
  });

  app.querySelector('[data-action="check-for-update"]')?.addEventListener('click', async () => {
    updateStatusKey = 'checking';
    updateStatusUntil = Date.now() + UPDATE_STATUS_MS;
    await refresh();
    try {
      const { status } = await chrome.runtime.sendMessage({ type: 'reelief:check-for-update' });
      if (status === 'throttled') {
        // Chrome rate-limits requestUpdateCheck on rapid repeat calls — fall
        // back to the last real answer instead of a content-free "just
        // checked" message, if we have one.
        const cached = await storage.getLastUpdateCheck();
        updateStatusKey = cached ? cached.status : 'throttled';
      } else {
        updateStatusKey = status;
        await storage.setLastUpdateCheck(status);
      }
    } catch {
      updateStatusKey = 'error';
    }
    updateStatusUntil = Date.now() + UPDATE_STATUS_MS;
    await refresh();
    setTimeout(() => {
      updateStatusUntil = 0;
      refresh();
    }, UPDATE_STATUS_MS);
  });
  app.querySelector('[data-action="report"]')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'reelief:report' });
  });
  app.querySelector('[data-action="dismiss-health"]')?.addEventListener('click', async (e) => {
    await storage.dismissHealthBanner(e.currentTarget.dataset.platformId, Number(e.currentTarget.dataset.since));
  });
  app.querySelector('[data-action="apply-update"]')?.addEventListener('click', async () => {
    await storage.clearUpdateAvailable();
    chrome.runtime.reload();
  });
  // No setBadgeText here: background/index.js owns the toolbar dot and
  // recomputes it from storage (this write included), so it can fall back to
  // the review nudge's amber dot instead of always blanking it.
  app.querySelector('[data-action="dismiss-update"]')?.addEventListener('click', async (e) => {
    await storage.dismissUpdateAvailable(e.currentTarget.dataset.version);
  });

  // FR-39 review nudge. Each answer is one storage write; the popup re-renders
  // from storage.onChanged, so the card and the ⋮ dot drop away on their own.
  app.querySelectorAll('[data-review-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleReviewAction(btn.dataset.reviewAction));
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
        <button type="button" class="stepperBtn" data-step="down" aria-label="${COPY.popup.decreaseInterval}"${atMin ? ' disabled' : ''}>−</button>
        <span class="stepperInputWrap" role="status" aria-label="${COPY.popup.intervalAria}">
          <span class="stepperValue">${recurringMinutes}</span>
          <span class="stepperUnit">${COPY.popup.minutesUnit}</span>
        </span>
        <button type="button" class="stepperBtn" data-step="up" aria-label="${COPY.popup.increaseInterval}"${atMax ? ' disabled' : ''}>+</button>
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
  // FR-40: the step-away count and the avoided-minutes estimate now live on
  // the opens/spent cards' own corner badges (see opensCard()/timeCard()
  // above) instead of this sentence.
  return '';
}

function updateStatusMessage(key) {
  switch (key) {
    case 'checking':
      return COPY.popup.updateChecking;
    case 'update_available':
      return COPY.popup.updateAvailable;
    case 'no_update':
      return COPY.popup.updateNone;
    case 'throttled':
      return COPY.popup.updateThrottled;
    case 'error':
      return COPY.popup.updateError;
    default:
      return '';
  }
}

function renderDegraded(healthBanner) {
  const { since, platformId, feedLabel, feedPath } = healthBanner;
  const showUpdateStatus = Date.now() < updateStatusUntil;
  return `
    <div class="calloutRow" data-tone="amber">
      <span class="dot"></span>
      <div>
        <p><b>${COPY.popup.degraded(feedLabel, feedPath)}</b> ${COPY.popup.degradedTitle(feedLabel)}</p>
        <div class="degradedButtons">
          <button type="button" class="primary" data-action="check-for-update">${COPY.popup.checkForUpdate}</button>
          <button type="button" class="ghost" data-action="report">${COPY.popup.report}</button>
        </div>
        ${showUpdateStatus ? `<div class="updateStatusNote">${updateStatusMessage(updateStatusKey)}</div>` : ''}
      </div>
      <button type="button" class="closeBtn" data-action="dismiss-health" data-since="${since}" data-platform-id="${platformId}" aria-label="${COPY.popup.dismiss}">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;
}

// Issue #26: passive nudge for a Chrome-downloaded update, independent of
// (and additive to) the degraded-shelf banner's manual "Check for update".
// No dismiss control — clicking "Update now" is the only way this clears,
// since it's the thing that actually resolves it.
function renderUpdateReady(updateReady) {
  return `
    <div class="calloutRow" data-tone="brand">
      <span class="dot"></span>
      <div>
        <p><b>${COPY.popup.updateReadyTitle}</b> ${COPY.popup.updateReadyBody(updateReady.version)}</p>
        <div class="degradedButtons">
          <button type="button" class="primary" data-action="apply-update">${COPY.popup.updateReadyCta}</button>
        </div>
      </div>
      <button type="button" class="closeBtn" data-action="dismiss-update" data-version="${updateReady.version}" aria-label="${COPY.popup.dismiss}">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;
}

// FR-15 / FR-37: the first-run card is now an offer of the quick tour (see
// tour.js) instead of a wall of text, with Skip always beside it.
function renderOnboarding() {
  return `
    <div class="onboardTip" role="region" aria-label="${COPY.tour.offerTitle}">
      <div class="title">${COPY.tour.offerTitle}</div>
      <div class="body">${COPY.tour.offerBody}</div>
      <div class="onboardActions">
        <button type="button" data-tour-action="start">${COPY.tour.start}</button>
        <button type="button" class="ghost" data-tour-action="skip">${COPY.tour.skipOffer}</button>
      </div>
      <span class="caret"></span>
    </div>
  `;
}

// FR-39: the review nudge's card. Built from the first-run card's own
// .onboardTip shell (same slot above the footer, outside .main, so scrolling
// never moves it) — the only new pieces are the muted "Don't ask again" link
// beside the title and no caret, since the card points at nothing.
function renderReviewCard() {
  return `
    <div class="onboardTip reviewTip" role="region" aria-label="${COPY.popup.reviewTitle}">
      <div class="reviewHead">
        <div class="title">${COPY.popup.reviewTitle}</div>
        <button type="button" class="reviewDecline" data-review-action="decline">${COPY.popup.reviewDecline}</button>
      </div>
      <div class="body">${COPY.popup.reviewBody}</div>
      <div class="onboardActions">
        <button type="button" data-review-action="review">${COPY.popup.reviewCta}</button>
        <button type="button" class="ghost" data-review-action="later">${COPY.popup.reviewLater}</button>
      </div>
    </div>
  `;
}

// The standing door: a "Rate Reelief" row at the top of the ⋮ menu. Not an ask.
// Until the nudge is done it is highlighted (amber bar + star); once done it
// stays for good as a plain text row like Report / About, so anyone can still
// open the review page later.
function renderReviewMenuRow(highlighted) {
  const star = highlighted
    ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.6l1.9 4.1 4.5.5-3.3 3 .9 4.4L8 11.4l-4 2.2.9-4.4-3.3-3 4.5-.5L8 1.6z"/></svg>'
    : '';
  return `<li role="none"><button type="button" role="menuitem"${highlighted ? ' class="reviewRow"' : ''} data-settings-action="review">
    <span class="rowLabel">${star}${COPY.popup.reviewMenuLabel}</span>
  </button></li>`;
}

async function handleReviewAction(action) {
  if (action === 'later') {
    await storage.snoozeReviewPrompt(storage.localDateKey());
  } else if (action === 'decline') {
    await storage.resolveReviewPrompt('declined');
  } else if (action === 'review') {
    // Write first, then open the tab: the new tab takes focus and closes this
    // popup, which would otherwise cut the write short. Chrome reports nothing
    // about whether a review was actually submitted, so the click is the signal.
    // Once the nudge is already done (the plain row people can keep using) there
    // is nothing to record — keep the stored reason as it was.
    if (!(await storage.getReviewPrompt())?.done) await storage.resolveReviewPrompt('reviewed');
    chrome.tabs.create({ url: BRAND.reviewUrl.trim() });
  }
}

async function loadState() {
  const [
    mode,
    perPlatformCounters,
    onboardingSeen,
    perPlatformHealth,
    recurringMinutes,
    recurringProgress,
    history,
    updateAvailable,
    updateAvailableDismissed,
    reviewState,
    todayRecord,
  ] = await Promise.all([
    storage.getMode(),
    Promise.all(PLATFORM_IDS.map((id) => storage.getTodayCounters(id))),
    storage.getOnboardingSeen(),
    Promise.all(PLATFORM_IDS.map((id) => storage.getHealthBanner(id))),
    storage.getRecurringFrictionMinutes(),
    storage.getRecurringProgress(),
    storage.getHistory(),
    storage.getUpdateAvailable(),
    storage.getUpdateAvailableDismissed(),
    storage.getReviewPrompt(),
    storage.ensureCurrentDay(),
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

  // Chrome may have already applied the pending update on its own (browser
  // restart, extension idle) before the user ever saw/clicked this nudge —
  // comparing against the running manifest's own version keeps a stale
  // "update ready" banner from lingering for a version that's already live.
  const updateReady =
    updateAvailable &&
    updateAvailable.version !== chrome.runtime.getManifest().version &&
    updateAvailable.version !== updateAvailableDismissed
      ? updateAvailable
      : null;

  const dailySeries = buildDailySeries(history, storage.localDateKey(), totals);

  // FR-40. `history` rows span every platform already (each row is
  // per-platform), and `totals` is today's counters aggregated the same
  // way — both match evaluateTimeAvoided()'s "any platform" contract.
  const timeAvoided = evaluateTimeAvoided(history, {
    opens: totals.opens,
    blockedOpens: totals.blockedOpens,
    minutes: Math.floor(totals.seconds / 60),
    stepAwayCount: totals.stepAwayCount,
  });

  // FR-39. An empty/invalid `reviewUrl` in product.config.json switches the
  // whole nudge off (nothing to open), the same way an empty uninstall URL does.
  const review = isValidReviewUrl(BRAND.reviewUrl)
    ? evaluateReviewPrompt({ history, today: todayRecord, state: reviewState, todayKey: storage.localDateKey() })
    : { unlockNow: false, unlocked: false, cardDue: false, doorVisible: false, rateRowVisible: false };
  if (review.unlockNow) storage.markReviewUnlocked(storage.localDateKey());

  return { mode, totals, breakdown, onboardingSeen, healthBanner, recurringMinutes, recurringProgress, dailySeries, updateReady, review, timeAvoided };
}

async function refresh() {
  render(await loadState());
}

// Resolve the UI language (stored pref -> browser UI language -> English)
// and load its locale before the first paint, so the popup never flashes
// English on the way to the chosen language. Also loads the trend chart's
// sticky metric/zoom prefs before the first render, so a fresh popup opens
// on whatever was last chosen instead of always resetting to 7D/Opens.
async function boot() {
  await initI18n(async () => (await storage.getLanguage()) || matchLanguage(chrome.i18n.getUILanguage()));
  trendMetric = await storage.getTrendMetric();
  trendZoomed = await storage.getTrendZoomed();
  await refresh();
}
boot();

storage.onChanged(async (changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.language) await setLanguage(changes.language.newValue || 'en');
  // Keeps this popup's own trend prefs correct if the change came from
  // elsewhere (e.g. another open instance of the popup) rather than from
  // this tab's own click handlers above, which already update them locally.
  if (changes.trendMetric) trendMetric = changes.trendMetric.newValue === 'minutes' ? 'minutes' : 'opens';
  if (changes.trendZoomed) trendZoomed = changes.trendZoomed.newValue ?? true;
  refresh();
});

// Design 4.2: "a user who closes the popup has seen it" — persist on close too.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) storage.setOnboardingSeen();
});
