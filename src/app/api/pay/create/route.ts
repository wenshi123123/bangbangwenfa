import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import crypto from 'crypto';

/**
 * 创建微信支付订单
 * POST /api/pay/create
 * Body: { orderId: number }
 */
export async function POST(request: NextRequest) {
  try {
    // 必须登录才能创建支付
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '缺少订单号' },
        { status: 400 }
      );
    }

    // 查询订单信息
    const supabase = getSupabaseClient();
    const { data: order, error: orderError } = await supabase
      .from('consult_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    // 验证订单归属：从 Token 获取用户ID，不允许为他人订单创建支付
    const tokenUserId = auth.userId || auth.guardianId || auth.lawyerId;
    if (order.user_id && tokenUserId && String(order.user_id) !== String(tokenUserId)) {
      return NextResponse.json(
        { success: false, error: '无权操作此订单' },
        { status: 403 }
      );
    }

    // 检查订单状态
    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: '订单已支付' },
        { status: 400 }
      );
    }

    // 生成微信支付订单号（增强随机性，16字节不可预测）
    const payTradeNo = `WX${Date.now()}${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

    // 正式模式：使用真实微信支付
    const wechatPay = getWechatPayClient();
    const callbackUrl = process.env.WEIXIN_CALLBACK_URL || 'https://www.bangbangwenfa.com/api/pay/callback';

    // 创建 Native 支付订单
    const result = await wechatPay.createNativeOrder({
      outTradeNo: payTradeNo,
      description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
      amount: order.service_price, // 单位：分
      notifyUrl: callbackUrl,
    });

    // 更新订单表，添加微信支付订单号
    await supabase
      .from('consult_orders')
      .update({
        pay_trade_no: payTradeNo,
        pay_prepay_id: result.prepayId,
      })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      data: {
        orderId: orderId,
        payTradeNo: payTradeNo,
        codeUrl: result.codeUrl, // 二维码链接
        prepayId: result.prepayId,
      },
    });

  } catch (error: any) {
    console.error('创建微信支付订单失败:', error);
    
    // 返回具体错误信息（临时用仦排查）
    const errMsg = error?.message || error || '未知错误';
    const isConfigError = typeof errMsg === 'string' && errMsg.includes('配置');
    const isKeyError = typeof errMsg === 'string' && (
      errMsg.includes('私钥') || 
     errMsg.includes('privateKey') ||
      errMsg.includes('PRIVATE') ||
      errMsg.includes('环境变量')
    );

    return NextResponse.json(
      { success: false, error: isConfigError ? '支付配置错误，请联系管理员' : `创建支付订单失败: ${errMsg}`, debug: errMsg },
      { status: 500 }
    );
  }
}
