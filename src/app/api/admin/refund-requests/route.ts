import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

function refundNumber(id: number | string) {
  return `RF${Date.now()}${String(id).replace(/\D/g, '').slice(-8)}`.slice(0, 64);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return adminUnauthorizedResponse(auth.error);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('refund_requests').select('id, order_type, order_id, order_no, amount, reason, status, created_at').in('status', ['pending', 'processing']).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ success: false, error: '查询退款申请失败' }, { status: 500 });
  return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return adminUnauthorizedResponse(auth.error);

  try {
    const { requestId } = await request.json().catch(() => ({}));
    if (!requestId) return NextResponse.json({ success: false, error: '缺少退款申请编号' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: refundRequest, error: requestError } = await supabase.from('refund_requests').select('*').eq('id', requestId).maybeSingle();
    if (requestError || !refundRequest) return NextResponse.json({ success: false, error: '退款申请不存在' }, { status: 404 });
    if (refundRequest.status !== 'pending') return NextResponse.json({ success: false, error: '该退款申请已处理' }, { status: 409 });

    const { data: claimed, error: claimError } = await supabase.from('refund_requests').update({ status: 'processing', reviewer_id: auth.adminId || null, updated_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'pending').select('*').maybeSingle();
    if (claimError || !claimed) return NextResponse.json({ success: false, error: '退款申请正在被其他管理员处理' }, { status: 409 });

    let order: any = null;
    let paymentOrder: any = null;
    if (refundRequest.order_type === 'consult') {
      order = (await supabase.from('consult_orders').select('*').eq('id', refundRequest.order_id).maybeSingle()).data;
    } else if (refundRequest.order_type === 'lawyer_application') {
      order = (await supabase.from('lawyer_applications').select('*').eq('id', refundRequest.order_id).maybeSingle()).data;
      paymentOrder = order ? (await supabase.from('lawyer_application_payment_orders').select('order_no, status, amount').eq('application_id', order.id).eq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle()).data : null;
    } else if (refundRequest.order_type === 'lawyer_renewal') {
      order = (await supabase.from('lawyer_renew_orders').select('*').eq('id', refundRequest.order_id).maybeSingle()).data;
    }

    const paymentStatus = order?.payment_status || paymentOrder?.status;
    if (!order || paymentStatus !== 'paid') {
      await supabase.from('refund_requests').update({ status: 'failed', failure_reason: '订单不是已支付状态', updated_at: new Date().toISOString(), processed_at: new Date().toISOString() }).eq('id', requestId);
      return NextResponse.json({ success: false, error: '订单不是已支付状态' }, { status: 409 });
    }

    const outTradeNo = paymentOrder?.order_no || order.pay_trade_no || order.trade_no || order.order_no;
    const totalAmount = Number(order.service_price || order.package_price || paymentOrder?.amount || 0);
    if (!outTradeNo || !totalAmount) {
      await supabase.from('refund_requests').update({ status: 'failed', failure_reason: '缺少原支付单号或金额', updated_at: new Date().toISOString(), processed_at: new Date().toISOString() }).eq('id', requestId);
      return NextResponse.json({ success: false, error: '退款信息不完整' }, { status: 409 });
    }

    const outRefundNo = refundNumber(requestId);
    try {
      const result = await getWechatPayClient().refundOrder({ outTradeNo, outRefundNo, amount: Number(refundRequest.amount), totalAmount, reason: refundRequest.reason });
      const now = new Date().toISOString();
      if (refundRequest.order_type === 'consult') {
        await supabase.from('consult_orders').update({ payment_status: 'refunded', refund_at: now, updated_at: now }).eq('id', refundRequest.order_id).eq('payment_status', 'paid');
      } else if (refundRequest.order_type === 'lawyer_application') {
        await supabase.from('lawyer_applications').update({ payment_status: 'refunded', refund_at: now, updated_at: now }).eq('id', refundRequest.order_id).eq('payment_status', 'paid');
      } else {
        await supabase.from('lawyer_renew_orders').update({ payment_status: 'refunded', updated_at: now }).eq('id', refundRequest.order_id).eq('payment_status', 'paid');
      }
      await supabase.from('refund_requests').update({ status: 'succeeded', wechat_refund_no: outRefundNo, wechat_refund_id: result.refundId || null, updated_at: now, processed_at: now }).eq('id', requestId);
      return NextResponse.json({ success: true, data: { requestId, status: 'succeeded', refundId: result.refundId || null } });
    } catch (error: any) {
      const message = error?.message || '微信退款失败';
      await supabase.from('refund_requests').update({ status: 'failed', failure_reason: message, updated_at: new Date().toISOString(), processed_at: new Date().toISOString() }).eq('id', requestId);
      return NextResponse.json({ success: false, error: message }, { status: 502 });
    }
  } catch (error) {
    console.error('处理退款申请异常:', error);
    return NextResponse.json({ success: false, error: '处理退款申请失败' }, { status: 500 });
  }
}
