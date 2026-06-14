/**
 * 微信支付回调接口（统一入口）
 * 
 * 此路由已统一使用 /api/pay/callback 的核心逻辑。
 * 保留此路由是为了兼容微信商户后台可能配置的旧回调URL。
 * 
 * 核心支付回调逻辑请参考 /api/pay/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatusAfterPayment } from '@/lib/payment/wechat-pay';
import { verifyWechatPaySignature } from '@/lib/payment/wechat-cert';
import { sendPaymentSuccessNotification } from '@/lib/wechat-oa';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    
    // 签名验证：任何环境都必须验证
    // 微信支付 APIv3 回调签名在 Authorization 头中
    // 格式: WECHATPAY2-SHA256-RSA2048 signature="xxx",serial_no="yyy",nonce_str="...",timestamp="..."
    const authorization = req.headers.get('authorization') || '';
    const signature = authorization.match(/signature="([^"]+)"/)?.[1] || '';
    const timestamp = req.headers.get('wechatpay-timestamp') || '';
    const nonce = req.headers.get('wechatpay-nonce') || '';
    const serialNo = req.headers.get('wechatpay-serial') || '';

    if (!signature || !serialNo) {
      console.error('支付回调缺少签名信息');
      return NextResponse.json({ 
        code: 'FAIL',
        message: '缺少签名信息'
      }, { status: 401 });
    }
    
    // 注意：verifyWechatPaySignature 参数顺序为 (signature, timestamp, nonce, body, serialNo)
    const verifyResult = await verifyWechatPaySignature(
      signature,
      timestamp,
      nonce,
      body,
      serialNo
    );
    
    if (!verifyResult.valid) {
      console.error('支付回调签名验证失败:', verifyResult.reason);
      return NextResponse.json({ 
        code: 'FAIL',
        message: '签名验证失败'
      }, { status: 401 });
    }
    
    // 1. 更新订单状态（支付成功）
    const result = await updateOrderStatusAfterPayment(body);
    
    if (!result.success) {
      console.error('支付回调处理失败:', result.error);
      // 注意：即使处理失败，也返回SUCCESS给微信，避免重复回调
      // 但在日志中记录错误以便排查
    }

    // 2. 支付成功后发送微信通知
    if (result.success && result.order?.user_wechat_openid) {
      try {
        const notifyResult = await sendPaymentSuccessNotification(
          result.order.user_wechat_openid,
          result.order.order_no,
          '法律咨询订单'
        );
        
        if (notifyResult.success) {
          console.log('微信支付成功通知已发送:', result.order.order_no);
        } else {
          console.warn('微信通知发送失败:', notifyResult.error);
        }
      } catch (notifyErr) {
        console.error('发送微信通知异常:', notifyErr);
      }
    }

    // 统一返回SUCCESS给微信支付系统
    return NextResponse.json({ 
      code: 'SUCCESS',
      message: '支付回调处理成功'
    });

  } catch (error) {
    console.error('支付回调错误:', error);
    // 返回SUCCESS防止微信重复回调
    return NextResponse.json({ 
      code: 'SUCCESS',
      message: '处理完成'
    }, { status: 200 });
  }
}

// 微信支付回调需要返回SUCCESS才不会再发送
export async function GET() {
  return NextResponse.json({ code: 'NOT_SUPPORTED' }, { status: 405 });
}
