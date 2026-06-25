import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';

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
      .select('id, payment_status, service_price, pay_trade_no, paid_at, wechat_transaction_id')
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

    let paymentStatus = order.payment_status;
    let paidAt = order.paid_at;
    let transactionId = order.wechat_transaction_id || null;

    // 兜底补偿：如果本地仍是未支付，主动查一次微信订单状态
    // 避免微信回调偶发未到导致前端长期卡在 pending
    if (paymentStatus !== 'paid') {
      try {
        const wechatPay = getWechatPayClient();
        const remote = await wechatPay.queryOrder(payTradeNo);

        if (remote.tradeState === 'SUCCESS') {
          const { error: updateError } = await supabase
            .from('consult_orders')
            .update({
              payment_status: 'paid',
              paid_at: new Date().toISOString(),
              wechat_transaction_id: remote.transactionId || transactionId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (!updateError) {
            paymentStatus = 'paid';
            paidAt = new Date().toISOString();
            transactionId = remote.transactionId || transactionId;
            console.log('[Pay/Status] 微信查单补偿成功:', {
              payTradeNo,
              orderId: order.id,
              transactionId,
            });
          } else {
            console.error('[Pay/Status] 微信查单补偿落库失败:', updateError);
          }
        } else {
          console.log('[Pay/Status] 微信查单结果未支付:', {
            payTradeNo,
            tradeState: remote.tradeState,
            tradeStateDesc: remote.tradeStateDesc,
          });
        }
      } catch (syncError) {
        console.error('[Pay/Status] 微信查单补偿异常:', syncError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tradeState: paymentStatus === 'paid' ? 'SUCCESS' : 'NOTPAY',
        tradeStateDesc: paymentStatus,
        orderId: order.id,
        servicePrice: order.service_price,
        paidAt,
        transactionId,
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
