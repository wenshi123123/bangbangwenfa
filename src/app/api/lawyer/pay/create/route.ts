import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { getWechatPayClient } from '@/lib/payment/wechat-pay';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { getSiteUrl, getWechatH5SiteUrl } from '@/lib/site';
import { getPaymentClientContext, getWechatPaymentSession } from '@/lib/payment/payment-context';

const SITE_URL = getSiteUrl();
const H5_SITE_URL = getWechatH5SiteUrl();

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
    const body = await request.json().catch(() => null);
    
    // 认证逻辑：支持 JWT 认证或 applicationId 参数（入驻流程场景）
    const { applicationId } = body ?? {};
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
    const isCivil = ['civil_premium', 'civil'].includes(application.package_type);
    const isCriminal = ['criminal_premium', 'criminal'].includes(application.package_type);
    const packageName = isCivil ? '民事律师（臻选）' 
                  : isCriminal ? '刑事律师（臻选）' 
                  : '律师入驻';

    // 获取客户端 IP 和设备类型
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') || '127.0.0.1';
    const { channel } = getPaymentClientContext(request);
    const wechatSession = getWechatPaymentSession(request);

    // 根据场景调用不同支付 API
    let payData: {
      orderId: string;
      h5Url?: string;
      codeUrl?: string;
      jsapiPayParams?: {
        appId: string;
        timeStamp: string;
        nonceStr: string;
        package: string;
        signType: 'RSA';
        paySign: string;
      };
    } = { orderId: orderNo };

    if (channel === 'jsapi') {
      if (!wechatSession) {
        return NextResponse.json({ success: false, code: 'WECHAT_OAUTH_REQUIRED', error: '需要微信授权' }, { status: 401 });
      }
      const result = await wechatPay.createJsapiOrder({
        outTradeNo: orderNo,
        description: `律师入驻会员费 - ${packageName}`,
        amount: application.package_price,
        notifyUrl: `${SITE_URL}/api/lawyer/pay/callback`,
        payerOpenid: wechatSession.openid,
      });
      payData.jsapiPayParams = result.payParams;
    } else if (channel === 'h5') {
      const result = await wechatPay.createH5Order({
        outTradeNo: orderNo,
        description: `律师入驻会员费 - ${packageName}`,
        amount: application.package_price,
        notifyUrl: `${SITE_URL}/api/lawyer/pay/callback`,
        clientIp,
        appUrl: H5_SITE_URL,
      });
      payData.h5Url = result.h5Url;
    } else {
      // PC：Native 扫码支付
      const result = await wechatPay.createNativeOrder({
        description: `律师入驻会员费 - ${packageName}`,
        outTradeNo: orderNo,
        amount: application.package_price,
        notifyUrl: `${SITE_URL}/api/lawyer/pay/callback`,
      });
      payData.codeUrl = result.codeUrl;
    }

    // 保存订单号到数据库
    await supabase
      .from('lawyer_applications')
      .update({ order_no: orderNo })
      .eq('id', appIdNum);

    console.log('律师入驻支付创建成功:', {
      orderNo,
      applicationId,
      packagePrice: application.package_price,
      payData,
    });

    return NextResponse.json({
      success: true,
      data: payData,
    });
  } catch (error) {
    console.error('创建律师入驻支付订单失败:', error);
    // 开发环境暴露具体错误便于排查
    const errMsg = error instanceof Error ? error.message : '创建支付订单失败';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
