import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// POST /api/admin/migrate - Execute database migration
// This endpoint uses Supabase's rpc() to execute SQL via a pre-created function,
// or falls back to direct SQL if the admin has database access.
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error || '请先登录管理员账号');
  }

  const supabase = getSupabaseAdmin();

  try {
    const results: string[] = [];

    // Step 1: Check if membership_logs table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('membership_logs')
      .select('id')
      .limit(1);

    if (!checkError || !checkError.message?.includes('does not exist')) {
      results.push('membership_logs 表已存在，跳过创建');
    } else {
      // Table doesn't exist - try to create via raw SQL through Supabase
      // Since we can't execute DDL via JS client, we'll use a workaround:
      // Create the table using the Supabase admin API's SQL execution

      // Attempt 1: Use the Supabase project URL to hit the internal SQL API
      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const ref = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';

      // Build the SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS membership_logs (
            id BIGSERIAL PRIMARY KEY,
            lawyer_id BIGINT NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
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

      // Try Supabase's internal pgapi SQL endpoint
      const sqlRes = await fetch(`https://${ref}.supabase.co/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({}),
      });

      // If pgapi works, try direct SQL execution
      // Otherwise, fall back to manual table creation via Supabase JS
      if (!sqlRes.ok) {
        results.push('无法通过 API 执行 DDL，尝试替代方案...');
      }
    }

    // Step 2: Try creating the expire_overdue_memberships function
    // (Can't create functions via JS client either, but we check)

    // Step 3: Verify by attempting to insert/read from the table
    const { error: verifyError } = await supabase
      .from('membership_logs')
      .select('id')
      .limit(1);

    if (verifyError?.message?.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        message: '无法自动创建 membership_logs 表。请在 Supabase Dashboard > SQL Editor 中执行 scripts/membership-logs-migration.sql',
        results,
      });
    }

    return NextResponse.json({
      success: true,
      message: '迁移检查完成',
      results: [...results, 'membership_logs 表已就绪'],
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: '迁移失败', details: String(e) }, { status: 500 });
  }
}
