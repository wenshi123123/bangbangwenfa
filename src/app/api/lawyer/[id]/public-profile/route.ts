import { getSupabaseAdmin } from '@/storage/database/supabase-client';

/**
 * 公开律师名片 API（无需登录）
 * GET /api/lawyer/[id]/public-profile
 * 返回律师公开信息，不返回 phone 等隐私字段
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lawyerId } = await params;
    const lawyerIdFilter = String(lawyerId);

    if (!lawyerId || typeof lawyerId !== 'string') {
      return Response.json({ success: false, error: '无效的律师 ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('lawyers')
      .select(`
        id,
        name,
        real_name,
        gender,
        title,
        intro,
        specialties,
        education,
        graduated_school,
        working_years,
        law_firm,
        license_no,
        wechat,
        province,
        city,
        status,
        is_available,
        package_type,
        selected_packages,
        created_at
      `)
      .eq('id', lawyerId)
      .single();

    if (error || !data) {
      return Response.json({ success: false, error: '律师不存在' }, { status: 404 });
    }

    // 只返回已审核通过的律师
    if (data.status !== 'active') {
      return Response.json({ success: false, error: '律师信息暂未公开' }, { status: 403 });
    }

    // 不返回 phone，保护隐私
    const { phone: _phone, ...publicData } = data as Record<string, unknown>;

    // 查询已接单数量（confirmed + completed）
    const { count, error: countError } = await supabase
      .from('consult_orders')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_lawyer_id', lawyerIdFilter)
      .in('assignment_status', ['confirmed', 'completed']);

    return Response.json({
      success: true,
      data: {
        ...publicData,
        orderCount: count || 0,
      },
    });
  } catch (err: any) {
    console.error('[public-profile] 异常:', err);
    return Response.json({ success: false, error: '服务器异常' }, { status: 500 });
  }
}
