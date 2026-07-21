#!/bin/bash
set -e

# 镜像构建期写入的公开发布清单也必须用于运行期响应头，避免动态文档的
# X-BBWV-Deployment-Id 与客户端内联的静态资源版本不一致。
if [ -f "./static-release.env" ]; then
  # shellcheck source=/dev/null
  . "./static-release.env"
fi

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

# ============================================
# 端口配置
# - APP_PORT: 主应用端口（处理所有用户请求）
# - PROBE_PORT: 健康检查端口（CloudBase 默认探测 3000）
# - 当两者一致时，只需一个服务器
# - 当不同时，server.mts 会自动启动健康检查服务器
# ============================================
APP_PORT="${PORT:-${APP_PORT:-3000}}"
PROBE_PORT="${PROBE_PORT:-3000}"
HOSTNAME=0.0.0.0

echo "Starting HTTP service on port ${APP_PORT} for deploy..."
echo "Health probe on port ${PROBE_PORT} (managed by server.mts)"

# 启动主服务（server.mts 内部已集成健康检查处理）
cd "${COZE_WORKSPACE_PATH}"
APP_PORT="${APP_PORT}" PROBE_PORT="${PROBE_PORT}" node dist/server.js
