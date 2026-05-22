import crypto from 'crypto';

/**
 * 管理员 JWT Token 模块
 * 
 * 使用 HS256 签名（复用 JWT_SECRET），替代原先的 Base64 明文编码。
 * 旧 Token 在过渡期内仍可被 admin-middleware.ts 兼容解析，
 * 但新登录的管理员将获得 JWT 签名的 Token。
 */

// JWT_SECRET 配置：延迟检查，只在真正使用时才验证
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('必须设置 JWT_SECRET 环境变量');
  }
  return secret;
}

const ADMIN_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7天

function base64UrlEncode(data: string): string {
  return Buffer.from(data, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * 生成管理员 JWT Token
 */
export function generateAdminToken(adminId: number, username: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    adminId,
    username,
    userType: 'admin',
    iat: now,
    exp: now + ADMIN_TOKEN_EXPIRY_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signingInput}.${signature}`;
}

/**
 * 验证管理员 JWT Token
 * 返回 null 表示无效或过期
 */
export function verifyAdminJWT(token: string): { adminId: number; username: string } | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      // 拒绝旧 Base64 格式，必须使用 JWT
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // 验证 header
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    if (header.alg !== 'HS256') return null;

    // 验证签名
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(signingInput)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    if (!crypto.timingSafeEqual(
      Buffer.from(encodedSignature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )) {
      return null;
    }

    // 解析 payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // 必须是管理员类型
    if (payload.userType !== 'admin') return null;

    // 检查过期时间（exp 是秒级时间戳）
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { adminId: payload.adminId, username: payload.username };
  } catch {
    return null;
  }
}
