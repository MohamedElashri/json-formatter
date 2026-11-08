# JSON Formatter — Makefile
# Build and package the Firefox extension for manual store uploads.

SHELL := /bin/bash
.DEFAULT_GOAL := all
.PHONY: all install ci update update-dev dev verify test test-unit lint \
	build build-firefox package package-firefox source bump bump-minor bump-major \
	release icons screenshots updates clean help

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DIST_DIR       := dist
FIREFOX_ZIP    := firefox_extension.zip
SOURCE_ZIP     := source_code.zip
NPM            := npm
NPX            := npx
PYTHON         := python3
export VERSION

# ---------------------------------------------------------------------------
# Default target
# ---------------------------------------------------------------------------
all:
	$(MAKE) clean
	$(MAKE) install
	$(MAKE) test
	$(MAKE) package
	@echo ""
	@echo "All done. Firefox upload ready: $(FIREFOX_ZIP)"

ci:
	$(MAKE) install
	$(MAKE) test
	$(MAKE) package
	$(MAKE) source

help:
	@echo "JSON Formatter — Makefile targets"
	@echo ""
	@echo "  make install        Install dependencies (npm ci)"
	@echo "  make update         Update dependencies within their ranges"
	@echo "  make update-dev     Update only dev dependencies within their ranges"
	@echo "  make dev            Run the temporary extension in Firefox"
	@echo "  make test           Run verification, Mozilla lint, and unit tests"
	@echo "  make lint           Run Mozilla web-ext lint on the staged extension"
	@echo "  make verify         Check manifest, JavaScript syntax, and release assets"
	@echo "  make build          Stage Firefox files in $(DIST_DIR)/firefox/"
	@echo "  make build-firefox  Stage only Firefox (alias for this Firefox-only project)"
	@echo "  make package        Build $(FIREFOX_ZIP) and the listing kit"
	@echo "  make package-firefox Create the Firefox upload ZIP"
	@echo "  make source         Create $(SOURCE_ZIP) for AMO source review"
	@echo "  make bump           Bump the patch version (x.y.Z)"
	@echo "  make bump-minor     Bump the minor version (x.Y.0)"
	@echo "  make bump-major     Bump the major version (X.0.0)"
	@echo "  make release        Set VERSION, install, test, package, and archive source"
	@echo "  make icons          Regenerate PNG icons (requires rsvg-convert)"
	@echo "  make screenshots    Run Firefox smoke checks and capture listing images"
	@echo "  make clean          Remove generated packages and $(DIST_DIR)/"
	@echo "  make all            Run: clean → install → test → package"
	@echo "  make ci             Run: install → test → package → source"
	@echo ""
	@echo "Release example: VERSION=1.0.2 make release (does not publish)"

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
install:
	$(NPM) ci --ignore-scripts

update:
	$(NPM) update

update-dev:
	$(NPM) update $$($(PYTHON) -c 'import json; print(" ".join(json.load(open("package.json")).get("devDependencies", {})))')

# ---------------------------------------------------------------------------
# Development and quality
# ---------------------------------------------------------------------------
dev: build
	NO_UPDATE_NOTIFIER=1 $(NPX) web-ext run --source-dir "$(DIST_DIR)/firefox"

verify:
	@bash scripts/lint-manifest.sh
	@node --check content-script.js
	@bash scripts/verify.sh

lint: build
	NO_UPDATE_NOTIFIER=1 $(NPX) --no-install web-ext lint --source-dir "$(DIST_DIR)/firefox" --warnings-as-errors

test: lint test-unit
	@echo "All checks passed."

test-unit:
	$(PYTHON) -m unittest discover -s tests -v

# ---------------------------------------------------------------------------
# Building and packaging
# ---------------------------------------------------------------------------
build: build-firefox

build-firefox: verify
	$(PYTHON) scripts/package.py --stage-only --dist-dir "$(DIST_DIR)"

package: package-firefox

package-firefox: verify
	$(PYTHON) scripts/package.py --dist-dir "$(DIST_DIR)" --firefox-zip "$(FIREFOX_ZIP)"

source:
	$(PYTHON) scripts/package.py --source-only --source-zip "$(SOURCE_ZIP)"

# ---------------------------------------------------------------------------
# Versioning and release preparation (no tagging or publishing)
# ---------------------------------------------------------------------------
bump:
	$(PYTHON) scripts/version.py patch

bump-minor:
	$(PYTHON) scripts/version.py minor

bump-major:
	$(PYTHON) scripts/version.py major

release:
	$(PYTHON) scripts/version.py --release
	$(MAKE) clean
	$(MAKE) install
	$(MAKE) test
	$(MAKE) package
	$(MAKE) source
	@echo ""
	@echo "Release $(VERSION) ready: $(FIREFOX_ZIP), $(SOURCE_ZIP), and the listing kit in $(DIST_DIR)/"

icons:
	@bash scripts/generate-icons.sh

screenshots:
	$(NPM) run screenshots

updates:
	@echo "Use scripts/gen-updates.sh --signed-xpi FILE --url HTTPS_URL after AMO signing."
	@echo "See PUBLISHING.md for migration of existing private installations."
	@exit 1

clean:
	rm -rf "$(DIST_DIR)"
	rm -f "$(FIREFOX_ZIP)" "$(SOURCE_ZIP)"
