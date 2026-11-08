#!/usr/bin/env python3
"""Check public-channel invariants and image sizes without third-party modules."""
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / "manifest.json").read_text())
gecko = manifest["browser_specific_settings"]["gecko"]
assert gecko["id"] == "json-formatter@melashri.dev", "Keep the existing add-on identity"
assert "update_url" not in gecko, "A public release must use AMO updates"
assert gecko["data_collection_permissions"] == {"required": ["none"]}
assert gecko["strict_min_version"] == "140.0"
assert manifest["version"] == json.loads((ROOT / "package.json").read_text())["version"]
lockfile = json.loads((ROOT / "package-lock.json").read_text())
assert manifest["version"] == lockfile["version"] == lockfile["packages"][""]["version"]
assert manifest["action"]["default_icon"] == manifest["icons"]


def png_size(name, expected):
    data = (ROOT / name).read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG: {name}"
    assert data[12:16] == b"IHDR", f"Missing PNG header: {name}"
    assert struct.unpack(">II", data[16:24]) == expected, f"Wrong image dimensions: {name}"
    print(f"OK: {name} ({expected[0]} x {expected[1]})")


assert set(manifest["icons"]) == {"16", "32", "48", "64", "96", "128"}
for size, name in manifest["icons"].items():
    png_size(name, (int(size), int(size)))

for file in ["content-script.js", "styles.css", "LICENSE", "PRIVACY.md", "README.md",
             "CHANGELOG.md", "listing/amo.md",
             "listing/reviewer-notes.txt", "listing/sample.json", "icons/icon.svg"]:
    assert (ROOT / file).is_file(), f"Missing release file: {file}"

for name in ["01-dark-tree.png", "02-light-tree.png", "03-formatted.png"]:
    png_size(f"listing/screenshots/{name}", (1280, 800))
print(f"OK: public release {manifest['version']}")
