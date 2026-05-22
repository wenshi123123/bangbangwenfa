import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  // 认证检查
  const auth = authenticateRequest(request);
  if (!auth || !auth.success) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  try {
    const body = await request.json();
    const {
      lawyerId,
      revisionType,
      oldValue,
      newValue,
      reason,
    } = body;

    if (!lawyerId) {
      return NextResponse.json({ success: false, error: '缺少律师ID' }, { status: 400 });
    }

    if (!revisionType || oldValue === undefined || newValue === undefined) {
      return NextResponse.json({ success: false, error: '缺少修改信息' }, { status: 400 });
    }

    // 权限校验：只能提交自己的审核
    const supabase = getSupabaseAdmin();
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('user_id')
      .eq('id', lawyerId)
      .single();

    if (!lawyer || lawyer.user_id.toString() !== auth.user!.id.toString()) {
      return NextResponse.json({ success: false, error: '无权提交此审核' }, { status: 403 });
    }

    // 创建审核记录（保存完整字段信息）
    const { data: revision, error: revisionError } = await supabase
      .from('lawyer_profile_revisions')
      .insert({
        lawyer_id: lawyerId,
        field_name: revisionType,
        old_value: String(oldValue),
        new_value: String(newValue),
        reason: reason || '',
        status: 'pending',
      })
      .select()
      .single();

    if (revisionError) {
      return NextResponse.json({ success: false, error: revisionError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, revision });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
