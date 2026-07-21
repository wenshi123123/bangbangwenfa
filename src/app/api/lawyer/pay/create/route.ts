import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { getSiteUrl, getWechatH5SiteUrl } from '@/lib/site';
import { getPaymentClientContext, getWechatPaymentSession } from '@/lib/payment/payment-context';

const SITE_URL = getSiteUrl();
const H5_SITE_URL = getWechatH5SiteUrl();
const PAYMENT_TTL_MS = 5 * 60 * 1000;

function withH5ReturnUrl(h5Url: string, returnUrl: string): string {
  const url = new URL(h5Url);
  url.searchParams.set('redirect_url', returnUrl);
  return url.toString();
}

function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `LAW${timestamp}${random}`;
}

function packageName(packageType: string | null): string {
  if (['civil_premium', 'civil'].includes(packageType || '')) return '民事律师（臻选）';
  if (['criminal_premium', 'criminal'].includes(packageType || '')) return '刑事律师（臻选）';
  return '律师入驻';
}

function orderResponse(order: any, extra: Record<string, unknown> = {}) {
  return NextResponse.json({
    success: true,
    data: {
      orderId: order.order_no,
      status: order.status,
      isPaid: order.status === 'paid',
      expiresAt: order.payment_expires_at,
      ...extra,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth?.success || !auth.user) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  const supabase = getSupabaseAdmin();
  let reservedOrder: any = null;

  try {
    // 申请的选择只能来自服务端的登录用户；请求体与 URL 参数均不参与授权。
    const { data: applications, error: applicationError } = await supabase
      .from('lawyer_applications')
      .select('id, user_id, package_type, package_price, payment_status, review_status, created_at')
      .eq('user_id', String(auth.user.id))
      .neq('payment_status', 'paid')
      .neq('review_status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(2);

    if (applicationError) {
      console.error('[Lawyer/Pay/Create] 查询申请失败:', applicationError);
      return NextResponse.json({ success: false, error: '查询申请失败' }, { status: 500 });
    }
    if (!applications || applications.length === 0) {
      return NextResponse.json({ success: false, error: '没有可支付的入驻申请', code: 'NO_PAYABLE_APPLICATION' }, { status: 409 });
    }
    if (applications.length > 1) {
      console.error('[Lawyer/Pay/Create] 发现同一用户多条可支付申请，拒绝自动选择:', { userId: auth.user.id });
      return NextResponse.json({ success: false, error: '存在多条待支付申请，请联系客服处理', code: 'MULTIPLE_PAYABLE_APPLICATIONS' }, { status: 409 });
    }
    const application = applications[0];
    if (application.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        data: { status: 'paid', isPaid: true, message: '该入驻申请已支付' },
      });
    }
    if (!application.package_price || application.package_price <= 0) {
      return NextResponse.json({ success: false, error: '申请套餐金额无效' }, { status: 409 });
    }

    const now = new Date();
    // 先释放超时订单，再由数据库部分唯一索引保障并发下只保留一笔有效订单。
    const { error: expireError } = await supabase
      .from('lawyer_application_payment_orders')
      .update({ status: 'expired', updated_at: now.toISOString() })
      .eq('application_id', application.id)
      .in('status', ['creating', 'pending'])
      .lt('payment_expires_at', now.toISOString());
    if (expireError) {
      console.error('[Lawyer/Pay/Create] 清理过期订单失败:', expireError);
      return NextResponse.json({ success: false, error: '创建支付订单失败' }, { status: 500 });
    }

    const { data: activeOrder, error: activeOrderError } = await supabase
      .from('lawyer_application_payment_orders')
      .select('order_no, status, payment_expires_at, paid_at')
      .eq('application_id', application.id)
      .in('status', ['creating', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeOrderError) {
      console.error('[Lawyer/Pay/Create] 查询有效订单失败:', activeOrderError);
      return NextResponse.json({ success: false, error: '创建支付订单失败' }, { status: 500 });
    }
    if (activeOrder) return orderResponse(activeOrder, { reused: true });

    const orderNo = generateOrderNo();
    const paymentExpiresAt = new Date(now.getTime() + PAYMENT_TTL_MS).toISOString();
    const { data: createdOrder, error: createOrderError } = await supabase
      .from('lawyer_application_payment_orders')
      .insert({
        application_id: application.id,
        user_id: String(auth.user.id),
        order_no: orderNo,
        amount: application.package_price,
        status: 'creating',
        payment_expires_at: paymentExpiresAt,
      })
      .select('order_no, status, payment_expires_at, paid_at')
      .single();

    if (createOrderError || !createdOrder) {
      // 并发请求由数据库唯一约束拒绝后，读取赢家订单并返回，绝不创建第二笔订单。
      if (createOrderError?.code === '23505') {
        const { data: concurrentOrder } = await supabase
          .from('lawyer_application_payment_orders')
          .select('order_no, status, payment_expires_at, paid_at')
          .eq('application_id', application.id)
          .in('status', ['creating', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (concurrentOrder) return orderResponse(concurrentOrder, { reused: true });
      }
      console.error('[Lawyer/Pay/Create] 预留订单失败:', createOrderError);
      return NextResponse.json({ success: false, error: '创建支付订单失败' }, { status: 500 });
    }
    reservedOrder = createdOrder;

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || '127.0.0.1';
    const { channel } = getPaymentClientContext(request);
    const wechatSession = getWechatPaymentSession(request);
    const jsapiAppId = channel === 'jsapi' ? process.env.WEIXIN_OA_APPID : undefined;
    if (channel === 'jsapi' && !jsapiAppId) {
      await supabase.from('lawyer_application_payment_orders').update({ status: 'failed', failed_at: new Date().toISOString(), failure_reason: '微信 JSAPI 配置缺失' }).eq('order_no', orderNo);
      return NextResponse.json({ success: false, code: 'WECHAT_JSAPI_CONFIG_ERROR', error: '微信内支付暂未配置完成，请在浏览器打开后继续支付' }, { status: 503 });
    }

    const wechatPay = getWechatPayClient({ appId: jsapiAppId });
    const description = `律师入驻会员费 - ${packageName(application.package_type)}`;
    const payData: Record<string, unknown> = { orderId: orderNo, status: 'pending', expiresAt: paymentExpiresAt };
    if (channel === 'jsapi') {
      if (!wechatSession) {
        await supabase.from('lawyer_application_payment_orders').update({ status: 'failed', failed_at: new Date().toISOString(), failure_reason: '缺少微信授权' }).eq('order_no', orderNo);
        return NextResponse.json({ success: false, code: 'WECHAT_OAUTH_REQUIRED', error: '需要微信授权' }, { status: 401 });
      }
      const result = await wechatPay.createJsapiOrder({ outTradeNo: orderNo, description, amount: application.package_price, notifyUrl: `${SITE_URL}/api/lawyer/pay/callback`, payerOpenid: wechatSession.openid });
      payData.jsapiPayParams = result.payParams;
    } else if (channel === 'h5') {
      const result = await wechatPay.createH5Order({ outTradeNo: orderNo, description, amount: application.package_price, notifyUrl: `${SITE_URL}/api/lawyer/pay/callback`, clientIp, appUrl: H5_SITE_URL });
      const returnUrl = new URL('/success', H5_SITE_URL);
      returnUrl.searchParams.set('type', 'lawyer');
      returnUrl.searchParams.set('orderId', orderNo);
      payData.h5Url = withH5ReturnUrl(result.h5Url, returnUrl.toString());
    } else {
      const result = await wechatPay.createNativeOrder({ description, outTradeNo: orderNo, amount: application.package_price, notifyUrl: `${SITE_URL}/api/lawyer/pay/callback` });
      payData.codeUrl = result.codeUrl;
    }

    const { error: markPendingError } = await supabase
      .from('lawyer_application_payment_orders')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('order_no', orderNo)
      .eq('status', 'creating');
    if (markPendingError) {
      console.error('[Lawyer/Pay/Create] 更新订单状态失败:', markPendingError);
      return NextResponse.json({ success: false, error: '创建支付订单失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: payData });
  } catch (error) {
    console.error('[Lawyer/Pay/Create] 创建支付订单失败:', error);
    if (reservedOrder?.order_no) {
      await supabase.from('lawyer_application_payment_orders').update({ status: 'failed', failed_at: new Date().toISOString(), failure_reason: '微信支付下单失败' }).eq('order_no', reservedOrder.order_no);
    }
    return NextResponse.json({ success: false, error: '创建支付订单失败' }, { status: 500 });
  }
}
