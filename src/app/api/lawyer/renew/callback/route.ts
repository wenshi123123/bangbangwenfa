/**
 * 律师续费支付回调（APIv3）
 * 微信支付 Native 下单完成后，微信服务器会 POST 通知到此接口
 * 通知格式为 JSON，签名使用 RSA-SHA256
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';
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
function decryptNotifyData(
  ciphertext: string,
  associatedData: string,
  nonce: string,
  apiV3Key: string
): string {
  const key = Buffer.from(apiV3Key, 'utf8');
  const iv = Buffer.from(nonce, 'utf8');
  const authTag = Buffer.from(ciphertext.slice(-16), 'base64');
  const data = Buffer.from(ciphertext.slice(0, -16), 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));

  let decrypted = decipher.update(data, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// 处理支付成功逻辑（幂等）
async function handlePaymentSuccess(tradeNo: string, orderNo: string, paidAmount: number): Promise<{ success: boolean; error?: string }> {
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

  if (Number(order.package_price) !== paidAmount) {
    console.error('续费订单支付金额不一致:', { orderNo, expected: order.package_price, actual: paidAmount });
    return { success: false, error: '支付金额不一致' };
  }

  const alreadyPaid = order.payment_status === 'paid';
  if (!alreadyPaid && !['pending', 'paying'].includes(order.payment_status)) {
    return { success: false, error: '订单状态不允许完成支付' };
  }

  const membershipPackage = String(order.package_id).startsWith('criminal_') ? 'criminal' : 'civil';
  const { data: existingMembership } = await supabase
    .from('membership_records')
    .select('id, expires_at')
    .eq('source_order_no', order.order_no)
    .maybeSingle();

  const { data: activeMembership } = await supabase
    .from('membership_records')
    .select('expires_at')
    .eq('lawyer_id', order.lawyer_id)
    .eq('package_type', membershipPackage)
    .in('status', ['active', 'trial'])
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 计算新的到期时间（精确按月计算）
  const months = order.months;
  let newExpiresAt: Date;

  const packageExpiry = order.expires_at || existingMembership?.expires_at || activeMembership?.expires_at || order.lawyers?.member_expires_at;
  if (packageExpiry && alreadyPaid) {
    newExpiresAt = new Date(packageExpiry);
  } else if (packageExpiry) {
    const currentExpires = new Date(packageExpiry);
    newExpiresAt = currentExpires > new Date()
      ? calculateExpiry(currentExpires, months)
      : calculateExpiry(new Date(), months);
  } else {
    newExpiresAt = calculateExpiry(new Date(), months);
  }

  if (!alreadyPaid) {
    const { error: updateOrderError } = await supabase
      .from('lawyer_renew_orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        trade_no: tradeNo,
        expires_at: newExpiresAt.toISOString(),
        payment_completed_at: new Date().toISOString(),
      })
      .eq('order_no', orderNo)
      .in('payment_status', ['pending', 'paying']);

    if (updateOrderError) {
      console.error('更新续费订单失败:', updateOrderError);
      return { success: false, error: '更新续费订单失败' };
    }
  }

  if (!existingMembership) {
    const { error: membershipError } = await supabase
      .from('membership_records')
      .insert({
        lawyer_id: order.lawyer_id,
        package_type: membershipPackage,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: newExpiresAt.toISOString(),
        source_type: 'renewal',
        source_order_no: order.order_no,
        is_complimentary: false,
      });
    if (membershipError && membershipError.code !== '23505') {
      console.error('更新套餐会员资格失败:', membershipError);
      return { success: false, error: '更新套餐会员资格失败' };
    }
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
    const apiV3Key = process.env.WEIXIN_APIV3_KEY || '';
    if (!apiV3Key) {
      console.error('WEIXIN_APIV3_KEY 未配置');
      return NextResponse.json(
        { code: 'FAIL', message: 'API v3 key not configured' },
        { status: 500 }
      );
    }

    // ========== 签名验证（任何环境都必须验证，防止伪造回调）==========
    // 微信支付 APIv3 回调签名在 Authorization 头中
    // 格式: WECHATPAY2-SHA256-RSA2048 signature="xxx",serial_no="yyy",nonce_str="...",timestamp="..."
    const authorization = headers.get('authorization') || '';
    const signature = authorization.match(/signature="([^"]+)"/)?.[1] || '';
    const timestamp = headers.get('wechatpay-timestamp') || '';
    const nonce = headers.get('wechatpay-nonce') || '';
    const serial = headers.get('wechatpay-serial') || '';

    if (!signature || !serial) {
      console.error('律师续费支付回调缺少签名信息');
      return NextResponse.json(
        { code: 'FAIL', message: '缺少签名信息' },
        { status: 401 }
      );
    }

    // 注意：verifyWechatPaySignature 参数顺序为 (signature, timestamp, nonce, body, serialNo)
    const verifyResult = await verifyWechatPaySignature(
      signature,
      timestamp,
      nonce,
      body,
      serial
    );

    if (!verifyResult.valid) {
      console.error('律师续费支付回调签名验证失败:', verifyResult.reason);
      return NextResponse.json(
        { code: 'FAIL', message: '签名验证失败' },
        { status: 401 }
      );
    }
    console.log('律师续费支付回调签名验证通过');

    // 解密通知数据
    let paymentResult: any;

      if (notifyData.resource?.ciphertext) {
        // 加密数据：需要解密
        const { ciphertext, associated_data, nonce: resourceNonce } = notifyData.resource;
        paymentResult = JSON.parse(
          decryptNotifyData(
            ciphertext,
            associated_data || '',
            resourceNonce || '',
            apiV3Key
          )
        );
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
    const paidAmount = Number(paymentResult.amount?.total);
    if (!Number.isFinite(paidAmount)) {
      return NextResponse.json({ code: 'FAIL', message: '支付通知缺少金额' }, { status: 400 });
    }

    // 处理支付成功
    const result = await handlePaymentSuccess(transactionId, outTradeNo, paidAmount);
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
