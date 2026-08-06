import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

type RefundOrderType = 'consult' | 'lawyer_application' | 'lawyer_renewal';

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.success || !auth.userId) return unauthorizedResponse(auth.error);

  try {
    const body = await request.json().catch(() => ({}));
    const orderType = body.orderType as RefundOrderType;
    const orderId = String(body.orderId || '').trim();
    const reason = String(body.reason || '').trim();
    if (!['consult', 'lawyer_application', 'lawyer_renewal'].includes(orderType) || !orderId || !reason) {
      return NextResponse.json({ success: false, error: '退款订单和退款原因不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    let order: any = null;
    if (orderType === 'consult') {
      const result = await supabase.from('consult_orders').select('id, order_no, user_id, payment_status, service_price').eq('id', orderId).eq('user_id', auth.userId).maybeSingle();
      order = result.data;
    } else if (orderType === 'lawyer_application') {
      const result = await supabase.from('lawyer_applications').select('id, order_no, user_id, payment_status, package_price').eq('id', orderId).eq('user_id', auth.userId).maybeSingle();
      order = result.data;
      if (order) order.service_price = order.package_price;
    } else {
      const result = await supabase.from('lawyer_renew_orders').select('id, order_no, user_id, payment_status, package_price').eq('id', orderId).eq('user_id', auth.userId).maybeSingle();
      order = result.data;
      if (order) order.service_price = order.package_price;
    }

    if (!order) return NextResponse.json({ success: false, error: '订单不存在或无权操作' }, { status: 404 });
    if (order.payment_status !== 'paid') return NextResponse.json({ success: false, error: '只有已支付订单可以申请退款' }, { status: 409 });

    const { data, error } = await supabase.from('refund_requests').insert({
      order_type: orderType,
      order_id: orderId,
      order_no: order.order_no || null,
      user_id: String(auth.userId),
      amount: Number(order.service_price),
      reason,
      status: 'pending',
    }).select('id, status, created_at').single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: '该订单已有退款申请，请等待处理' }, { status: 409 });
      console.error('创建退款申请失败:', error);
      return NextResponse.json({ success: false, error: '提交退款申请失败' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('退款申请异常:', error);
    return NextResponse.json({ success: false, error: '提交退款申请失败' }, { status: 500 });
  }
}
