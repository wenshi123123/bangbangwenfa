import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const supabase = getSupabaseAdmin();
    
    // 构建基础查询
    let query = supabase
      .from('lawyer_profile_revisions')
      .select('*, lawyers(name, phone)')
      .order('created_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    // 将嵌套的 lawyers.name 展平为 lawyer_name
    const revisions = (data || []).map((item: Record<string, unknown>) => {
      const lawyers = item.lawyers as { name?: string } | null;
      return {
        ...item,
        lawyer_name: lawyers?.name || null,
      };
    });
    
    // 统计各状态数量（仅查询 pending 计数用于顶部 badge）
    const { data: pendingData, error: countError } = await supabase
      .from('lawyer_profile_revisions')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');
    
    return NextResponse.json({ 
      success: true, 
      revisions,
      pendingCount: countError ? 0 : (pendingData?.length || 0)
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);
  
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lawyer_profile_revisions')
      .insert(body)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, revision: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
