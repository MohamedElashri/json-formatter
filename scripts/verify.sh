#!/bin/bash
# verify.sh - Check required files and icons
# Called by: make verify

set -euo pipefail

ERRORS=0
REQUIRED="manifest.json content-script.js styles.css README.md"
ICONS="icons/icon-48.png icons/icon-96.png icons/icon-128.png"

err() { echo "   [ERROR] $1"; ERRORS=$((ERRORS + 1)); }
ok()  { echo "   [OK] $1"; }

echo "[CHECK] Verifying extension structure..."
for f in $REQUIRED; do
    if [[ -f "$f" ]]; then
        ok "$f"
    else
        err "Missing required file: $f"
    fi
done

echo ""
echo "[CHECK] Verifying icons..."
for icon in $ICONS; do
    if [[ -f "$icon" ]]; then
        HEADER=$(head -c4 "$icon" | od -An -tx1 | tr -d ' ')
        if [[ "$HEADER" == "89504e47" ]]; then
            ok "$icon (valid PNG)"
        else
            err "$icon is not a valid PNG file"
        fi
    else
        err "Missing icon: $icon"
    fi
done

if (( ERRORS > 0 )); then
    echo ""
    echo "[FAIL] $ERRORS error(s)"
    exit 1
fi
