/** 律师入驻与续费支付状态查询。 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { notifyOrder } from '@/lib/notify/webhook';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

function paymentResponse(order: any) {
  return NextResponse.json({
    success: true,
    data: {
      orderId: order.order_no,
      status: order.status,
      isPaid: order.status === 'paid',
      paidAt: order.paid_at,
      transactionId: order.wechat_transaction_id || null,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderRef = searchParams.get('orderId') || searchParams.get('orderNo');
    if (!orderRef) {
      return NextResponse.json({ success: false, error: '订单号不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 续费逻辑保持原有独立表和律师身份校验，不受入驻订单改造影响。
    if (orderRef.startsWith('RENEW')) {
      const auth = authenticateRequest(request);
      if (!auth?.success) return unauthorizedResponse(auth?.error || '请先登录');
      if (!auth.lawyerId) return NextResponse.json({ success: false, error: '非律师账号' }, { status: 403 });

      const { data: renewOrder, error: renewOrderError } = await supabase
        .from('lawyer_renew_orders')
        .select('order_no, lawyer_id, payment_status, paid_at, trade_no, expires_at')
        .eq('order_no', orderRef)
        .maybeSingle();
      if (renewOrderError || !renewOrder) return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
      if (String(renewOrder.lawyer_id) !== String(auth.lawyerId)) return NextResponse.json({ success: false, error: '无权查看此订单' }, { status: 403 });

      return NextResponse.json({
        success: true,
        data: {
          orderId: renewOrder.order_no,
          status: renewOrder.payment_status,
          isPaid: renewOrder.payment_status === 'paid',
          paidAt: renewOrder.paid_at,
          transactionId: renewOrder.trade_no,
          expiresAt: renewOrder.expires_at,
        },
      });
    }

    const auth = authenticateRequest(request);
    if (!auth?.success || !auth.user) {
      return unauthorizedResponse(auth?.error || '请先登录');
    }

    // 新订单优先。订单归属与关联申请归属必须同时匹配当前登录用户。
    const { data: paymentOrder, error: paymentOrderError } = await supabase
      .from('lawyer_application_payment_orders')
      .select('application_id, user_id, order_no, status, paid_at, wechat_transaction_id')
      .eq('order_no', orderRef)
      .maybeSingle();
    if (paymentOrderError) {
      console.error('[Lawyer/Pay/Status] 查询入驻订单失败:', paymentOrderError);
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
    }
    if (paymentOrder) {
      if (String(paymentOrder.user_id) !== String(auth.user.id)) {
        return NextResponse.json({ success: false, error: '无权查看此订单' }, { status: 403 });
      }
      const { data: application, error: applicationError } = await supabase
        .from('lawyer_applications')
        .select('id, user_id')
        .eq('id', paymentOrder.application_id)
        .maybeSingle();
      if (applicationError || !application) return NextResponse.json({ success: false, error: '订单关联申请不存在' }, { status: 404 });
      if (String(application.user_id) !== String(auth.user.id)) {
        return NextResponse.json({ success: false, error: '无权查看此订单' }, { status: 403 });
      }
      return paymentResponse(paymentOrder);
    }

    // 兼容新表上线前已写入 lawyer_applications.order_no 的历史入驻订单。
    const { data: application, error: legacyError } = await supabase
      .from('lawyer_applications')
      .select('id, user_id, order_no, payment_status, package_price, paid_at, wechat_transaction_id, name, phone, package_type')
      .eq('order_no', orderRef)
      .maybeSingle();
    if (legacyError || !application) return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    if (String(application.user_id) !== String(auth.user.id)) {
      return NextResponse.json({ success: false, error: '无权查看此订单' }, { status: 403 });
    }

    let paymentStatus = application.payment_status;
    let paidAt = application.paid_at;
    let transactionId = application.wechat_transaction_id || null;
    // 保留历史订单的微信补偿查询，不改变其原有业务语义。
    if (paymentStatus !== 'paid' && application.order_no) {
      try {
        const remote = await getWechatPayClient().queryOrder(application.order_no);
        if (remote.tradeState === 'SUCCESS' && (!remote.amount || remote.amount.total === application.package_price)) {
          const confirmedAt = new Date().toISOString();
          const { data: updatedApplication, error: updateError } = await supabase
            .from('lawyer_applications')
            .update({ payment_status: 'paid', paid_at: confirmedAt, wechat_transaction_id: remote.transactionId || transactionId })
            .eq('id', application.id)
            .neq('payment_status', 'paid')
            .select('id')
            .maybeSingle();
          if (!updateError && updatedApplication) {
            paymentStatus = 'paid';
            paidAt = confirmedAt;
            transactionId = remote.transactionId || transactionId;
            await notifyOrder({
              type: 'Registration', userName: application.name || application.phone || '未知', phone: application.phone || undefined,
              amount: application.package_price, detail: `套餐：${application.package_type || '律师入驻'}`,
              orderId: application.order_no, status: 'Paid', event: 'paid',
            });
          } else if (!updateError) {
            paymentStatus = 'paid';
          }
        }
      } catch (syncError) {
        console.error('[Lawyer/Pay/Status] 历史订单微信查单补偿失败:', syncError);
      }
    }

    return NextResponse.json({
      success: true,
      data: { orderId: application.order_no, status: paymentStatus, isPaid: paymentStatus === 'paid', paidAt, transactionId },
    });
  } catch (error) {
    console.error('[Lawyer/Pay/Status] 查询支付状态失败:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}
