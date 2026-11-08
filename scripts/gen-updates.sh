#!/bin/bash
# The legacy private update feed must reference an AMO-signed public-channel XPI.
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scripts/gen-updates.py "$@"
