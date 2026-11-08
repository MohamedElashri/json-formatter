#!/usr/bin/env python3
"""Prepare the old update feed from the unchanged signed XPI downloaded from AMO."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--signed-xpi", type=Path, required=True)
    parser.add_argument("--url", required=True, help="HTTPS URL serving exactly these signed bytes")
    args = parser.parse_args()
    url = urlsplit(args.url)
    if url.scheme != "https" or not url.hostname or url.username or url.password or url.fragment:
        parser.error("--url must be an HTTPS download URL without credentials or a fragment")
    expected = json.loads(Path("manifest.json").read_text())
    try:
        with zipfile.ZipFile(args.signed_xpi) as archive:
            manifest = json.loads(archive.read("manifest.json"))
            names = {name.lower() for name in archive.namelist()}
            signature_pairs = [
                {"meta-inf/mozilla.rsa", "meta-inf/mozilla.sf", "meta-inf/manifest.mf"},
                {"meta-inf/cose.sig", "meta-inf/cose.manifest"},
            ]
            if not any(pair <= names for pair in signature_pairs):
                parser.error("XPI has no Mozilla signature files; use the signed AMO download")
    except (OSError, zipfile.BadZipFile, KeyError, ValueError) as error:
        parser.error(f"Cannot read signed XPI: {error}")
    gecko = manifest["browser_specific_settings"]["gecko"]
    addon_id = expected["browser_specific_settings"]["gecko"]["id"]
    if gecko["id"] != addon_id or manifest["version"] != expected["version"]:
        parser.error("Signed XPI must have the release manifest's add-on ID and version")
    if "update_url" in gecko:
        parser.error("Migration XPI must omit update_url so future updates come from AMO")
    # Never generate a feed from an unrelated or stale signed build of this version.
    with zipfile.ZipFile(args.signed_xpi) as archive:
        if manifest != expected:
            parser.error("Signed XPI manifest differs from this release")
        for name in ["content-script.js", "styles.css", *expected["icons"].values()]:
            if archive.read(name) != Path(name).read_bytes():
                parser.error(f"Signed XPI contains different release bytes for {name}")
    digest = hashlib.sha256(args.signed_xpi.read_bytes()).hexdigest()
    data = {"addons": {addon_id: {"updates": [{
        "version": manifest["version"],
        "update_link": args.url,
        "update_hash": f"sha256:{digest}",
        "applications": {"gecko": {"strict_min_version": gecko["strict_min_version"]}},
    }]}}}
    target = Path("dist/updates.json")
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Written {target}; upload it only with the unchanged AMO-signed XPI.")


if __name__ == "__main__":
    main()
