import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET /api/admin/guardian-stats - 获取守护者统计
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  try {
    const supabase = getSupabaseClient();

    // 获取守护者总数和活跃数
    const { count: totalCount, error: countError } = await supabase
      .from('guardian_users')
      .select('*', { count: 'exact', head: true });

    const { count: activeCount, error: activeError } = await supabase
      .from('guardian_users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // 获取分成统计
    const { data: commissionData, error: commissionError } = await supabase
      .from('guardian_users')
      .select('total_commission, available_commission');

    const totalCommission = commissionData?.reduce((sum: number, g: any) => sum + (g.total_commission || 0), 0) || 0;
    const availableCommission = commissionData?.reduce((sum: number, g: any) => sum + (g.available_commission || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        total: totalCount || 0,
        active: activeCount || 0,
        totalCommission,
        availableCommission
      }
    });
  } catch (error) {
    console.error('获取守护者统计失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
