/**
 * 律师续费支付回调（APIv3）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';
import crypto from 'crypto';

function calculateExpiry(baseDate: Date, months: number): Date {
  const result = new Date(baseDate);
  const originalDate = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== originalDate) result.setDate(0);
  return result;
}

function decryptNotifyData(encryptedData: Buffer, apiV3Key: string): Buffer {
  const nonce = encryptedData.subarray(0, 16);
  const tag = encryptedData.subarray(16, 32);
  const ciphertext = encryptedData.subarray(32);
  const key = Buffer.from(apiV3Key, 'utf8');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}

async function handlePaymentSuccess(tradeNo: string, orderNo: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data: order, error: orderError } = await supabase
    .from('lawyer_renew_orders').select('*, lawyers(id, user_id, member_expires_at)').eq('order_no', orderNo).single();
  if (orderError || !order) { console.error('续费订单不存在:', orderNo); return { success: false, error: '续费订单不存在' }; }
  if (order.payment_status === 'paid') { console.log('订单已处理，跳过:', orderNo); return { success: true }; }
  const months = order.months;
  let newExpiresAt: Date;
  if (order.lawyers?.member_expires_at) {
    const currentExpires = new Date(order.lawyers.member_expires_at);
    newExpiresAt = currentExpires > new Date() ? calculateExpiry(currentExpires, months) : calculateExpiry(new Date(), months);
  } else { newExpiresAt = calculateExpiry(new Date(), months); }
  const { error: updateOrderError } = await supabase.from('lawyer_renew_orders').update({
    payment_status: 'paid', paid_at: new Date().toISOString(), trade_no: tradeNo, expires_at: newExpiresAt.toISOString(),
  }).eq('order_no', orderNo);
  if (updateOrderError) { console.error('更新续费订单失败:', updateOrderError); return { success: false, error: '更新续费订单失败' }; }
  const { data: lawyerData, error: updateLawyerError } = await supabase.from('lawyers').update({
    member_expires_at: newExpiresAt.toISOString(), membership_status: 'normal', updated_at: new Date().toISOString(),
  }).eq('id', order.lawyer_id).select('user_id, phone').single();
  if (updateLawyerError) { console.error('更新律师会员到期时间失败:', updateLawyerError); return { success: false, error: '更新律师会员到期时间失败' }; }
  if (lawyerData) {
    await supabase.from('lawyer_applications').update({ member_expires_at: newExpiresAt.toISOString(), updated_at: new Date().toISOString() }).eq('user_id', lawyerData.user_id).eq('review_status', 'approved');
  }
  console.log('律师续费成功:', { orderNo, tradeNo, lawyerId: order.lawyer_id, months, newExpiresAt: newExpiresAt.toISOString() });
  return { success: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;

    let notifyData: any;
    try { notifyData = JSON.parse(body); } catch {
      console.error('回调数据 JSON 解析失败');
      return NextResponse.json({ code: 'FAIL', message: 'Invalid JSON' }, { status: 400 });
    }

    console.log('收到律师续费支付回调:', { eventType: notifyData.event_type, resourceType: notifyData.resource?.ciphertext ? 'encrypted' : 'plain' });

    const apiV3Key = process.env.WEIXIN_APIV3_KEY || '';
    if (!apiV3Key) {
      console.error('WEIXIN_APIV3_KEY 未配置');
      return NextResponse.json({ code: 'FAIL', message: 'API v3 key not configured' }, { status: 500 });
    }

    // ========== 签名验证 ==========
    const timestamp = headers.get('Wechatpay-Timestamp') || '';
    const nonce = headers.get('Wechatpay-Nonce') || '';
    const signature = headers.get('Wechatpay-Signature') || '';
    const serial = headers.get('Wechatpay-Serial') || '';

    if (!signature || !serial) {
      console.error('律师续费支付回调缺少签名信息');
      return NextResponse.json({ code: 'FAIL', message: '缺少签名信息' }, { status: 401 });
    }

    const verifyResult = await verifyWechatPaySignature(signature, timestamp, nonce, body, serial);
    if (!verifyResult.valid) {
      console.error('律师续费支付回调签名验证失败:', verifyResult.reason);
      return NextResponse.json({ code: 'FAIL', message: '签名验证失败' }, { status: 401 });
    }
    console.log('律师续费支付回调签名验证通过');

    let paymentResult: any;
    if (notifyData.resource?.ciphertext) {
      const { ciphertext, associated_data, nonce: resourceNonce } = notifyData.resource;
      const encryptedBuffer = Buffer.from(ciphertext, 'base64');
      const decrypted = decryptNotifyData(encryptedBuffer, apiV3Key);
      paymentResult = JSON.parse(decrypted.toString('utf8'));
    } else if (notifyData.trade_state) {
      paymentResult = notifyData;
    } else {
      console.error('无法解析回调数据:', notifyData);
      return NextResponse.json({ code: 'FAIL', message: 'Cannot parse notification' }, { status: 400 });
    }

    console.log('解密后的支付结果:', { tradeState: paymentResult.trade_state, outTradeNo: paymentResult.out_trade_no, transactionId: paymentResult.transaction_id });

    if (paymentResult.trade_state !== 'SUCCESS') {
      console.log('支付未成功:', paymentResult.trade_state);
      return NextResponse.json({ code: 'SUCCESS', message: 'OK' }, { status: 200 });
    }

    const transactionId = paymentResult.transaction_id;
    const outTradeNo = paymentResult.out_trade_no;
    const result = await handlePaymentSuccess(transactionId, outTradeNo);
    if (!result.success) {
      console.error('处理支付成功失败:', result.error);
      return NextResponse.json({ code: 'FAIL', message: result.error }, { status: 500 });
    }
    return NextResponse.json({ code: 'SUCCESS', message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('处理律师续费支付回调失败:', error);
    return NextResponse.json({ code: 'FAIL', message: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ code: 'SUCCESS', message: 'OK' }, { status: 200 });
}
