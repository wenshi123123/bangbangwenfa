#!/bin/bash
set -e

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./pnpm-cmd.sh
. "${SCRIPT_DIR}/pnpm-cmd.sh"

cd "${COZE_WORKSPACE_PATH}"

BUILD_CACHE_BUST_VALUE="$(git rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)"
echo "Preparing build cache-bust token: ${BUILD_CACHE_BUST_VALUE}"
export BUILD_CACHE_BUST_VALUE
export NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE="${BUILD_CACHE_BUST_VALUE}"

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [ -z "${NODE_BIN}" ] && [ -x "/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]; then
  NODE_BIN="/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ -z "${NODE_BIN}" ]; then
  echo "Unable to locate a usable Node.js binary."
  exit 1
fi

RESOLVE_PKG_DIR='const path = require("path"); const pkg = process.argv[1]; try { console.log(path.dirname(require.resolve(`${pkg}/package.json`))); } catch (err) { process.exit(1); }'
NEXT_PKG_DIR="$("${NODE_BIN}" -e "${RESOLVE_PKG_DIR}" next)"
TSUP_PKG_DIR="$("${NODE_BIN}" -e "${RESOLVE_PKG_DIR}" tsup)"

NEXT_BIN="${NEXT_BIN:-${NEXT_PKG_DIR}/dist/bin/next}"
TSUP_BIN="${TSUP_BIN:-${TSUP_PKG_DIR}/dist/cli-default.js}"

# ============================================
# COZE_ 前缀变量映射（与 start.sh 保持同步）
# 扣子平台自动给环境变量添加 COZE_ 前缀，
# 以下代码将 COZE_XXX 映射为 XXX（在代码中直接读取）
# 此映射必须在 pnpm next build 前执行，确保
# NEXT_PUBLIC_* 变量能被正确内联到客户端 JS 包。
# ============================================
echo "Mapping COZE_ prefixed environment variables..."
COZE_PREFIXED_VARS=$(env | grep '^COZE_' | cut -d= -f1)
for COZE_VAR in $COZE_PREFIXED_VARS; do
  ORIG_VAR="${COZE_VAR#COZE_}"
  if [ -z "${!ORIG_VAR:-}" ]; then
    export "$ORIG_VAR=${!COZE_VAR}"
    echo "  Mapped: $COZE_VAR → $ORIG_VAR"
  fi
done
echo "COZE_ mapping complete."

echo "Installing dependencies..."
pnpm_cmd install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

# 构建完成后再移除 drizzle-kit，避免影响依赖锁定文件
# 注意：此步骤在 build 之后执行

# ============================================
# 生产环境关键配置检查
# ============================================
if [ "${DEPLOY_ENV:-}" = "PROD" ] || [ "${NODE_ENV:-}" = "production" ]; then
  echo "=== 生产环境配置检查 ==="
  
  MISSING_VARS=()
  
  # 必需的环境变量
  REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "WEIXIN_APPID"
    "WEIXIN_MCHID"
    "WEIXIN_SERIAL_NO"
    "WEIXIN_APIV3_KEY"
    "JWT_SECRET"
  )
  
  for var in "${REQUIRED_VARS[@]}"; do
    # 检查 COZE_ 前缀或原始变量名
    COZE_VAR="COZE_${var}"
    if [ -z "${!var:-}" ] && [ -z "${!COZE_VAR:-}" ]; then
      MISSING_VARS+=("$var")
    fi
  done
  
  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ 错误: 以下必需的环境变量未配置:"
    for v in "${MISSING_VARS[@]}"; do
      echo "  - $v"
    done
    echo ""
    echo "请复制 .env.production.example 为 .env.production 并填入真实值"
    exit 1
  fi
  
  # 检查 JWT_SECRET 长度
  JWT_SECRET_VAL="${JWT_SECRET:-}"
  if [ ${#JWT_SECRET_VAL} -lt 128 ]; then
    echo "⚠ 警告: JWT_SECRET 长度不足 128 字符 (当前: ${#JWT_SECRET_VAL})，建议使用 openssl rand -hex 64 生成高熵密钥"
  fi
  
  # 检查微信支付私钥
  if [ -z "${WEIXIN_PRIVATE_KEY:-}" ]; then
    if [ ! -f "./assets/apiclient_key.pem" ]; then
      echo "⚠ 警告: 未配置 WEIXIN_PRIVATE_KEY 且 assets/apiclient_key.pem 不存在，微信支付将无法使用"
    fi
  fi
  
  echo "✅ 生产环境配置检查通过"
fi

echo "Building the Next.js project..."
"${NODE_BIN}" "${NEXT_BIN}" build --webpack

echo "Bundling server with tsup..."
"${NODE_BIN}" "${TSUP_BIN}" src/server.mts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

# 构建完成后移除 drizzle-kit，防止扣子平台自动执行 schema 同步
# 放在 build 之后不影响构建产物完整性
echo "Removing drizzle-kit to prevent automatic schema sync..."
if grep -q '"drizzle-kit"' package.json; then
  pnpm_cmd remove drizzle-kit 2>/dev/null || true
fi

echo "Build completed successfully!"
