#!/bin/bash
# Render the editable, self-contained SVG. Requires librsvg's rsvg-convert.
set -euo pipefail
cd "$(dirname "$0")/.."
for size in 16 32 48 64 96 128; do
    rsvg-convert --width "$size" --height "$size" icons/icon.svg > "icons/icon-${size}.png"
done
