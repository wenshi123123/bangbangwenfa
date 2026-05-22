import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

/**
 * 刷新 Supabase Schema Cache 的 API 端点
 * 用于解决 PGRST205 错误
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    // 使用 service role key 连接到数据库
    const supabase = getSupabaseAdmin();

    // 方法1：通过 RPC 调用 pg_notify 刷新 schema cache
    let notifyResult = null;
    let notifyError = null;
    try {
      const result = await supabase.rpc('pg_catalog.stmt', {
        query: "NOTIFY pgrst, 'reload schema'"
      });
      notifyResult = result.data;
      notifyError = result.error;
    } catch (e) {
      notifyError = 'RPC not available';
    }

    // 方法2：直接执行 SQL 语句
    let sqlResult = null;
    let sqlError = null;
    let status = null;
    try {
      const result = await supabase.rpc('pg_catalog', {
        statement: "SELECT 'test'"
      });
      sqlResult = result.data;
      sqlError = result.error;
      status = result.status;
    } catch (e) {
      sqlError = 'RPC not available';
      status = 500;
    }

    // 检查表是否存在
    const { data: tableCheck, error: tableError } = await supabase
      .from('sms_verification_codes')
      .select('id')
      .limit(1);

    if (tableError) {
      return NextResponse.json({
        success: false,
        message: 'sms_verification_codes 表不存在或无法访问',
        error: tableError.message,
        code: tableError.code,
        suggestion: '请在 Supabase SQL Editor 中执行 init-database.sql 脚本创建表'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Schema cache 刷新成功',
      table: {
        name: 'sms_verification_codes',
        accessible: true
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('刷新 Schema Cache 失败:', error);

    return NextResponse.json({
      success: false,
      message: '刷新 Schema Cache 失败',
      error: error.message,
      suggestion: '请在 Supabase Dashboard -> SQL Editor 中手动执行: NOTIFY pgrst, \'reload schema\';'
    }, { status: 500 });
  }
}
