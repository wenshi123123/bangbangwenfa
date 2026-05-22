#!/bin/bash
set -Eeuo pipefail

PORT=5000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Starting Next.js dev server on port ${PORT}..."
cd "${COZE_WORKSPACE_PATH}"
PORT=$PORT pnpm next dev --port ${PORT}
