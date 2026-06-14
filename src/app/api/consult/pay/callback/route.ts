/**
 * 微信支付回调接口（统一入口，兼容旧URL）
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatusAfterPayment } from '@/lib/payment/wechat-pay';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';
import { sendPaymentSuccessNotification } from '@/lib/wechat-oa';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('wechatpay-signature') || '';
    const timestamp = req.headers.get('wechatpay-timestamp') || '';
    const nonce = req.headers.get('wechatpay-nonce') || '';
    const serialNo = req.headers.get('wechatpay-serial') || '';

    if (!signature || !serialNo) {
      console.error('支付回调缺少签名信息');
      return NextResponse.json({ code: 'FAIL', message: '缺少签名信息' }, { status: 401 });
    }

    // verifyWechatPaySignature(signature, timestamp, nonce, body, serialNo)
    const verifyResult = await verifyWechatPaySignature(signature, timestamp, nonce, body, serialNo);
    if (!verifyResult.valid) {
      console.error('支付回调签名验证失败:', verifyResult.reason);
      return NextResponse.json({ code: 'FAIL', message: '签名验证失败' }, { status: 401 });
    }

    const result = await updateOrderStatusAfterPayment(body);
    if (!result.success) { console.error('支付回调处理失败:', result.error); }

    if (result.success && result.order?.user_wechat_openid) {
      try {
        const notifyResult = await sendPaymentSuccessNotification(result.order.user_wechat_openid, result.order.order_no, '法律咨询订单');
        if (notifyResult.success) { console.log('微信支付成功通知已发送:', result.order.order_no); }
        else { console.warn('微信通知发送失败:', notifyResult.error); }
      } catch (notifyErr) { console.error('发送微信通知异常:', notifyErr); }
    }

    return NextResponse.json({ code: 'SUCCESS', message: '支付回调处理成功' });
  } catch (error) {
    console.error('支付回调错误:', error);
    return NextResponse.json({ code: 'SUCCESS', message: '处理完成' }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ code: 'NOT_SUPPORTED' }, { status: 405 });
}
