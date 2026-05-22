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
    const { lawyerId, ...updates } = body;
    
    if (!lawyerId) {
      return NextResponse.json({ success: false, error: '缺少律师ID' }, { status: 400 });
    }

    // 权限校验：只能修改自己的信息
    const supabase = getSupabaseAdmin();
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('user_id')
      .eq('id', lawyerId)
      .single();

    if (!lawyer || lawyer.user_id.toString() !== auth.user!.id.toString()) {
      return NextResponse.json({ success: false, error: '无权修改此律师信息' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('lawyers')
      .update(updates)
      .eq('id', lawyerId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lawyer: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
