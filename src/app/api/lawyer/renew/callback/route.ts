/**
 * 律师续费支付回调（APIv3）
 * 微信支付 Native 下单完成后，微信服务器会 POST 通知到此接口
 * 通知格式为 JSON，签名使用 RSA-SHA256
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';
import { notifyOrder } from '@/lib/notify/webhook';
import { handleRenewalPaymentSuccess } from '@/lib/payment/renewal-settlement';
import crypto from 'crypto';

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
    // 微信支付回调的签名在独立的 Wechatpay-Signature 请求头中。
    // 保留 Authorization 解析作为兼容旧代理/测试请求的回退路径。
    const authorization = headers.get('authorization') || '';
    const signature = headers.get('wechatpay-signature')
      || authorization.match(/signature="([^"]+)"/)?.[1]
      || '';
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
    const result = await handleRenewalPaymentSuccess(transactionId, outTradeNo, paidAmount);
    if (!result.success) {
      console.error('处理支付成功失败:', result.error);
      return NextResponse.json(
        { code: 'FAIL', message: result.error },
        { status: 500 }
      );
    }

    if (result.paidNow) {
      await notifyOrder({
        type: 'Renew',
        userName: '律师用户',
        amount: paidAmount,
        detail: `续费订单 ${outTradeNo}`,
        orderId: outTradeNo,
        status: 'Paid',
        event: 'paid',
      });
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
