import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';


export const dynamic = 'force-dynamic';

// GET /api/price - 获取所有价格配置（公开）
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabase
      .from('price_configs')
      .select('category, plan_id, plan_name, price')
      .order('category', { ascending: true })
      .order('price', { ascending: true });

    // 如果指定了 category，则过滤
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

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
