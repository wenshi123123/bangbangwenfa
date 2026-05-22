import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 确保是律师类型
  if (auth.userType !== 'lawyer') {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  const lawyerId = auth.lawyerId!;
  
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('consult_orders')
      .select('*')
      .eq('assigned_lawyer_id', lawyerId)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, orders: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
