import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

// POST 方法：通过手机号检查
export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    
    // 参数校验先于限流，避免无效请求消耗限流配额
    if (!phone) {
      return NextResponse.json({ success: false, error: '请输入手机号' }, { status: 400 });
    }

    // 限流检查（仅对有效请求限流）
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`${clientIP}:lawyer-check`, 5, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
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
    
    // 🔧 在数据库层面过滤，避免全表查询
    let { data: lawyerData, error } = await supabase
      .from('lawyers')
      .select('id, real_name, phone, status, user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('查询 lawyers 失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: '查询失败', 
        details: error.message 
      }, { status: 500 });
    }

    // 🔧 兜底：如果 user_id 匹配失败，尝试通过 phone 匹配（修复存量数据 user_id=NULL 的问题）
    if (!lawyerData) {
      try {
        const { data: userRecord } = await supabase
          .from('users')
          .select('phone')
          .eq('id', userId)
          .single();
        if (userRecord?.phone) {
          const { data: phoneMatch } = await supabase
            .from('lawyers')
            .select('id, real_name, phone, status, user_id')
            .eq('phone', userRecord.phone)
            .maybeSingle();
          lawyerData = phoneMatch;
          // 🔧 回写 user_id 修复存量数据
          if (lawyerData) {
            await supabase
              .from('lawyers')
              .update({ user_id: userId })
              .eq('id', lawyerData.id);
          }
        }
      } catch {
        // 忽略查询失败
      }
    }
    
    if (lawyerData) {
      return NextResponse.json({ success: true, data: lawyerData });
    }

    // 没有律师记录，检查是否有申请记录（兜底）
    try {
      let { data: appData } = await supabase
        .from('lawyer_applications')
        .select('*')
        .filter('user_id', 'eq', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      // 🔧 兜底：如果 user_id 匹配不到，用 phone 再次查询（修复存量数据）
      if (!appData || appData.length === 0) {
        const { data: userRecord } = await supabase
          .from('users')
          .select('phone')
          .eq('id', userId)
          .single();
        if (userRecord?.phone) {
          const phoneResult = await supabase
            .from('lawyer_applications')
            .select('*')
            .eq('phone', userRecord.phone)
            .order('created_at', { ascending: false })
            .limit(1);
          appData = phoneResult.data;
          // 如果通过 phone 找到了，回写 user_id
          if (appData && appData.length > 0) {
            await supabase
              .from('lawyer_applications')
              .update({ user_id: userId })
              .eq('id', appData[0].id);
          }
        }
      }
      
      if (appData && appData.length > 0) {
        const app = appData[0];
        // 如果申请已审核通过，返回 success: true 让前端进入律师后台
        if (app.review_status === 'approved') {
          return NextResponse.json({ 
            success: true, 
            data: {
              id: app.id,
              real_name: app.name,
              status: 'active',
              // 通过 application 作为临时律师数据
              _from_application: true,
              application_id: app.id,
            },
          });
        }
        // 其他状态返回详细信息
        return NextResponse.json({ 
          success: false, 
          data: null,
          hasApplication: true,
          applicationStatus: app.review_status,
          paymentStatus: app.payment_status
        });
      }
    } catch (tableError) {
      console.warn('lawyer_applications 表查询失败:', tableError);
    }

    return NextResponse.json({ success: false, data: null, hasApplication: false });
  } catch (error: any) {
    console.error('GET /api/lawyer/check error:', error);
    return NextResponse.json({ success: false, error: error.message || '服务器错误' }, { status: 500 });
  }
}
