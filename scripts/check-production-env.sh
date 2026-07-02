#!/bin/bash
set -euo pipefail

ROOT_DIR="${1:-$(pwd)}"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env.production}"

load_env_file() {
  local file="$1"
  while IFS= read -r line || [ -n "${line}" ]; do
    line="${line%$'\r'}"
    if [ -z "${line}" ]; then
      continue
    fi
    case "${line}" in
      \#*)
        continue
        ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"

    if [ -z "${key}" ] || [ "${key}" = "${line}" ]; then
      continue
    fi

    export "${key}=${value}"
  done < "${file}"
}

if [ -f "${ENV_FILE}" ]; then
  load_env_file "${ENV_FILE}"
fi

get_env_value() {
  local key="$1"
  local coze_key="COZE_${key}"
  local value="${!key:-}"
  if [ -n "${value}" ]; then
    printf '%s' "${value}"
    return 0
  fi
  local part_value=""
  local part_index=1
  while [ "${part_index}" -le 9 ]; do
    local part_key="${key}_PART${part_index}"
    local part="${!part_key:-}"
    if [ -n "${part}" ]; then
      part_value="${part_value}${part}"
    fi
    part_index=$((part_index + 1))
  done
  if [ -n "${part_value}" ]; then
    printf '%s' "${part_value}"
    return 0
  fi
  printf '%s' "${!coze_key:-}"
}

print_source_hint() {
  local key="$1"
  case "${key}" in
    NEXT_PUBLIC_SUPABASE_URL)
      echo "   ↳ 来源: Supabase 控制台 -> Settings -> API -> Project URL"
      ;;
    NEXT_PUBLIC_SUPABASE_ANON_KEY)
      echo "   ↳ 来源: Supabase 控制台 -> Settings -> API -> Project API keys -> anon public"
      ;;
    SUPABASE_SERVICE_ROLE_KEY)
      echo "   ↳ 来源: Supabase 控制台 -> Settings -> API -> Project API keys -> service_role"
      ;;
    JWT_SECRET)
      echo "   ↳ 生成: openssl rand -hex 64"
      ;;
    INTERNAL_SERVICE_KEY)
      echo "   ↳ 生成: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
      ;;
    WEIXIN_APPID|WEIXIN_MCHID|WEIXIN_SERIAL_NO|WEIXIN_APIV3_KEY)
      echo "   ↳ 来源: 微信支付商户平台"
      ;;
    WEIXIN_PRIVATE_KEY)
      echo "   ↳ 来源: 商户 API 证书私钥 PEM 文件"
      ;;
    WEIXIN_PLATFORM_CERT)
      echo "   ↳ 来源: 微信支付平台证书 PEM 文件"
      ;;
    WEIXIN_CALLBACK_URL)
      echo "   ↳ 填写: 正式域名 + /api/pay/callback"
      ;;
    NEXT_PUBLIC_SITE_URL)
      echo "   ↳ 填写: 正式 HTTPS 站点域名，例如 https://bangbangwenfa.com"
      ;;
    NEXT_PUBLIC_SENTRY_DSN)
      echo "   ↳ 来源: Sentry -> Settings -> Client Keys (DSN)"
      ;;
    TENCENT_SECRET_ID|TENCENT_SECRET_KEY)
      echo "   ↳ 来源: 腾讯云 CAM -> API 密钥管理"
      ;;
    TENCENT_SMS_APP_ID|TENCENT_SMS_SIGN_NAME|TENCENT_SMS_TEMPLATE_ID)
      echo "   ↳ 来源: 腾讯云短信控制台"
      ;;
    WEIXIN_OA_APPID|WEIXIN_OA_APPSECRET|WEIXIN_OA_TEMPLATE_ID)
      echo "   ↳ 来源: 微信公众平台"
      ;;
  esac
}

require_non_empty() {
  local key="$1"
  local value
  value="$(get_env_value "${key}")"
  if [ -z "${value}" ]; then
    echo "❌ 缺少必填变量: ${key}"
    print_source_hint "${key}"
    return 1
  fi
  return 0
}

looks_like_placeholder() {
  local value="$1"
  case "${value}" in
    your_*|Your*|generate_with_*|https://your-*|https://example*|examplePublicKey*|YOUR_*)
      return 0
      ;;
  esac
  return 1
}

