import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';
import { encryptFields, LAWYER_SENSITIVE_FIELDS } from '@/lib/crypto/encryption';
import { normalizeMembershipRecordPackageType } from '@/lib/admin/membership-package';

const ONBOARDING_MONTHS = 18;

function addMonths(base: Date, months: number) {
  const result = new Date(base);
  const originalDay = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== originalDay) result.setDate(0);
  return result;
}

function selectedMembershipPackages(application: { selected_packages?: unknown; package_type?: string | null }) {
  let packages: string[] = [];
  if (Array.isArray(application.selected_packages)) {
    packages = application.selected_packages.filter((value): value is string => typeof value === 'string');
  } else if (typeof application.selected_packages === 'string') {
    try {
      const parsed = JSON.parse(application.selected_packages);
      if (Array.isArray(parsed)) packages = parsed.filter((value): value is string => typeof value === 'string');
    } catch {
      packages = [];
    }
  }
  if (packages.length === 0 && application.package_type) packages = [application.package_type];
  return [...new Set(packages.map(normalizeMembershipRecordPackageType))];
}

async function sendNotification(supabase: any, userId: string, type: string, content: string, applicationId: string | number) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title: type === 'lawyer_review_failed' ? '入驻审核未通过' : '入驻审核通过',
    content,
    data: { applicationId: String(applicationId) },
    is_read: false,
  });
  if (error) console.error('[LawyerReview] 创建用户通知失败:', error);
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);
  return NextResponse.json({ success: false, error: '请使用 PUT 方法提交审核操作' }, { status: 405 });
}

