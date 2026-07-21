/** 微信律师入驻支付回调：新订单优先，历史申请订单仅作兼容回退。 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';
import { notifyOrder } from '@/lib/notify/webhook';
import crypto from 'crypto';

function failure(message: string, status = 200) {
  return NextResponse.json({ code: 'FAIL', message }, { status });
}

function success() {
  return NextResponse.json({ code: 'SUCCESS', message: 'OK' }, { status: 200 });
}

function decryptNotifyData(ciphertext: string, associatedData: string, nonce: string, apiV3Key: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), Buffer.from(nonce, 'utf8'));
  decipher.setAuthTag(Buffer.from(ciphertext.slice(-16), 'base64'));
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  return decipher.update(Buffer.from(ciphertext.slice(0, -16), 'base64'), undefined, 'utf8') + decipher.final('utf8');
}

async function parseVerifiedPayment(request: NextRequest) {
  const body = await request.text();
  const authorization = request.headers.get('authorization') || '';
  const signature = authorization.match(/signature="([^"]+)"/)?.[1] || '';
  const timestamp = request.headers.get('wechatpay-timestamp') || '';
  const nonce = request.headers.get('wechatpay-nonce') || '';
  const serial = request.headers.get('wechatpay-serial') || '';
  if (!signature || !serial) return { error: failure('缺少签名信息', 401) };

  const verified = await verifyWechatPaySignature(signature, timestamp, nonce, body, serial);
  if (!verified.valid) return { error: failure('签名验证失败', 401) };

  const apiV3Key = process.env.WEIXIN_APIV3_KEY || '';
  if (!apiV3Key) return { error: failure('配置错误', 500) };
  try {
    const notification = JSON.parse(body);
    const paymentResult = notification.resource?.ciphertext
      ? JSON.parse(decryptNotifyData(notification.resource.ciphertext, notification.resource.associated_data || '', notification.resource.nonce || '', apiV3Key))
      : notification;
    return { paymentResult };
  } catch {
    return { error: failure('Invalid notification', 400) };
  }
}

async function notifyRegistration(application: any, orderNo: string) {
  await notifyOrder({
    type: 'Registration',
    userName: application.name || application.phone || '未知',
    phone: application.phone || undefined,
    amount: application.package_price,
    detail: `套餐：${application.package_type || '律师入驻'}`,
    orderId: orderNo,
    status: 'Paid',
    event: 'paid',
  });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseVerifiedPayment(request);
    if ('error' in parsed) return parsed.error;
    const paymentResult = parsed.paymentResult;
    if (paymentResult.trade_state !== 'SUCCESS') return failure('Payment not successful');

    const outTradeNo = paymentResult.out_trade_no;
    const transactionId = paymentResult.transaction_id;
    if (!outTradeNo || !transactionId || !paymentResult.amount?.total) return failure('支付通知缺少订单或金额');

    const supabase = getSupabaseAdmin();
    // 新订单优先：所有新入驻支付必须先命中独立订单表。
    const { data: paymentOrder, error: paymentOrderError } = await supabase
      .from('lawyer_application_payment_orders')
      .select('application_id, user_id, order_no, amount, status, paid_at, wechat_transaction_id')
      .eq('order_no', outTradeNo)
      .maybeSingle();
    if (paymentOrderError) {
      console.error('[Lawyer/Pay/Callback] 查询新订单失败:', paymentOrderError);
      return failure('Order lookup failed', 500);
    }

    if (paymentOrder) {
      if (paymentOrder.amount !== paymentResult.amount.total) return failure('支付金额不一致');
      if (paymentOrder.status === 'paid') {
        if (paymentOrder.wechat_transaction_id && paymentOrder.wechat_transaction_id !== transactionId) return failure('微信交易号不一致');
        return success();
      }
      if (!['creating', 'pending'].includes(paymentOrder.status)) return failure('订单状态不允许支付完成');

      const { data: application, error: applicationError } = await supabase
        .from('lawyer_applications')
        .select('id, user_id, payment_status, order_no, wechat_transaction_id, paid_at, name, phone, package_price, package_type')
        .eq('id', paymentOrder.application_id)
        .maybeSingle();
      if (applicationError || !application) return failure('Application not found');
      if (String(paymentOrder.user_id) !== String(application.user_id)) return failure('订单归属不一致');
      if (application.wechat_transaction_id && application.wechat_transaction_id !== transactionId) return failure('申请已有不同微信交易号');

      const paidAt = new Date().toISOString();
      // 原子状态跃迁，重复回调不会将 paid 覆盖或降级。
      const { data: paidOrder, error: updateOrderError } = await supabase
        .from('lawyer_application_payment_orders')
        .update({ status: 'paid', paid_at: paidAt, wechat_transaction_id: transactionId, updated_at: paidAt })
        .eq('order_no', outTradeNo)
        .in('status', ['creating', 'pending'])
        .select('order_no')
        .maybeSingle();
      if (updateOrderError) return failure('Order update failed', 500);
      if (!paidOrder) {
        const { data: latestOrder } = await supabase
          .from('lawyer_application_payment_orders')
          .select('status, wechat_transaction_id')
          .eq('order_no', outTradeNo)
          .maybeSingle();
        return latestOrder?.status === 'paid' && (!latestOrder.wechat_transaction_id || latestOrder.wechat_transaction_id === transactionId)
          ? success() : failure('订单状态冲突');
      }

      const { data: updatedApplication, error: updateApplicationError } = await supabase
        .from('lawyer_applications')
        .update({ payment_status: 'paid', order_no: outTradeNo, wechat_transaction_id: transactionId, paid_at: paidAt })
        .eq('id', application.id)
        .neq('payment_status', 'paid')
        .select('id')
        .maybeSingle();
      if (updateApplicationError) return failure('Application update failed', 500);
      if (updatedApplication) await notifyRegistration(application, outTradeNo);
      return success();
    }

    // 历史订单兼容：新表上线前的二维码仍通过申请表 order_no 完成支付。
    const { data: application, error: legacyError } = await supabase
      .from('lawyer_applications')
      .select('id, user_id, payment_status, order_no, wechat_transaction_id, paid_at, name, phone, package_price, package_type')
      .eq('order_no', outTradeNo)
      .maybeSingle();
    if (legacyError || !application) return failure('Application not found');
    if (application.package_price !== paymentResult.amount.total) return failure('支付金额不一致');
    if (application.payment_status === 'paid') {
      return application.wechat_transaction_id && application.wechat_transaction_id !== transactionId ? failure('微信交易号不一致') : success();
    }

    const paidAt = new Date().toISOString();
    const { data: updatedApplication, error: updateError } = await supabase
      .from('lawyer_applications')
      .update({ payment_status: 'paid', order_no: outTradeNo, wechat_transaction_id: transactionId, paid_at: paidAt })
      .eq('id', application.id)
      .neq('payment_status', 'paid')
      .select('id')
      .maybeSingle();
    if (updateError) return failure('Update failed', 500);
    if (updatedApplication) await notifyRegistration(application, outTradeNo);
    return success();
  } catch (error) {
    console.error('[Lawyer/Pay/Callback] 处理失败:', error);
    return failure('Internal error', 500);
  }
}

export async function GET() {
  return success();
}
