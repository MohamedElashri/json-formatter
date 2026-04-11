#!/bin/bash
# lint-manifest.sh - Lint manifest.json for common issues
# Called by: make lint

set -euo pipefail

MANIFEST="manifest.json"
ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m' # No Color

err() { echo -e "   ${RED}[ERROR]${NC} $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo -e "   ${YELLOW}[WARN]${NC} $1"; WARNINGS=$((WARNINGS + 1)); }

# File exists
if [[ ! -f "$MANIFEST" ]]; then
    err "manifest.json not found"
    echo ""; echo -e "${RED}[FAIL]${NC} $ERRORS error(s)"
    exit 1
fi

# Valid JSON
if ! python3 -c "import json; json.load(open('$MANIFEST'))" 2>/dev/null; then
    err "manifest.json is not valid JSON"
    echo ""; echo -e "${RED}[FAIL]${NC} $ERRORS error(s)"
    exit 1
fi

# Parse with python3
read_val() {
    python3 -c "
import json, sys
m = json.load(open('$MANIFEST'))
try:
    keys = sys.argv[1].split('.')
    val = m
    for k in keys:
        if isinstance(val, list):
            val = val[int(k)]
        else:
            val = val[k]
    if isinstance(val, list):
        print(json.dumps(val))
    elif isinstance(val, dict):
        print(json.dumps(val))
    else:
        print(val)
except Exception:
    pass
" "$1"
}

echo -e "${BOLD}[CHECK]${NC} Linting manifest.json..."

# manifest_version
MV=$(read_val "manifest_version")
if [[ "$MV" != "3" ]]; then
    err "manifest_version should be 3, got '$MV'"
fi

# Required fields
for field in name version description icons; do
    val=$(read_val "$field")
    if [[ -z "$val" ]]; then
        err "Missing required field: $field"
    fi
done

# browser_specific_settings
GEO=$(read_val "browser_specific_settings.gecko")
if [[ -z "$GEO" ]]; then
    err "Missing browser_specific_settings.gecko"
fi

# Version format
VER=$(read_val "version")
if [[ -n "$VER" ]]; then
    IFS='.' read -ra PARTS <<< "$VER"
    NPARTS=${#PARTS[@]}
    if (( NPARTS < 2 || NPARTS > 4 )); then
        err "Version '$VER' should have 2-4 dot-separated parts"
    fi
    for part in "${PARTS[@]}"; do
        if ! [[ "$part" =~ ^[0-9]+$ ]]; then
            err "Version part '$part' is not a number"
        fi
    done
fi

# Permissions audit
PERMS=$(read_val "permissions")
if [[ -n "$PERMS" ]] && [[ "$PERMS" != "[]" ]]; then
    warn "Extension requests permissions: $PERMS. Verify each is needed."
fi

# content_scripts
CS=$(read_val "content_scripts")
if [[ -z "$CS" ]]; then
    err "No content_scripts defined"
else
    MATCHES=$(read_val "content_scripts.0.matches")
    JS=$(read_val "content_scripts.0.js")
    if [[ -z "$MATCHES" ]] || [[ "$MATCHES" == "[]" ]]; then
        err "content_scripts[0] has no 'matches'"
    fi
    if [[ -z "$JS" ]] || [[ "$JS" == "[]" ]]; then
        err "content_scripts[0] has no 'js' files"
    fi
fi

# web_accessible_resources format
WAR=$(read_val "web_accessible_resources")
if [[ -n "$WAR" ]]; then
    if [[ "$WAR" == *"\"resources\""* ]] && [[ "$WAR" == *"\"matches\""* ]]; then
        : # MV3 format - OK
    elif [[ "$WAR" == "\"["* ]]; then
        warn "web_accessible_resources may use MV2 string format instead of MV3 objects"
    fi
fi

# Summary
if (( ERRORS == 0 && WARNINGS == 0 )); then
    echo -e "   ${GREEN}[OK]${NC} No issues found"
else
    if (( ERRORS > 0 )); then
        echo ""; echo -e "${RED}[FAIL]${NC} $ERRORS error(s), $WARNINGS warning(s)"
        exit 1
    elif (( WARNINGS > 0 )); then
        echo ""; echo -e "${YELLOW}[WARN]${NC} $WARNINGS warning(s), 0 error(s)"
    fi
fi
