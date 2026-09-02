# Reelief

A Chrome extension that adds a brief, dismissable pause before YouTube
Shorts, Instagram Reels, or Facebook Reels loads, so scrolling is a choice
instead of a reflex. See [`../PRD/reelief-prd.md`](../PRD/reelief-prd.md)
for the full product spec and [`ARCHITECTURE.md`](ARCHITECTURE.md) for how
the codebase is organized and how to extend it to new platforms/browsers.

## Load it locally

1. Run `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` directory.
4. Visit `youtube.com` — Shorts links and the homepage Shorts shelf should
   now show Reelief's friction pause.
5. Visit `instagram.com` — the Reels tab, `/reels/`, and inline Reels posts
   in the main feed should show the same treatment.
6. Visit `facebook.com` — the Reels tab, `/reel/`, and inline Reels posts
   in the main feed should show the same treatment.

No build step is required — the extension runs directly from source.

## Rebranding (name / icon / tagline)

Edit `config/product.config.json`, then run:

```sh
node scripts/generate-manifest.mjs   # regenerates manifest.json
./scripts/generate-icons.sh          # rasterizes assets/icons/icon.svg (needs rsvg-convert)
```

Reload the unpacked extension in `chrome://extensions` to see the change.

## Scripts

- `scripts/generate-manifest.mjs` — fills `manifest.template.json` from
  `config/product.config.json` and writes `manifest.json`.
- `scripts/generate-icons.sh` — rasterizes the SVG icon source to the PNG
  sizes Chrome requires (`brew install librsvg` for `rsvg-convert`).

## Project layout

See [`ARCHITECTURE.md`](ARCHITECTURE.md).
