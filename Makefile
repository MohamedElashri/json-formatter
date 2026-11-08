SHELL := /bin/bash
.PHONY: all verify lint package release test icons screenshots updates clean help

all: package

help:
	@echo "make package      Verify and build the unsigned AMO upload and listing kit"
	@echo "make release      Package and run Mozilla web-ext lint (npm ci required)"
	@echo "make verify       Check manifest, JavaScript syntax, files, and image sizes"
	@echo "make test         Test private-channel migration feed validation"
	@echo "make icons        Regenerate PNG icons from SVG (rsvg-convert required)"
	@echo "make screenshots  Run Firefox smoke checks and capture listing images"
	@echo "make clean        Remove generated dist/ artifacts"

lint:
	@bash scripts/lint-manifest.sh

verify: lint
	@node --check content-script.js
	@bash scripts/verify.sh

package: verify
	@python3 scripts/package.py

release: package test
	@npm run lint

test:
	@python3 -m unittest discover -s tests -v

icons:
	@bash scripts/generate-icons.sh

screenshots:
	@npm run screenshots

updates:
	@echo "Use scripts/gen-updates.sh --signed-xpi FILE --url HTTPS_URL after AMO signing."
	@echo "See PUBLISHING.md for migration of existing private installations."
	@exit 1

clean:
	@rm -rf dist
