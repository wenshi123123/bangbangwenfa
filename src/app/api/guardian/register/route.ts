import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { randomBytes } from 'crypto';

// 生成守护者邀请码（使用密码学安全随机）
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let code = 'GUD-';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// POST - 注册守护者（需认证）
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    // 支持 userId 和 user_id 两种格式
    const { userId, user_id, openid, nickname, avatarUrl, phone, wechat } = body;
    const uid = userId || user_id || auth.userId;

    // 必须提供至少一种用户标识
    if (!uid && !phone && !openid) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少用户标识 (userId 或 phone)' 
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 优先使用手机号查询/注册
    if (phone) {
      // 检查该手机号是否已是守护者
      const { data: byPhone } = await supabase
        .from('guardian_users')
        .select('*')
        .eq('phone', phone)
        .single();
      
      if (byPhone) {
        return NextResponse.json({ 
          success: false,  // 返回 false 以便前端判断
          error: '已是守护者',  
          message: '已是守护者',
          data: byPhone
        });
      }
    }

    // 优先使用传入的 openid，其次使用 userId 生成
    const userOpenid = openid || (uid ? `user_${uid}` : null);

    if (!userOpenid && !uid && !phone) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少用户标识 (openid、userId 或 phone)' 
      }, { status: 400 });
    }

    // 检查是否已是守护者（优先通过 user_id 查询，其次通过 openid）
    let existingGuardian = null;
    
    if (uid) {
      const { data: byUserId } = await supabase
        .from('guardian_users')
        .select('*')
        .eq('user_id', String(uid))
        .single();
      
      if (byUserId) {
        existingGuardian = byUserId;
      }
    }
    
    // 如果 user_id 没找到，再尝试 openid 查询
    if (!existingGuardian && userOpenid) {
      const { data: byOpenid } = await supabase
        .from('guardian_users')
        .select('*')
        .eq('openid', userOpenid)
        .single();
      
      if (byOpenid) {
        existingGuardian = byOpenid;
      }
    }

    if (existingGuardian) {
      return NextResponse.json({ 
        success: false,  // 返回 false 以便前端判断
        error: '已是守护者',  
        message: '已是守护者',
        data: existingGuardian
      });
    }

    // 生成唯一邀请码
    let inviteCode = generateInviteCode();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabase
        .from('guardian_users')
        .select('id')
        .eq('invite_code', inviteCode)
        .single();
      
      if (!existing) {
        isUnique = true;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    // 创建守护者
    const { data: newGuardian, error } = await supabase
      .from('guardian_users')
      .insert([{
        openid: userOpenid,
        nickname: nickname || '守护者',
        avatar_url: avatarUrl || null,
        invite_code: inviteCode,
        wechat_account: wechat || null,
        phone: phone || null,
        total_invites: 0,
        valid_invites: 0,
        total_commission: 0,
        available_commission: 0,
        withdrawn_commission: 0,
        status: 'active',
        user_id: uid ? String(uid) : null
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '注册成功',
      data: {
        id: newGuardian.id,
        openid: newGuardian.openid,
        nickname: newGuardian.nickname,
        avatar_url: newGuardian.avatar_url,
        invite_code: newGuardian.invite_code,  // 下划线格式
        inviteCode: newGuardian.invite_code,   // 驼峰格式兼容
        guardianId: newGuardian.id
      }
    });
  } catch (error: any) {
    console.error('守护者注册失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
