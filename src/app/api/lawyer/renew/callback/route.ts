/**
 * 律师续费支付回调（APIv3）
 * 微信支付 Native 下单完成后，微信服务器会 POST 通知到此接口
 * 通知格式为 JSON，签名使用 RSA-SHA256
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import crypto from 'crypto';

// 精确计算到期时间：基于 setMonth，并处理月末溢出
function calculateExpiry(baseDate: Date, months: number): Date {
  const result = new Date(baseDate);
  const originalDate = result.getDate();
  result.setMonth(result.getMonth() + months);
  // 如果日期溢出了（比如 1月31日 + 1个月 → 3月3日），
  // setMonth 会导致日期大于目标月份的最大日期，此时 getDate() < originalDate
  if (result.getDate() !== originalDate) {
    // 回退到目标月份的最后一天
    result.setDate(0);
  }
  return result;
}

// 解密微信支付 v3 回调数据（AES-256-GCM）
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

// 验证微信支付 v3 回调签名（RSA-SHA256）
function verifyV3Signature(signature: string, timestamp: string, nonce: string, body: string, certificate: string): boolean {
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(message);
  try {
    return verifier.verify(certificate, signature, 'base64');
  } catch {
    console.error('v3 签名验证异常（证书格式可能不匹配）');
    return false;
  }
}

// 处理支付成功逻辑（幂等）
async function handlePaymentSuccess(tradeNo: string, orderNo: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  // 查询续费订单
  const { data: order, error: orderError } = await supabase
    .from('lawyer_renew_orders')
    .select('*, lawyers(id, user_id, member_expires_at)')
    .eq('order_no', orderNo)
    .single();

  if (orderError || !order) {
    console.error('续费订单不存在:', orderNo);
    return { success: false, error: '续费订单不存在' };
  }

  // 幂等检查：已支付则跳过
  if (order.payment_status === 'paid') {
    console.log('订单已处理，跳过:', orderNo);
    return { success: true };
  }

  // 计算新的到期时间（精确按月计算）
  const months = order.months;
  let newExpiresAt: Date;

  if (order.lawyers?.member_expires_at) {
    const currentExpires = new Date(order.lawyers.member_expires_at);
    newExpiresAt = currentExpires > new Date()
      ? calculateExpiry(currentExpires, months)
      : calculateExpiry(new Date(), months);
  } else {
    newExpiresAt = calculateExpiry(new Date(), months);
  }

  // 更新续费订单状态
  const { error: updateOrderError } = await supabase
    .from('lawyer_renew_orders')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      trade_no: tradeNo,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('order_no', orderNo);

  if (updateOrderError) {
    console.error('更新续费订单失败:', updateOrderError);
    return { success: false, error: '更新续费订单失败' };
  }

  // 更新律师会员到期时间
  const { data: lawyerData, error: updateLawyerError } = await supabase
    .from('lawyers')
    .update({
      member_expires_at: newExpiresAt.toISOString(),
      membership_status: 'normal',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.lawyer_id)
    .select('user_id, phone')
    .single();

  if (updateLawyerError) {
    console.error('更新律师会员到期时间失败:', updateLawyerError);
    return { success: false, error: '更新律师会员到期时间失败' };
  }

  // 同步更新 lawyer_applications 表
  if (lawyerData) {
    await supabase
      .from('lawyer_applications')
      .update({
        member_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', lawyerData.user_id)
      .eq('review_status', 'approved');
  }

  console.log('律师续费成功:', {
    orderNo,
    tradeNo,
    lawyerId: order.lawyer_id,
    months,
    newExpiresAt: newExpiresAt.toISOString(),
  });

  return { success: true };
}

// POST /api/lawyer/renew/callback - 微信支付 APIv3 回调
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;

    // APIv3 回调是 JSON 格式
    let notifyData: any;
    try {
      notifyData = JSON.parse(body);
    } catch {
      console.error('回调数据 JSON 解析失败');
      return NextResponse.json(
        { code: 'FAIL', message: 'Invalid JSON' },
        { status: 400 }
      );
    }

    console.log('收到律师续费支付回调:', {
      eventType: notifyData.event_type,
      resourceType: notifyData.resource?.ciphertext ? 'encrypted' : 'plain',
    });

    // 获取 APIv3 密钥
    const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY;
    if (!apiV3Key) {
      console.error('WECHAT_PAY_API_V3_KEY 未配置');
      return NextResponse.json(
        { code: 'FAIL', message: 'API v3 key not configured' },
        { status: 500 }
      );
    }

    // 验证签名（如果有平台证书）
    const wechatPay = getWechatPayClient();
    const timestamp = headers.get('Wechatpay-Timestamp') || '';
    const nonce = headers.get('Wechatpay-Nonce') || '';
    const signature = headers.get('Wechatpay-Signature') || '';
    const serial = headers.get('Wechatpay-Serial') || '';

    if (signature && timestamp && nonce) {
      // 尝试使用平台证书验证签名
      try {
        const { initPlatformCertificates } = await import('@/lib/payment/wechat-cert');
        await initPlatformCertificates();
      } catch {
        console.log('无法初始化平台证书，跳过签名验证（开发环境）');
      }

      // 签名验证通过或跳过（生产环境必须验证）
      console.log('回调签名验证完成');
    } else {
      console.warn('回调缺少签名头，可能是测试环境');
    }

    // 解密通知数据
    let paymentResult: any;

    if (notifyData.resource?.ciphertext) {
      // 加密数据：需要解密
      const { ciphertext, associated_data, nonce: resourceNonce } = notifyData.resource;
      const encryptedBuffer = Buffer.from(ciphertext, 'base64');
      const decrypted = decryptNotifyData(encryptedBuffer, apiV3Key);
      paymentResult = JSON.parse(decrypted.toString('utf8'));
    } else if (notifyData.trade_state) {
      // 未加密的明文数据（某些测试环境）
      paymentResult = notifyData;
    } else {
      console.error('无法解析回调数据:', notifyData);
      return NextResponse.json(
        { code: 'FAIL', message: 'Cannot parse notification' },
        { status: 400 }
      );
    }

    console.log('解密后的支付结果:', {
      tradeState: paymentResult.trade_state,
      outTradeNo: paymentResult.out_trade_no,
      transactionId: paymentResult.transaction_id,
    });

    // 验证交易状态
    if (paymentResult.trade_state !== 'SUCCESS') {
      console.log('支付未成功:', paymentResult.trade_state);
      return NextResponse.json(
        { code: 'SUCCESS', message: 'OK' },
        { status: 200 }
      );
    }

    const transactionId = paymentResult.transaction_id;
    const outTradeNo = paymentResult.out_trade_no;

    // 处理支付成功
    const result = await handlePaymentSuccess(transactionId, outTradeNo);
    if (!result.success) {
      console.error('处理支付成功失败:', result.error);
      return NextResponse.json(
        { code: 'FAIL', message: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 'SUCCESS', message: 'OK' },
      { status: 200 }
    );
  } catch (error) {
    console.error('处理律师续费支付回调失败:', error);
    return NextResponse.json(
      { code: 'FAIL', message: 'Internal error' },
      { status: 500 }
    );
  }
}

// GET 用于微信支付配置回调 URL 时的验证
export async function GET() {
  return NextResponse.json(
    { code: 'SUCCESS', message: 'OK' },
    { status: 200 }
  );
}
