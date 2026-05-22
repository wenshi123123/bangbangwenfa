import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // 必须登录才能查询订单
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: '缺少订单号' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('consult_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

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

    // 使用 Token 中的用户ID验证订单归属，不再信任请求参数中的 userId
    const userId = auth.userId || auth.guardianId || auth.lawyerId;
    const isOwner = userId && data.user_id !== null && data.user_id === userId;

    // 非订单所有者只能看到基本信息
    if (data.user_id !== null && !isOwner) {
      return NextResponse.json(
        { success: false, error: '无权查看此订单' },
        { status: 403 }
      );
    }

    // 格式化返回数据
    const order = {
      id: data.id,
      orderNo: data.order_no,
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

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
