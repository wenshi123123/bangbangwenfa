import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // 状态映射：URL 参数值 -> 数据库字段值
    const reviewStatuses = ['pending', 'approved', 'rejected'];
    const isPaymentFilter = status === 'paid';
    const dbStatus = status ? (reviewStatuses.includes(status) ? status : status) : null;
    
    const supabase = getSupabaseAdmin();
    let query = supabase.from('lawyer_applications').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    
    if (isPaymentFilter) {
      query = query.eq('payment_status', 'paid');
    } else if (dbStatus) {
      query = query.eq('review_status', dbStatus);
    }
    
    // 分页
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        list: data || [],
        total: count || 0
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
