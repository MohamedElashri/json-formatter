"""Check version synchronization without changing the working tree."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent


class VersionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "scripts").mkdir()
        self.script = self.root / "scripts/version.py"
        shutil.copyfile(ROOT / "scripts/version.py", self.script)
        self.documents = {
            "manifest.json": {"version": "1.2.3", "name": "Keep manifest fields"},
            "package.json": {"version": "1.2.3", "private": True},
            "package-lock.json": {"version": "1.2.3", "packages": {
                "": {"version": "1.2.3"}, "node_modules/example": {"version": "9.8.7"}}},
        }
        for name, document in self.documents.items():
            (self.root / name).write_text(json.dumps(document))

    def run_version(self, *args, version=""):
        env = {**os.environ, "VERSION": version}
        return subprocess.run([sys.executable, str(self.script), *args],
                              env=env, capture_output=True, text=True)

    def assert_versions(self, expected):
        for name, original in self.documents.items():
            document = json.loads((self.root / name).read_text())
            original = json.loads(json.dumps(original))
            original["version"] = expected
            if name == "package-lock.json":
                original["packages"][""]["version"] = expected
            self.assertEqual(document, original)

    def test_bumps_sync_all_files(self):
        for bump, expected in [("patch", "1.2.4"), ("minor", "1.3.0"), ("major", "2.0.0")]:
            with self.subTest(bump=bump):
                for name, document in self.documents.items():
                    (self.root / name).write_text(json.dumps(document))
                result = self.run_version(bump)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assert_versions(expected)

    def test_explicit_release(self):
        result = self.run_version("--release", version="1.4.0")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_versions("1.4.0")

    def test_same_version_rebuild(self):
        self.assertEqual(self.run_version("--release", version="1.2.3").returncode, 0)
        self.assert_versions("1.2.3")

    def test_invalid_release_preserves_files(self):
        for version in ["", "v1.2.4", "1.2.4-beta", "01.2.4", "1.2.65536", "1.2.2"]:
            with self.subTest(version=version):
                before = {name: (self.root / name).read_bytes() for name in self.documents}
                self.assertNotEqual(self.run_version("--release", version=version).returncode, 0)
                self.assertEqual(before, {name: (self.root / name).read_bytes() for name in self.documents})

    def test_mismatched_version_rejected(self):
        path = self.root / "package.json"
        path.write_text(json.dumps({"version": "1.0.0"}))
        self.assertNotEqual(self.run_version("patch").returncode, 0)
        self.assertEqual(json.loads((self.root / "manifest.json").read_text())["version"], "1.2.3")


if __name__ == "__main__":
    unittest.main()
