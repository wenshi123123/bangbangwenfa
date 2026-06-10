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

    // 🔒 P0-3 方案A：定义需要触发"重新审核"的敏感字段
    // 修改这些字段后，律师状态从 active → pending_review，需管理员重新审核
    const P0_SENSITIVE_FIELDS = new Set([
      'law_firm',           // 所属律所
      'working_years',      // 从业年限
      'license_no',        // 执业证号（证书相关）
      'name',               // 姓名
      'real_name',          // 真实姓名
    ]);

    // 检查本次提交是否包含 P0 敏感字段
    const fieldsToCheck = changes
      ? changes.map((c: { field: string }) => c.field)
      : [revisionType];
    const hasP0SensitiveField = fieldsToCheck.some((f: string) => P0_SENSITIVE_FIELDS.has(f));

    // 🔒 P0-3 方案A：如果包含 P0 敏感字段，将律师状态改为 pending_review
    if (hasP0SensitiveField) {
      console.log('[P0-3] 检测到 P0 敏感字段变更，将律师状态改为 pending_review', {
        lawyerId,
        sensitiveFields: fieldsToCheck.filter((f: string) => P0_SENSITIVE_FIELDS.has(f)),
      });
      const { error: statusError } = await supabase
        .from('lawyers')
        .update({
          status: 'pending_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lawyerId);

      if (statusError) {
        console.error('[P0-3] 更新律师状态失败:', statusError);
        // 不阻断审核提交流程，但记录错误
      }
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

      return NextResponse.json({
        success: true,
        revisions,
        batchId: sharedBatchId,
        statusChanged: hasP0SensitiveField,
        newStatus: hasP0SensitiveField ? 'pending_review' : undefined,
        message: hasP0SensitiveField
          ? '修改申请已提交，因涉及敏感信息，您的账号将进入审核状态。审核期间您可正常接单。'
          : undefined,
      });
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

    return NextResponse.json({
      success: true,
      revision,
      statusChanged: hasP0SensitiveField,
      newStatus: hasP0SensitiveField ? 'pending_review' : undefined,
      message: hasP0SensitiveField
        ? '修改申请已提交，因涉及敏感信息，您的账号将进入审核状态。审核期间您可正常接单。'
        : undefined,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
