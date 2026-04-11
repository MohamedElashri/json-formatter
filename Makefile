SHELL := /bin/bash
.PHONY: all verify lint package clean help

# Configuration
DIST       := dist
MANIFEST   := manifest.json
REQUIRED   := manifest.json content-script.js styles.css README.md
ICONS      := icons/icon-48.png icons/icon-96.png icons/icon-128.png

NAME       := $(shell grep '"name"' $(MANIFEST) | sed 's/.*: *"//;s/".*//' | tr '[:upper:] ' '[:lower:]-')
VERSION    := $(shell grep '"version"' $(MANIFEST) | head -1 | sed 's/.*: *"//;s/".*//')
XPI        := $(DIST)/$(NAME)-$(VERSION).xpi
SHA        := $(DIST)/$(NAME)-$(VERSION).sha256

# Targets
all: verify package

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "  make          Verify and package the extension"
	@echo "  make verify   Run all verification checks"
	@echo "  make lint     Lint manifest.json"
	@echo "  make package  Create .xpi file (runs verify first)"
	@echo "  make clean    Remove dist/ directory"
	@echo "  make help     Show this help"

verify: lint
	@echo ""
	@bash scripts/verify.sh
	@echo ""
	@echo "[OK] All checks passed"

lint:
	@bash scripts/lint-manifest.sh

package: verify
	@mkdir -p $(DIST)
	@rm -f $(XPI) $(SHA)
	@echo ""
	@echo "[PACKAGE] Creating $(XPI)..."
	@zip -qr $(XPI) $(REQUIRED) $(ICONS)
	@sha256sum $(XPI) > $(SHA)
	@SIZE=$$(stat -f%z "$(XPI)" 2>/dev/null || stat -c%s "$(XPI)" 2>/dev/null); \
	HASH=$$(cut -d' ' -f1 $(SHA)); \
	echo ""; \
	echo "[OK] Created: $(XPI) ($$SIZE bytes)"; \
	echo "[OK] SHA256: $$HASH"; \
	echo "[OK] Hash file: $(SHA)"

clean:
	@rm -rf $(DIST)
	@echo "[OK] Removed $(DIST)/"
