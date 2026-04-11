#!/bin/bash
# verify.sh - Check required files and icons
# Called by: make verify

set -euo pipefail

ERRORS=0
REQUIRED="manifest.json content-script.js styles.css README.md"
ICONS="icons/icon-48.png icons/icon-96.png icons/icon-128.png"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m' # No Color

err() { echo -e "   ${RED}[ERROR]${NC} $1"; ERRORS=$((ERRORS + 1)); }
ok()  { echo -e "   ${GREEN}[OK]${NC} $1"; }

echo -e "${BOLD}[CHECK]${NC} Verifying extension structure..."
for f in $REQUIRED; do
    if [[ -f "$f" ]]; then
        ok "$f"
    else
        err "Missing required file: $f"
    fi
done

echo ""
echo -e "${BOLD}[CHECK]${NC} Verifying icons..."
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
    echo -e "${RED}[FAIL]${NC} $ERRORS error(s)"
    exit 1
fi
