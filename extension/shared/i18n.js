/**
 * Runtime i18n — a tiny, dependency-free string layer that both the popup
 * and the content scripts share.
 *
 * Design:
 * - One flat message map per language under `shared/locales/<code>.js`.
 * - `en.js` is the base and is imported statically, so `t()` always has
 *   something to return even before `initI18n()` finishes.
 * - Any other language is merged over English on top, per-key — a locale
 *   that omits a key (or a whole untranslated locale) shows English there,
 *   never a blank (PRD FR-36).
 * - `t()` is synchronous: it reads module state that `initI18n()` /
 *   `setLanguage()` populate. Callers render synchronously; only the
 *   language *switch* is async.
 *
 * Message values are strings with `{name}` placeholders. `meta.ordinal`
 * and `meta.plural` live in the locale file too, since those rules are
 * language-specific.
 */

import EN from './locales/en.js';
import { DEFAULT_LANGUAGE, isSupported, getLanguageMeta } from './languages.js';

let activeCode = DEFAULT_LANGUAGE;
let messages = EN;

const listeners = new Set();

function localeUrl(code) {
  // Works from both an extension page (popup) and a content script.
  return chrome.runtime.getURL(`shared/locales/${code}.js`);
}

/** BCP-47 code of the language currently in effect. */
export function currentLanguage() {
  return activeCode;
}

/** `{ code, name, endonym, tier, dir }` for the active language. */
export function currentLanguageMeta() {
  return getLanguageMeta(activeCode);
}

/**
 * Look up a message by key and fill `{placeholders}` from `params`.
 * Unknown keys return the key itself (visible, greppable) rather than
 * throwing.
 */
export function t(key, params) {
  const raw = messages[key] ?? EN[key] ?? key;
  if (typeof raw !== 'string' || !params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) => (name in params ? String(params[name]) : `{${name}}`));
}

/** Language-specific helpers (ordinal words, plural selection). */
export function meta() {
  return messages.meta ?? EN.meta;
}

/** Subscribe to language changes; returns an unsubscribe fn. */
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Load `code` and make it active. Falls back to English if the code is
 * unsupported or its locale file fails to load. Safe to call repeatedly.
 */
export async function setLanguage(code) {
  const next = isSupported(code) ? code : DEFAULT_LANGUAGE;
  if (next === 'en') {
    activeCode = 'en';
    messages = EN;
  } else {
    try {
      const mod = await import(localeUrl(next));
      messages = { ...EN, ...(mod.default ?? mod) };
      activeCode = next;
    } catch {
      activeCode = 'en';
      messages = EN;
    }
  }
  applyDirection();
  for (const fn of listeners) fn(activeCode);
}

/**
 * Stamp `lang` / `dir` on the popup's <html>. Deliberately a no-op
 * everywhere else: in a content script `document.documentElement` is the
 * *host page's* <html>, and flipping YouTube/Instagram to RTL is not our
 * call — the overlay carries its own `dir` on its shadow root instead.
 */
export function applyDirection() {
  const isExtensionPage =
    typeof location !== 'undefined' && location.protocol === 'chrome-extension:';
  if (!isExtensionPage || typeof document === 'undefined' || !document.documentElement) return;
  const { dir } = currentLanguageMeta();
  document.documentElement.lang = activeCode;
  document.documentElement.dir = dir;
}

/**
 * Resolve the language to use on load: the stored preference if set,
 * otherwise the browser UI language if it maps to a supported one,
 * otherwise English. Then activate it.
 */
export async function initI18n(getStored) {
  let code = null;
  try {
    code = await getStored();
  } catch {
    code = null;
  }
  await setLanguage(code || DEFAULT_LANGUAGE);
}
