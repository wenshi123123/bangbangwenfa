import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/storage/database/supabase-client';

// GET /api/guardian/verify-code - 验证邀请码
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteCode = searchParams.get('inviteCode');

    if (!inviteCode) {
      return NextResponse.json(
        { error: '邀请码不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 查询守护者信息
    const { data: guardian, error } = await supabase
      .from('guardian_users')
      .select('id, nickname, avatar_url, invite_code, status')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (error || !guardian) {
      return NextResponse.json(
        { valid: false, error: '邀请码不存在' },
        { status: 200 }
      );
    }

    // 检查守护者状态
    if (guardian.status !== 'active') {
      return NextResponse.json(
        { valid: false, error: '邀请码已失效' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      guardian: {
        id: guardian.id,
        nickname: guardian.nickname,
        avatar_url: guardian.avatar_url,
        invite_code: guardian.invite_code,
      }
    });

  } catch (err) {
    console.error('[verify-code] Error:', err);
    return NextResponse.json(
      { valid: false, error: '验证失败，请稍后重试' },
      { status: 500 }
    );
  }
}
