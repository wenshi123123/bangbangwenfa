import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** Return a rejected application as editable reapplication defaults. */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.success || !auth.userId) return unauthorizedResponse(auth.error || '请先登录');

  const applicationId = Number(request.nextUrl.searchParams.get('sourceApplicationId'));
  if (!Number.isInteger(applicationId)) {
    return NextResponse.json({ success: false, error: '来源申请编号无效' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('lawyer_applications')
    .select('id, user_id, name, gender, law_firm, license_number, specialties, education, graduated_school, working_years, city, phone, wechat, license_images, id_card_images, education_images, package_type, selected_packages, review_status, review_remark')
    .eq('id', applicationId)
    .eq('user_id', String(auth.userId))
    .maybeSingle();

  if (error) {
    console.error('[Lawyer/Reapplication] 查询来源申请失败:', error);
    return NextResponse.json({ success: false, error: '读取原申请失败' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ success: false, error: '来源申请不存在或无权访问' }, { status: 404 });
  if (data.review_status !== 'rejected') {
    return NextResponse.json({ success: false, error: '只有已拒绝的申请可以重新提交' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: {
      sourceApplicationId: data.id,
      reason: data.review_remark || '',
      formData: {
        name: data.name || '',
        gender: data.gender || '',
        lawFirm: data.law_firm || '',
        licenseNumber: data.license_number || '',
        specialties: parseJsonArray(data.specialties),
        education: data.education || '',
        graduatedSchool: data.graduated_school || '',
        workingYears: data.working_years == null ? '' : String(data.working_years),
        city: data.city || '',
        phone: data.phone || '',
        wechat: data.wechat || '',
        licenseImages: parseJsonArray(data.license_images),
        idCardImages: parseJsonArray(data.id_card_images),
        educationImages: parseJsonArray(data.education_images),
        packageType: data.package_type || '',
        packagePrice: 0,
        selectedPackages: parseJsonArray(data.selected_packages),
      },
    },
  });
}
