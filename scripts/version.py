#!/usr/bin/env python3
"""Synchronize numeric Firefox release versions without creating commits or tags."""
import argparse
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
VERSION_PATTERN = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bump", nargs="?", choices=["patch", "minor", "major"])
    parser.add_argument("--release", action="store_true")
    args = parser.parse_args()
    if args.release == bool(args.bump):
        parser.error("Choose a version bump or --release")

    paths = [ROOT / name for name in ["manifest.json", "package.json", "package-lock.json"]]
    documents = [json.loads(path.read_text()) for path in paths]
    current = documents[0]["version"]
    if not VERSION_PATTERN.fullmatch(current):
        parser.error(f"Expected a numeric major.minor.patch version, got {current!r}")
    versions = [document["version"] for document in documents]
    versions.append(documents[2]["packages"][""]["version"])
    if any(version != current for version in versions):
        parser.error("Manifest, package.json, and package-lock.json versions must match")

    if args.release:
        version = os.environ.get("VERSION", "")
        if not version:
            parser.error("VERSION is not set. Example: VERSION=1.0.2 make release")
    else:
        parts = [int(part) for part in current.split(".")]
        index = {"major": 0, "minor": 1, "patch": 2}[args.bump]
        parts[index] += 1
        parts[index + 1:] = [0] * (2 - index)
        version = ".".join(map(str, parts))
    if not VERSION_PATTERN.fullmatch(version) or any(int(part) > 65535 for part in version.split(".")):
        parser.error("VERSION must be major.minor.patch with each part between 0 and 65535")
    if tuple(map(int, version.split("."))) < tuple(map(int, current.split("."))):
        parser.error("Release version cannot be lower than the current version")

    for document in documents:
        document["version"] = version
    documents[2]["packages"][""]["version"] = version
    replacements = []
    for path, document in zip(paths, documents):
        # Preserve the existing manifest/package formatting when changing versions.
        text = path.read_text()
        text = re.sub(r'("version"\s*:\s*")[^"]*(")',
                      lambda match: match[1] + version + match[2], text, count=1)
        if path.name == "package-lock.json":
            text = re.sub(r'(""\s*:\s*\{[^{}]*?"version"\s*:\s*")[^"]*(")',
                          lambda match: match[1] + version + match[2], text, count=1)
        if json.loads(text) != document:
            parser.error(f"Cannot update {path.name} without changing other fields")
        replacements.append((path, text))
    for path, text in replacements:
        if path.read_text() != text:
            path.write_text(text)
    print(f"Version: {current} → {version} (manifest, package.json, and lockfile)")


if __name__ == "__main__":
    main()
