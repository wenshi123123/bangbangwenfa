import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export const dynamic = 'force-dynamic';

// GET /api/admin/price - 获取所有价格配置（后台）
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('price_configs')
      .select('id, category, plan_id, plan_name, price, created_at, updated_at')
      .order('category', { ascending: true })
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching price configs:', error);
      return NextResponse.json(
        { success: false, error: '获取价格配置失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching price configs:', error);
    return NextResponse.json(
      { success: false, error: '获取价格配置失败' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/price - 更新价格配置
export async function PUT(request: NextRequest) {
  // 使用 JWT 签名验证管理员身份
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }

  try {
    const body = await request.json();
    const { id, price } = body;

    if (!id || price === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 价格验证（分）
    const priceInCents = parseInt(price);
    if (isNaN(priceInCents) || priceInCents < 0) {
      return NextResponse.json(
        { success: false, error: '价格格式不正确' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('price_configs')
      .update({ 
        price: priceInCents,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, category, plan_id, plan_name, price, updated_at')
      .single();

    if (error) {
      console.error('Error updating price config:', error);
      return NextResponse.json(
        { success: false, error: '更新价格配置失败' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: '价格配置不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error updating price config:', error);
    return NextResponse.json(
      { success: false, error: '更新价格配置失败' },
      { status: 500 }
    );
  }
}
