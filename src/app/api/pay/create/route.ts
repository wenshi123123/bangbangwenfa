import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { getSiteUrl, getWechatH5SiteUrl, normalizeCanonicalUrl } from '@/lib/site';
import { getPaymentClientContext, getWechatPaymentSession } from '@/lib/payment/payment-context';
import crypto from 'crypto';

/**
 * 创建微信支付订单
 * POST /api/pay/create
 * Body: { orderId: number }
 * 支持三种场景：PC(Native扫码)、手机浏览器(H5跳转)、微信内(JSAPI)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { orderId } = body ?? {};

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '缺少订单号' },
        { status: 400 }
      );
    }

    // 查询订单信息
    const supabase = getSupabaseClient();
    let { data: order, error: orderError } = await supabase
      .from('consult_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    const { channel } = getPaymentClientContext(request);
    const wechatSession = getWechatPaymentSession(request);
    const auth = authenticateRequest(request);

    if (channel === 'jsapi' && !wechatSession) {
      return NextResponse.json({ success: false, code: 'WECHAT_OAUTH_REQUIRED', error: '需要微信授权' }, { status: 401 });
    }

    if (!auth.success) {
      const orderOpenid = order?.openid ? String(order.openid) : null;
      const openidMatched = !!wechatSession && !!orderOpenid && wechatSession.openid === orderOpenid;

      if (!(channel === 'jsapi' && openidMatched)) {
        return unauthorizedResponse(auth.error);
      }
    }

    if (orderError || !order) {
      console.error('[Pay/Create] 订单不存在:', orderError);
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    // 验证订单归属：仅允许订单所有者发起支付
    const tokenUserId = auth.userId;
    if (order.user_id && tokenUserId && String(order.user_id) !== String(tokenUserId)) {
      return NextResponse.json(
        { success: false, error: '无权操作此订单' },
        { status: 403 }
      );
    }

    // 检查订单状态
    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: '订单已支付' },
        { status: 400 }
      );
    }

    // 生成微信支付订单号（最多32字符，微信支付限制）
    // WX(2) + 时间戳(13) + 随机hex(12) = 27字符，在32字符限制内
    const payTradeNo = `WX${Date.now()}${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // 正式模式：使用真实微信支付
    const wechatPay = getWechatPayClient();
    const siteUrl = getSiteUrl();
    const h5SiteUrl = getWechatH5SiteUrl();
    const callbackUrl =
      normalizeCanonicalUrl(process.env.WEIXIN_CALLBACK_URL || '')?.toString().replace(/\/$/, '') ||
      `${siteUrl}/api/pay/callback`;

    // 获取客户端 IP（H5 支付必须）
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // 判断是否移动端请求（前端通过 header 传递）
    // 微信内用 JSAPI，手机浏览器用 H5，PC 用 Native（二维码）
    let payData: {
      orderId: number;
      payTradeNo: string;
      prepayId?: string;
      codeUrl?: string;
      h5Url?: string;
      jsapiPayParams?: {
        appId: string;
        timeStamp: string;
        nonceStr: string;
        package: string;
        signType: 'RSA';
        paySign: string;
      };
    };

    if (channel === 'jsapi') {
      if (!wechatSession) {
        return NextResponse.json({ success: false, code: 'WECHAT_OAUTH_REQUIRED', error: '需要微信授权' }, { status: 401 });
      }
      const result = await wechatPay.createJsapiOrder({
        outTradeNo: payTradeNo,
        description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
        amount: order.service_price,
        notifyUrl: callbackUrl,
        payerOpenid: wechatSession.openid,
      });
      payData = { orderId, payTradeNo, prepayId: result.prepayId, jsapiPayParams: result.payParams };
    } else if (channel === 'h5') {
      const result = await wechatPay.createH5Order({
        outTradeNo: payTradeNo,
        description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
        amount: order.service_price,
        notifyUrl: callbackUrl,
        clientIp,
        appUrl: h5SiteUrl,
      });
      payData = { orderId, payTradeNo, prepayId: result.prepayId, h5Url: result.h5Url };
    } else {
      // PC：Native 扫码支付（原有逻辑）
      const result = await wechatPay.createNativeOrder({
        outTradeNo: payTradeNo,
        description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
        amount: order.service_price, // 单位：分
        notifyUrl: callbackUrl,
      });
      payData = {
        orderId,
        payTradeNo,
        prepayId: result.prepayId,
        codeUrl: result.codeUrl,
      };
      console.log('[Pay/Create] Native订单创建成功');
    }

    // 更新订单表，添加微信支付订单号
    await supabase
      .from('consult_orders')
      .update({
        pay_trade_no: payTradeNo,
        pay_prepay_id: payData.prepayId,
      })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      data: payData,
    });

  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || '未知错误';
    console.error('创建微信支付订单失败:', errorMsg);
    
    // 返回详细错误信息以便调试
    return NextResponse.json(
      { success: false, error: `创建支付订单失败: ${errorMsg}` },
      { status: 500 }
    );
  }
}
