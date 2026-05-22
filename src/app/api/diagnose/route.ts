import { NextResponse } from 'next/server';

/**
 * Supabase 连接诊断 API
 * 
 * 在浏览器或 curl 中访问:
 * GET /api/diagnose
 * 
 * 或在扣子平台日志中查看诊断信息
 */

export async function GET() {
  const diagnosis: any = {
    status: 'diagnostic',
    timestamp: new Date().toISOString(),
    checks: [] as any[],
    message: '',
    environment: {
      hasSupabaseUrl: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL),
      hasAnonKey: !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY),
      hasServiceRoleKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY),
    }
  };
  
  // 尝试导入 Supabase 客户端
  try {
    const { getSupabaseAdmin } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseAdmin();
    
    // 检查核心表
    const coreTables = ['sms_verification_codes', 'users', 'guardian_users', 'lawyers', 'consult_orders'];
    for (const table of coreTables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      diagnosis.checks.push({
        name: `${table} table`,
        status: error ? 'error' : 'ok',
        error: error ? { message: error.message, code: error.code } : null
      });
      
      if (error?.code === 'PGRST205') {
        diagnosis.message = 'PGRST205 错误: 需要刷新 PostgREST Schema Cache';
        diagnosis.solution = '在 Supabase SQL Editor 中执行: NOTIFY pgrst, \'reload schema\';';
        return NextResponse.json(diagnosis, { status: 500 });
      }
    }
    
    diagnosis.message = 'Supabase 连接正常';
    return NextResponse.json(diagnosis, { status: 200 });
    
  } catch (err: any) {
    diagnosis.checks.push({
      name: 'Supabase connection',
      status: 'error',
      error: err.message
    });
    diagnosis.message = 'Supabase 连接失败';
    return NextResponse.json(diagnosis, { status: 500 });
  }
}
