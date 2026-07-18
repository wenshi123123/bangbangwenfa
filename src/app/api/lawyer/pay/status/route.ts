/**
 * 律师入驻支付状态查询
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { notifyOrder } from '@/lib/notify/webhook';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const orderNo = searchParams.get('orderNo');
    const orderRef = orderId || orderNo;

    if (!orderRef) {
      return NextResponse.json(
        { success: false, error: '订单号不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 通过订单号查找申请
    const { data: application, error } = await supabase
      .from('lawyer_applications')
      .select('id, order_no, payment_status, package_price, paid_at, wechat_transaction_id, name, phone, package_type')
      .or(`order_no.eq.${orderRef},id.eq.${orderRef}`)
      .single();

    if (error || !application) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    let paymentStatus = application.payment_status;
    let paidAt = application.paid_at;
    let transactionId = application.wechat_transaction_id || null;

    // 微信回调可能延迟或偶发失败；以微信查单作为支付完成的最终补偿。
    if (paymentStatus !== 'paid' && application.order_no) {
      try {
        const remote = await getWechatPayClient().queryOrder(application.order_no);
        if (remote.tradeState === 'SUCCESS') {
          if (remote.amount && remote.amount.total !== application.package_price) {
            console.error('[Lawyer/Pay/Status] 微信金额不匹配:', { orderNo: application.order_no, remote: remote.amount.total, local: application.package_price });
          } else {
            const confirmedAt = new Date().toISOString();
            const { data: updatedApplication, error: updateError } = await supabase
              .from('lawyer_applications')
              .update({
                payment_status: 'paid',
                paid_at: confirmedAt,
                wechat_transaction_id: remote.transactionId || transactionId,
              })
              .eq('id', application.id)
              // 与微信回调并发时，只有首个更新者发送“支付成功”通知。
              .neq('payment_status', 'paid')
              .select('id')
              .maybeSingle();
            if (!updateError && updatedApplication) {
              paymentStatus = 'paid';
              paidAt = confirmedAt;
              transactionId = remote.transactionId || transactionId;
              await notifyOrder({
                type: 'Registration',
                userName: application.name || application.phone || '未知',
                phone: application.phone || undefined,
                amount: application.package_price,
                detail: `套餐：${application.package_type || '律师入驻'}`,
                orderId: application.order_no,
                status: 'Paid',
                event: 'paid',
              });
            } else if (!updateError) {
              // 另一条并发请求刚刚完成了更新，微信侧已确认成功。
              paymentStatus = 'paid';
            }
          }
        }
      } catch (syncError) {
        console.error('[Lawyer/Pay/Status] 微信查单补偿失败:', syncError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: application.order_no || application.id,
        status: paymentStatus,
        isPaid: paymentStatus === 'paid',
        paidAt,
        transactionId,
      },
    });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}
