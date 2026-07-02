import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const orderNo = searchParams.get('orderNo');
    const requestOpenid = searchParams.get('oa_openid') || searchParams.get('openid');

    const orderRef = orderId || orderNo;

    if (!orderRef) {
      return NextResponse.json(
        { success: false, error: '缺少订单号' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const isNumericOrderId = /^\d+$/.test(orderRef);

    let query = supabase
      .from('consult_orders')
      .select('*');

    if (isNumericOrderId) {
      query = query.eq('id', orderRef);
    } else {
      query = query.eq('order_no', orderRef);
    }

    let { data, error } = await query.maybeSingle();

    if (!data && isNumericOrderId) {
      const fallback = await supabase
        .from('consult_orders')
        .select('*')
        .eq('order_no', orderRef)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('查询订单失败:', error);
      return NextResponse.json(
        { success: false, error: '查询订单失败' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    // 先尝试站内 token 验证，再回退到公众号 openid 验证
    const auth = authenticateRequest(request);
    const userId = auth.success ? (auth.userId || auth.guardianId || auth.lawyerId) : null;
    const isOwnerByUserId = !!userId && data.user_id !== null && data.user_id === userId;
    const isOwnerByOpenid = !!requestOpenid && !!data.openid && String(data.openid) === String(requestOpenid);
    const isOwner = isOwnerByUserId || isOwnerByOpenid;

    // 非订单所有者只能看到基本信息；微信内 openid 命中时视为订单所有者
    if (data.user_id !== null && !isOwner && !auth.success && !requestOpenid) {
      return unauthorizedResponse('未登录或登录已过期');
    }

    if (data.user_id !== null && !isOwner) {
      return NextResponse.json(
        { success: false, error: '无权查看此订单' },
        { status: 403 }
      );
    }

    // 格式化返回数据
    const order = {
      id: data.id,
      orderNo: data.order_no || `ORD${String(data.id).replace(/-/g, '').slice(0, 12)}`,
      caseType: data.case_type,
      caseTitle: data.case_title,
      caseDescription: data.case_description,
      serviceType: data.service_type,
      servicePrice: data.service_price,
      paymentStatus: data.payment_status,
      paidAt: data.paid_at,
      // 敏感信息仅订单所有者可见
      ...(isOwner && {
        contactName: data.contact_name,
        contactPhone: data.contact_phone,
        contactWechat: data.contact_wechat,
        lawyerResponse: data.lawyer_response,
        lawyerWechat: data.lawyer_wechat,
        lawyerName: data.lawyer_name,
        respondedAt: data.responded_at,
      }),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({
      success: true,
      order,
      isOwner
    });

  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || '未知错误';
    console.error('API错误:', errorMsg);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${errorMsg}` },
      { status: 500 }
    );
  }
}
