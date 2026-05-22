import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// GET /api/guardian/withdrawals - 获取提现记录列表（需要JWT认证）
export async function GET(request: NextRequest) {
  try {
    // 严格JWT认证：不再支持 guardianId 查询参数绕过
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    if (auth.userType !== 'guardian') {
      return NextResponse.json({ success: false, error: '非守护者账号' }, { status: 403 });
    }
    const guardianId = auth.guardianId!;

    const supabase = getSupabaseAdmin();

    const { data: withdrawals, error } = await supabase
      .from('guardian_withdrawals')
      .select('*')
      .eq('guardian_id', guardianId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取提现记录失败:', error);
      return NextResponse.json({ success: false, error: '获取提现记录失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: withdrawals?.map(w => ({
        id: w.id,
        amount: w.amount,
        status: w.status,
        createdAt: w.created_at,
        processedAt: w.processed_at,
      })) || [],
    });
  } catch (error) {
    console.error('获取提现记录失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
