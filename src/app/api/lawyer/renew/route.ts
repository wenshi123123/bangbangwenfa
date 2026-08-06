import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { notifyOrder } from '@/lib/notify/webhook';
import { getSiteUrl, getWechatH5SiteUrl } from '@/lib/site';
import { RENEWAL_PACKAGE_META, RenewalPackageId } from '@/lib/lawyer/package-config';
import { loadRenewalPackagePrice } from '@/lib/lawyer/price-config';
import { resolveUserNickname } from '@/lib/user/resolve-nickname';
import { getPaymentClientContext, getWechatPaymentSession } from '@/lib/payment/payment-context';
import { PAYMENT_TTL_MS } from '@/lib/payment/order-lifecycle';

const SITE_URL = getSiteUrl();
const H5_SITE_URL = getWechatH5SiteUrl();
function withH5ReturnUrl(h5Url: string, returnUrl: string) {
  const url = new URL(h5Url);
  url.searchParams.set('redirect_url', returnUrl);
  return url.toString();
}

function parseSelectedPackages(value: unknown, fallback: string | null) {
  let selected: string[] = [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) selected = parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      selected = [];
    }
  } else if (Array.isArray(value)) {
    selected = value.filter((item): item is string => typeof item === 'string');
  }
  if (selected.length === 0 && fallback) selected = [fallback];
  return new Set(selected.map((item) => item === 'criminal' || item === 'criminal_premium' ? 'criminal' : 'civil'));
}

