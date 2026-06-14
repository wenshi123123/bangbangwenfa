import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { getSupabaseClient, getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import crypto from 'crypto';

/**
 * 创建微信支付订单（H5 支付）
 * POST /api/pay/create
 * Body: { orderId: number }
 *
 * H5 支付不需要 openid，微信内跳出浏览器拉起微信支付。
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

    // 验证订单归属
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

    // 获取用户真实 IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // 调用微信支付 H5 下单
    const wechatPay = getWechatPayClient();
    const callbackUrl = process.env.WEIXIN_CALLBACK_URL || 'https://www.bangbangwenfa.com/api/pay/callback';

    const result = await wechatPay.createH5Order({
      outTradeNo: `WX${Date.now()}${crypto.randomBytes(16).toString('hex').toUpperCase()}`,
      description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
      amount: order.service_price, // 单位：分
      notifyUrl: callbackUrl,
      clientIp,
    });

    return NextResponse.json({
      success: true,
      data: {
        h5_url: result.h5Url,
      },
    });

  } catch (error: any) {
    console.error('创建微信支付订单失败:', error);

    if (error.message?.includes('配置')) {
      return NextResponse.json(
        { success: false, error: '支付配置错误，请联系管理员' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: '创建支付订单失败' },
      { status: 500 }
    );
  }
}
