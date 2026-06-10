import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './token';
import { verifyAdminJWT } from './admin-token';

/**
 * 认证结果类型
 */
export interface AuthResult {
  success: boolean;
  userId?: number;
  guardianId?: number;       // 守护者 ID（当 userType 为 guardian 时）
  lawyerId?: string | number; // 律师 ID（当 userType 为 lawyer 时，UUID 或整数）
  phone?: string;
  userType?: 'user' | 'guardian' | 'lawyer';
  status?: string;           // P0-2/P0-3: 律师账号状态（active|pending_review|banned）
  error?: string;
  user?: {
    id: number;
    phone?: string;
    userType?: 'user' | 'guardian' | 'lawyer';
  };
}

/**
 * 从请求中验证用户 Token
 * 
 * 使用方式：
 * 1. 从 Authorization header 获取 token
 * 2. 验证 token 有效性
 * 3. 返回用户信息或错误
 */
export function authenticateRequest(request: NextRequest): AuthResult {
  // 1. 尝试从 Authorization header 获取 token
  const authHeader = request.headers.get('Authorization');
  
  let token: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  
  // 2. 如果 header 没有，尝试从 cookie 获取
  if (!token) {
    const cookieToken = request.cookies.get('token')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }
  
  // 3. 如果还是没有，尝试从 URL 参数获取（兼容旧逻辑，但不推荐）
  if (!token) {
    const urlToken = request.nextUrl.searchParams.get('token');
    if (urlToken) {
      token = urlToken;
    }
  }
  
  if (!token) {
    return {
      success: false,
      error: '未登录或登录已过期',
    };
  }
  
  // 验证 token
  const result = verifyToken(token);
  
  if (!result.valid) {
    return {
      success: false,
      error: result.error || 'Token 无效',
    };
  }
  
  if (!result.payload?.id) {
    return {
      success: false,
      error: 'Token 中缺少用户信息',
    };
  }
  
  const payload = result.payload;
  const userType = payload.userType;
  
  // id 始终为 users 表主键（统一用户标识）
  // guardianId/lawyerId 从 token 独立字段提取（向后兼容旧 token）
  return {
    success: true,
    userId: payload.id,                                      // users 表 ID（始终有效）
    guardianId: payload.guardianId,                          // guardian_users 表 ID
    lawyerId: payload.lawyerId,                              // lawyer_applications/lawyers 表 ID
    phone: payload.phone,
    userType: userType,
    status: payload.status,                                  // P0-2/P0-3: 律师账号状态
    user: {
      id: payload.id as number,
      phone: payload.phone,
      userType: userType,
    },
  };
}

/**
 * 创建未认证的响应
 */
export function unauthorizedResponse(message: string = '未登录或登录已过期') {
  return NextResponse.json(
    { success: false, error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

/**
 * 异步验证用户 Token（推荐使用）
 * 
 * 使用方式：
 * const auth = await requireAuth(request);
 * if (!auth.success) {
 *   return unauthorizedResponse(auth.error);
 * }
 * // 使用 auth.userId, auth.userType 等
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  return authenticateRequest(request);
}

/**
 * 从请求中获取用户信息（不强制验证）
 * 
 * 使用方式：
 * const user = getUserFromRequest(request);
 * if (!user) {
 *   // 用户未登录，但可能允许匿名访问
 * }
 */
export function getUserFromRequest(request: NextRequest): AuthResult | null {
  const result = authenticateRequest(request);
  return result.success ? result : null;
}

/**
 * 检查是否是管理员 Token
 */
export function verifyAdminToken(request: NextRequest): { success: boolean; adminId?: number; username?: string; error?: string } {
  const authHeader = request.headers.get('Authorization');
  
  let token: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  
  if (!token) {
    const cookieToken = request.cookies.get('admin_token')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }
  
  if (!token) {
    return { success: false, error: '未登录' };
  }
  
  // 使用 JWT 签名验证（兼容旧 Base64 格式）
  const decoded = verifyAdminJWT(token);
  
  if (!decoded) {
    return { success: false, error: 'Token 无效或已过期' };
  }
  
  return {
    success: true,
    adminId: decoded.adminId,
    username: decoded.username,
  };
}
