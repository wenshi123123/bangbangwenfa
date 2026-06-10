import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

// 分成比例 1%
const COMMISSION_RATE = 0.01;

// 内部服务认证 - 验证请求来自本服务内部
function verifyInternalRequest(request: NextRequest): boolean {
  const internalKey = request.headers.get('x-internal-service-key');
  const expectedKey = process.env.INTERNAL_SERVICE_KEY;
  
  // 必须在环境变量中配置密钥
  if (!expectedKey) {
    console.error('INTERNAL_SERVICE_KEY 未配置，拒绝内部请求');
    return false;
  }
  
  if (!internalKey) {
    console.warn('缺少 x-internal-service-key 头');
    return false;
  }
  
  // 使用 timing-safe 比较
  try {
    const crypto = require('crypto');
    return crypto.timingSafeEqual(
      Buffer.from(internalKey),
      Buffer.from(expectedKey)
    );
  } catch {
    return internalKey === expectedKey;
  }
}

// POST /api/guardian/calculate - 计算并生成分成
// 此接口在用户订单支付成功后调用（仅限内部调用）
export async function POST(request: NextRequest) {
  // 内部服务认证检查
  if (!verifyInternalRequest(request)) {
    return NextResponse.json({ 
      success: false, 
      error: '无权访问此接口' 
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { orderId, orderAmount, orderNo } = body;

    if (!orderId || !orderAmount) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 检查是否已经计算过分成
    const { data: existing } = await supabase
      .from('guardian_commissions')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: '该订单已计算过分成' 
      });
    }

    // 根据订单关联的微信用户openid查询邀请关系
    const { data: order } = await supabase
      .from('consult_orders')
      .select('contact_wechat, client_ip, user_id')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ 
        success: false, 
        error: '订单不存在' 
      }, { status: 404 });
    }

    // 优先使用 user_id 查询邀请关系，其次使用 contact_wechat
    let inviteeQuery = supabase
      .from('guardian_invitees')
      .select('*');
    
    if (order.user_id) {
      inviteeQuery = inviteeQuery.eq('invitee_user_id', order.user_id);
    } else if (order.contact_wechat) {
      inviteeQuery = inviteeQuery.eq('invitee_openid', order.contact_wechat);
    } else {
      // 没有用户标识，无法查询邀请关系
      return NextResponse.json({
        success: true,
        message: '无用户标识，无法查询邀请关系'
      });
    }

    const { data: invitee } = await inviteeQuery.single();

    if (!invitee) {
      // 没有邀请人，不计算分成
      return NextResponse.json({
        success: true,
        message: '无邀请关系，无需分成'
      });
    }

    // 计算分成金额
    const commissionAmount = Math.floor(orderAmount * COMMISSION_RATE);

    // 创建分成记录
    const { data: commission, error: insertError } = await supabase
      .from('guardian_commissions')
      .insert({
        guardian_id: invitee.guardian_id,
        order_id: orderId,
        commission_amount: commissionAmount,
        commission_rate: String(COMMISSION_RATE),
        status: 'settled',
        is_refunded: false,
        refunded_amount: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('创建分成记录失败:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: '创建分成记录失败' 
      }, { status: 500 });
    }

    // 更新被邀请用户的累计消费
    await supabase
      .from('guardian_invitees')
      .update({
        total_consumption: (invitee.total_consumption || 0) + orderAmount
      })
      .eq('id', invitee.id);

    // 更新守护者分成统计
    const { data: guardian } = await supabase
      .from('guardian_users')
      .select('total_commission, available_commission')
      .eq('id', invitee.guardian_id)
      .single();

    if (guardian) {
      await supabase
        .from('guardian_users')
        .update({
          total_commission: (guardian.total_commission || 0) + commissionAmount,
          available_commission: (guardian.available_commission || 0) + commissionAmount
        })
        .eq('id', invitee.guardian_id);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: commission.id,
        commissionAmount: commissionAmount / 100,
        guardianId: invitee.guardian_id
      }
    });

  } catch (error) {
    console.error('计算分成失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
