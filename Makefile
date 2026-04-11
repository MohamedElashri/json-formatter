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

# Colors
RED        := \033[0;31m
YELLOW     := \033[0;33m
GREEN      := \033[0;32m
CYAN       := \033[0;36m
BOLD       := \033[1m
NC         := \033[0m

# Targets
all: verify package

help:
	@echo -e "${BOLD}Usage: make [target]${NC}"
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
	@echo -e "${GREEN}[OK]${NC} All checks passed"

lint:
	@bash scripts/lint-manifest.sh

package: verify
	@mkdir -p $(DIST)
	@rm -f $(XPI) $(SHA)
	@echo ""
	@echo -e "${BOLD}[PACKAGE]${NC} Creating $(XPI)..."
	@zip -qr $(XPI) $(REQUIRED) $(ICONS)
	@sha256sum $(XPI) > $(SHA)
	@SIZE=$$(stat -f%z "$(XPI)" 2>/dev/null || stat -c%s "$(XPI)" 2>/dev/null); \
	HASH=$$(cut -d' ' -f1 $(SHA)); \
	echo ""; \
	echo -e "${GREEN}[OK]${NC} Created: $(XPI) ($$SIZE bytes)"; \
	echo -e "${CYAN}[OK]${NC} SHA256: $$HASH"; \
	echo -e "${CYAN}[OK]${NC} Hash file: $(SHA)"

clean:
	@rm -rf $(DIST)
	@echo -e "${YELLOW}[OK]${NC} Removed $(DIST)/"
