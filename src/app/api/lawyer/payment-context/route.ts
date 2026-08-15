import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

/**
 * 返回当前登录用户的入驻支付上下文。
 * 申请 ID 只作为当前账号范围内的查询提示，不能单独作为授权凭据。
 */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth?.success || !auth.user) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  const supabase = getSupabaseAdmin();
  const applicationId = request.nextUrl.searchParams.get('applicationId');
  let applicationsQuery = supabase
    .from('lawyer_applications')
    .select('id, package_type, package_price, payment_status, review_status, approval_mode, review_remark, complimentary_reason, complimentary_expires_at, created_at')
    .eq('user_id', String(auth.user!.id));
  if (applicationId) {
    applicationsQuery = applicationsQuery.eq('id', applicationId).limit(1);
  } else {
    applicationsQuery = applicationsQuery
      .neq('payment_status', 'paid')
      .neq('review_status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(2);
  }
  const { data: applications, error } = await applicationsQuery;

  if (error) {
    console.error('[Lawyer/PaymentContext] 查询申请失败:', error);
    return NextResponse.json({ success: false, error: '查询支付信息失败' }, { status: 500 });
  }

  if (!applications?.length && applicationId) {
    return NextResponse.json({
      success: true,
      data: { status: 'application_not_found' },
    });
  }

  if (applications && applications.length > 1) {
    return NextResponse.json({
      success: true,
      data: { status: 'manual_review_required' },
    });
  }

  const application = applications?.[0];
  if (application?.payment_status === 'paid') {
    return NextResponse.json({
      success: true,
      data: { status: 'paid', packageType: application.package_type, amount: application.package_price },
    });
  }
  if (application?.review_status === 'rejected') {
    return NextResponse.json({
      success: true,
      data: {
        status: 'application_rejected',
        applicationId: application.id,
        reason: application.review_remark || null,
      },
    });
  }
  if (application?.approval_mode === 'complimentary_requested' && application.review_status === 'pending') {
    return NextResponse.json({
      success: true,
      data: { status: 'complimentary_pending', applicationId: application.id },
    });
  }
  if (application?.approval_mode === 'complimentary' && application.review_status === 'approved') {
    return NextResponse.json({
      success: true,
      data: {
        status: 'complimentary_active',
        applicationId: application.id,
        expiresAt: application.complimentary_expires_at || null,
        reason: application.complimentary_reason || application.review_remark || null,
      },
    });
  }
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
