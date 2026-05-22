import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// POST /api/guardian/invitees - 创建邀请关系
export async function POST(request: NextRequest) {
  // 验证用户身份
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return unauthorizedResponse(auth.error);
  }
  
  const userId = auth.user?.id || auth.guardianId;
  if (!userId) {
    return NextResponse.json({ success: false, error: '无法获取用户信息' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const { guardianId, inviteCode, openid, inviteeNickname } = body;

    if (!guardianId) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少守护者ID' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const userIdStr = String(userId);

    // 优先通过 user_id 查找，如果找到则更新 openid
    const { data: existingByUserId } = await supabase
      .from('guardian_invitees')
      .select('*')
      .eq('invitee_user_id', userIdStr)
      .eq('guardian_id', guardianId)
      .single();

    if (existingByUserId) {
      // 如果已有关系但缺少 openid，尝试补充
      if (!existingByUserId.invitee_openid && openid) {
        await supabase
          .from('guardian_invitees')
          .update({ invitee_openid: openid })
          .eq('id', existingByUserId.id);
        existingByUserId.invitee_openid = openid;
      }
      return NextResponse.json({ 
        success: true, 
        data: existingByUserId,
        message: '邀请关系已存在'
      });
    }

    // 通过 openid 查找（用户可能已通过 openid 登录）
    if (openid) {
      const { data: existingByOpenid } = await supabase
        .from('guardian_invitees')
        .select('*')
        .eq('invitee_openid', openid)
        .eq('guardian_id', guardianId)
        .single();

      if (existingByOpenid) {
        // 如果找到但缺少 user_id，补充
        if (!existingByOpenid.invitee_user_id) {
          await supabase
            .from('guardian_invitees')
            .update({ invitee_user_id: userIdStr })
            .eq('id', existingByOpenid.id);
          existingByOpenid.invitee_user_id = userIdStr;
        }
        return NextResponse.json({ 
          success: true, 
          data: existingByOpenid,
          message: '邀请关系已存在'
        });
      }
    }

    // 获取守护者信息
    const { data: guardian } = await supabase
      .from('guardian_users')
      .select('nickname')
      .eq('id', guardianId)
      .single();

    // 创建邀请关系，同时保存 user_id 和 openid（如果都有）
    const { data: newInvitee, error } = await supabase
      .from('guardian_invitees')
      .insert([{
        guardian_id: guardianId,
        invitee_user_id: userIdStr,
        invitee_openid: openid || null,  // 同时保存 openid
        invitee_nickname: inviteeNickname || '用户',
        invite_code: inviteCode || null,
        bind_source: 'link',  // 添加绑定来源
        is_valid: true
      }])
      .select()
      .single();

    if (error) {
      // 如果因为唯一约束失败（user_id+guardian_id 已存在），返回已有记录
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('guardian_invitees')
          .select('*')
          .eq('invitee_user_id', userIdStr)
          .eq('guardian_id', guardianId)
          .single();
        return NextResponse.json({ 
          success: true, 
          data: existing,
          message: '邀请关系已存在'
        });
      }
      console.error('创建邀请关系失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: `创建邀请关系失败: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: newInvitee 
    });

  } catch (error: any) {
    console.error('创建邀请关系异常:', error);
    return NextResponse.json({ 
      success: false, 
      error: `服务器错误: ${error.message}` 
    }, { status: 500 });
  }
}
