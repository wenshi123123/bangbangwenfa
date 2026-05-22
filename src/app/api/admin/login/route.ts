import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import bcrypt from 'bcryptjs';
import { generateAdminToken } from '@/lib/auth/admin-token';

// 管理员登录（旧端点，现已迁移到 /api/admin/auth）
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: admin, error: queryError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .eq('status', 'active')
      .single();

    if (queryError || !admin) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // 生成 JWT token (升级为token化)
    const token = generateAdminToken(admin.id, admin.username);
    const { password_hash, ...safeAdmin } = admin;

    return NextResponse.json({
      success: true,
      data: {
        token,
        admin: safeAdmin,
        message: '登录成功',
      },
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
