import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyCode } from '@/lib/sms/verify-code';
import { generateToken } from '@/lib/auth/token';
import { hashPassword, validatePasswordStrength, validateUsername } from '@/lib/auth/password';

/**
 * POST /api/auth/register
 * 注册接口
 * 必填: phone, code, username, password
 * 选填: inviteCode
 * 注: nickname 默认使用 username
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, username, password, inviteCode } = body;

    // === 参数校验 ===

    // 手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 验证码
    if (!code) {
      return NextResponse.json(
        { success: false, error: '请输入验证码' },
        { status: 400 }
      );
    }

    // 验证验证码
    const verifyResult = await verifyCode(phone, code, 'register');
    if (!verifyResult.valid) {
      return NextResponse.json(
        { success: false, error: verifyResult.reason || '验证码错误' },
        { status: 400 }
      );
    }

    // 用户名
    if (!username) {
      return NextResponse.json(
        { success: false, error: '请输入用户名' },
        { status: 400 }
      );
    }
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { success: false, error: usernameValidation.message },
        { status: 400 }
      );
    }

    // 密码
    if (!password) {
      return NextResponse.json(
        { success: false, error: '请输入密码' },
        { status: 400 }
      );
    }
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // === 检查手机号是否已注册 ===
    const { data: phoneUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (phoneUser) {
      return NextResponse.json(
        { success: false, error: '该手机号已注册' },
        { status: 400 }
      );
    }

    // === 检查用户名是否已存在（精确匹配，注册时已存储为小写）===
    const { data: usernameUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (usernameUser) {
      return NextResponse.json(
        { success: false, error: '该用户名已被使用' },
        { status: 400 }
      );
    }

    // === 处理邀请码 ===
    let inviterId = null;
    if (inviteCode) {
      // 检查是否是守护者邀请码
      const { data: guardian } = await supabase
        .from('guardian_users')
        .select('id')
        .eq('invite_code', inviteCode)
        .single();

      if (guardian) {
        inviterId = guardian.id;
      }
    }

    // === 创建用户 ===
    const hashedPassword = await hashPassword(password);
    // nickname 默认使用 username
    const finalNickname = username;

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        phone,
        username: username.toLowerCase(),
        password_hash: hashedPassword,
        nickname: finalNickname,
        source: 'register',
        invite_code: inviteCode,
        inviter_id: inviterId,
        login_count: 1,
        last_login_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('创建用户失败:', createError);
      return NextResponse.json(
        { success: false, error: '注册失败，请稍后重试' },
        { status: 500 }
      );
    }

    // === 生成 token ===
    const token = await generateToken({
      id: newUser.id,
      phone: newUser.phone,
      username: newUser.username,
      userType: 'user'
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          phone: newUser.phone,
          username: newUser.username,
          nickname: newUser.nickname
        },
        token
      }
    });

  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { success: false, error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
