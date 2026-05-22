#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

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
pnpm next build

echo "Bundling server with tsup..."
pnpm tsup src/server.mts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

# 构建完成后移除 drizzle-kit，防止扣子平台自动执行 schema 同步
# 放在 build 之后不影响构建产物完整性
echo "Removing drizzle-kit to prevent automatic schema sync..."
pnpm remove drizzle-kit 2>/dev/null || true

echo "Build completed successfully!"
