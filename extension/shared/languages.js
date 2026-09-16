/**
 * The language registry — the single extension point for localization.
 *
 * Adding a language is two steps and no code:
 *   1. add an entry here (code, English name, endonym, tier, dir)
 *   2. add `shared/locales/<code>.js` with the translated strings
 *      (any key it omits falls back to English — see shared/i18n.js)
 *
 * `code` is a BCP-47 tag and must match the locale filename. The popup's
 * language menu (FR-32) and onboarding picker (FR-33) are both rendered
 * straight from this array, in this order.
 *
 * Tiers (PRD FR-36): Tier 1 ships with V1.5; Tier 2 is a translation-only
 * follow-on; Tier 3 (RTL) additionally needs the mirrored-layout work.
 */

export const LANGUAGES = [
  { code: 'en', name: 'English', endonym: 'English', tier: 1, dir: 'ltr' },
  { code: 'es', name: 'Spanish', endonym: 'Español', tier: 1, dir: 'ltr' },
  { code: 'pt-BR', name: 'Portuguese', endonym: 'Português', tier: 1, dir: 'ltr' },
  { code: 'de', name: 'German', endonym: 'Deutsch', tier: 1, dir: 'ltr' },
  { code: 'fr', name: 'French', endonym: 'Français', tier: 1, dir: 'ltr' },
  { code: 'hi', name: 'Hindi', endonym: 'हिन्दी', tier: 1, dir: 'ltr' },
  { code: 'id', name: 'Indonesian', endonym: 'Indonesia', tier: 2, dir: 'ltr' },
  { code: 'ja', name: 'Japanese', endonym: '日本語', tier: 2, dir: 'ltr' },
  { code: 'ru', name: 'Russian', endonym: 'Русский', tier: 2, dir: 'ltr' },
  { code: 'it', name: 'Italian', endonym: 'Italiano', tier: 2, dir: 'ltr' },
  { code: 'tr', name: 'Turkish', endonym: 'Türkçe', tier: 2, dir: 'ltr' },
  { code: 'ar', name: 'Arabic', endonym: 'العربية', tier: 3, dir: 'rtl' },
];

export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function isSupported(code) {
  return LANGUAGE_CODES.includes(code);
}

export function getLanguageMeta(code) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/**
 * Map a browser UI language (`chrome.i18n.getUILanguage()`, e.g. "pt-BR",
 * "es-419", "en-US", "de") to a supported code, or null if none fits.
 * Exact match first, then base-language match ("es-419" -> "es").
 */
export function matchLanguage(uiLang) {
  if (!uiLang) return null;
  const lower = String(uiLang).toLowerCase();
  const exact = LANGUAGES.find((l) => l.code.toLowerCase() === lower);
  if (exact) return exact.code;
  const base = lower.split('-')[0];
  const baseMatch = LANGUAGES.find((l) => l.code.toLowerCase().split('-')[0] === base);
  return baseMatch ? baseMatch.code : null;
}
