"""Exercise migration-feed validation with synthetic (not validly signed) ZIPs."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts/gen-updates.py"


class MigrationFeedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.manifest = json.loads((ROOT / "manifest.json").read_text())
        self.files = ["manifest.json", "content-script.js", "styles.css",
                      *self.manifest["icons"].values()]
        for name in self.files:
            target = self.directory / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)

    def archive(self, *, signature=True, version=None, addon_id=None, update_url=None, altered=False):
        manifest = json.loads(json.dumps(self.manifest))
        if version:
            manifest["version"] = version
        gecko = manifest["browser_specific_settings"]["gecko"]
        if addon_id:
            gecko["id"] = addon_id
        if update_url:
            gecko["update_url"] = update_url
        path = self.directory / "fixture.xpi"
        with zipfile.ZipFile(path, "w") as archive:
            for name in self.files:
                data = (self.directory / name).read_bytes()
                if name == "manifest.json":
                    data = json.dumps(manifest).encode()
                if name == "content-script.js" and altered:
                    data += b"\n// different build"
                archive.writestr(name, data)
            if signature:
                # Presence checks only: these are deliberately NOT real signatures.
                archive.writestr("META-INF/cose.sig", b"synthetic test fixture")
                archive.writestr("META-INF/cose.manifest", b"synthetic test fixture")
        return path

    def run_helper(self, archive, url="https://example.com/signed.xpi"):
        return subprocess.run([sys.executable, str(SCRIPT), "--signed-xpi", str(archive),
                               "--url", url], cwd=self.directory, capture_output=True, text=True)

    def assert_rejected(self, result):
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.directory / "dist/updates.json").exists())

    def test_feed_hashes_exact_archive_bytes(self):
        archive = self.archive()
        result = self.run_helper(archive)
        self.assertEqual(result.returncode, 0, result.stderr)
        feed = json.loads((self.directory / "dist/updates.json").read_text())
        entry = feed["addons"]["json-formatter@melashri.dev"]["updates"][0]
        self.assertEqual(entry["version"], self.manifest["version"])
        self.assertEqual(entry["update_hash"], "sha256:" + hashlib.sha256(archive.read_bytes()).hexdigest())
        self.assertEqual(entry["update_link"], "https://example.com/signed.xpi")

    def test_unsigned_archive_rejected(self):
        self.assert_rejected(self.run_helper(self.archive(signature=False)))

    def test_wrong_id_rejected(self):
        self.assert_rejected(self.run_helper(self.archive(addon_id="other@example.com")))

    def test_wrong_version_rejected(self):
        self.assert_rejected(self.run_helper(self.archive(version="0.0.1")))

    def test_custom_update_url_rejected(self):
        self.assert_rejected(self.run_helper(self.archive(update_url="https://example.com/feed.json")))

    def test_different_runtime_bytes_rejected(self):
        self.assert_rejected(self.run_helper(self.archive(altered=True)))

    def test_http_url_rejected(self):
        self.assert_rejected(self.run_helper(self.archive(), "http://example.com/signed.xpi"))


if __name__ == "__main__":
    unittest.main()
