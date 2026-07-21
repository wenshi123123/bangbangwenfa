import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { resolveGuardianId } from '@/lib/auth/guardian-identity';

// GET /api/guardian/invites - 获取邀请列表（需要JWT认证）
export async function GET(request: NextRequest) {
  // 严格JWT认证：不再支持 guardianId 查询参数绕过
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  const supabase = getSupabaseAdmin();
  const guardianId = await resolveGuardianId(auth, supabase);
  if (!guardianId) {
    return NextResponse.json({ success: false, error: '非守护者账号' }, { status: 403 });
  }
  
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const { data: invitees, error, count } = await supabase
      .from('guardian_invitees')
      .select('*', { count: 'exact' })
      .eq('guardian_id', guardianId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      // 表不存在或其他数据库错误，返回空数据
      console.warn('invites 表查询失败，返回空:', error.message);
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      });
    }

    return NextResponse.json({
      success: true,
      data: invitees?.map(item => ({
        id: item.id,
        nickname: item.invitee_nickname,
        total_consumption: item.total_consumption,
        is_valid: item.is_valid,
        created_at: item.created_at
      })) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.warn('invites API 异常，返回空:', error?.message);
    return NextResponse.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    });
  }
}
