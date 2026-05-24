import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

/**
 * GET - 获取待审核的律师资料修改列表
 */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth || !auth.success) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  try {
    const url = new URL(request.url);
    const lawyerId = url.searchParams.get('lawyerId');

    if (!lawyerId) {
      return NextResponse.json({ success: false, error: '缺少律师ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: revisions, error } = await supabase
      .from('lawyer_profile_revisions')
      .select('id, field_name, old_value, new_value, status, reason, created_at, processed_at, admin_remark')
      .eq('lawyer_id', lawyerId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 映射 field_name → revision_type 以匹配前端接口
    const mappedRevisions = (revisions || []).map((r) => ({
      id: r.id,
      revision_type: r.field_name,
      old_value: r.old_value,
      new_value: r.new_value,
      status: r.status,
      reason: r.reason,
      submitted_at: r.created_at,
      processed_at: r.processed_at,
      admin_remark: r.admin_remark,
    }));

    return NextResponse.json({ success: true, data: mappedRevisions });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // 认证检查
  const auth = authenticateRequest(request);
  if (!auth || !auth.success) {
    return unauthorizedResponse(auth?.error || '请先登录');
  }

  try {
    const body = await request.json();
    const { lawyerId, changes, reason, batchId } = body;

    if (!lawyerId) {
      return NextResponse.json({ success: false, error: '缺少律师ID' }, { status: 400 });
    }

    // 兼容旧版单字段格式
    const revisionType = body.revisionType;
    const oldValue = body.oldValue;
    const newValue = body.newValue;

    // 权限校验：只能提交自己的审核
    const supabase = getSupabaseAdmin();
    const { data: lawyer } = await supabase
      .from('lawyers')
      .select('user_id')
      .eq('id', lawyerId)
      .single();

    if (!lawyer || lawyer.user_id.toString() !== auth.user!.id.toString()) {
      return NextResponse.json({ success: false, error: '无权提交此审核' }, { status: 403 });
    }

    // 新格式：批量提交 changes 数组
    if (changes && Array.isArray(changes) && changes.length > 0) {
      // 🔒 格式校验：手机号必须11位数字，执业证号必须17位数字
      for (const c of changes) {
        if (c.field === 'phone' && c.newValue && !/^\d{11}$/.test(String(c.newValue))) {
          return NextResponse.json({ success: false, error: '手机号必须为11位数字' }, { status: 400 });
        }
        if (c.field === 'license_no' && c.newValue && !/^\d{17}$/.test(String(c.newValue))) {
          return NextResponse.json({ success: false, error: '执业证号必须为17位数字' }, { status: 400 });
        }
      }

      const sharedBatchId = batchId || crypto.randomUUID();
      const insertRows = changes.map((c: { field: string; oldValue: string; newValue: string }) => ({
        lawyer_id: lawyerId,
        field_name: c.field,
        old_value: String(c.oldValue ?? ''),
        new_value: String(c.newValue ?? ''),
        reason: reason || '',
        status: 'pending',
        batch_id: sharedBatchId,
      }));

      const { data: revisions, error: revisionError } = await supabase
        .from('lawyer_profile_revisions')
        .insert(insertRows)
        .select();

      if (revisionError) {
        return NextResponse.json({ success: false, error: revisionError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, revisions, batchId: sharedBatchId });
    }

    // 旧格式兼容：单字段提交
    if (!revisionType || oldValue === undefined || newValue === undefined) {
      return NextResponse.json({ success: false, error: '缺少修改信息' }, { status: 400 });
    }

    const { data: revision, error: revisionError } = await supabase
      .from('lawyer_profile_revisions')
      .insert({
        lawyer_id: lawyerId,
        field_name: revisionType,
        old_value: String(oldValue),
        new_value: String(newValue),
        reason: reason || '',
        status: 'pending',
        batch_id: batchId || crypto.randomUUID(),
      })
      .select()
      .single();

    if (revisionError) {
      return NextResponse.json({ success: false, error: revisionError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, revision });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
