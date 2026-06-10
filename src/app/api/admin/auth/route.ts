import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import bcrypt from 'bcryptjs';
import { generateAdminToken, verifyAdminJWT } from '@/lib/auth/admin-token';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

// 使用 JWT 签名的管理员 Token（不再使用 Base64 明文编码）

export async function POST(request: NextRequest) {
  try {
    // 限流：同一 IP 5次/分钟
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`${clientIP}:admin-login`, 5, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '登录尝试过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 查询管理员
    const supabase = getSupabaseAdmin();
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 检查账户状态
    if (admin.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '账户已被禁用，请联系管理员' },
        { status: 403 }
      );
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 登录成功，更新最后登录时间
    await supabase
      .from('admins')
      .update({
        last_login_at: new Date().toISOString()
      })
      .eq('id', admin.id);

    // 生成 JWT 签名的管理员 token
    const token = generateAdminToken(admin.id, admin.username);

    return NextResponse.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          nickname: admin.nickname,
          permissions: admin.permissions
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const payload = verifyAdminJWT(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: '登录已过期' }, { status: 401 });
    }

    // 获取管理员信息
    const supabase = getSupabaseAdmin();
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, nickname, permissions, status, last_login_at')
      .eq('id', payload.adminId)
      .single();

    if (error || !admin) {
      console.error('[Admin Auth Verify] error:', error?.message, 'adminId:', payload.adminId);
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { admin } });
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
