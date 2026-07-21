import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { resolveGuardianId } from '@/lib/auth/guardian-identity';

// GET /api/guardian/commissions - 获取分成记录（需要JWT认证）
export async function GET(request: NextRequest) {
  try {
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

    const offset = (page - 1) * limit;

    // 查询分成记录（不含关联查询，避免外键缺失问题）
    const { data: commissions, error, count } = await supabase
      .from('guardian_commissions')
      .select('*', { count: 'exact' })
      .eq('guardian_id', guardianId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('查询分成记录失败:', error);
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: commissions?.map(item => ({
        id: item.id,
        order_no: item.order_no || '',
        order_amount: item.order_amount || 0,
        commission_amount: item.commission_amount,
        commission_rate: item.commission_rate,
        status: item.status,
        is_refunded: item.is_refunded,
        refunded_amount: item.refunded_amount,
        created_at: item.created_at
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('获取分成记录失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
