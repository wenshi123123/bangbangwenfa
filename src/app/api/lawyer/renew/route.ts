import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// 生成订单号
function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RENEW${timestamp}${random}`;
}

// 套餐配置
const PACKAGE_CONFIG: Record<string, { price: number; months: number }> = {
  'civil_renew_6': { price: 200000, months: 6 },    // 2000元/6个月
  'civil_renew_18': { price: 500000, months: 18 },  // 5000元/18个月
  'criminal_renew_6': { price: 320000, months: 6 }, // 3200元/6个月
  'criminal_renew_18': { price: 800000, months: 18 }, // 8000元/18个月
};

export async function POST(request: NextRequest) {
  // 认证检查
  const auth = authenticateRequest(request);
  if (!auth || !auth.success) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  // 🔧 确保是律师身份（检查 lawyerId 而非死卡 userType）
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

    // 使用认证的用户ID
    const userId = auth.user?.id;

    const supabase = getSupabaseAdmin();

    // 查询当前律师信息
    const { data: lawyer, error: lawyerError } = await supabase
      .from('lawyers')
      .select('id, user_id, name, member_expires_at')
      .eq('user_id', userId)
      .single();

    if (lawyerError || !lawyer) {
      return NextResponse.json(
        { success: false, error: '未找到律师信息' },
        { status: 404 }
      );
    }

    // 获取套餐配置
    const packageConfig = PACKAGE_CONFIG[package_id];
    if (!packageConfig) {
      return NextResponse.json(
        { success: false, error: '无效的套餐ID' },
        { status: 400 }
      );
    }

    const { price, months } = packageConfig;
    const orderNo = generateOrderNo();

    // 生成订单记录
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
        expires_at: null, // 支付成功后再更新
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

    // 获取微信支付客户端
    const wechatPay = getWechatPayClient();

    // 计算新的到期时间
    const now = new Date();
    let expiresAt: Date;
    if (lawyer.member_expires_at) {
      const currentExpires = new Date(lawyer.member_expires_at);
      expiresAt = currentExpires > now 
        ? new Date(currentExpires.getTime() + months * 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
    } else {
      expiresAt = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
    }

    // 调用微信支付创建订单
    const payResult = await wechatPay.createNativeOrder({
      description: `律师会员续费 - ${months}个月`,
      outTradeNo: orderNo,
      amount: price,
      notifyUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bangbangwenfa.com'}/api/lawyer/renew/callback`,
    });

    console.log('律师续费支付创建成功:', {
      orderNo,
      lawyerId: lawyer.id,
      packagePrice: price,
      codeUrl: payResult.codeUrl,
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
