import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET - 获取所有服务类型
export async function GET(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// POST - 创建服务类型
export async function POST(request: NextRequest) {
  // 验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const body = await request.json();
    const { name, code, description, price, icon, sort_order, is_active } = body;
    
    if (!name || !code) {
      return NextResponse.json({ success: false, error: '名称和代码不能为空' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('service_types')
      .insert([{ name, code, description, price: price || 0, icon, sort_order: sort_order || 0, is_active: is_active !== false }])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
