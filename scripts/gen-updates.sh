#!/bin/bash
# gen-updates.sh - Generate updates.json for Firefox auto-update
#
# Usage:
#   ./scripts/gen-updates.sh                    # From manifest + latest .xpi in dist/
#   ./scripts/gen-updates.sh 1.0.0 sha256:abc   # Explicit version and hash
#   ./scripts/gen-updates.sh --from-release     # Read version from git tags
#
# Output: dist/updates.json

set -euo pipefail

DIST="dist"
MANIFEST="manifest.json"
UPDATES="$DIST/updates.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────
get_manifest_version() {
    python3 -c "import json; print(json.load(open('$MANIFEST'))['version'])"
}

get_addon_id() {
    python3 -c "import json; print(json.load(open('$MANIFEST'))['browser_specific_settings']['gecko']['id'])"
}

# ── Parse arguments ──────────────────────────────────────────────
VERSION=""
HASH=""
BASE_URL="https://github.com/MohamedElashri/json-formatter/releases/download"

if [[ $# -eq 2 ]]; then
    VERSION="$1"
    HASH="$2"
elif [[ $# -eq 1 && "$1" == "--from-release" ]]; then
    # Get latest git tag
    VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [[ -z "$VERSION" ]]; then
        echo -e "${RED}[ERROR]${NC} No git tags found. Create a tag first."
        exit 1
    fi
    VERSION="${VERSION#v}"
elif [[ $# -eq 0 ]]; then
    VERSION=$(get_manifest_version)
else
    echo -e "${RED}[ERROR]${NC} Invalid arguments"
    echo "Usage: $0 [VERSION HASH]"
    echo "       $0 --from-release"
    exit 1
fi

# If no hash provided, compute from dist/
if [[ -z "$HASH" ]]; then
    XPI="$DIST/json-formatter-${VERSION}.xpi"
    if [[ ! -f "$XPI" ]]; then
        echo -e "${RED}[ERROR]${NC} XPI not found: $XPI"
        echo -e "       Run 'make package' first, or provide the hash manually."
        exit 1
    fi
    COMPUTED=$(sha256sum "$XPI" | cut -d' ' -f1)
    HASH="sha256:${COMPUTED}"
fi

ADDON_ID=$(get_addon_id)
DOWNLOAD_URL="${BASE_URL}/v${VERSION}/json-formatter-${VERSION}.xpi"

echo -e "${BOLD}[UPDATES]${NC} Generating updates.json..."
echo -e "   Add-on ID : $ADDON_ID"
echo -e "   Version   : $VERSION"
echo -e "   Hash      : $HASH"
echo -e "   URL       : $DOWNLOAD_URL"

# ── Merge with existing updates ──────────────────────────────────
if [[ -f "$UPDATES" ]]; then
    # Merge: add new version, keep existing ones
    python3 -c "
import json, sys

with open('$UPDATES') as f:
    data = json.load(f)

addon_id = '$ADDON_ID'
new_version = '$VERSION'
new_hash = '$HASH'
new_url = '$DOWNLOAD_URL'

if 'addons' not in data:
    data['addons'] = {}
if addon_id not in data['addons']:
    data['addons'][addon_id] = {'updates': []}

updates = data['addons'][addon_id]['updates']

# Check if version already exists
for entry in updates:
    if entry['version'] == new_version:
        entry['update_link'] = new_url
        entry['update_hash'] = new_hash
        break
else:
    updates.append({
        'version': new_version,
        'update_link': new_url,
        'update_hash': new_hash
    })

# Sort by version descending
def version_key(v):
    return [int(x) for x in v['version'].split('.')]

data['addons'][addon_id]['updates'] = sorted(updates, key=version_key, reverse=True)

with open('$UPDATES', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"
else
    # Create new updates.json
    cat > "$UPDATES" << EOF
{
  "addons": {
    "${ADDON_ID}": {
      "updates": [
        {
          "version": "${VERSION}",
          "update_link": "${DOWNLOAD_URL}",
          "update_hash": "${HASH}"
        }
      ]
    }
  }
}
EOF
fi

echo -e "${GREEN}[OK]${NC} Written to $UPDATES"
