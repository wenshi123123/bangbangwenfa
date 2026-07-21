import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

/**
 * 返回当前登录用户的入驻支付上下文。
 * 不接受申请 ID，避免客户端把可猜测的记录 ID 当作授权凭据。
 */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth?.success || !auth.user) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  const supabase = getSupabaseAdmin();
  const { data: applications, error } = await supabase
    .from('lawyer_applications')
    .select('id, package_type, package_price, payment_status, review_status, created_at')
    .eq('user_id', String(auth.user!.id))
    .neq('payment_status', 'paid')
    .neq('review_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(2);

  if (error) {
    console.error('[Lawyer/PaymentContext] 查询申请失败:', error);
    return NextResponse.json({ success: false, error: '查询支付信息失败' }, { status: 500 });
  }

  if (applications && applications.length > 1) {
    return NextResponse.json({
      success: true,
      data: { status: 'manual_review_required' },
    });
  }

  const application = applications?.[0];
  if (!application) {
    const { data: paidApplication, error: paidApplicationError } = await supabase
      .from('lawyer_applications')
      .select('package_type, package_price')
      .eq('user_id', String(auth.user!.id))
      .eq('payment_status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (paidApplicationError) {
      console.error('[Lawyer/PaymentContext] 查询已支付申请失败:', paidApplicationError);
      return NextResponse.json({ success: false, error: '查询支付信息失败' }, { status: 500 });
    }
    if (paidApplication) {
      return NextResponse.json({
        success: true,
        data: { status: 'paid', packageType: paidApplication.package_type, amount: paidApplication.package_price },
      });
    }
    return NextResponse.json({
      success: true,
      data: { status: 'no_payable_application' },
    });
  }

  if (!application.package_price || application.package_price <= 0) {
    return NextResponse.json({
      success: true,
      data: { status: 'no_payable_application' },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      status: 'payable',
      packageType: application.package_type,
      amount: application.package_price,
    },
  });
}
