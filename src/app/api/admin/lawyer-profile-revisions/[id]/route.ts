import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);
  
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lawyer_profile_revisions')
      .select('*, lawyers(name, phone)')
      .eq('id', id)
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    // 展平 lawyers.name 为 lawyer_name 供前端直接使用
    const lawyers = (data as Record<string, unknown>).lawyers as { name?: string; phone?: string } | null;
    const result = {
      ...data,
      lawyer_name: lawyers?.name || null,
      lawyer_phone: lawyers?.phone || null,
    };
    return NextResponse.json({ success: true, revision: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, comment } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: '无效的操作类型' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 先查询当前 revision
    const { data: revision, error: fetchError } = await supabase
      .from('lawyer_profile_revisions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !revision) {
      return NextResponse.json({ success: false, error: '审核记录不存在' }, { status: 404 });
    }

    if (revision.status !== 'pending') {
      return NextResponse.json({ success: false, error: '该记录已处理，无法重复审核' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    // 如果审核通过，将修改应用到 lawyers 表
    if (action === 'approve') {
      const fieldMap: Record<string, string> = {
        name: 'name',
        working_years: 'working_years',
        license_no: 'license_no',
        phone: 'phone',
        email: 'email',
        wechat: 'wechat',
        wechat_id: 'wechat_id',
        title: 'title',
        specialties: 'specialties',
        intro: 'intro',
      };

      const dbField = fieldMap[revision.revision_type];
      if (dbField) {
        const updateValue: Record<string, unknown> = {};
        // specialties 需要解析为 JSON 数组
        if (revision.revision_type === 'specialties') {
          try {
            updateValue[dbField] = JSON.parse(revision.new_value);
          } catch {
            updateValue[dbField] = revision.new_value;
          }
        } else if (revision.revision_type === 'working_years') {
          updateValue[dbField] = parseInt(revision.new_value) || 0;
        } else {
          updateValue[dbField] = revision.new_value;
        }

        const { error: lawyerUpdateError } = await supabase
          .from('lawyers')
          .update(updateValue)
          .eq('id', revision.lawyer_id);

        if (lawyerUpdateError) {
          return NextResponse.json({ success: false, error: '更新律师信息失败: ' + lawyerUpdateError.message }, { status: 500 });
        }
      }
    }

    // 更新 revision 状态
    const updateData: Record<string, unknown> = {
      status: newStatus,
      reviewed_at: now,
      review_comment: comment || null,
    };

    const { data, error } = await supabase
      .from('lawyer_profile_revisions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, revision: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
