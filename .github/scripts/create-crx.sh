#!/usr/bin/env bash

# Create installable ZIP and CRX packages from this extension source directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SOURCE_DIR="${PROJECT_ROOT}"
PACKAGES_DIR="${PROJECT_ROOT}/packages"
OUTPUT_NAME="linkedin-outreach-extension"

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip is required to create the ZIP package."
  exit 1
fi

if ! command -v crx >/dev/null 2>&1; then
  echo "Error: crx is required to create the CRX package."
  echo "Install it with: npm install --global crx"
  exit 1
fi

mkdir -p "${PACKAGES_DIR}"
rm -f "${PACKAGES_DIR}/${OUTPUT_NAME}.zip" "${PACKAGES_DIR}/${OUTPUT_NAME}.crx"

SIGNING_KEY_PATH=""
TEMP_KEY_PATH=""
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/${OUTPUT_NAME}.XXXXXX")"

if [ -n "${CHROME_CRX_SIGNING_KEY:-}" ]; then
  if [ -f "${CHROME_CRX_SIGNING_KEY}" ]; then
    SIGNING_KEY_PATH="${CHROME_CRX_SIGNING_KEY}"
  else
    TEMP_KEY_PATH="$(mktemp "${TMPDIR:-/tmp}/${OUTPUT_NAME}-key.XXXXXX.pem")"
    printf '%s\n' "${CHROME_CRX_SIGNING_KEY}" > "${TEMP_KEY_PATH}"
    chmod 600 "${TEMP_KEY_PATH}"
    SIGNING_KEY_PATH="${TEMP_KEY_PATH}"
  fi
elif [ -f "${PROJECT_ROOT}/key.pem" ]; then
  SIGNING_KEY_PATH="${PROJECT_ROOT}/key.pem"
else
  echo "Error: Set CHROME_CRX_SIGNING_KEY or create key.pem before packaging."
  exit 1
fi

cleanup() {
  if [ -n "${TEMP_KEY_PATH}" ]; then
    rm -f "${TEMP_KEY_PATH}"
  fi
  rm -rf "${STAGING_DIR}"
}
trap cleanup EXIT

echo "Preparing extension source..."
tar -C "${SOURCE_DIR}" \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./packages' \
  --exclude='./key.pem' \
  --exclude='./.gitignore' \
  -cf - . | tar -C "${STAGING_DIR}" -xf -

echo "Creating ZIP package..."
(
  cd "${STAGING_DIR}"
  zip -r "${PACKAGES_DIR}/${OUTPUT_NAME}.zip" .
)

echo "Creating CRX package..."
crx pack "${STAGING_DIR}" \
  -o "${PACKAGES_DIR}/${OUTPUT_NAME}.crx" \
  -p "${SIGNING_KEY_PATH}"

echo "Created ${PACKAGES_DIR}/${OUTPUT_NAME}.zip"
echo "Created ${PACKAGES_DIR}/${OUTPUT_NAME}.crx"
