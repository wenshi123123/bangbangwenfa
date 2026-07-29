import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { notifyOrder } from '@/lib/notify/webhook';
import { getSiteUrl } from '@/lib/site';
import { RENEWAL_PACKAGE_META, RenewalPackageId } from '@/lib/lawyer/package-config';
import { loadRenewalPackagePrice } from '@/lib/lawyer/price-config';
import { resolveUserNickname } from '@/lib/user/resolve-nickname';

const SITE_URL = getSiteUrl();

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
      .select('package_type')
      .eq('user_id', lawyer.user_id || userId)
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 优先按入驻套餐确定律师类型；存量数据才回退到专业领域。
    const lawyerType = application?.package_type === 'criminal_premium'
      ? 'criminal'
      : lawyer.specialization?.toLowerCase().includes('刑事') ? 'criminal' : 'civil';
    if (lawyerType !== packageConfig.type) {
      return NextResponse.json(
        { success: false, error: `律师类型不匹配：您是${lawyerType === 'criminal' ? '刑事' : '民事'}律师，无法购买${packageConfig.type === 'criminal' ? '刑事' : '民事'}续费套餐` },
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
      .select('order_no, created_at')
      .eq('lawyer_id', lawyer.id)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingOrder) {
      // 5 分钟内的 pending 订单直接复用，不让重复创建
      const createdAt = new Date(pendingOrder.created_at);
      const minutesDiff = (Date.now() - createdAt.getTime()) / (1000 * 60);
      if (minutesDiff < 5) {
        return NextResponse.json(
          { success: false, error: '您有一笔未完成的续费订单，请先完成支付或等待订单超时' },
          { status: 409 }
        );
      }
      // 超过 5 分钟的 pending 订单，标记为 expired
      await supabase
        .from('lawyer_renew_orders')
        .update({ payment_status: 'expired' })
        .eq('order_no', pendingOrder.order_no);
    }

    const orderNo = generateOrderNo();

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

    // 调用微信支付 Native API 创建订单
    const wechatPay = getWechatPayClient();
    const payResult = await wechatPay.createNativeOrder({
      description: `律师会员续费 - ${packageConfig.name}`,
      outTradeNo: orderNo,
      amount: price,
      notifyUrl: `${SITE_URL}/api/lawyer/renew/callback`,
    });

    console.log('律师续费支付创建成功:', {
      orderNo,
      lawyerId: lawyer.id,
      packagePrice: price,
      codeUrl: payResult.codeUrl,
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
      data: {
        order_id: orderNo,
        code_url: payResult.codeUrl,
        amount: price,
        months: months,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('续费失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
