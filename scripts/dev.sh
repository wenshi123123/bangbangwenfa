#!/bin/bash
set -e

PORT=3000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./pnpm-cmd.sh
. "${SCRIPT_DIR}/pnpm-cmd.sh"

cd "${COZE_WORKSPACE_PATH}"

echo "Starting Next.js dev server on port ${PORT}..."
cd "${COZE_WORKSPACE_PATH}"
PORT=$PORT pnpm_cmd exec next dev --webpack --hostname 127.0.0.1 --port ${PORT}
