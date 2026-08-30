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
// Deliberately original, simple geometric shapes (a play triangle, a
// generic camera outline) rather than the platforms' actual trademarked
// logos — redistributing an official brand asset (even a simplified one)
// inside a shipped extension is a real trademark/brand-guideline risk that
// isn't ours to sign off on; these evoke each platform without copying its
// specific proprietary artwork. Swap for the real official assets only if
// they're sourced directly from each platform's own brand/press page.
const YOUTUBE_ICON_SVG =
  '<svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden="true"><path d="M1.2 0.4 6.2 3.5 1.2 6.6Z" fill="#fff"/></svg>';
const INSTAGRAM_ICON_SVG =
  '<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><rect x="0.6" y="0.6" width="6.8" height="6.8" rx="2.2" stroke="#fff" stroke-width="1"/><circle cx="4" cy="4" r="1.3" stroke="#fff" stroke-width="1"/></svg>';
const FACEBOOK_ICON_SVG = '<span style="font:700 10px/1 var(--font-sans); color:#fff;">f</span>';

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
    iconColor: '#c0392b',
    iconSvg: YOUTUBE_ICON_SVG,
  },
  instagram: {
    displayName: 'Instagram Reels',
    siteName: 'Instagram',
    homeLabel: 'instagram.com',
    feedLabel: 'Reels',
    feedPath: '/reels/',
    iconColor: '#a83e82',
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
    iconColor: '#3b6ea5',
    iconSvg: FACEBOOK_ICON_SVG,
  },
};
