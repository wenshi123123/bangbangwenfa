import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { createConsultPaymentHandoff } from '@/lib/payment/payment-handoff';

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.success || !auth.userId) return unauthorizedResponse(auth.error);

  try {
    const { orderId } = await request.json().catch(() => ({}));
    const parsedOrderId = Number(orderId);
    if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
      return NextResponse.json({ success: false, error: '订单号无效' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data: order, error } = await supabase
      .from('consult_orders')
      .select('id, user_id, payment_status')
      .eq('id', parsedOrderId)
      .maybeSingle();

    if (error) return NextResponse.json({ success: false, error: '查询订单失败' }, { status: 500 });
    if (!order || Number(order.user_id) !== Number(auth.userId)) {
      return NextResponse.json({ success: false, error: '无权操作此订单' }, { status: 403 });
    }
    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: false, error: '订单已支付' }, { status: 400 });
    }

    const handoffToken = createConsultPaymentHandoff(parsedOrderId, Number(auth.userId));
    if (!handoffToken) {
      return NextResponse.json({ success: false, error: '支付会话暂不可用，请稍后重试' }, { status: 503 });
    }

    return NextResponse.json({ success: true, data: { handoffToken } });
  } catch (error) {
    console.error('[Pay/Handoff] 创建支付凭证失败:', error);
    return NextResponse.json({ success: false, error: '创建支付会话失败' }, { status: 500 });
  }
}
