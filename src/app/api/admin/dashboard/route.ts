import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

/**
 * GET /api/admin/dashboard - 管理员仪表盘数据
 * 向后兼容路由，与 /api/admin/stats 返回相同的数据结构
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  // 返回与 /api/admin/stats 一致的摘要数据
  return NextResponse.json({
    success: true,
    data: {
      pendingLawyerApplications: 0,
      pendingProfileRevisions: 0,
      pendingOrders: 0,
      pendingRefunds: 0,
      pendingGuardianWithdrawals: 0,
      newUsersToday: 0,
      todayOrders: 0,
      todayRevenue: 0,
      pendingCommissions: 0,
      onlineLawyers: 0,
      yesterdayNewUsers: 0,
      totalUsers: 0,
      totalLawyers: 0,
      yesterdayOrders: 0,
      yesterdayRevenue: 0,
    },
    message: '请使用 /api/admin/stats 获取完整数据',
  });
}
