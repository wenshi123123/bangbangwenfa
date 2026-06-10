import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { decryptFields, encryptFields, LAWYER_SENSITIVE_FIELDS } from '@/lib/crypto/encryption';

// GET /api/admin/lawyers/[id] - 获取律师详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('lawyers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: decryptFields(data, LAWYER_SENSITIVE_FIELDS) });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// PUT /api/admin/lawyers/[id] - 更新律师信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const supabase = getSupabaseAdmin();

    // 读取旧值用于日志对比
    const { data: oldLawyer } = await supabase
      .from('lawyers')
      .select('membership_status, member_expires_at')
      .eq('id', id)
      .single();

    // 只提取律师表允许的会员相关字段，避免把 note 等日志字段传给 lawyers 表
    const membershipUpdateFields = ['membership_status', 'member_expires_at', 'member_starting_at', 'is_available', 'online_status', 'package_type'];
    const updateBody: Record<string, unknown> = {};
    for (const key of membershipUpdateFields) {
      if (key in body) updateBody[key] = body[key];
    }
    const encryptedBody = encryptFields(updateBody, LAWYER_SENSITIVE_FIELDS);

    const { data, error } = await supabase
      .from('lawyers')
      .update(encryptedBody)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 自动写入会员操作日志（仅当会员相关字段有变更时）
    const membershipFields = ['membership_status', 'member_expires_at', 'member_starting_at'];
    const hasMembershipChange = membershipFields.some(f =>
      f in body && oldLawyer && body[f] !== (oldLawyer as Record<string, unknown>)[f]
    );

    if (hasMembershipChange && oldLawyer) {
      try {
        const determineAction = () => {
          if (!oldLawyer.member_expires_at && body.member_expires_at) return 'activate';
          if (body.membership_status === 'expired' && oldLawyer.membership_status !== 'expired') return 'close';
          return 'renew';
        };

        const newExpires = body.member_expires_at ? new Date(body.member_expires_at) : null;
        const oldExpires = oldLawyer.member_expires_at ? new Date(oldLawyer.member_expires_at) : null;
        const durationDays = newExpires && oldExpires && newExpires > oldExpires
          ? Math.ceil((newExpires.getTime() - (oldExpires > new Date() ? oldExpires.getTime() : Date.now())) / (1000 * 60 * 60 * 24))
          : null;

        await supabase.from('membership_logs').insert({
          lawyer_id: id,
          action: determineAction(),
          package_type: body.package_type || null,
          is_trial: body.membership_status === 'trial' || false,
          duration_days: durationDays,
          old_expires_at: oldLawyer.member_expires_at || null,
          new_expires_at: body.member_expires_at || null,
          note: body.note || null,
        });
      } catch {
        // 日志写入失败不影响主操作
      }
    }

    return NextResponse.json({ success: true, data: decryptFields(data, LAWYER_SENSITIVE_FIELDS) });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/admin/lawyers/[id] - 删除律师
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('lawyers')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
