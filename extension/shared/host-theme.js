/**
 * Detects the *host page's* actual light/dark theme — not just the OS
 * setting — because a light overlay on a dark host page (or the reverse)
 * is the single most jarring failure available. Falls back to
 * prefers-color-scheme only when the host gives no usable signal.
 *
 * Multiple independent detection strategies, same reasoning as the
 * platform adapter's selector strategies (PRD Risk 1): sites change how
 * they mark dark mode without notice, so no single strategy is trusted
 * alone.
 */

function computeLuminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseRgb(str) {
  const match = str.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/);
  if (!match) return null;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (alpha === 0) return null; // fully transparent — e.g. rgba(0,0,0,0) — is not "black", it's no signal
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function detectFromAttribute() {
  const html = document.documentElement;
  // YouTube marks its dark theme with a boolean `dark` attribute on <html>.
  if (html.hasAttribute('dark')) return 'dark';
  const dataTheme = html.getAttribute('data-theme');
  if (dataTheme === 'dark' || dataTheme === 'light') return dataTheme;
  return null;
}

function detectFromComputedBackground() {
  // document.body's own background is commonly transparent on YouTube (the
  // real page color comes from a deeper wrapper element instead) — try
  // body first, then <html>, then YouTube's own app-root element, and use
  // whichever is the first to actually report a non-transparent color.
  // `parseRgb`'s alpha check is what makes "transparent" not read as
  // "black" here — without it a light-theme page misdetects as dark.
  const candidates = [document.body, document.documentElement, document.querySelector('ytd-app')].filter(
    Boolean,
  );
  for (const el of candidates) {
    const rgb = parseRgb(getComputedStyle(el).backgroundColor);
    if (rgb) return computeLuminance(rgb) < 128 ? 'dark' : 'light';
  }
  return null;
}

function detectFromMediaQuery() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function detectHostTheme() {
  return detectFromAttribute() ?? detectFromComputedBackground() ?? detectFromMediaQuery();
}

/**
 * Sets data-md-theme on `element` (a Shadow DOM host, so tokens.css's
 * :host([data-md-theme]) rules pick it up) and keeps it in sync with
 * runtime host-side theme toggles — e.g. YouTube's own dark-mode switch
 * flips the <html dark> attribute without a page reload. Returns a
 * cleanup function.
 */
export function watchHostTheme(element, { onChange } = {}) {
  function apply() {
    const theme = detectHostTheme();
    element.setAttribute('data-md-theme', theme);
    onChange?.(theme);
  }
  apply();

  const attributeObserver = new MutationObserver(apply);
  attributeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['dark', 'data-theme', 'class'],
  });

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', apply);

  return function stopWatching() {
    attributeObserver.disconnect();
    media.removeEventListener('change', apply);
  };
}
