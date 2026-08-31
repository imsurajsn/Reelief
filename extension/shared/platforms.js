/**
 * Platform display metadata — the popup needs a human-readable name and
 * a short home-domain label per platform, without importing a
 * content-script-only adapter (see ARCHITECTURE.md's platform-adapter
 * pattern; popup and content scripts stay on separate sides of that
 * boundary). Content-script adapters (content/platforms/*.js) also read
 * from here so the two never drift apart.
 *
 * Adding v1b/v1c means adding one entry here alongside the new
 * content/platforms/*.js adapter file — nothing else needs to change to
 * learn a new platform exists.
 */
// Per-platform badge glyphs for the popup's TODAY stat-card breakdown.
// All three are reproductions of the platforms' brand marks, used at the
// product owner's request — redistributing an official brand asset inside a
// shipped extension is a trademark/brand-guideline risk, so if this ships
// publicly (Chrome Web Store), confirm each against the platform's own
// brand/press-page guidelines first.
//
// Full-bleed: these fill the circular .platformBadge themselves rather than
// sitting as a white glyph on an iconColor chip.
const YOUTUBE_ICON_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
  '<rect width="16" height="16" rx="8" fill="#FF0000"/>' +
  '<rect x="3" y="5" width="10" height="6" rx="1.7" fill="#fff"/>' +
  '<path d="M6.7 6.1 10.5 8 6.7 9.9Z" fill="#FF0000"/></svg>';
const INSTAGRAM_ICON_SVG =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
  '<defs><linearGradient id="reeliefIgGrad" x1="1.5" y1="14.5" x2="14.5" y2="1.5" gradientUnits="userSpaceOnUse">' +
  '<stop offset="0" stop-color="#FEDA75"/><stop offset=".25" stop-color="#FA7E1E"/>' +
  '<stop offset=".5" stop-color="#D62976"/><stop offset=".75" stop-color="#962FBF"/>' +
  '<stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs>' +
  '<rect width="16" height="16" rx="8" fill="url(#reeliefIgGrad)"/>' +
  '<rect x="4.25" y="4.25" width="7.5" height="7.5" rx="2.4" stroke="#fff" stroke-width="1.1"/>' +
  '<circle cx="8" cy="8" r="1.95" stroke="#fff" stroke-width="1.1"/>' +
  '<circle cx="11.15" cy="4.85" r="0.72" fill="#fff"/></svg>';
const FACEBOOK_ICON_SVG =
  '<svg width="16" height="16" viewBox="0 0 36 36" fill="none" aria-hidden="true">' +
  '<circle cx="18" cy="18" r="18" fill="#0866FF"/>' +
  '<path fill="#fff" d="M25.03 23.2 25.83 18h-5v-3.37c0-1.42.7-2.81 2.94-2.81h2.27V7.38S24.02 7.03 22.06 7.03c-4.11 0-6.79 2.49-6.79 7V18h-4.58v5.2h4.58v12.57a18.2 18.2 0 0 0 5.62 0V23.2h4.14Z"/></svg>';

export const PLATFORM_INFO = {
  youtube: {
    displayName: 'YouTube Shorts',
    // Bare site name (no feed type) — FR-19's popup breakdown line reads
    // "YouTube: 3 opens, 12 min", not "YouTube Shorts: 3 opens, 12 min".
    siteName: 'YouTube',
    homeLabel: 'youtube.com',
    // feedLabel/feedPath: the short feed-type word and its URL path,
    // used to generalize copy that used to hardcode "Shorts"/"/shorts/".
    feedLabel: 'Shorts',
    feedPath: '/shorts/',
    // Fallback tint only — YOUTUBE_ICON_SVG is full-bleed.
    iconColor: '#FF0000',
    iconSvg: YOUTUBE_ICON_SVG,
  },
  instagram: {
    displayName: 'Instagram Reels',
    siteName: 'Instagram',
    homeLabel: 'instagram.com',
    feedLabel: 'Reels',
    feedPath: '/reels/',
    // Fallback tint only — INSTAGRAM_ICON_SVG is full-bleed and paints its
    // own gradient over the whole badge.
    iconColor: '#d62976',
    iconSvg: INSTAGRAM_ICON_SVG,
  },
  facebook: {
    displayName: 'Facebook Reels',
    siteName: 'Facebook',
    homeLabel: 'facebook.com',
    feedLabel: 'Reels',
    // Singular /reel/ — verified live against facebook.com, unlike
    // Instagram's plural /reels/.
    feedPath: '/reel/',
    // Fallback tint only — FACEBOOK_ICON_SVG is full-bleed.
    iconColor: '#0866FF',
    iconSvg: FACEBOOK_ICON_SVG,
  },
};