// 生成订单号
function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RENEW${timestamp}${random}`;
}

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

export async function POST(request: NextRequest) {
  // 认证检查
  const auth = authenticateRequest(request);
  if (!auth || !auth.success) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  // 确保是律师身份
  if (!auth.lawyerId) {
    return NextResponse.json(
      { success: false, error: '仅律师可执行续费操作' },
      { status: 403 }
    );
  }

  let createdOrderNo: string | null = null;
  try {
    const body = await request.json();
    const { package_id } = body;

    if (!package_id) {
      return NextResponse.json(
        { success: false, error: '套餐ID不能为空' },
        { status: 400 }
      );
    }

    // 获取套餐配置
    const packageConfig = RENEWAL_PACKAGE_META[package_id as RenewalPackageId];
    if (!packageConfig) {
      return NextResponse.json(
        { success: false, error: '无效的套餐ID' },
        { status: 400 }
      );
    }

    const userId = auth.user?.id;
    const supabase = getSupabaseAdmin();

    // 查询当前律师信息（优先用 user_id；若存量数据未回填，再回退到 lawyerId）
    const { data: lawyerByUserId, error: lawyerError } = await supabase
      .from('lawyers')
      .select('id, user_id, name, member_expires_at, specialization')
      .eq('user_id', userId)
      .single();

    let lawyer = lawyerByUserId;

    if ((lawyerError || !lawyer) && auth.lawyerId) {
      const { data: lawyerById } = await supabase
        .from('lawyers')
        .select('id, user_id, name, member_expires_at, specialization')
        .eq('id', auth.lawyerId)
        .single();

      if (lawyerById) {
        lawyer = lawyerById;
        if (lawyerById.user_id !== userId) {
          await supabase
            .from('lawyers')
            .update({ user_id: userId })
            .eq('id', lawyerById.id);
        }
      }
    }

    if (!lawyer) {
      return NextResponse.json(
        { success: false, error: '未找到律师信息，请先完成律师入驻或重新登录' },
        { status: 404 }
      );
    }

    const { data: application } = await supabase
      .from('lawyer_applications')
      .select('package_type, selected_packages')
      .eq('user_id', lawyer.user_id || userId)
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 双领域律师可分别为民事/刑事套餐续费；历史记录才回退到专业领域。
    const selectedPackages = parseSelectedPackages(application?.selected_packages, application?.package_type || null);
    if (selectedPackages.size === 0) {
      selectedPackages.add(lawyer.specialization?.toLowerCase().includes('刑事') ? 'criminal' : 'civil');
    }
    if (!selectedPackages.has(packageConfig.type)) {
      return NextResponse.json(
        { success: false, error: `您未开通${packageConfig.type === 'criminal' ? '刑事' : '民事'}律师资格，无法购买该续费套餐` },
        { status: 400 }
      );
    }

    let priceConfig;
    try {
      priceConfig = await loadRenewalPackagePrice(supabase, package_id);
    } catch {
      return NextResponse.json(
        { success: false, error: '续费套餐价格尚未在后台配置，请联系管理员' },
        { status: 503 },
      );
    }
    const price = priceConfig.price;
    const { months } = packageConfig;

    // 检查是否有未支付的续费订单（防止重复创建）
    const { data: pendingOrder } = await supabase
      .from('lawyer_renew_orders')
      .select('order_no, created_at, payment_expires_at')
      .eq('lawyer_id', lawyer.id)
      .in('payment_status', ['pending', 'paying'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingOrder) {
      // 15 分钟内保留唯一有效订单；历史订单没有过期时间时按创建时间兜底。
      const fallbackExpiresAt = new Date(new Date(pendingOrder.created_at).getTime() + PAYMENT_TTL_MS);
      const expiresAt = pendingOrder.payment_expires_at
        ? new Date(pendingOrder.payment_expires_at)
        : fallbackExpiresAt;
      if (expiresAt.getTime() > Date.now()) {
        return NextResponse.json(
          { success: false, error: '您有一笔未完成的续费订单，请先完成支付或等待 15 分钟超时' },
          { status: 409 }
        );
      }
      // 超过 15 分钟的待支付订单关闭，避免支付中订单永久存在。
      await supabase
        .from('lawyer_renew_orders')
        .update({ payment_status: 'closed', updated_at: new Date().toISOString() })
        .eq('order_no', pendingOrder.order_no)
        .in('payment_status', ['pending', 'paying']);
    }

    const orderNo = generateOrderNo();
    createdOrderNo = orderNo;
    const paymentExpiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString();
    const { channel } = getPaymentClientContext(request);
    const wechatSession = getWechatPaymentSession(request);
    if (channel === 'jsapi' && !wechatSession) {
      return NextResponse.json({ success: false, code: 'WECHAT_OAUTH_REQUIRED', error: '需要微信授权后才能在微信内支付' }, { status: 401 });
    }

    // 创建订单记录
    const { data: order, error: orderError } = await supabase
      .from('lawyer_renew_orders')
      .insert({
        lawyer_id: lawyer.id,
        user_id: userId,
        order_no: orderNo,
        package_id: package_id,
        package_price: price,
        months: months,
        payment_status: 'pending',
        payment_expires_at: paymentExpiresAt,
        expires_at: null, // 支付成功后在回调中计算
      })
      .select()
      .single();

    if (orderError) {
      console.error('创建续费订单失败:', orderError);
      return NextResponse.json(
        { success: false, error: '创建续费订单失败' },
        { status: 500 }
      );
    }

    // 计算预计到期时间（展示用，实际以回调为准）
    const now = new Date();
    let expiresAt: Date;
    if (lawyer.member_expires_at) {
      const currentExpires = new Date(lawyer.member_expires_at);
      expiresAt = currentExpires > now
        ? calculateExpiry(currentExpires, months)
        : calculateExpiry(now, months);
    } else {
      expiresAt = calculateExpiry(now, months);
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || '127.0.0.1';
    const wechatPay = getWechatPayClient({ appId: channel === 'jsapi' ? process.env.WEIXIN_OA_APPID : undefined });
    const description = `律师会员续费 - ${packageConfig.name}`;
    const responseData: Record<string, unknown> = { order_id: orderNo, amount: price, months, expires_at: expiresAt.toISOString() };
    let prepayId: string | undefined;
    if (channel === 'jsapi') {
      const result = await wechatPay.createJsapiOrder({ description, outTradeNo: orderNo, amount: price, notifyUrl: `${SITE_URL}/api/lawyer/renew/callback`, payerOpenid: wechatSession!.openid });
      prepayId = result.prepayId;
      responseData.jsapiPayParams = result.payParams;
    } else if (channel === 'h5') {
      const result = await wechatPay.createH5Order({ description, outTradeNo: orderNo, amount: price, notifyUrl: `${SITE_URL}/api/lawyer/renew/callback`, clientIp, appUrl: H5_SITE_URL });
      prepayId = result.prepayId;
      const returnUrl = new URL('/success', H5_SITE_URL);
      returnUrl.searchParams.set('type', 'renew');
      returnUrl.searchParams.set('orderId', orderNo);
      responseData.h5_url = withH5ReturnUrl(result.h5Url, returnUrl.toString());
    } else {
      const result = await wechatPay.createNativeOrder({ description, outTradeNo: orderNo, amount: price, notifyUrl: `${SITE_URL}/api/lawyer/renew/callback` });
      prepayId = result.prepayId;
      responseData.code_url = result.codeUrl;
    }

    const { error: paymentStateError } = await supabase
      .from('lawyer_renew_orders')
      .update({ payment_status: 'paying', payment_channel: channel, prepay_id: prepayId || null, updated_at: new Date().toISOString() })
      .eq('order_no', orderNo)
      .eq('payment_status', 'pending');
    if (paymentStateError) throw paymentStateError;

    console.log('律师续费支付创建成功:', {
      orderNo,
      lawyerId: lawyer.id,
      packagePrice: price,
      channel,
    });

    // Webhook 通知
    notifyOrder({
      type: 'Renew',
      userName: await resolveUserNickname(supabase, userId),
      amount: price,
      detail: `${packageConfig.name} × ${months}个月`,
      orderId: orderNo,
      status: 'Pending Payment',
    });

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('续费失败:', error);
    if (createdOrderNo) {
      await getSupabaseAdmin()
        .from('lawyer_renew_orders')
        .update({ payment_status: 'closed', updated_at: new Date().toISOString() })
        .eq('order_no', createdOrderNo)
        .in('payment_status', ['pending', 'paying']);
    }
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
