import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { resolveUserNickname } from '@/lib/user/resolve-nickname';

const lawyerPackageLabels: Record<string, string> = {
  civil_premium: '民事律师（臻选）',
  criminal_premium: '刑事律师（臻选）',
  civil: '民事律师（臻选）',
  criminal: '刑事律师（臻选）',
};

type RefundRequestSummary = {
  id: number;
  order_type: string;
  order_id: string | number;
  reason: string;
  status: string;
  amount: number;
  created_at: string;
  processed_at: string | null;
  failure_reason: string | null;
};

export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    
    // 使用 token 中的用户 ID
    const userId = auth.userId!;

    const supabase = getSupabaseAdmin();
    const nickname = await resolveUserNickname(supabase, userId);

    const { data: refundRequests, error: refundRequestsError } = await supabase
      .from('refund_requests')
      .select('id, order_type, order_id, reason, status, amount, created_at, processed_at, failure_reason')
      .eq('user_id', String(userId))
      .order('created_at', { ascending: false });
    if (refundRequestsError) {
      console.error('查询退款申请失败:', refundRequestsError);
    }
    const refundRequestMap = new Map<string, RefundRequestSummary>();
    for (const request of refundRequests || []) {
      const key = `${request.order_type}:${request.order_id}`;
      if (!refundRequestMap.has(key)) refundRequestMap.set(key, request);
    }

    const orders: any[] = [];

    // 1. 查询普通咨询订单
    const { data: consultOrders, error: consultError } = await supabase
      .from('consult_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (consultError) {
      console.error('查询普通订单失败:', consultError);
    } else if (consultOrders) {
      // 格式化普通咨询订单
      for (const order of consultOrders) {
        orders.push({
          id: order.id,
          orderNo: order.order_no || `ORD${order.id}`,
          type: 'consult',
          category: order.category,
          caseType: order.case_type,
          caseTitle: order.case_title,
          caseDescription: order.case_description,
          serviceType: order.service_type,
          servicePrice: order.service_price,
          paymentStatus: order.payment_status,
          paidAt: order.paid_at,
          refundAt: order.refund_at,
          lawyerResponse: order.lawyer_response,
          lawyerWechat: order.lawyer_wechat,
          lawyerName: order.lawyer_name,
          contactName: nickname,
          respondedAt: order.responded_at,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          refundRequest: refundRequestMap.get(`consult:${order.id}`) || null,
        });
      }
    }

    // 2. 查询律师入驻订单（通过 lawyer_applications 表）
    const { data: lawyerApplications, error: lawyerError } = await supabase
      .from('lawyer_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (lawyerError) {
      console.error('查询律师入驻订单失败:', lawyerError);
    } else if (lawyerApplications) {
      // 格式化律师入驻订单
      for (const app of lawyerApplications) {
        if (app.approval_mode === 'complimentary') continue;
        let selectedPackages: string[] = [];
        if (app.selected_packages) {
          try {
            selectedPackages = typeof app.selected_packages === 'string'
              ? JSON.parse(app.selected_packages)
              : app.selected_packages;
          } catch {
            selectedPackages = [];
          }
        }

        const packageTags = (selectedPackages.length > 0 ? selectedPackages : [app.package_type])
          .filter(Boolean)
          .map((pkg: string) => lawyerPackageLabels[pkg] || pkg);

        const caseTitle = packageTags.length > 0
          ? `臻选律师入驻申请 - ${packageTags.join(' + ')}`
          : '臻选律师入驻申请';

        orders.push({
          id: app.id,
          applicationId: app.id,
          orderNo: app.order_no || `LAW${app.id}`,
          type: 'lawyer',
          category: 'lawyer',
          caseType: '律师入驻',
          caseTitle,
          caseDescription: app.notes || `申请成为臻选律师（${app.specialties || '综合'})`,
          serviceType: app.package_type,
          servicePrice: app.package_price || 0,
          paymentStatus: app.payment_status,
          reviewStatus: app.review_status,
          paidAt: app.paid_at,
          refundAt: app.refund_at,
          name: app.name,
          contactName: nickname,
          createdAt: app.created_at,
          updatedAt: app.updated_at,
          refundRequest: refundRequestMap.get(`lawyer_application:${app.id}`) || null,
        });
      }
    }

    // 3. 查询律师续费订单。续费与咨询/入驻使用同一个订单展示契约。
    const { data: renewOrders, error: renewError } = await supabase
      .from('lawyer_renew_orders')
      .select('id, order_no, package_id, package_price, payment_status, paid_at, expires_at, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (renewError) {
      console.error('查询律师续费订单失败:', renewError);
    } else {
      for (const order of renewOrders || []) {
        const isCriminal = String(order.package_id).startsWith('criminal_');
        const isYear = String(order.package_id).endsWith('_year');
        orders.push({
          id: `renew-${order.id}`,
          orderNo: order.order_no,
          type: 'renewal',
          category: 'lawyer_renewal',
          caseType: '律师续费',
          caseTitle: `${isCriminal ? '刑事' : '民事'}律师${isYear ? '年卡' : '季卡'}续费`,
          serviceType: order.package_id,
          servicePrice: Number(order.package_price),
          paymentStatus: order.payment_status,
          paidAt: order.paid_at,
          expiresAt: order.expires_at,
          contactName: nickname,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          refundRequest: refundRequestMap.get(`lawyer_renewal:${order.id}`) || null,
        });
      }
    }

    // 4. 赠送体验是零金额开通，不混入付款收入，但用户可在订单中查到。
    const { data: complimentaryOrders, error: complimentaryError } = await supabase
      .from('lawyer_complimentary_orders')
      .select('id, order_no, reason, expires_at, status, created_at, updated_at')
      .eq('user_id', String(userId))
      .order('created_at', { ascending: false });
    if (complimentaryError) {
      console.error('查询赠送体验订单失败:', complimentaryError);
    } else {
      for (const order of complimentaryOrders || []) {
        orders.push({
          id: `complimentary-${order.id}`,
          orderNo: order.order_no,
          type: 'complimentary',
          category: 'lawyer_complimentary',
          caseType: '赠送体验',
          caseTitle: '律师赠送体验开通',
          caseDescription: '平台赠送体验资格已开通',
          serviceType: 'complimentary',
          servicePrice: 0,
          paymentStatus: order.status,
          expiresAt: order.expires_at,
          contactName: nickname,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
        });
      }
    }

    // 按创建时间排序
    orders.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  } catch (error) {
    console.error('查询用户订单异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
