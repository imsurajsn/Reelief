#!/usr/bin/env bash
# Rasterizes assets/icons/icon.svg (+ icon-disabled.svg) to the PNG sizes
# Chrome extensions require. Not part of the runtime build — a dev-time
# convenience so a rebrand is "edit the SVG, run this script".
#
# Requires rsvg-convert (brew install librsvg).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert not found. Install with: brew install librsvg" >&2
  exit 1
fi

for size in 16 32 48 128; do
  rsvg-convert -w "$size" -h "$size" assets/icons/icon.svg -o "assets/icons/icon-$size.png"
  echo "wrote assets/icons/icon-$size.png"
done

rsvg-convert -w 48 -h 48 assets/icons/icon-disabled.svg -o assets/icons/icon-48-disabled.png
echo "wrote assets/icons/icon-48-disabled.png"
