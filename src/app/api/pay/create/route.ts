import { NextRequest, NextResponse } from 'next/server';
import { createWechatPayOrder } from '@/lib/payment/wechat-pay';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/pay/create
 * 创建微信支付订单
 */
export async function POST(req: NextRequest) {
  console.log('===== 创建支付订单 =====');

  try {
    const body = await req.json().catch(() => null);
    console.log('请求体:', JSON.stringify(body));

    if (!body || !body.orderId) {
      return NextResponse.json(
        { success: false, error: '缺少订单ID' },
        { status: 400 }
      );
    }

    const orderId = Number(body.orderId);
    const openid = body.openid || '';

    // 查询订单
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    console.log('订单查询结果:', { order: order ? 'found' : 'not found', error: orderError });

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    if (order.status === 'paid') {
      return NextResponse.json(
        { success: false, error: '订单已支付' },
        { status: 400 }
      );
    }

    if (order.status === 'expired') {
      return NextResponse.json(
        { success: false, error: '订单已过期' },
        { status: 400 }
      );
    }

    // 创建微信支付订单
    const amount = Number(order.amount);
    const description = order.description || '帮帮问法-法律服务';
    const outTradeNo = order.out_trade_no;

    console.log('创建微信支付:', { outTradeNo, amount, description, openid });

    const payResult = await createWechatPayOrder({
      outTradeNo,
      amount,
      description,
      openid
    });

    console.log('微信支付创建结果:', JSON.stringify(payResult).substring(0, 300));

    if (!payResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: payResult.error || '微信支付创建失败',
          debug: payResult.debug
        },
        { status: 502 }
      );
    }

    // 返回支付参数给前端
    return NextResponse.json({
      success: true,
      data: {
        codeUrl: payResult.code_url,
        prepayId: payResult.prepay_id,
        orderId: orderId,
        outTradeNo: outTradeNo,
        amount: amount,
        // JSAPI 支付参数（移动端/微信内）
        jsapiConfig: payResult.jsapi_config
      }
    });
  } catch (error: any) {
    console.error('创建支付订单异常:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || '服务器内部错误',
        debug: process.env.NODE_ENV !== 'production' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
