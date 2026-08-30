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
  },
  instagram: {
    displayName: 'Instagram Reels',
    siteName: 'Instagram',
    homeLabel: 'instagram.com',
    feedLabel: 'Reels',
    feedPath: '/reels/',
  },
  facebook: {
    displayName: 'Facebook Reels',
    siteName: 'Facebook',
    homeLabel: 'facebook.com',
    feedLabel: 'Reels',
    // Singular /reel/ — verified live against facebook.com, unlike
    // Instagram's plural /reels/.
    feedPath: '/reel/',
  },
};
