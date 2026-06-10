import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET /api/admin/members/[id]/logs - 获取律师会员操作日志
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('membership_logs')
      .select('*')
      .eq('lawyer_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // 表可能尚未创建，返回空数组而非报错
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ success: true, data: [], note: '日志表尚未创建' });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
