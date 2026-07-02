import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 确保当前用户有关联的律师身份
  if (!auth.lawyerId) {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  const lawyerId = auth.lawyerId;
  const lawyerIdFilter = String(lawyerId);
  
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('consult_orders')
      .select('id, contact_name, contact_phone, contact_wechat, case_type, case_title, case_description, service_type, service_price, assigned_at, category, created_at, assignment_status, assigned_lawyer_id, user_id, payment_status, confirmed_at, completed_at, lawyer_response, status')
      .eq('assigned_lawyer_id', lawyerIdFilter)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, orders: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
