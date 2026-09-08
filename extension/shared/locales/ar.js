/**
 * Arabic (ar) — Tier 3. Not translated yet; every key falls back to
 * English (shared/i18n.js). The registry marks this locale `dir: "rtl"`,
 * so selecting it already flips the popup to right-to-left — but a full
 * RTL layout pass on the popup and overlays is still pending (PRD: Tier 3
 * is gated on that work). Treat Arabic as preview-only until then.
 *
 * When translating, also set a `meta.ordinal` suited to Arabic.
 */

export default {};
