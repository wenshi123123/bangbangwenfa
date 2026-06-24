import { NextResponse } from 'next/server';

/**
 * 增强健康检查端点
 * GET /api/health
 * 
 * 用于：
 * - 负载均衡器探活（返回200即健康）
 * - 监控系统采集指标
 * - 部署后自检
 */
export async function GET() {
  const checks: Record<string, { status: string; detail?: string }> = {};

  // 1. JWT 密钥检查
  const jwtSecret = process.env.JWT_SECRET;
  checks.jwt = jwtSecret
    ? { status: 'ok', detail: `length=${jwtSecret.length}chars` }
    : { status: 'error', detail: 'JWT_SECRET 未设置' };

  // 2. Supabase 配置检查
  checks.supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? { status: 'ok' }
    : { status: 'error', detail: 'NEXT_PUBLIC_SUPABASE_URL 未设置' };

  // 3. 微信支付配置检查
  checks.wechat_pay = process.env.WEIXIN_APPID && process.env.WEIXIN_MCHID
    ? { status: 'ok' }
    : { status: 'warning', detail: '微信支付配置不完整' };

  // 4. 短信配置检查
  checks.sms = process.env.TENCENT_SECRET_ID
    ? { status: 'ok' }
    : { status: 'warning', detail: '短信服务未配置' };

  // 5. 微信公众号 OAuth 配置检查
  checks.wechat_oa = process.env.WEIXIN_OA_APPID && process.env.WEIXIN_OA_APPSECRET
    ? { status: 'ok' }
    : { status: 'warning', detail: '微信公众号 OAuth 未配置，微信内 JSAPI 可能无法获取 openid' };

  // 6. Sentry 监控检查
  checks.sentry = process.env.NEXT_PUBLIC_SENTRY_DSN
    ? { status: 'ok' }
    : { status: 'info', detail: 'Sentry 未启用（缺少 DSN）' };

  // 7. 加密模块检查
  try {
    const { encrypt, decrypt } = await import('@/lib/crypto/encryption');
    const testVal = 'health-check-test';
    const encrypted = encrypt(testVal);
    const decrypted = decrypt(encrypted);
    checks.encryption = decrypted === testVal
      ? { status: 'ok' }
      : { status: 'error', detail: '加密/解密不一致' };
  } catch (e) {
    checks.encryption = { status: 'error', detail: String(e) };
  }

  // 汇总状态
  const hasError = Object.values(checks).some(c => c.status === 'error');
  const overallStatus = hasError ? 'degraded' : 'ok';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    env: process.env.NODE_ENV || 'unknown',
    version: process.env.npm_package_version || '0.1.0',
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    checks,
  }, {
    status: hasError ? 503 : 200,
  });
}
