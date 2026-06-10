import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// POST - 律师回复订单
export async function POST(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 确保是律师类型
  if (auth.userType !== 'lawyer') {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  const lawyerId = auth.lawyerId!;
  
  try {
    const body = await request.json();
    const { orderId, response, responseType } = body;

    if (!orderId || !response) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数：orderId、response' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 检查订单归属
    const { data: order, error: orderError } = await supabase
      .from('consult_orders')
      .select('id, assigned_lawyer_id, case_type, case_title, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ 
        success: false, 
        error: '订单不存在' 
      }, { status: 404 });
    }

    // 校验律师归属
    if (order.assigned_lawyer_id !== lawyerId) {
      return NextResponse.json({ 
        success: false, 
        error: '无权回复此订单' 
      }, { status: 403 });
    }

    // 校验订单状态
    if (order.payment_status !== 'paid') {
      return NextResponse.json({ 
        success: false, 
        error: '订单未支付，无法回复' 
      }, { status: 400 });
    }

    // 构建回复内容
    const now = new Date().toISOString();
    const newResponse = {
      type: responseType || 'text',
      content: response,
      lawyerId,
      timestamp: now,
    };

    // 更新订单律师回复
    const { data: updatedOrder, error: updateError } = await supabase
      .from('consult_orders')
      .update({
        lawyer_response: JSON.stringify(newResponse),
        response_at: now,
        updated_at: now,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: '回复失败：' + updateError.message 
      }, { status: 500 });
    }

    // 【P0-用户通知】律师回复后通知用户
    try {
      // 查询订单的 user_id 和 order_no
      const { data: orderInfo } = await supabase
        .from('consult_orders')
        .select('user_id, order_no, lawyer_name')
        .eq('id', orderId)
        .maybeSingle();

      if (orderInfo?.user_id) {
        await supabase.from('notifications').insert({
          user_id: orderInfo.user_id,
          type: 'lawyer_replied',
          title: '律师已回复您的咨询',
          content: `律师 ${orderInfo.lawyer_name || '律师'} 已回复您的咨询订单，请查看。订单号：${orderInfo.order_no}`,
          data: { orderId, orderNo: orderInfo.order_no, lawyerId, lawyerName: orderInfo.lawyer_name || '' },
          is_read: false,
        });
        console.log(`✅ 用户通知已写入: 律师回复，订单 ${orderId}`);
      }
    } catch (notifyErr) {
      console.error('写入用户回复通知失败（不影响回复结果）:', notifyErr);
    }
    
    return NextResponse.json({
      success: true,
      message: '回复成功',
      data: {
        orderId,
        response: newResponse,
      }
    });
  } catch (error) {
    console.error('律师回复订单失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}

// GET - 获取律师对订单的回复记录
export async function GET(request: NextRequest) {
  // 验证律师身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  // 确保是律师类型
  if (auth.userType !== 'lawyer') {
    return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });
  }
  
  const lawyerId = auth.lawyerId!;
  
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数：orderId' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 获取订单的律师回复
    const { data: order, error } = await supabase
      .from('consult_orders')
      .select('lawyer_response, response_at')
      .eq('id', orderId)
      .eq('assigned_lawyer_id', lawyerId)
      .single();

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: '查询失败' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: order ? {
        response: order.lawyer_response ? JSON.parse(order.lawyer_response) : null,
        responseAt: order.response_at,
      } : null
    });
  } catch (error) {
    console.error('获取回复记录失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