/**
 * Normal approval is available only after payment. Complimentary approval is an
 * explicit, audited exception and never changes the payment status to paid.
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);

  try {
    const body = await request.json();
    const targetId = body.applicationId || body.id;
    const action = body.action as 'approve' | 'approve_complimentary' | 'grant_complimentary' | 'reject';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const isComplimentary = action === 'approve_complimentary' || action === 'grant_complimentary';
    const isGrant = action === 'grant_complimentary';
    const isApproval = action === 'approve' || action === 'approve_complimentary';

    if (!targetId || !action) return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    if (!['approve', 'approve_complimentary', 'grant_complimentary', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: application, error: applicationError } = await supabase
      .from('lawyer_applications')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();
    if (applicationError || !application) return NextResponse.json({ success: false, error: '申请不存在' }, { status: 404 });
    if (!isGrant && application.review_status !== 'pending') return NextResponse.json({ success: false, error: '该申请已处理，不能重复审核' }, { status: 409 });
    if (isGrant && (application.review_status !== 'approved' || application.payment_status !== 'paid')) {
      return NextResponse.json({ success: false, error: '只有已通过且已付款的申请可以追加赠送体验' }, { status: 409 });
    }
    if (action === 'approve' && application.payment_status !== 'paid') {
      return NextResponse.json({ success: false, error: '该申请尚未支付；如需免费体验，请使用赠送体验开通。' }, { status: 409 });
    }

    const complimentaryDays = Number(body.complimentaryDays);
    if (isComplimentary) {
      if (!reason) return NextResponse.json({ success: false, error: '请填写赠送体验开通原因' }, { status: 400 });
      if (!Number.isInteger(complimentaryDays) || complimentaryDays < 1 || complimentaryDays > 365) {
        return NextResponse.json({ success: false, error: '体验有效期必须为 1 至 365 天' }, { status: 400 });
      }
    }

    const now = new Date();
    const expiresAt = isComplimentary
      ? new Date(now.getTime() + complimentaryDays * 24 * 60 * 60 * 1000)
      : addMonths(now, ONBOARDING_MONTHS);
    const preservePaidApplication = isComplimentary && application.payment_status === 'paid';
    const reviewUpdate: Record<string, unknown> = isGrant
      ? {
          complimentary_reason: reason,
          complimentary_code_verified_at: now.toISOString(),
          complimentary_expires_at: expiresAt.toISOString(),
        }
      : isApproval
      ? {
          review_status: 'approved', reviewed_at: now.toISOString(), review_remark: isComplimentary ? reason : null,
          member_starting_at: now.toISOString(), member_expires_at: expiresAt.toISOString(),
          approval_mode: preservePaidApplication ? 'paid' : isComplimentary ? 'complimentary' : 'paid',
          complimentary_reason: isComplimentary ? reason : null,
          complimentary_code_verified_at: isComplimentary ? now.toISOString() : null,
          complimentary_expires_at: isComplimentary ? expiresAt.toISOString() : null,
        }
      : { review_status: 'rejected', reviewed_at: now.toISOString(), review_remark: reason || '资料不符合要求' };

    if (!isApproval) {
      const { data: updatedApplication, error: reviewError } = await supabase
        .from('lawyer_applications').update(reviewUpdate).eq('id', targetId).select().single();
      if (reviewError) return NextResponse.json({ success: false, error: reviewError.message }, { status: 500 });
      if (application.user_id) await sendNotification(supabase, application.user_id, 'lawyer_review_failed', `抱歉，您的律师入驻申请未通过：${reason || '资料不符合要求'}`, targetId);
      return NextResponse.json({ success: true, message: '已拒绝申请', data: updatedApplication });
    }

    let effectiveUserId = application.user_id ? String(application.user_id) : null;
    if (!effectiveUserId && application.phone) {
      const { data: matchedUser } = await supabase.from('users').select('id').eq('phone', application.phone).maybeSingle();
      if (matchedUser) {
        effectiveUserId = String(matchedUser.id);
        await supabase.from('lawyer_applications').update({ user_id: effectiveUserId }).eq('id', targetId);
      }
    }

    const { data: existingLawyer } = await supabase.from('lawyers').select('id').eq('phone', application.phone).maybeSingle();
    let lawyerId = existingLawyer?.id as string | undefined;
    if (!lawyerId) {
      let specialties: string[] = [];
      if (application.specialties) {
        try { specialties = typeof application.specialties === 'string' ? JSON.parse(application.specialties) : application.specialties; } catch { specialties = [application.specialties]; }
      }
      let lawyerData: Record<string, unknown> = {
        user_id: effectiveUserId, phone: application.phone, name: application.name, real_name: application.name,
        wechat: application.wechat, license_no: application.license_number || null, specialties,
        package_type: application.package_type || null, selected_packages: application.selected_packages || null,
        member_expires_at: expiresAt.toISOString(), member_starting_at: now.toISOString(),
        membership_status: isComplimentary ? 'trial' : 'normal', status: 'active', is_available: true,
        working_years: application.working_years || 0, city: application.city || null,
        bio: JSON.stringify({ lawFirm: application.law_firm, education: application.education, graduatedSchool: application.graduated_school || '', gender: application.gender, licenseImages: application.license_images, idCardImages: application.id_card_images }),
        max_orders: 50, current_orders: 0, rating: 5, response_rate: 100, created_at: now.toISOString(), updated_at: now.toISOString(),
      };
      lawyerData = encryptFields(lawyerData, LAWYER_SENSITIVE_FIELDS);
      const { data: createdLawyer, error: lawyerError } = await supabase.from('lawyers').insert(lawyerData).select('id').single();
      if (lawyerError || !createdLawyer) return NextResponse.json({ success: false, error: '律师资格创建失败' }, { status: 500 });
      lawyerId = createdLawyer.id;
    } else {
      const { error: lawyerError } = await supabase.from('lawyers').update({ status: 'active', is_available: true, member_expires_at: expiresAt.toISOString(), membership_status: isComplimentary ? 'trial' : 'normal', updated_at: now.toISOString() }).eq('id', lawyerId);
      if (lawyerError) return NextResponse.json({ success: false, error: '律师资格更新失败' }, { status: 500 });
    }

    const packages = selectedMembershipPackages(application);
    if (!packages.length) return NextResponse.json({ success: false, error: '申请未包含有效套餐' }, { status: 409 });
    const membershipSourceType = isComplimentary ? 'complimentary_onboarding' : 'paid_onboarding';
    for (const packageType of packages) {
      const { data: existingMembership, error: membershipLookupError } = await supabase
        .from('membership_records')
        .select('id')
        .eq('lawyer_id', lawyerId)
        .eq('package_type', packageType)
        .eq('source_type', membershipSourceType)
        .limit(1)
        .maybeSingle();
      if (membershipLookupError) return NextResponse.json({ success: false, error: '查询套餐资格失败' }, { status: 500 });
      if (existingMembership) continue;
      const { error: membershipError } = await supabase.from('membership_records').insert({
        lawyer_id: lawyerId, package_type: packageType, status: isComplimentary ? 'trial' : 'active',
        started_at: now.toISOString(), expires_at: expiresAt.toISOString(), source_type: membershipSourceType,
        source_order_no: isComplimentary ? null : application.order_no || null, is_complimentary: isComplimentary, remark: isComplimentary ? reason : null,
      });
      if (membershipError) return NextResponse.json({ success: false, error: '套餐资格创建失败' }, { status: 500 });
    }

    if (isComplimentary) {
      const { data: existingComplimentaryOrder, error: complimentaryLookupError } = await supabase
        .from('lawyer_complimentary_orders')
        .select('id')
        .eq('application_id', targetId)
        .limit(1)
        .maybeSingle();
      if (complimentaryLookupError) return NextResponse.json({ success: false, error: '查询赠送体验订单失败' }, { status: 500 });
      if (!existingComplimentaryOrder) {
        const { error: complimentaryError } = await supabase.from('lawyer_complimentary_orders').insert({
          application_id: targetId, lawyer_id: lawyerId, user_id: effectiveUserId || String(application.user_id || ''),
          order_no: `COMP${Date.now()}${targetId}`, amount: 0, status: 'completed', reason,
          code_verified_at: now.toISOString(), expires_at: expiresAt.toISOString(), created_by: String(authResult.adminId || ''),
        });
        if (complimentaryError) return NextResponse.json({ success: false, error: '赠送体验订单创建失败' }, { status: 500 });
      }
    }

    const applicationUpdateQuery = supabase.from('lawyer_applications').update(reviewUpdate).eq('id', targetId);
    if (!isGrant) applicationUpdateQuery.eq('review_status', 'pending');
    const { data: updatedApplication, error: reviewError } = await applicationUpdateQuery.select().single();
    if (reviewError || !updatedApplication) {
      return NextResponse.json({ success: false, error: reviewError?.message || '申请状态更新失败，请重试' }, { status: 500 });
    }
    if (effectiveUserId) await sendNotification(supabase, effectiveUserId, 'lawyer_review_passed', isComplimentary ? '您的律师体验资格已开通。' : '恭喜！您已通过律师入驻审核，可以开始接单服务了。', targetId);
    return NextResponse.json({ success: true, message: isComplimentary ? '已赠送体验开通' : '已通过审核', data: updatedApplication });
  } catch (error) {
    console.error('审核操作失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
