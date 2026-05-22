import crypto from 'crypto';

// JWT_SECRET 配置：延迟检查，只在真正使用时才验证
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('必须设置 JWT_SECRET 环境变量');
  }
  // 密钥至少 128 字符（hex 编码的 64 字节随机数据）
  if (secret.length < 128) {
    console.warn('警告: JWT_SECRET 长度不足 128 字符，建议使用 openssl rand -hex 64 或 crypto.randomBytes(64) 生成高熵密钥');
  }
  return secret;
}

// Token 有效期：7 天（生产环境）
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

// 🔒 旧 Token 的有效期统一为 7 天（与新 Token 一致，降低泄露风险窗口）
const LEGACY_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/**
 * Base64URL 编码（JWT 标准）
 */
function base64UrlEncode(data: string): string {
  return Buffer.from(data, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64URL 解码
 */
function base64UrlDecode(str: string): string {
  // 补回 padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * 生成 Token（JWS 格式，兼容标准 JWT）
 * Header: { alg: "HS256", typ: "JWT" }
 * Payload: { id, phone, userType, [guardianId], [lawyerId], iat, exp }
 * 
 * - id: 始终为 users 表主键（统一用户标识）
 * - guardianId: 守护者专属，为 guardian_users 表主键
 * - lawyerId: 律师专属，为 lawyer_applications 表主键（或 lawyers 表）
 */
export function generateToken(payload: {
  id?: number;
  phone: string;
  username?: string;
  userType: 'user' | 'guardian' | 'lawyer';
  guardianId?: number;  // 守护者记录 ID（guardian_users.id）
  lawyerId?: number;     // 律师记录 ID（lawyer_applications.id）
}): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
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
 * 验证 Token（JWS/JWT 格式）
 * 同时兼容旧的 base64.payload.signature 格式
 */
export function verifyToken(token: string): {
  valid: boolean;
  payload?: {
    id?: number;
    phone: string;
    username?: string;
    userType: 'user' | 'guardian' | 'lawyer';
    guardianId?: number;  // 守护者记录 ID
    lawyerId?: number;     // 律师记录 ID
    iat?: number;
    exp?: number;
  };
  error?: string;
} {
  try {
    const parts = token.split('.');

    // 兼容两种格式
    if (parts.length === 3) {
      // 新格式：JWS/JWT (header.payload.signature)
      return verifyJWSToken(parts[0], parts[1], parts[2]);
    } else if (parts.length === 2) {
      // 旧格式兼容：base64payload.signature
      return verifyLegacyToken(parts[0], parts[1]);
    }

    return { valid: false, error: 'Token 格式错误' };
  } catch {
    return { valid: false, error: 'Token 无效' };
  }
}

/**
 * 验证 JWS 格式 Token
 */
function verifyJWSToken(
  encodedHeader: string,
  encodedPayload: string,
  encodedSignature: string
): { valid: boolean; payload?: any; error?: string } {
  try {
    // 验证 header
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    if (header.alg !== 'HS256') {
      return { valid: false, error: '不支持的算法' };
    }

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
      return { valid: false, error: 'Token 签名无效' };
    }

    // 解析 payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // 检查过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token 已过期' };
    }

    return {
      valid: true,
      payload: {
        id: payload.id,
        phone: payload.phone,
        username: payload.username,
        userType: payload.userType,
        guardianId: payload.guardianId,
        lawyerId: payload.lawyerId,
        iat: payload.iat,
        exp: payload.exp,
      },
    };
  } catch {
    return { valid: false, error: 'Token 解析失败' };
  }
}

/**
 * 兼容旧格式 Token 验证
 * 旧格式：base64(payload).hmacSignature
 */
function verifyLegacyToken(
  encodedPayload: string,
  signature: string
): { valid: boolean; payload?: any; error?: string } {
  try {
    let payloadStr: string;
    try {
      payloadStr = Buffer.from(encodedPayload, 'base64').toString();
    } catch {
      return { valid: false, error: 'Token 解码失败' };
    }

    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(payloadStr)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Token 签名无效' };
    }

    const payload = JSON.parse(payloadStr);

    // 旧 Token 30 天过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token 已过期' };
    }

    return {
      valid: true,
      payload: {
        id: payload.id,
        phone: payload.phone,
        username: payload.username,
        userType: payload.userType,
        guardianId: payload.guardianId,
        lawyerId: payload.lawyerId,
        iat: payload.iat,
        exp: payload.exp,
      },
    };
  } catch {
    return { valid: false, error: 'Token 无效' };
  }
}

/**
 * 从请求头获取用户信息
 */
export function getUserFromRequest(request: Request): {
  id?: number;
  phone: string;
  userType: 'user' | 'guardian' | 'lawyer';
  guardianId?: number;
  lawyerId?: number;
} | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const result = verifyToken(token);
  
  if (!result.valid || !result.payload) {
    return null;
  }

  return {
    id: result.payload.id,
    phone: result.payload.phone,
    userType: result.payload.userType,
    guardianId: result.payload.guardianId,
    lawyerId: result.payload.lawyerId,
  };
}
