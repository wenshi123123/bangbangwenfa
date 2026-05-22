import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

// 获取用户的申请状态
export async function GET(request: NextRequest) {
  // 验证用户身份
  const authResult = await requireAuth(request);
  if (!authResult.success || !authResult.userId) {
    return NextResponse.json(
      { success: false, error: '未登录或登录已过期' },
      { status: 401 }
    );
  }
  const userIdNum = authResult.userId;
  try {
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { success: false, error: '无效的用户ID' },
        { status: 400 }
      );
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询用户的最新申请
    const { data: application, error } = await supabase
      .from('lawyer_applications')
      .select('id, user_id, name, review_status, payment_status, created_at')
      .eq('user_id', userIdNum)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('查询申请状态失败:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 查询是否已是正式律师（审核通过的申请）
    const { data: approvedApp } = await supabase
      .from('lawyer_applications')
      .select('id, review_status')
      .eq('user_id', userIdNum)
      .eq('review_status', 'approved')
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      application: application || null,
      isLawyer: !!approvedApp
    });

  } catch (error: any) {
    console.error('查询申请状态异常:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}
