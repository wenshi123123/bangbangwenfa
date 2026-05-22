/**
 * 简单的内存限流器
 * 用于防止 API 滥用
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 存储每个 IP/标识符的请求记录
const rateLimitStore = new Map<string, RateLimitEntry>();

// Map 最大容量，防止内存溢出
const MAX_STORE_SIZE = 10000;

// 清理过期记录（每分钟执行一次）
let lastCleanup = Date.now();
const cleanup = () => {
  const now = Date.now();
  if (now - lastCleanup > 60000) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
    lastCleanup = now;
  }
};

/**
 * 限流检查
 * @param identifier IP 地址或用户标识
 * @param limit 限制次数
 * @param windowMs 时间窗口（毫秒）
 * @returns 是否允许请求
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  cleanup();

  const now = Date.now();
  let entry = rateLimitStore.get(identifier);

  // 如果没有记录或已过期，创建新记录
  if (!entry || now > entry.resetTime) {
    // 容量保护：超过上限时清理最旧的条目
    if (rateLimitStore.size >= MAX_STORE_SIZE) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, e] of rateLimitStore.entries()) {
        if (e.resetTime < oldestTime) {
          oldestTime = e.resetTime;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        rateLimitStore.delete(oldestKey);
      }
    }
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);
  }

  // 增加计数
  entry.count++;

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * 获取客户端 IP 地址
 */
export function getClientIP(request: Request): string {
  // 尝试从各种头部获取真实 IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // 默认值
  return '127.0.0.1';
}

/**
 * 创建限流响应头
 */
export function createRateLimitHeaders(result: { remaining: number; resetTime: number }) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
}
