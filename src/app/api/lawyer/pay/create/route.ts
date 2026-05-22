import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import crypto from 'crypto';

// 生成订单号
function generateOrderNo(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `LAW${timestamp}${random}`;
}

export async function POST(request: NextRequest) {
  // 认证检查（支持 JWT 或 applicationId 查询）
  const auth = authenticateRequest(request);
  const { searchParams } = new URL(request.url);
  const queryAppId = searchParams.get('applicationId');
  
  try {
    const body = await request.json();
    
    // 认证逻辑：支持 JWT 认证或 applicationId 参数（入驻流程场景）
    const { applicationId } = body;
    const effectiveAppId = applicationId || queryAppId;
    const isAuthenticated = auth?.success && auth?.user;

    if (!isAuthenticated && !effectiveAppId) {
      return unauthorizedResponse(auth?.error || '请先登录');
    }

    if (!effectiveAppId) {
      return NextResponse.json(
        { success: false, error: '申请ID不能为空' },
        { status: 400 }
      );
    }

    // 安全校验 applicationId 格式
    const appIdNum = parseInt(effectiveAppId);
    if (isNaN(appIdNum) || appIdNum <= 0) {
      return NextResponse.json(
        { success: false, error: '无效的申请ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 查询申请信息
    const { data: application, error: appError } = await supabase
      .from('lawyer_applications')
      .select('*')
      .eq('id', appIdNum)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { success: false, error: '申请不存在' },
        { status: 404 }
      );
    }

    // 权限校验：只能为自己申请支付（仅在已认证时做严格校验）
    if (isAuthenticated && application.user_id &&
        application.user_id.toString() !== auth.user!.id.toString()) {
      return NextResponse.json(
        { success: false, error: '无权操作此申请' },
        { status: 403 }
      );
    }

    // 如果已支付，直接返回
    if (application.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        data: {
          orderId: `LAW${application.id}_PAID`,
          status: 'paid',
          message: '已支付',
        },
      });
    }

    // 生成订单号
    const orderNo = generateOrderNo();

    // 获取微信支付客户端
    const wechatPay = getWechatPayClient();

    // 获取套餐名称
    const packageName = application.package_type === 'civil_premium' ? '民事律师（臻选）' 
                      : application.package_type === 'criminal_premium' ? '刑事律师（臻选）' 
                      : '律师入驻';

    // 调用微信支付 Native API 创建订单
    const result = await wechatPay.createNativeOrder({
      description: `律师入驻会员费 - ${packageName}`,
      outTradeNo: orderNo,
      amount: application.package_price, // 单位：分
      notifyUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bangbangwenfa.com'}/api/lawyer/pay/callback`,
    });

    // 保存订单号到数据库
    await supabase
      .from('lawyer_applications')
      .update({ order_no: orderNo })
      .eq('id', appIdNum);

    console.log('律师入驻支付创建成功:', {
      orderNo,
      applicationId,
      packagePrice: application.package_price,
      codeUrl: result.codeUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: orderNo,
        codeUrl: result.codeUrl, // 微信支付二维码链接
        amount: application.package_price,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('创建律师入驻支付订单失败:', error);
    return NextResponse.json(
      { success: false, error: '创建支付订单失败' },
      { status: 500 }
    );
  }
}
