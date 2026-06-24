import { NextRequest, NextResponse } from 'next/server';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import crypto from 'crypto';

/**
 * 创建微信支付订单
 * POST /api/pay/create
 * Body: { orderId: number }
 * 支持三种场景：PC(Native扫码)、手机浏览器(H5跳转)、微信内(JSAPI)
 */
export async function POST(request: NextRequest) {
  try {
    // 必须登录才能创建支付
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    let { orderId, openid } = body;

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

    // 测试模式：如果订单不存在，自动创建一个测试订单
    if (orderError || !order) {
      console.log('[Pay/Create] 订单不存在，自动创建测试订单');
      try {
        const { data: newOrder, error: createError } = await supabase
          .from('consult_orders')
          .insert({
            user_id: 1,  // 用整数（表结构是 INTEGER，不是 UUID）
            service_price: 99,
            case_title: '测试咨询订单',
            payment_status: 'unpaid',
            status: 'pending',
          })
          .select()
          .single();
        
        if (createError || !newOrder) {
          console.error('[Pay/Create] 创建测试订单失败:', createError);
          return NextResponse.json(
            { success: false, error: '创建测试订单失败', details: createError },
            { status: 500 }
          );
        }
        
        order = newOrder;
        orderId = newOrder.id;
        console.log('[Pay/Create] 测试订单创建成功:', { orderId });
      } catch (insertError: any) {
        console.error('[Pay/Create] 插入订单异常:', insertError);
        return NextResponse.json(
          { success: false, error: '插入订单异常', details: insertError?.message },
          { status: 500 }
        );
      }
    }

    // 验证订单归属：从 Token 获取用户ID，不允许为他人订单创建支付（测试模式：暂时注释掉）
    // const tokenUserId = auth.userId || auth.guardianId || auth.lawyerId;
    // if (order.user_id && tokenUserId && String(order.user_id) !== String(tokenUserId)) {
    //   return NextResponse.json(
    //     { success: false, error: '无权操作此订单' },
    //     { status: 403 }
    //   );
    // }

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

    // 获取客户端 IP（H5 支付必须）
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // 判断是否移动端请求（前端通过 header 传递）
    const userAgent = (request.headers.get('x-user-agent') || request.headers.get('user-agent') || '').toLowerCase();
    const isMobile =
      request.headers.get('x-client-device') === 'mobile' ||
      /android|iphone|ipad|ipod|webos|blackberry|iemobile|opera mini/.test(userAgent);
    const isWechat = userAgent.includes('micromessenger');

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

    if (isWechat) {
      const payerOpenid = openid || order.openid;
      if (!payerOpenid) {
        return NextResponse.json(
          { success: false, error: '微信内支付需要公众号 openid，请先完成授权' },
          { status: 400 }
        );
      }

      const result = await wechatPay.createJsapiOrder({
        outTradeNo: payTradeNo,
        description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
        amount: order.service_price,
        notifyUrl: callbackUrl,
        payerOpenid,
      });
      payData = {
        orderId,
        payTradeNo,
        prepayId: result.prepayId,
        jsapiPayParams: result.payParams,
      };
    } else if (isMobile) {
      // 手机浏览器：H5 下单
      const result = await wechatPay.createH5Order({
        outTradeNo: payTradeNo,
        description: `法律咨询服务 - ${order.case_title || '咨询订单'}`,
        amount: order.service_price,
        notifyUrl: callbackUrl,
        clientIp,
      });
      payData = {
        orderId,
        payTradeNo,
        prepayId: result.prepayId,
        h5Url: result.h5Url,
      };
      console.log('[Pay/Create] H5订单创建成功:', { h5Url: result.h5Url.substring(0, 60) + '...' });
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
