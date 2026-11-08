#!/usr/bin/env python3
"""Package an explicit file allowlist; never ship release tooling or credentials."""
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
manifest = json.loads((ROOT / "manifest.json").read_text())
version = manifest["version"]
runtime = ["manifest.json", "content-script.js", "styles.css", "LICENSE", "PRIVACY.md"]
runtime += sorted(set(manifest["icons"].values()))
listing = ["README.md", "PUBLISHING.md", "CHANGELOG.md", "LICENSE", "PRIVACY.md",
           "icons/icon.svg", "icons/icon-128.png"]
listing += [str(p.relative_to(ROOT)) for p in sorted((ROOT / "listing").rglob("*")) if p.is_file()]


def archive(path, files):
    # Stable timestamps, permissions, order and bytes allow repeatable packaging.
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for name in sorted(files):
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, (ROOT / name).read_bytes())
    print(path.relative_to(ROOT))


DIST.mkdir(exist_ok=True)
stage = DIST / "extension"
if stage.exists():
    shutil.rmtree(stage)
stage.mkdir()
for name in runtime:
    target = stage / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / name, target)

xpi = DIST / f"json-formatter-{version}-unsigned.xpi"
kit = DIST / f"json-formatter-{version}-listing-kit.zip"
archive(xpi, runtime)
archive(kit, listing)
with (DIST / "SHA256SUMS").open("w") as checksums:
    for path in (xpi, kit):
        checksums.write(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n")
