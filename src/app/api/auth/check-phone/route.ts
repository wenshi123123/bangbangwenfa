import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/auth/check-phone?phone=xxx
 * 检查手机号是否已注册
 * 
 * 🔒 安全措施：
 * 1. 限流：每 IP 每分钟最多 10 次，防止批量枚举
 * 2. 对已注册和未注册返回一致的状态码，仅通过布尔值区分
 */
export async function GET(request: NextRequest) {
  try {
    // 限流检查 — 防止手机号枚举攻击
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`check-phone:${clientIP}`, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { success: false, error: '请输入手机号' },
        { status: 400 }
      );
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({
        success: true,
        data: {
          registered: false,
          reason: '手机号格式不正确'
        }
      });
    }

    const supabase = getSupabaseClient();

    // 检查手机号是否已注册
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username, nickname')
      .eq('phone', phone)
      .single();

    // 🔒 统一返回格式，避免信息泄露（不做差异性错误信息）
    return NextResponse.json({
      success: true,
      data: {
        registered: !!existingUser
      }
    });

  } catch (error) {
    console.error('检查手机号失败:', error);
    return NextResponse.json(
      { success: false, error: '检查失败，请稍后重试' },
      { status: 500 }
    );
  }
}
