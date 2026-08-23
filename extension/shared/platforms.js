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
    homeLabel: 'youtube.com',
  },
};
