import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { withAdminAuth } from '@/lib/auth/admin-middleware';

export const GET = withAdminAuth(async (request: NextRequest) => {
  const supabase = getSupabaseAdmin();

  // 律师入驻 - 待审核申请数
  const { count: pendingLawyerApplications } = await supabase
    .from('lawyer_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // 资料修改 - 待审核数
  const { count: pendingProfileRevisions } = await supabase
    .from('lawyer_profile_revisions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // 订单管理 - 待派单数
  const { count: pendingOrders } = await supabase
    .from('consult_orders')
    .select('*', { count: 'exact', head: true })
    .eq('assignment_status', 'unassigned');

  // 退款处理 - 待处理退款数
  const { count: pendingRefunds } = await supabase
    .from('refund_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // 守护者提现 - 待处理提现数
  const { count: pendingGuardianWithdrawals } = await supabase
    .from('guardian_withdrawals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // 用户管理 - 今日新注册用户数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const { count: newUsersToday } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStr);

  // 今日订单数
  const { count: todayOrders } = await supabase
    .from('consult_orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStr);

  // 今日收入
  const { data: todayRevenueData } = await supabase
    .from('consult_orders')
    .select('service_price')
    .eq('payment_status', 'paid')
    .gte('created_at', todayStr);

  const todayRevenue = todayRevenueData?.reduce((sum, item) => sum + (item.service_price || 0), 0) || 0;

  // 守护者分成 - 待审核数
  const { count: pendingCommissions } = await supabase
    .from('guardian_commissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return NextResponse.json({
    success: true,
    data: {
      pendingLawyerApplications: pendingLawyerApplications || 0,
      pendingProfileRevisions: pendingProfileRevisions || 0,
      pendingOrders: pendingOrders || 0,
      pendingRefunds: pendingRefunds || 0,
      pendingGuardianWithdrawals: pendingGuardianWithdrawals || 0,
      newUsersToday: newUsersToday || 0,
      todayOrders: todayOrders || 0,
      todayRevenue: todayRevenue || 0,
      pendingCommissions: pendingCommissions || 0,
    },
  });
});
