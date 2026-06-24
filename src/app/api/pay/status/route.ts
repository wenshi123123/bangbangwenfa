import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 咨询支付状态查询
 * GET /api/pay/status?payTradeNo=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const payTradeNo = searchParams.get('payTradeNo');

    if (!payTradeNo) {
      return NextResponse.json(
        { success: false, error: '支付单号不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data: order, error } = await supabase
      .from('consult_orders')
      .select('id, payment_status, service_price, pay_trade_no')
      .eq('pay_trade_no', payTradeNo)
      .maybeSingle();

    if (error) {
      console.error('查询支付状态失败:', error);
      return NextResponse.json(
        { success: false, error: '查询失败' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tradeState: order.payment_status === 'paid' ? 'SUCCESS' : 'NOTPAY',
        tradeStateDesc: order.payment_status,
        orderId: order.id,
        servicePrice: order.service_price,
      },
    });
  } catch (error) {
    console.error('查询咨询支付状态异常:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}
