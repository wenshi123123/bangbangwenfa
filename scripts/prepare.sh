#!/bin/bash
set -e

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./pnpm-cmd.sh
. "${SCRIPT_DIR}/pnpm-cmd.sh"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm_cmd install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only
