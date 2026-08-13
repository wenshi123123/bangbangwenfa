import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { notifyOrder } from '@/lib/notify/webhook';

type PaidConsultNotificationResult =
  | { sent: true }
  | { sent: false; reason: 'already_sent' | 'not_paid' | 'claim_failed' | 'send_failed' };

function isNotificationSchemaMissing(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '42703' || /wecom_paid_notification/i.test(error?.message || '');
}

async function sendConsultPaidNotification(order: {
  id: string | number;
  order_no?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  service_price?: number | string | null;
  category?: string | null;
  service_type?: string | null;
}): Promise<PaidConsultNotificationResult> {
  const sent = await notifyOrder({
    type: 'Consult',
    userName: order.contact_name || '未填写联系人',
    phone: order.contact_phone || undefined,
    amount: Number(order.service_price || 0),
    detail: `${order.category === 'criminal' ? '刑事' : '民事'}咨询 - ${order.service_type || '咨询服务'}`,
    orderId: order.order_no || order.id,
    status: 'Paid',
    event: 'paid',
  });
  return sent ? { sent: true } : { sent: false, reason: 'send_failed' };
}

/**
 * 为咨询订单抢占一次企业微信“支付成功”通知发送权。
 * 状态更新和通知发送解耦：支付成功不会因 Webhook 故障回滚。
 */
export async function notifyPaidConsultOrderOnce(orderId: string | number): Promise<PaidConsultNotificationResult> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: order, error } = await supabase
    .from('consult_orders')
    .update({
      wecom_paid_notification_status: 'sending',
      wecom_paid_notification_attempts: 1,
      wecom_paid_notification_last_error: null,
    })
    .eq('id', orderId)
    .eq('payment_status', 'paid')
    .or('wecom_paid_notification_status.is.null,wecom_paid_notification_status.eq.failed')
    .select('id, order_no, contact_name, contact_phone, service_price, category, service_type, wecom_paid_notification_status')
    .maybeSingle();

  if (error) {
    // 允许代码先部署、数据库迁移稍后执行：支付状态已经由回调原子更新，
    // 在幂等字段尚不存在时沿用“状态转变只触发一次”的调用方保护。
    if (isNotificationSchemaMissing(error)) {
      const { data: fallbackOrder, error: fallbackError } = await supabase
        .from('consult_orders')
        .select('id, order_no, contact_name, contact_phone, service_price, category, service_type, payment_status')
        .eq('id', orderId)
        .maybeSingle();
      if (fallbackError || !fallbackOrder) return { sent: false, reason: 'claim_failed' };
      if (fallbackOrder.payment_status !== 'paid') return { sent: false, reason: 'not_paid' };
      console.warn('[WeCom] 通知幂等字段尚未迁移，使用支付状态转变兼容路径:', { orderId });
      return sendConsultPaidNotification(fallbackOrder);
    }
    console.error('[WeCom] 抢占咨询支付成功通知失败:', { orderId, error: error.message });
    return { sent: false, reason: 'claim_failed' };
  }

  if (!order) {
    const { data: existing } = await supabase
      .from('consult_orders')
      .select('payment_status, wecom_paid_notification_status')
      .eq('id', orderId)
      .maybeSingle();
    if (existing?.wecom_paid_notification_status === 'sent') return { sent: false, reason: 'already_sent' };
    return { sent: false, reason: existing?.payment_status === 'paid' ? 'claim_failed' : 'not_paid' };
  }

  try {
    const notificationResult = await sendConsultPaidNotification(order);
    if (!notificationResult.sent) throw new Error('企业微信 Webhook 未返回成功');

    await supabase
      .from('consult_orders')
      .update({
        wecom_paid_notification_status: 'sent',
        wecom_paid_notified_at: now,
        wecom_paid_notification_last_error: null,
      })
      .eq('id', orderId)
      .eq('wecom_paid_notification_status', 'sending');

    return { sent: true };
  } catch (notifyError) {
    const message = notifyError instanceof Error ? notifyError.message : '企业微信通知失败';
    await supabase
      .from('consult_orders')
      .update({
        wecom_paid_notification_status: 'failed',
        wecom_paid_notification_last_error: message.slice(0, 500),
      })
      .eq('id', orderId)
      .eq('wecom_paid_notification_status', 'sending');
    console.error('[WeCom] 咨询支付成功通知失败:', { orderId, error: message });
    return { sent: false, reason: 'send_failed' };
  }
}
