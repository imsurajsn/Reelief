/**
 * Uninstall feedback survey (FR-38). The background service worker hands
 * `uninstallSurveyUrl` (from config/product.config.json, delivered through
 * background/product-config.generated.js) to chrome.runtime.setUninstallURL(),
 * so Chrome opens that page in a new tab when someone removes the extension.
 *
 * This file only decides whether a configured value is safe to give Chrome. It
 * has no imports and touches no chrome.* API, so it runs the same in the
 * service worker and in plain node (used for the checks below).
 */

// Chrome rejects uninstall URLs longer than this (setUninstallURL docs).
export const MAX_UNINSTALL_URL_LENGTH = 1023;

/**
 * True only for a plain https URL Chrome will accept. Anything else — empty
 * (feature switched off), http, javascript:, data:, a malformed string, or an
 * over-long one — is refused, so a typo in the config can never make Chrome
 * open something unexpected or make setUninstallURL throw.
 */
export function isValidUninstallUrl(value) {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (url === '' || url.length > MAX_UNINSTALL_URL_LENGTH) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}
