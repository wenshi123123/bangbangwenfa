import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';
import { encryptFields, LAWYER_SENSITIVE_FIELDS } from '@/lib/crypto/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);
  
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    let data: unknown[] | null = null;
    let error = null;

    // 1) 先按 lawyer_id 查询所有状态记录
    let result = await supabase
      .from('lawyer_profile_revisions')
      .select('*, lawyers(name, phone)')
      .eq('lawyer_id', id)
      .order('created_at', { ascending: true });
    data = result.data;
    error = result.error;

    // 2) 如果 lawyer_id 没查到，尝试按 batch_id 查
    if (!error && (!data || data.length === 0)) {
      result = await supabase
        .from('lawyer_profile_revisions')
        .select('*, lawyers(name, phone)')
        .eq('batch_id', id)
        .order('created_at', { ascending: true });
      data = result.data;
      error = result.error;
    }

    // 3) 都查不到，尝试作为单条记录 ID 精确查询
    if (!error && (!data || data.length === 0)) {
      result = await supabase
        .from('lawyer_profile_revisions')
        .select('*, lawyers(name, phone)')
        .eq('id', id)
        .single();
      if (result.data) {
        data = [result.data];
        error = result.error;
      } else {
        data = null;
        error = result.error || new Error('not found');
      }
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: '审核记录不存在' }, { status: 404 });
    }

    const firstRow = (data[0] as Record<string, unknown>);
    const lawyers = firstRow.lawyers as { name?: string; phone?: string } | null;

    const revisions = data.map((d: unknown) => {
      const row = d as Record<string, unknown>;
      const rowLawyers = row.lawyers as { name?: string; phone?: string } | null;
      return {
        ...row,
        lawyer_name: rowLawyers?.name || lawyers?.name || null,
        lawyer_phone: rowLawyers?.phone || lawyers?.phone || null,
        revision_type: row.field_name,
        status: (row.status as string) || 'pending',
        submitted_at: row.created_at,
        reviewed_at: row.processed_at || row.reviewed_at || null,
        review_comment: row.admin_remark || row.review_comment || null,
      };
    });

    const batchInfo = {
      batch_id: (firstRow.batch_id as string) || String(firstRow.id),
      lawyer_id: firstRow.lawyer_id as string,
      lawyer_name: lawyers?.name || null,
      lawyer_phone: lawyers?.phone || null,
      reason: (firstRow.reason as string) || '',
      status: revisions.some(r => r.status === 'pending') ? 'pending'
        : revisions.every(r => r.status === 'approved') ? 'approved' : 'rejected',
      submitted_at: firstRow.created_at as string,
      revisions,
    };

    return NextResponse.json({ success: true, batch: batchInfo });
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

    let revisions: Record<string, unknown>[] = [];

    // 🔒 按 batch_id 审批（不再按 lawyer_id 以免一锅端）
    {
      const { data: batchData, error: batchFetchError } = await supabase
        .from('lawyer_profile_revisions')
        .select('*').eq('batch_id', id);
      if (!batchFetchError && batchData && batchData.length > 0) {
        revisions = batchData as Record<string, unknown>[];
      }
    }

    // 兜底：尝试作为单条记录 ID
    if (revisions.length === 0) {
      const { data: singleRev, error: fetchError } = await supabase
        .from('lawyer_profile_revisions').select('*').eq('id', id).single();
      if (fetchError || !singleRev) {
        return NextResponse.json({ success: false, error: '审核记录不存在' }, { status: 404 });
      }
      revisions = [singleRev as Record<string, unknown>];
    }

    if (revisions.length === 0) {
      return NextResponse.json({ success: false, error: '无待审核记录' }, { status: 404 });
    }

    // 🔒 二次校验：确保所有记录仍然是 pending 状态（防止竞态）
    const pendingCount = revisions.filter(r => r.status === 'pending').length;
    if (pendingCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '这些记录已被其他管理员处理，请刷新页面' 
      }, { status: 409 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    if (action === 'approve') {
      const fieldMap: Record<string, string> = {
        name: 'name',
        gender: 'gender',
        law_firm: 'law_firm',
        education: 'education',
        graduated_school: 'graduated_school',
        phone: 'phone',
        license_no: 'license_no',
        city: 'city',
        specialties: 'specialties',
        wechat: 'wechat',
        email: 'email',
        title: 'title',
        intro: 'intro',
        working_years: 'working_years',
      };

      const updateValues: Record<string, unknown> = {};
      const lawyerId = revisions[0]?.lawyer_id;

      for (const revision of revisions) {
        const fieldName = revision.field_name as string;
        const newValue = revision.new_value as string;
        const dbField = fieldMap[fieldName];
        if (dbField) {
          if (fieldName === 'specialties') {
            try {
              updateValues[dbField] = JSON.parse(newValue);
            } catch {
              updateValues[dbField] = newValue;
            }
          } else if (fieldName === 'working_years') {
            updateValues[dbField] = parseInt(newValue) || 0;
          } else {
            updateValues[dbField] = newValue;
          }
        }
      }

      if (lawyerId && Object.keys(updateValues).length > 0) {
        // 🔒 加密敏感字段后再写入（与律师端 PUT 逻辑保持一致）
        const safeUpdates = encryptFields(updateValues, LAWYER_SENSITIVE_FIELDS);

        const { error: lawyerUpdateError } = await supabase
          .from('lawyers')
          .update(safeUpdates)
          .eq('id', lawyerId);

        if (lawyerUpdateError) {
          return NextResponse.json({ success: false, error: '更新律师信息失败: ' + lawyerUpdateError.message }, { status: 500 });
        }
      }
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      processed_at: now,
      admin_remark: comment || null,
    };

    // 🔒 记录审核人 ID（从认证结果中获取）
    if (authResult.adminId) {
      updateData.admin_id = authResult.adminId;
    }

    const revIds = revisions.map(r => r.id);
    const { data, error } = await supabase
      .from('lawyer_profile_revisions')
      .update(updateData)
      .in('id', revIds)
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, revisions: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
