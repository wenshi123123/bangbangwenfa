import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { validateUsername } from '@/lib/auth/password';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/auth/check-username?username=xxx
 * 检查用户名是否可用
 * 
 * 🔒 安全措施：
 * 1. 限流：每 IP 每分钟最多 15 次，防止批量枚举
 * 2. 使用 eq 精确匹配，防止 ilike 大小写变体探测
 */
export async function GET(request: NextRequest) {
  try {
    // 限流检查 — 防止用户名枚举攻击
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`check-username:${clientIP}`, 15, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { success: false, error: '请输入用户名' },
        { status: 400 }
      );
    }

    // 验证用户名格式
    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          reason: validation.message
        }
      });
    }

    const supabase = getSupabaseClient();

    // 🔒 使用 eq 精确匹配（而非 ilike），防止大小写变体探测
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          reason: '该用户名已被使用'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        available: true
      }
    });

  } catch (error) {
    console.error('检查用户名失败:', error);
    return NextResponse.json(
      { success: false, error: '检查失败，请稍后重试' },
      { status: 500 }
    );
  }
}
