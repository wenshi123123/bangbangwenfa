#!/bin/bash
set -e

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

# 加载 .env.production（自定义服务器需要手动加载）
if [ -f "${COZE_WORKSPACE_PATH}/.env.production" ]; then
  set -a
  . "${COZE_WORKSPACE_PATH}/.env.production"
  set +a
fi

# ============================================
# COZE_ 前缀变量映射
# 扣子平台自动给环境变量添加 COZE_ 前缀，
# 以下代码将 COZE_XXX 映射为 XXX（在代码中直接读取）
# ============================================
echo "Mapping COZE_ prefixed environment variables..."
COZE_PREFIXED_VARS=$(env | grep '^COZE_' | cut -d= -f1)
for COZE_VAR in $COZE_PREFIXED_VARS; do
  ORIG_VAR="${COZE_VAR#COZE_}"
  # 如果原始变量名尚未设置，则映射
  if [ -z "${!ORIG_VAR:-}" ]; then
    export "$ORIG_VAR=${!COZE_VAR}"
    echo "  Mapped: $COZE_VAR → $ORIG_VAR"
  fi
done
echo "COZE_ mapping complete."

PORT=3000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"


start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
    PORT=${DEPLOY_RUN_PORT} node dist/server.js
}

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service