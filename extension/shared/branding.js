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
 * Inline SVG icon markup at an arbitrary size, built from BRAND.brand's
 * colors — matches assets/icons/icon.svg's geometry exactly. Use this
 * (not iconUrl) anywhere the icon appears at a UI size that isn't one of
 * the fixed toolbar PNG sizes (16/32/48/128): it never 404s on an
 * unlisted size, and it recolors automatically when product.config.json's
 * brand color changes, no regeneration step required.
 */
export function iconMarkup(size = 24) {
  const { color, markColor } = BRAND.brand;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="24" height="24" rx="7" fill="${color}"></rect>
    <path d="M12 5.6v5.2M9.6 8.9 12 11.3l2.4-2.4" stroke="${markColor}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
    <rect x="6.2" y="14.1" width="11.6" height="2.4" rx="1.2" fill="${markColor}"></rect>
  </svg>`;
}
