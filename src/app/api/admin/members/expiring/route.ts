import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET /api/admin/members/expiring?days=7 - 获取即将到期的套餐记录
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  try {
    const daysParam = request.nextUrl.searchParams.get('days') || '7';
    const days = parseInt(daysParam) || 7;

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('membership_records')
      .select(`
        id,
        lawyer_id,
        package_type,
        status,
        expires_at,
        started_at,
        lawyers!inner(name)
      `)
      .in('status', ['active', 'trial'])
      .gt('expires_at', new Date().toISOString())
      .lte('expires_at', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
      .order('expires_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 附加倒计时天数
    const enriched = (data || []).map((r: Record<string, unknown>) => {
      const rec = r as Record<string, unknown>;
      const exp = new Date(rec.expires_at as string);
      const daysLeft = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const lawyerInfo = rec.lawyers as Record<string, unknown> || {};
      return {
        id: rec.id,
        lawyer_id: rec.lawyer_id,
        name: lawyerInfo.name || '未知',
        package_type: rec.package_type,
        expires_at: rec.expires_at,
        daysLeft,
        is_trial: rec.status === 'trial',
      };
    });

    return NextResponse.json({ success: true, data: enriched, total: enriched.length });
  } catch {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
