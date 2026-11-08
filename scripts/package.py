#!/usr/bin/env python3
"""Stage and package explicit file allowlists for Firefox and AMO source review."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def archive(path, files):
    # Stable timestamps, permissions, order and bytes allow repeatable packaging.
    temporary = path.with_name(path.name + ".tmp")
    try:
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED) as package:
            for name in sorted(set(files)):
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                package.writestr(info, (ROOT / name).read_bytes())
        with zipfile.ZipFile(temporary) as package:
            if package.testzip() is not None:
                raise ValueError(f"Invalid archive: {path}")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    print(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path)


def tree_files(directory):
    return [str(path.relative_to(ROOT)) for path in sorted((ROOT / directory).rglob("*"))
            if path.is_file() and not path.is_symlink()
            and not any(part.startswith(".") or part == "__pycache__"
                        for part in path.relative_to(ROOT).parts)
            and path.suffix not in {".pyc", ".log", ".tmp"}]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--stage-only", action="store_true")
    mode.add_argument("--source-only", action="store_true")
    parser.add_argument("--dist-dir", default="dist")
    parser.add_argument("--firefox-zip", default="firefox_extension.zip")
    parser.add_argument("--source-zip", default="source_code.zip")
    args = parser.parse_args()

    if args.source_only:
        files = ["manifest.json", "content-script.js", "styles.css", "LICENSE",
                 "PRIVACY.md", "README.md", "CHANGELOG.md",
                 "Makefile", "package.json", "package-lock.json"]
        if (ROOT / "PUBLISHING.md").is_file():
            files.append("PUBLISHING.md")
        for directory in ["icons", "listing", "scripts", "tests"]:
            files += tree_files(directory)
        archive(ROOT / args.source_zip, files)
        return

    manifest = json.loads((ROOT / "manifest.json").read_text())
    version = manifest["version"]
    runtime = ["manifest.json", "content-script.js", "styles.css", "LICENSE", "PRIVACY.md"]
    runtime += sorted(set(manifest["icons"].values()))
    dist = ROOT / args.dist_dir
    dist.mkdir(parents=True, exist_ok=True)
    stage = dist / "firefox"
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir()
    for name in runtime:
        target = stage / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
    if args.stage_only:
        print(f"Staged Firefox extension: {stage.relative_to(ROOT)}")
        return

    listing = ["README.md", "CHANGELOG.md", "LICENSE", "PRIVACY.md",
               "icons/icon.svg", "icons/icon-128.png", *tree_files("listing")]
    if (ROOT / "PUBLISHING.md").is_file():
        listing.append("PUBLISHING.md")
    xpi = dist / f"json-formatter-{version}-unsigned.xpi"
    upload_zip = dist / f"json-formatter-{version}.zip"
    kit = dist / f"json-formatter-{version}-listing-kit.zip"
    archive(xpi, runtime)
    # XPI files are ZIP archives; preserve exactly the same bytes in both uploads.
    shutil.copyfile(xpi, upload_zip)
    firefox_zip = ROOT / args.firefox_zip
    shutil.copyfile(xpi, firefox_zip)
    print(firefox_zip.relative_to(ROOT))
    archive(kit, listing)
    with (dist / "SHA256SUMS").open("w") as checksums:
        for path in (xpi, upload_zip, kit):
            checksums.write(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n")


if __name__ == "__main__":
    main()
