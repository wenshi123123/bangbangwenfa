import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET /api/admin/guardian/[id] - 获取守护者详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    
    // 获取守护者信息
    const { data: guardian, error } = await supabase
      .from('guardian_users')
      .select('*')
      .eq('id', parseInt(id, 10))
      .single();

    if (error || !guardian) {
      return NextResponse.json({ 
        success: false, 
        error: '守护者不存在' 
      }, { status: 404 });
    }

    // 获取该守护者的分成记录
    const { data: commissions } = await supabase
      .from('guardian_commissions')
      .select('*')
      .eq('guardian_id', guardian.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // 获取该守护者的提现记录
    const { data: withdrawals } = await supabase
      .from('guardian_withdrawals')
      .select('*')
      .eq('guardian_id', guardian.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 获取邀请的用户列表
    const { data: invitees } = await supabase
      .from('guardian_invitees')
      .select('*')
      .eq('guardian_id', guardian.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ 
      success: true, 
      data: {
        guardian,
        commissions: commissions || [],
        withdrawals: withdrawals || [],
        invitees: invitees || []
      }
    });
  } catch (error) {
    console.error('获取守护者详情失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
