import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET - 获取所有案件类型
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('case_types')
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

// POST - 创建案件类型
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const body = await request.json();
    const { name, code, description, icon, sort_order, is_active } = body;
    
    if (!name || !code) {
      return NextResponse.json({ success: false, error: '名称和代码不能为空' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('case_types')
      .insert([{ name, code, description, icon, sort_order: sort_order || 0, is_active: is_active !== false }])
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
