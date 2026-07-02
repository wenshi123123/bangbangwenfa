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
    const category = searchParams.get('category');
    const rawSearch = searchParams.get('search')?.trim() || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const supabase = getSupabaseAdmin();
    let query = supabase.from('consult_orders').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (status) query = query.eq('payment_status', status);
    if (category) query = query.eq('category', category);
    if (rawSearch) {
      const search = rawSearch.replace(/[%]/g, '').replace(/,/g, ' ');
      query = query.or(
        `contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%,case_title.ilike.%${search}%,order_no.ilike.%${search}%`
      );
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
