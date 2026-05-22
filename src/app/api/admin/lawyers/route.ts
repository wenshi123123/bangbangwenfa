import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdminAuth } from '@/lib/auth/admin-middleware';

// GET /api/admin/lawyers - 获取待分配律师列表
export async function GET(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }
  
  try {
    const supabase = getSupabaseClient();
    
    // 获取活跃且可接单的律师
    const { data: lawyers, error } = await supabase
      .from('lawyers')
      .select(`
        id,
        user_id,
        name,
        phone,
        wechat,
        specialties,
        status,
        is_available,
        max_orders,
        current_orders,
        rating,
        created_at
      `)
      .eq('status', 'active')
      .eq('is_available', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: lawyers || [] 
    });
  } catch (error) {
    console.error('获取律师列表失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
