import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth } from '@/lib/auth/admin-middleware';

// POST /api/admin/members/records - 开通/续费一条套餐记录
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lawyer_id, package_type, expires_at, is_trial, note } = body;

    if (!lawyer_id || !package_type || !expires_at) {
      return NextResponse.json({ success: false, error: '缺少必填参数' }, { status: 400 });
    }

    if (!['civil_premium', 'criminal_premium', 'civil', 'criminal'].includes(package_type)) {
      return NextResponse.json({ success: false, error: '无效的套餐类型' }, { status: 400 });
    }

    // 标准化套餐 key（向后兼容旧格式）
    const normalizedType = package_type === 'civil' ? 'civil_premium'
      : package_type === 'criminal' ? 'criminal_premium'
      : package_type;

    const supabase = getSupabaseAdmin();

    // 1. 创建套餐记录
    const { data: record, error: insertError } = await supabase
      .from('membership_records')
      .insert({
        lawyer_id,
        package_type: normalizedType,
        status: is_trial ? 'trial' : 'active',
        expires_at,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // 2. 同步更新 lawyers 表主字段（保持向后兼容）
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('package_type, member_expires_at, member_starting_at')
      .eq('id', lawyer_id)
      .single();

    // 如果新套餐到期日更晚，或律师无主套餐，则更新 lawyers 主字段
    const shouldUpdateLawyer = !lawyer?.member_expires_at
      || new Date(expires_at) > new Date(lawyer.member_expires_at);

    if (shouldUpdateLawyer) {
      await supabase
        .from('lawyers')
        .update({
          package_type: normalizedType,
          membership_status: is_trial ? 'trial' : 'normal',
          member_expires_at: expires_at,
          member_starting_at: lawyer?.member_starting_at || new Date().toISOString(),
          is_available: true,
        })
        .eq('id', lawyer_id);
    }

    // 3. 同步 selected_packages（用于律师工作台显示套餐标签）
    const { data: activeRecords } = await supabase
      .from('membership_records')
      .select('package_type')
      .eq('lawyer_id', lawyer_id)
      .in('status', ['active', 'trial']);

    const packages = [...new Set((activeRecords || []).map(r => r.package_type))];
    await supabase
      .from('lawyers')
      .update({ selected_packages: packages })
      .eq('id', lawyer_id);

    // 4. 写操作日志
    try {
      await supabase.from('membership_logs').insert({
        lawyer_id,
        action: 'activate',
        package_type: normalizedType,
        is_trial: !!is_trial,
        new_expires_at: expires_at,
        note: note || null,
      });
    } catch {
      // 日志失败不影响主操作
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
