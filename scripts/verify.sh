#!/bin/bash
# Public release asset and channel checks; no third-party Python dependencies.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/verify-release.py
