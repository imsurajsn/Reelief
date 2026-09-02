import product from '../config/product.config.json' with { type: 'json' };

/**
 * Single runtime source of truth for name/tagline/icon/brand color.
 * manifest.json's static fields (name, description, icons) are generated
 * from the same config/product.config.json by scripts/generate-manifest.mjs —
 * rebranding means editing that one JSON file and re-running the generator.
 */
export const BRAND = product;

export function iconUrl(size) {
  const path = BRAND.icons[String(size)];
  return path ? chrome.runtime.getURL(path) : null;
}

export function disabledIconUrl(size) {
  const path = BRAND.iconsDisabled[String(size)];
  return path ? chrome.runtime.getURL(path) : null;
}

/**
 * Inline SVG icon markup at an arbitrary size, built from BRAND.icon's
 * colors — matches assets/icons/icon.svg's geometry exactly. Use this
 * (not iconUrl) anywhere the icon appears at a UI size that isn't one of
 * the fixed toolbar PNG sizes (16/32/48/128): it never 404s on an
 * unlisted size, and it recolors automatically when product.config.json's
 * icon colors change, no regeneration step required.
 *
 * Deliberately reads BRAND.icon, not BRAND.brand: the toolbar icon has its
 * own palette, distinct from brand.color (the popup's own in-app accent —
 * mode pill, stat cards, etc.). They're independent on purpose, the same
 * way a lot of products ship a punchier toolbar mark than their muted
 * in-app palette; keep both in sync only if that ever changes deliberately.
 */
export function iconMarkup(size = 24) {
  const { base, ring, flame } = BRAND.icon;
  return `<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="128" height="128" rx="28" fill="${base}"></rect>
    <circle cx="64" cy="64" r="44" stroke="${ring}" stroke-width="6" fill="none"></circle>
    <path d="M64 36 C64 36 78 52 78 68 C78 76 72 84 64 84 C56 84 50 76 50 68 C50 52 64 36 64 36 Z" fill="${flame}"></path>
    <path d="M60 58 L72 65 L60 72 Z" fill="${base}"></path>
  </svg>`;
}
