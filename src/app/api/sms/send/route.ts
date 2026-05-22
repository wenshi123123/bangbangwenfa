import { NextRequest, NextResponse } from 'next/server';
import { sendSmsCode } from '@/lib/sms/tencent';
import {
  generateCode,
  storeCode,
  checkPhoneRateLimit,
  checkIpRateLimit,
} from '@/lib/sms/verify-code';

// 验证手机号格式
function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 获取客户端 IP
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, type = 'login' } = body;

    // 验证手机号
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json(
        { success: false, error: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 获取客户端 IP
    const clientIp = getClientIp(request);

    // 检查手机号发送频率
    const phoneRateCheck = await checkPhoneRateLimit(phone);
    if (!phoneRateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: phoneRateCheck.reason || '发送过于频繁',
          waitTime: phoneRateCheck.waitTime,
        },
        { status: 429 }
      );
    }

    // 检查 IP 发送频率
    const ipRateCheck = await checkIpRateLimit(clientIp);
    if (!ipRateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: ipRateCheck.reason || '请求过于频繁' },
        { status: 429 }
      );
    }

    // 生成验证码
    const code = generateCode();

    // 存储验证码到数据库
    await storeCode(phone, code, clientIp, type);

    // 发送短信
    const result = await sendSmsCode(phone, code);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '发送失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
    });
  } catch (error) {
    console.error('[SMS Send Error]', error);
    // 提供更详细的错误信息用于调试
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[SMS Send Error Details]', errorMessage);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
