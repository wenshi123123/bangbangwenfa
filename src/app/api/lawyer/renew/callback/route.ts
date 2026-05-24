import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import crypto from 'crypto';

// 验证微信支付 XML 回调签名 (APIv2)
function verifyXmlCallbackSignature(params: Record<string, string>, apiKey: string): boolean {
  const sign = params.sign || params.signature;
  if (!sign) {
    console.error('缺少签名参数');
    return false;
  }

  // 排除 sign 字段，按 key 排序拼接
  const signParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'sign' && key !== 'signature' && value) {
      signParams[key] = value;
    }
  }

  const sortedKeys = Object.keys(signParams).sort();
  const signStr = sortedKeys
    .map(k => `${k}=${signParams[k]}`)
    .join('&') + `&key=${apiKey}`;

  const expectedSign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

  return sign.toUpperCase() === expectedSign;
}

// 处理支付成功回调
async function handlePaymentSuccess(tradeNo: string, orderNo: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 查询续费订单
  const { data: order, error: orderError } = await supabase
    .from('lawyer_renew_orders')
    .select('*, lawyers(id, user_id, member_expires_at)')
    .eq('order_no', orderNo)
    .single();

  if (orderError || !order) {
    console.error('续费订单不存在:', orderNo);
    return;
  }

  // 已支付则跳过
  if (order.payment_status === 'paid') {
    console.log('订单已支付:', orderNo);
    return;
  }

  // 计算新的到期时间
  const now = new Date();
  const months = order.months;
  let newExpiresAt: Date;

  if (order.lawyers?.member_expires_at) {
    const currentExpires = new Date(order.lawyers.member_expires_at);
    newExpiresAt = currentExpires > now 
      ? new Date(currentExpires.getTime() + months * 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
  } else {
    newExpiresAt = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
  }

  // 更新续费订单状态
  await supabase
    .from('lawyer_renew_orders')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      trade_no: tradeNo,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('order_no', orderNo);

  // 更新律师会员到期时间
  const { data: lawyerData } = await supabase
    .from('lawyers')
    .update({
      member_expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.lawyer_id)
    .select('user_id, phone')
    .single();

  // 🔧 同步更新 lawyer_applications 表
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
    newExpiresAt: newExpiresAt.toISOString(),
  });
}

// POST /api/lawyer/renew/callback - 微信支付回调
export async function POST(request: NextRequest) {
  try {
    // 获取原始请求体
    const rawBody = await request.text();
    console.log('收到微信支付回调:', rawBody);

    // 解析 XML
    const params: Record<string, string> = {};
    const regex = /<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>|<(\w+)>([^<]*)<\/\3>/g;
    let match;
    while ((match = regex.exec(rawBody)) !== null) {
      const key = match[1] || match[3];
      const value = match[2] || match[4];
      params[key] = value;
    }

    console.log('解析后的参数:', params);

    // 验证签名（APIv2 MD5 签名）
    const wechatPay = getWechatPayClient();
    const apiKey = process.env.WECHAT_PAY_API_KEY;
    if (!apiKey) {
      console.error('微信支付 API 密钥未配置，无法验证签名');
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证配置错误]]></return_msg></xml>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const signValid = verifyXmlCallbackSignature(params, apiKey);
    if (!signValid) {
      console.error('签名验证失败，可能为伪造回调');
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    console.log('签名验证通过');

    const { return_code, result_code, out_trade_no, transaction_id } = params;

    // 支付成功
    if (return_code === 'SUCCESS' && result_code === 'SUCCESS') {
      await handlePaymentSuccess(transaction_id, out_trade_no);
    } else {
      console.error('支付失败:', params);
    }

    // 返回成功响应
    return new NextResponse(
      '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (error) {
    console.error('处理微信支付回调失败:', error);
    return new NextResponse(
      '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}
