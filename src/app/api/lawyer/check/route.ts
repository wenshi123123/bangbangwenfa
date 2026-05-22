import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

// POST 方法：通过手机号检查
export async function POST(request: NextRequest) {
  try {
    // 限流检查
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`${clientIP}:lawyer-check`, 5, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ success: false, error: '请输入手机号' }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('lawyers')
      .select('id, real_name, status')
      .eq('phone', phone)
      .single();
    if (error || !data) {
      return NextResponse.json({ exists: false, lawyer: null });
    }
    return NextResponse.json({ exists: true, lawyer: { id: data.id, name: data.real_name, status: data.status } });
  } catch (error: any) {
    console.error('POST /api/lawyer/check error:', error);
    return NextResponse.json({ success: false, error: error.message || '服务器错误' }, { status: 500 });
  }
}

// GET 方法：通过 userId 检查
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // 查询 lawyers 表
    const { data, error } = await supabase
      .from('lawyers')
      .select('*');
    
    if (error) {
      console.error('查询 lawyers 失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: '查询失败', 
        details: error.message 
      }, { status: 500 });
    }

    // 手动查找匹配的 user_id（避免类型不匹配）
    const lawyerData = data?.find((row: any) => 
      row.user_id?.toString() === userId || row.user_id === parseInt(userId)
    );
    
    if (lawyerData) {
      return NextResponse.json({ success: true, data: lawyerData });
    }

    // 没有律师记录，检查是否有申请记录
    try {
      const { data: appData } = await supabase
        .from('lawyer_applications')
        .select('*')
        .filter('user_id', 'eq', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (appData && appData.length > 0) {
        return NextResponse.json({ 
          success: false, 
          data: null,
          hasApplication: true,
          applicationStatus: appData[0].review_status,
          paymentStatus: appData[0].payment_status
        });
      }
    } catch (tableError) {
      console.warn('lawyer_applications 表不存在或查询失败:', tableError);
    }

    return NextResponse.json({ success: false, data: null, hasApplication: false });
  } catch (error: any) {
    console.error('GET /api/lawyer/check error:', error);
    return NextResponse.json({ success: false, error: error.message || '服务器错误' }, { status: 500 });
  }
}
