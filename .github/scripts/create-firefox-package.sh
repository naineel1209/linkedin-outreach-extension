#!/usr/bin/env bash

# Create an unsigned Firefox package and its source directory for web-ext signing.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SOURCE_DIR="${PROJECT_ROOT}"
PACKAGES_DIR="${PROJECT_ROOT}/packages"
FIREFOX_SOURCE_DIR="${PACKAGES_DIR}/firefox-source"
OUTPUT_NAME="linkedin-outreach-extension-firefox"

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip is required to create the Firefox package."
  exit 1
fi

rm -rf "${FIREFOX_SOURCE_DIR}"
mkdir -p "${FIREFOX_SOURCE_DIR}"
rm -f "${PACKAGES_DIR}/${OUTPUT_NAME}.zip"

echo "Preparing Firefox extension source..."
tar -C "${SOURCE_DIR}" \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./.agents' \
  --exclude='./.agents/*' \
  --exclude='./.codex' \
  --exclude='./.codex/*' \
  --exclude='./packages' \
  --exclude='./key.pem' \
  --exclude='./.gitignore' \
  --exclude='./manifest.json' \
  --exclude='./manifest.firefox.json' \
  --exclude='./background.chrome.js' \
  --exclude='./offscreen.html' \
  --exclude='./offscreen.js' \
  -cf - . | tar -C "${FIREFOX_SOURCE_DIR}" -xf -

cp "${SOURCE_DIR}/manifest.firefox.json" "${FIREFOX_SOURCE_DIR}/manifest.json"

echo "Creating Firefox ZIP package..."
(
  cd "${FIREFOX_SOURCE_DIR}"
  zip -r "${PACKAGES_DIR}/${OUTPUT_NAME}.zip" .
)

echo "Created ${PACKAGES_DIR}/${OUTPUT_NAME}.zip"