check_url_prefix() {
  local key="$1"
  local value
  value="$(get_env_value "${key}")"
  if [ -z "${value}" ]; then
    return 2
  fi
  if [[ ! "${value}" =~ ^https:// ]]; then
    echo "❌ ${key} 必须是 https:// 开头的正式地址"
    return 1
  fi
  return 0
}

check_pem_material() {
  local key="$1"
  local type="$2"
  local value normalized

  value="$(get_env_value "${key}")"
  if [ -z "${value}" ]; then
    return 2
  fi

  if [[ "${value}" == *"BEGIN ${type}"* && "${value}" == *"END ${type}"* ]]; then
    echo "✓ ${key} 格式看起来正确"
    return 0
  fi

  normalized="$(printf '%s' "${value}" | tr -d '\r\n[:space:]')"
  if [[ "${normalized}" =~ ^[A-Za-z0-9+/=]+$ ]] && [ "${#normalized}" -ge 200 ]; then
    echo "✓ ${key} 为可归一化的原始 base64 内容"
    return 0
  fi

  echo "❌ ${key} 缺少 ${type} 头，且不是可归一化的 base64 内容"
  return 1
}

echo "=== 生产环境变量检查 ==="
echo "检查来源: ${ENV_FILE}"
echo ""

required_vars=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  JWT_SECRET
  WEIXIN_APPID
  WEIXIN_MCHID
  WEIXIN_SERIAL_NO
  WEIXIN_APIV3_KEY
  WEIXIN_PRIVATE_KEY
  WEIXIN_PLATFORM_CERT
  WEIXIN_CALLBACK_URL
  NEXT_PUBLIC_SITE_URL
  INTERNAL_SERVICE_KEY
  NODE_ENV
  DEPLOY_ENV
)

warning_vars=(
  NEXT_PUBLIC_SENTRY_DSN
  TENCENT_SECRET_ID
  TENCENT_SECRET_KEY
  TENCENT_SMS_APP_ID
  TENCENT_SMS_SIGN_NAME
  TENCENT_SMS_TEMPLATE_ID
)

dangerous_prod_flags=(
  PAY_DEBUG_TOKEN
  DIAGNOSTIC_API_TOKEN
  ENABLE_DEV_SMS_FALLBACK
  FORCE_SMS_MOCK
)

failures=0

echo "[1/5] 检查必填变量..."
for key in "${required_vars[@]}"; do
  if ! require_non_empty "${key}"; then
    failures=$((failures + 1))
    continue
  fi

  value="$(get_env_value "${key}")"
  if looks_like_placeholder "${value}"; then
    echo "❌ ${key} 仍像占位符，请替换为真实生产值"
    print_source_hint "${key}"
    failures=$((failures + 1))
  else
    echo "✓ ${key}"
  fi
done
echo ""

echo "[2/5] 检查关键格式..."
jwt_secret_value="$(get_env_value JWT_SECRET)"
if [ "${#jwt_secret_value}" -lt 128 ]; then
  echo "❌ JWT_SECRET 长度不足 128 字符"
  failures=$((failures + 1))
else
  echo "✓ JWT_SECRET 长度符合建议"
fi

if [ "$(get_env_value NODE_ENV)" != "production" ]; then
  echo "❌ NODE_ENV 必须为 production"
  failures=$((failures + 1))
else
  echo "✓ NODE_ENV=production"
fi

if [ "$(get_env_value DEPLOY_ENV)" != "PROD" ]; then
  echo "❌ DEPLOY_ENV 必须为 PROD"
  failures=$((failures + 1))
else
  echo "✓ DEPLOY_ENV=PROD"
fi

site_url_status=0
check_url_prefix "NEXT_PUBLIC_SITE_URL" || site_url_status=$?
if [ "${site_url_status}" -eq 1 ]; then
  failures=$((failures + 1))
elif [ "${site_url_status}" -eq 2 ]; then
  echo "ℹ NEXT_PUBLIC_SITE_URL 缺失，已在必填变量阶段标记"
else
  echo "✓ NEXT_PUBLIC_SITE_URL 为 HTTPS"
fi

callback_url_status=0
check_url_prefix "WEIXIN_CALLBACK_URL" || callback_url_status=$?
if [ "${callback_url_status}" -eq 1 ]; then
  failures=$((failures + 1))
elif [ "${callback_url_status}" -eq 2 ]; then
  echo "ℹ WEIXIN_CALLBACK_URL 缺失，已在必填变量阶段标记"
else
  echo "✓ WEIXIN_CALLBACK_URL 为 HTTPS"
fi

callback_url="$(get_env_value WEIXIN_CALLBACK_URL)"
if [ -z "${callback_url}" ]; then
  echo "ℹ WEIXIN_CALLBACK_URL 缺失，已在必填变量阶段标记"
elif [[ ! "${callback_url}" =~ /api/pay/callback$ ]]; then
  echo "❌ WEIXIN_CALLBACK_URL 应以 /api/pay/callback 结尾"
  failures=$((failures + 1))
else
  echo "✓ WEIXIN_CALLBACK_URL 指向用户支付回调"
fi
echo ""

echo "[3/5] 检查 PEM 与密钥内容..."
private_key="$(get_env_value WEIXIN_PRIVATE_KEY)"
platform_cert="$(get_env_value WEIXIN_PLATFORM_CERT)"

if ! check_pem_material "WEIXIN_PRIVATE_KEY" "PRIVATE KEY"; then
  failures=$((failures + 1))
fi

if ! check_pem_material "WEIXIN_PLATFORM_CERT" "CERTIFICATE"; then
  failures=$((failures + 1))
fi
echo ""

echo "[4/5] 检查建议变量..."
for key in "${warning_vars[@]}"; do
  value="$(get_env_value "${key}")"
  if [ -z "${value}" ]; then
    echo "⚠ 建议补充变量: ${key}"
    print_source_hint "${key}"
  else
    echo "✓ ${key}"
  fi
done
echo ""

echo "[5/5] 检查生产不应默认开启的调试项..."
for key in "${dangerous_prod_flags[@]}"; do
  value="$(get_env_value "${key}")"
  if [ -n "${value}" ]; then
    echo "⚠ ${key} 当前已配置，生产默认建议关闭"
  else
    echo "✓ ${key} 未开启"
  fi
done
echo ""

if [ "${failures}" -gt 0 ]; then
  echo "结果: 发现 ${failures} 项阻塞问题，暂不建议正式部署。"
  echo "更多填写说明: docs/env-production-fill-guide.md"
  exit 1
fi

echo "结果: 必填生产环境变量检查通过。可以继续执行部署前构建与真实业务验收。"
