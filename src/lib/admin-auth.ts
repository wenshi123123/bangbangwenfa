'use server';

import { NextRequest, NextResponse } from 'next/server';

/**
 * 管理员权限验证函数
 * @param req NextRequest 请求对象
 * @returns 验证结果对象
 */
export async function verifyAdminAuth(req: NextRequest) {
  // 检查 cookie 中的 admin_session
  const adminSession = req.cookies.get('admin_session')?.value;

  if (!adminSession) {
    return { 
      success: false, 
      error: '请先登录管理员账号',
      status: 401 
    };
  }

  // 简单校验 session（生产环境建议换成 JWT）
  if (adminSession.length < 20) {
    return { 
      success: false, 
      error: '无效的管理员凭证',
      status: 401 
    };
  }

  return { success: true };
}

/**
 * 管理员登录路径（不需要验证）
 */
export const ADMIN_PUBLIC_PATHS = [
  '/api/admin/login',
];

/**
 * 检查路径是否需要管理员权限
 */
export function isAdminPublicPath(path: string): boolean {
  return ADMIN_PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'));
}

/**
 * 检查路径是否为管理员 API
 */
export function isAdminApiPath(path: string): boolean {
  return path.startsWith('/api/admin/');
}
