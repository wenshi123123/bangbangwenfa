import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// PATCH /api/lawyer/profile/status - 切换律师在线状态
export async function PATCH(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  const lawyerId = auth.lawyerId;
  if (!lawyerId) {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { onlineStatus } = body;

    if (!onlineStatus || !['online', 'away'].includes(onlineStatus)) {
      return NextResponse.json(
        { success: false, error: 'onlineStatus 必须为 online 或 away' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 查找律师：先按 lawyerId，再按 phone，最后按 user_id
    const findLawyer = async () => {
      // 第一轮：按 lawyerId 查
      const { data: d1, error: e1 } = await supabase
        .from('lawyers')
        .select('id')
        .eq('id', String(lawyerId))
        .maybeSingle();
      if (d1) return d1.id;
      if (e1) console.warn('[Status API] lawyerId 查询失败:', e1.message);

      // 兜底1：按 phone 查
      if (auth.phone) {
        const { data: d2, error: e2 } = await supabase
          .from('lawyers')
          .select('id')
          .eq('phone', auth.phone)
          .maybeSingle();
        if (d2) return d2.id;
        if (e2) console.warn('[Status API] phone 兜底查询失败:', e2.message);
      }

      // 兜底2：按 user_id 查
      if (auth.userId) {
        const { data: d3, error: e3 } = await supabase
          .from('lawyers')
          .select('id')
          .eq('user_id', String(auth.userId))
          .maybeSingle();
        if (d3) return d3.id;
        if (e3) console.warn('[Status API] user_id 兜底查询失败:', e3.message);
      }

      return null;
    };

    const resolvedLawyerId = await findLawyer();

    if (!resolvedLawyerId) {
      return NextResponse.json({ success: false, error: '律师不存在，请确认账号已通过审核' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('lawyers')
      .update({
        online_status: onlineStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedLawyerId)
      .select('id, online_status')
      .maybeSingle();

    if (error) {
      console.error('[Status API] 更新在线状态失败:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: '律师不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      onlineStatus: data.online_status,
    });
  } catch (error) {
    console.error('[Status API] 服务器错误:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
