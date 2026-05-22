import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyCode } from '@/lib/sms/verify-code';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';

/**
 * POST /api/auth/reset-password
 * 重置密码接口
 * 请求体: { phone, code, newPassword }
 * 
 * 流程:
 * 1. 验证手机号和验证码
 * 2. 验证新密码强度
 * 3. 更新用户密码
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, newPassword } = body;

    // 参数校验
    if (!phone || !code || !newPassword) {
      return NextResponse.json(
        { success: false, error: '手机号、验证码和新密码不能为空' },
        { status: 400 }
      );
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { success: false, error: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 验证验证码
    const verifyResult = await verifyCode(phone, code, 'reset-password');
    if (!verifyResult.valid) {
      return NextResponse.json(
        { success: false, error: verifyResult.reason || '验证码错误' },
        { status: 400 }
      );
    }

    // 验证新密码强度
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 查找用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: '该手机号未注册' },
        { status: 400 }
      );
    }

    // 哈希新密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新密码
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('更新密码失败:', updateError);
      return NextResponse.json(
        { success: false, error: '重置密码失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '密码重置成功'
    });

  } catch (error) {
    console.error('重置密码失败:', error);
    return NextResponse.json(
      { success: false, error: '重置密码失败，请稍后重试' },
      { status: 500 }
    );
  }
}
