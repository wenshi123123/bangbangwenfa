import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth } from '@/lib/auth/admin-middleware';

// GET /api/admin/members/list - 获取律师会员信息
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('lawyers')
      .select('id, name, membership_status, member_expires_at, member_starting_at, package_type, selected_packages')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const lawyerList = data || [];

    // 获取所有律师的套餐记录
    if (lawyerList.length > 0) {
      const ids = lawyerList.map(l => l.id);
      const { data: records } = await supabase
        .from('membership_records')
        .select('id, lawyer_id, package_type, status, started_at, expires_at')
        .in('lawyer_id', ids)
        .order('created_at', { ascending: true });

      // 将 records 按 lawyer_id 分组挂到每个律师上
      const recordsByLawyer: Record<string, typeof records> = {};
      if (records) {
        for (const r of records) {
          const lid = r.lawyer_id;
          if (!recordsByLawyer[lid]) recordsByLawyer[lid] = [];
          recordsByLawyer[lid].push(r);
        }
      }

      for (const lawyer of lawyerList) {
        (lawyer as Record<string, unknown>).records = recordsByLawyer[lawyer.id] || [];
      }
    }

    return NextResponse.json({ success: true, data: lawyerList });
  } catch (e) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
