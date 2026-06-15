import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import crypto from 'crypto';

/**
 * 创建微信支付订单
 * POST /api/pay/create
 * Body: { orderId: number }
 */
export async function POST(request: NextRequest) {
  try {
    // 必须登录才能创建支付
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    const { orderId, openid: bodyOpenid, payMethod } = body;

    // 也支持从 URL query 参数获取 openid（小程序 webview 传参场景）
    const { searchParams } = new URL(request.url);
    const queryOpenid = searchParams.get('openid') || '';
    let openid = bodyOpenid || queryOpenid || '';

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '缺少订单号' },
        { status: 400 }
      );
    }

    // 查询订单信息
    const supabase = getSupabaseClient();
    const { data: order, error: orderError } = await supabase
      .from('consult_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    // 验证订单归属：从 Token 获取用户ID，不允许为他人订单创建支付
    const tokenUserId = auth.userId || auth.guardianId || auth.lawyerId;
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
    const callbackUrl = process.env.WEIXIN_CALLBACK_URL || 'https://www.bangbangwenfa.com/api/pay/callback';

    // 如果请求了 JSAPI 但没有 openid，尝试从数据库查找
    if (payMethod === 'jsapi' && !openid) {
      const userId = auth.userId || auth.guardianId;
      if (userId) {
        const { data: guardian } = await supabase
          .from('guardian_users')
          .select('openid')
          .eq('id', userId)
          .single();
        if (guardian?.openid) {
          openid = guardian.openid;
          console.log('[PayCreate] 从 guardian_users 表查找到 openid:', openid.slice(0, 6) + '***');
        }
      }
      // 也尝试从 consult_orders 表的 openid 字段查找
      if (!openid && order.openid) {
        openid = order.openid;
        console.log('[PayCreate] 从 consult_orders 表查找到 openid');
      }
    }

    let result: { prepayId: string; codeUrl?: string };
    let jsapiPayParams: any = null;

    // 重新判断（可能从数据库获取到了 openid）
    const shouldUseJsapi = payMethod === 'jsapi' && openid;

    if (shouldUseJsapi) {
      // 微信内 JSAPI 支付
      const jsapiResult = await wechatPay.createJsapiOrder({
        outTradeNo: payTradeNo,
        description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
        amount: order.service_price,
        notifyUrl: callbackUrl,
        openid,
      });
      result = { prepayId: jsapiResult.prepayId, codeUrl: '' };
      // 生成 JSAPI 调起参数
      jsapiPayParams = wechatPay.generateJsapiPayParams(jsapiResult.prepayId);
      console.log('[PayCreate] JSAPI 支付参数已生成, prepayId:', jsapiResult.prepayId);
    } else {
      // Native 支付（扫码）
      const nativeResult = await wechatPay.createNativeOrder({
        outTradeNo: payTradeNo,
        description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
        amount: order.service_price,
        notifyUrl: callbackUrl,
      });
      result = nativeResult;
    }

    // 更新订单表，添加微信支付订单号
    await supabase
      .from('consult_orders')
      .update({
        pay_trade_no: payTradeNo,
        pay_prepay_id: result.prepayId,
      })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      data: {
        orderId: orderId,
        payTradeNo: payTradeNo,
        codeUrl: result.codeUrl || '', // 二维码链接（Native模式）
        prepayId: result.prepayId,
        jsapiPayParams: jsapiPayParams || null, // JSAPI 调起参数（微信内）
      },
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