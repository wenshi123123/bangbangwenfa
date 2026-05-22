/**
 * 敏感 API 限流中间件
 * 为支付、提现等敏感操作添加限流保护
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, createRateLimitHeaders } from '@/lib/rate-limit';

/**
 * 限流配置
 */
const RATE_LIMITS = {
  // 支付相关：每分钟最多 10 次
  '/api/consult/pay': { limit: 10, windowMs: 60000 },
  '/api/lawyer/pay/create': { limit: 10, windowMs: 60000 },
  '/api/lawyer/renew': { limit: 10, windowMs: 60000 },

  // 提现相关：每分钟最多 5 次
  '/api/guardian/withdraw': { limit: 5, windowMs: 60000 },

  // 登录相关：每分钟最多 20 次
  '/api/auth/login': { limit: 20, windowMs: 60000 },

  // 默认：每分钟最多 100 次
  default: { limit: 100, windowMs: 60000 },
};

/**
 * 检查路径是否匹配限流规则
 */
function getRateLimitConfig(pathname: string): { limit: number; windowMs: number } {
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config;
    }
  }
  return RATE_LIMITS.default;
}

/**
 * 限流中间件函数
 * 用于包装 API route handler
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options?: { pathOverride?: string }
) {
  return async (request: NextRequest, ...args: any[]) => {
    const pathname = options?.pathOverride || new URL(request.url).pathname;
    const config = getRateLimitConfig(pathname);
    const clientIP = getClientIP(request);

    // 构建限流标识符（IP + 路径）
    const identifier = `${clientIP}:${pathname}`;

    const result = checkRateLimit(identifier, config.limit, config.windowMs);

    // 如果被限流，返回 429
    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            ...createRateLimitHeaders(result),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 执行实际的处理逻辑
    const response = await handler(request, ...args);

    // 在响应中添加限流头
    if (response.headers) {
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    }

    return response;
  };
}
