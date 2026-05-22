import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  try {
    const supabase = getSupabaseAdmin();
    const [totalResult, paidResult, pendingResult, refundedResult] = await Promise.all([
      supabase.from('consult_orders').select('*', { count: 'exact', head: true }),
      supabase.from('consult_orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'paid'),
      supabase.from('consult_orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),
      supabase.from('consult_orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'refunded')
    ]);
    const { data: revenueData } = await supabase
      .from('consult_orders')
      .select('service_price')
      .eq('payment_status', 'paid');
    const totalRevenue = revenueData?.reduce((sum: number, item: { service_price: number }) => sum + (item.service_price || 0), 0) || 0;

    // 今日订单
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    const { count: todayOrders } = await supabase
      .from('consult_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStr);

    const { data: todayRevenueData } = await supabase
      .from('consult_orders')
      .select('service_price')
      .eq('payment_status', 'paid')
      .gte('created_at', todayStr);
    const todayRevenue = todayRevenueData?.reduce((sum: number, item: { service_price: number }) => sum + (item.service_price || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        total: totalResult.count || 0,
        paid: paidResult.count || 0,
        pending: pendingResult.count || 0,
        refunded: refundedResult.count || 0,
        totalRevenue,
        today: todayOrders || 0,
        todayRevenue
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
