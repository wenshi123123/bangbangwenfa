import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyAdminJWT } from '@/lib/auth/admin-token';

/**
 * 管理员认证结果
 */
export interface AdminAuthResult {
  success: boolean;
  adminId?: number;
  username?: string;
  nickname?: string;
  permissions?: string[];
  error?: string;
}

/**
 * 验证管理员 Token 并返回管理员信息
 * 
 * 使用方式：
 * const auth = await requireAdminAuth(request);
 * if (!auth.success) {
 *   return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
 * }
 * // 使用 auth.adminId, auth.permissions 等
 */
export async function requireAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  // 1. 从 Authorization header 获取 token
  const authHeader = request.headers.get('Authorization');
  
  let token: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  
  // 2. 如果 header 没有，尝试从 cookie 获取
  if (!token) {
    const cookieToken = request.cookies.get('admin_token')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }
  
  if (!token) {
    return { success: false, error: '请先登录管理员账号' };
  }
  
  // 3. 验证 token（JWT 签名验证，兼容旧 Base64 格式）
  const decoded = verifyAdminJWT(token);
  
  if (!decoded) {
    return { success: false, error: 'Token 无效或已过期' };
  }
  
  // 4. 验证管理员 ID 存在
  if (!decoded.adminId) {
    return { success: false, error: 'Token 中缺少管理员信息' };
  }
  
  // 6. 从数据库验证管理员是否存在且状态正常
  const supabase = getSupabaseAdmin();
  
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, username, nickname, permissions, status')
    .eq('id', decoded.adminId)
    .single();
  
  if (error || !admin) {
    return { success: false, error: '管理员账号不存在' };
  }
  
  if (admin.status !== 'active') {
    return { success: false, error: '管理员账号已被禁用' };
  }
  
  return {
    success: true,
    adminId: admin.id,
    username: admin.username,
    nickname: admin.nickname,
    permissions: admin.permissions || [],
  };
}

/**
 * 创建未认证的响应
 */
export function adminUnauthorizedResponse(message: string = '请先登录管理员账号') {
  return NextResponse.json(
    { success: false, error: message, code: 'ADMIN_UNAUTHORIZED' },
    { status: 401 }
  );
}

/**
 * 检查管理员是否有指定权限
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  if (!permissions || permissions.length === 0) {
    return false;
  }
  
  // 如果有 'all' 权限，则拥有所有权限
  if (permissions.includes('all')) {
    return true;
  }
  
  return permissions.includes(permission);
}

/**
 * 要求管理员具有指定权限
 * 
 * 使用方式：
 * const auth = await requireAdminAuth(request);
 * if (!auth.success) return unauthorized;
 * if (!requirePermission(auth.permissions, 'order_manage')) return forbidden;
 */
export function requirePermission(permissions: string[], permission: string): boolean {
  return hasPermission(permissions, permission);
}

/**
 * 创建权限不足的响应
 */
export function forbiddenResponse(message: string = '权限不足') {
  return NextResponse.json(
    { success: false, error: message, code: 'FORBIDDEN' },
    { status: 403 }
  );
}

/**
 * 管理员认证信息（用于 withAdminAuth 包装器）
 */
export interface AdminAuthInfo {
  adminId: number;
  username: string;
  nickname: string;
  permissions: string[];
}

/**
 * 包装 API Handler，自动处理管理员认证
 * 
 * 使用方式：
 * export const GET = withAdminAuth(async (request, admin) => {
 *   // admin.adminId, admin.permissions 等已可用
 *   return NextResponse.json({ success: true });
 * });
 */
export function withAdminAuth(
  handler: (request: NextRequest, admin: AdminAuthInfo) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const auth = await requireAdminAuth(request);
    
    if (!auth.success) {
      return adminUnauthorizedResponse(auth.error);
    }
    
    return handler(request, {
      adminId: auth.adminId!,
      username: auth.username!,
      nickname: auth.nickname!,
      permissions: auth.permissions!,
    });
  };
}
