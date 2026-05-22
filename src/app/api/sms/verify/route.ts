import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/lib/sms/verify-code';

// 验证手机号格式
function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, type = 'login' } = body;

    // 验证手机号
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json(
        { success: false, error: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 验证验证码
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: '请输入6位数字验证码' },
        { status: 400 }
      );
    }

    // 验证码类型校验（仅接受已知类型，防止注入）
    const validTypes = ['login', 'register'];
    const verifyType = validTypes.includes(type) ? type : 'login';

    // 验证验证码
    const result = await verifyCode(phone, code, verifyType);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.reason || '验证码错误' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '验证成功',
    });
  } catch (error) {
    console.error('[SMS Verify Error]', error);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
