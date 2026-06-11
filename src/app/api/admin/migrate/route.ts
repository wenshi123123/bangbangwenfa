import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// POST /api/admin/migrate - Execute database migration
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  const supabase = getSupabaseAdmin();

  try {
    const results: string[] = [];
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const ref = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';

    // Step 1: Check if membership_logs table already exists
    const { error: checkError } = await supabase
      .from('membership_logs')
      .select('id')
      .limit(1);

    if (!checkError) {
      results.push('✅ membership_logs 表已存在');
    } else if (checkError.message?.includes('does not exist') || checkError.code === '42P01') {
      // Table doesn't exist - try to create via Supabase Management API
      results.push('⚠️ membership_logs 表不存在，尝试创建...');

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS membership_logs (
            id BIGSERIAL PRIMARY KEY,
            lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
            action VARCHAR(20) NOT NULL,
            package_type VARCHAR(20),
            is_trial BOOLEAN DEFAULT FALSE,
            duration_days INTEGER,
            old_expires_at TIMESTAMPTZ,
            new_expires_at TIMESTAMPTZ,
            note TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_membership_logs_lawyer_id ON membership_logs(lawyer_id);
        CREATE INDEX IF NOT EXISTS idx_membership_logs_created_at ON membership_logs(created_at DESC);
        ALTER TABLE membership_logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Admin full access to membership_logs" ON membership_logs FOR ALL USING (true) WITH CHECK (true);
      `;

      if (ref && serviceKey) {
        try {
          // Use Supabase Management API to execute SQL
          const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ query: createTableSQL }),
          });

          if (mgmtRes.ok) {
            results.push('✅ 通过 Management API 创建 membership_logs 成功');
          } else {
            const errBody = await mgmtRes.text();
            results.push(`⚠️ Management API 创建失败 (${mgmtRes.status}): ${errBody.substring(0, 200)}`);
          }
        } catch (apiErr: any) {
          results.push(`⚠️ Management API 调用异常: ${apiErr.message}`);
        }

        // Fallback: Try Supabase REST API rpc
        try {
          const rpcRes = await fetch(`https://${ref}.supabase.co/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ sql: createTableSQL }),
          });
          if (rpcRes.ok) {
            results.push('✅ 通过 RPC 创建 membership_logs 成功');
          }
        } catch {
          // RPC fallback failed, that's ok
        }
      } else {
        results.push('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量');
      }
    } else {
      results.push(`⚠️ 检查 membership_logs 时出错: ${checkError.message}`);
    }

    // Step 2: Final verification
    const { error: verifyError } = await supabase
      .from('membership_logs')
      .select('id')
      .limit(1);

    if (verifyError?.message?.includes('does not exist') || verifyError?.code === '42P01') {
      return NextResponse.json({
        success: false,
        message: '无法自动创建 membership_logs 表。请在 Supabase Dashboard > SQL Editor 中执行 scripts/membership-logs-migration-v2.sql',
        results,
        manualSteps: [
          '1. 登录 Supabase Dashboard',
          '2. 打开 SQL Editor',
          '3. 复制并执行 scripts/membership-logs-migration-v2.sql 的内容',
          '4. 刷新此页面验证',
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message: '迁移检查完成',
      results: [...results, '✅ membership_logs 表已就绪'],
    });
  } catch (e: any) {
    console.error('[migrate] 迁移失败:', e);
    return NextResponse.json({ success: false, error: '迁移失败', details: e?.message || String(e) }, { status: 500 });
  }
}
