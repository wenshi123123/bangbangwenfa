import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

const REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;

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
      paymentOrder = order ? (await supabase.from('lawyer_application_payment_orders').select('order_no, status, amount, paid_at').eq('application_id', order.id).eq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle()).data : null;
    } else if (refundRequest.order_type === 'lawyer_renewal') {
      order = (await supabase.from('lawyer_renew_orders').select('*').eq('id', refundRequest.order_id).maybeSingle()).data;
    }

    const paymentStatus = order?.payment_status || paymentOrder?.status;
    if (!order || paymentStatus !== 'paid') {
      await supabase.from('refund_requests').update({ status: 'failed', failure_reason: '订单不是已支付状态', updated_at: new Date().toISOString(), processed_at: new Date().toISOString() }).eq('id', requestId);
      return NextResponse.json({ success: false, error: '订单不是已支付状态' }, { status: 409 });
    }

    const paidAtValue = order?.paid_at || paymentOrder?.paid_at;
    const paidAt = paidAtValue ? new Date(paidAtValue).getTime() : NaN;
    if (!Number.isFinite(paidAt) || Date.now() > paidAt + REFUND_WINDOW_MS) {
      await supabase.from('refund_requests').update({ status: 'failed', failure_reason: '已超过支付后 24 小时退款期限', updated_at: new Date().toISOString(), processed_at: new Date().toISOString() }).eq('id', requestId);
      return NextResponse.json({ success: false, error: '已超过支付后 24 小时退款期限' }, { status: 409 });
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

        // 续费退款必须撤销本次订单新增的会员记录，避免退款后仍可使用权益。
        const { data: revertedMemberships } = await supabase
          .from('membership_records')
          .update({ status: 'refunded', expires_at: now, updated_at: now })
          .eq('source_order_no', order.order_no)
          .in('status', ['active', 'trial'])
          .select('lawyer_id, package_type');

        const lawyerId = revertedMemberships?.[0]?.lawyer_id || order.lawyer_id;
        if (lawyerId) {
          const { data: remainingMemberships } = await supabase
            .from('membership_records')
            .select('package_type, expires_at')
            .eq('lawyer_id', lawyerId)
            .in('status', ['active', 'trial'])
            .gt('expires_at', now);
          const maxExpires = (remainingMemberships || [])
            .map((item) => new Date(item.expires_at).getTime())
            .filter(Number.isFinite)
            .reduce((max, value) => Math.max(max, value), 0);
          const { data: lawyer } = await supabase
            .from('lawyers')
            .select('selected_packages')
            .eq('id', lawyerId)
            .maybeSingle();
          const remainingTypes = new Set((remainingMemberships || []).map((item) => item.package_type));
          const currentPackages = Array.isArray(lawyer?.selected_packages)
            ? lawyer.selected_packages.filter((item: unknown): item is string => typeof item === 'string')
            : typeof lawyer?.selected_packages === 'string'
              ? (() => { try { const parsed = JSON.parse(lawyer.selected_packages); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } })()
              : [];
          const selectedPackages = currentPackages.filter((item) => {
            if (item.startsWith('criminal')) return remainingTypes.has('criminal');
            if (item.startsWith('civil')) return remainingTypes.has('civil');
            return true;
          });
          await supabase.from('lawyers').update({
            member_expires_at: maxExpires ? new Date(maxExpires).toISOString() : null,
            selected_packages: JSON.stringify(selectedPackages),
            membership_status: maxExpires ? 'normal' : 'expired',
            updated_at: now,
          }).eq('id', lawyerId);
        }
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
