import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET /api/admin/analytics/overview - 综合分析概览
export async function GET(request: NextRequest) {
  // 验证管理员权限
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30'); // 默认30天

    const supabase = getSupabaseAdmin();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. 订单统计
    const { count: totalOrders } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true });

    const { count: pendingOrders } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: completedOrders } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 2. 营收统计
    const { data: revenueData } = await supabase
      .from('consult_orders')
      .select('service_price')
      .eq('payment_status', 'paid');

    const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.service_price || 0), 0) || 0;

    // 3. 用户统计
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // 4. 律师统计
    const { count: totalLawyers } = await supabase
      .from('lawyers')
      .select('*', { count: 'exact', head: true });

    const { count: pendingLawyers } = await supabase
      .from('lawyer_applications')
      .select('*', { count: 'exact', head: true })
      .eq('review_status', 'pending');

    // 5. 守护者统计
    const { count: totalGuardians } = await supabase
      .from('guardian_users')
      .select('*', { count: 'exact', head: true });

    const { data: guardianStats } = await supabase
      .from('guardian_users')
      .select('total_commission, withdrawn_commission');

    const totalCommission = guardianStats?.reduce((sum, g) => sum + (g.total_commission || 0), 0) || 0;
    const totalWithdrawn = guardianStats?.reduce((sum, g) => sum + (g.withdrawn_commission || 0), 0) || 0;

    // 6. 服务类型分布
    const { data: serviceTypeStats } = await supabase
      .from('consult_orders')
      .select('service_type, service_price')
      .eq('payment_status', 'paid');

    const serviceTypeMap: Record<string, { count: number; revenue: number }> = {};
    serviceTypeStats?.forEach(order => {
      const type = order.service_type || 'unknown';
      if (!serviceTypeMap[type]) {
        serviceTypeMap[type] = { count: 0, revenue: 0 };
      }
      serviceTypeMap[type].count++;
      serviceTypeMap[type].revenue += order.service_price || 0;
    });

    // 7. 每日趋势数据
    const trendData: Record<string, { orders: number; revenue: number; users: number }> = {};
    
    // 获取最近N天的订单趋势（只统计已支付订单）
    const { data: dailyOrders } = await supabase
      .from('consult_orders')
      .select('created_at, service_price')
      .gte('created_at', startDate.toISOString())
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true });

    dailyOrders?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!trendData[date]) {
        trendData[date] = { orders: 0, revenue: 0, users: 0 };
      }
      trendData[date].orders++;
      trendData[date].revenue += order.service_price || 0;
    });

    // 获取最近N天的新用户趋势
    const { data: dailyUsers } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    dailyUsers?.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      if (trendData[date]) {
        trendData[date].users++;
      }
    });

    // 转换为数组格式
    const trendArray = Object.entries(trendData)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalOrders: totalOrders || 0,
          pendingOrders: pendingOrders || 0,
          completedOrders: completedOrders || 0,
          totalRevenue,
          averageOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
        },
        users: {
          total: totalUsers || 0,
          newInPeriod: newUsers || 0,
        },
        lawyers: {
          total: totalLawyers || 0,
          pendingApplications: pendingLawyers || 0,
        },
        guardians: {
          total: totalGuardians || 0,
          totalCommission,
          totalWithdrawn,
          availableCommission: totalCommission - totalWithdrawn,
        },
        serviceTypes: Object.entries(serviceTypeMap).map(([type, stats]) => ({
          type,
          count: stats.count,
          revenue: stats.revenue,
        })).sort((a, b) => b.revenue - a.revenue),
        trend: trendArray,
        period: days,
      }
    });
  } catch (error) {
    console.error('获取分析数据失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
