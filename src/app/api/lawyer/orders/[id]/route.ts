import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }

  // 兼容存量 token：只要已解析出 lawyerId，就视为律师身份
  if (!auth.lawyerId) {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }

  const lawyerId = auth.lawyerId!;
  const lawyerIdFilter = String(lawyerId);

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('consult_orders')
      .select('id, contact_name, contact_phone, contact_wechat, case_type, case_title, case_description, service_type, service_price, assigned_at, category, created_at, assignment_status, assigned_lawyer_id, user_id, payment_status, confirmed_at, completed_at, lawyer_response, status')
      .eq('id', id)
      .eq('assigned_lawyer_id', lawyerIdFilter)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: '订单不存在或无权访问' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
