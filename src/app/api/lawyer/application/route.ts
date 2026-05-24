import { NextRequest, NextResponse } from 'next/server';

// 获取用户的申请状态（无需 JWT，通过查询参数传入 userId）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get('userId');
    
    if (!userIdStr) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID参数' },
        { status: 400 }
      );
    }

    const { getSupabaseAdmin } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseAdmin();

    // 查询用户的最新申请
    let { data: application, error } = await supabase
      .from('lawyer_applications')
      .select('id, user_id, name, review_status, payment_status, created_at')
      .filter('user_id', 'eq', userIdStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('查询申请状态失败:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 🔧 兜底：如果 user_id 匹配不到，用 phone 再次查询（修复存量数据）
    if (!application) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('phone')
        .eq('id', userIdStr)
        .single();
      if (userRecord?.phone) {
        const phoneResult = await supabase
          .from('lawyer_applications')
          .select('id, user_id, name, review_status, payment_status, created_at')
          .eq('phone', userRecord.phone)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (phoneResult.data) {
          application = phoneResult.data;
          // 回写 user_id 修复存量数据
          await supabase
            .from('lawyer_applications')
            .update({ user_id: userIdStr })
            .eq('id', phoneResult.data.id);
        }
      }
    }

    // 查询是否已是正式律师（审核通过的申请）
    let { data: approvedApp } = await supabase
      .from('lawyer_applications')
      .select('id, review_status')
      .filter('user_id', 'eq', userIdStr)
      .eq('review_status', 'approved')
      .limit(1)
      .maybeSingle();

    // 🔧 兜底：同样用 phone 查询 approved 状态
    if (!approvedApp) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('phone')
        .eq('id', userIdStr)
        .single();
      if (userRecord?.phone) {
        const phoneResult = await supabase
          .from('lawyer_applications')
          .select('id, review_status')
          .eq('phone', userRecord.phone)
          .eq('review_status', 'approved')
          .limit(1)
          .maybeSingle();
        approvedApp = phoneResult.data || null;
      }
    }

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
