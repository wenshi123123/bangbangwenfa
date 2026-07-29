import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';


const cacheHeaders = {
  'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
};

const defaultPrices = [
  { category: 'civil', plan_id: 'basic', plan_name: '基础咨询', price: 6900 },
  { category: 'civil', plan_id: 'standard', plan_name: '标准方案', price: 19900 },
  { category: 'civil', plan_id: 'advanced', plan_name: '深度服务', price: 29900 },
  { category: 'criminal', plan_id: 'basic', plan_name: '基础咨询', price: 9900 },
  { category: 'criminal', plan_id: 'standard', plan_name: '标准方案', price: 24900 },
  { category: 'criminal', plan_id: 'advanced', plan_name: '深度服务', price: 37900 },
];

// GET /api/price - 获取所有价格配置（公开）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('price_configs')
      .select('category, plan_id, plan_name, price')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('price', { ascending: true });

    // 如果指定了 category，则过滤
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching price configs:', error);
      if (category === 'lawyer' || category === 'lawyer_renewal') {
        return NextResponse.json(
          { success: false, error: '律师套餐价格配置暂不可用' },
          { status: 503 },
        );
      }
      return NextResponse.json(
        {
          success: true,
          data: category ? defaultPrices.filter(item => item.category === category) : defaultPrices,
          fallback: true,
        },
        { headers: cacheHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { headers: cacheHeaders },
    );
  } catch (error) {
    console.error('Error fetching price configs:', error);
    if (category === 'lawyer' || category === 'lawyer_renewal') {
      return NextResponse.json(
        { success: false, error: '律师套餐价格配置暂不可用' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        success: true,
        data: category ? defaultPrices.filter(item => item.category === category) : defaultPrices,
        fallback: true,
      },
      { headers: cacheHeaders },
    );
  }
}
