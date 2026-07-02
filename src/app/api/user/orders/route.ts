import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

const lawyerPackageLabels: Record<string, string> = {
  civil_premium: '民事律师（臻选）',
  criminal_premium: '刑事律师（臻选）',
  civil: '民事律师（臻选）',
  criminal: '刑事律师（臻选）',
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

    const supabase = getSupabaseClient();

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
          respondedAt: order.responded_at,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
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
          createdAt: app.created_at,
          updatedAt: app.updated_at,
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
