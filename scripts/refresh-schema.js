#!/usr/bin/env node

/**
 * 直接通过 Supabase REST API 刷新 Schema Cache
 * 使用 Service Role Key 执行 SQL 命令
 */

const SUPABASE_URL = 'https://hznzreihgnosbmdfyeod.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnpyZWloZ25vc2JtZGZ5ZW9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE3MjQ4NywiZXhwIjoyMDkxNzQ4NDg3fQ.pvkWj_JBqZ6UFhSOdTuaBezpPGvbYZDbE_wlm29XkM4';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const color = type === 'error' ? colors.red : 
                type === 'success' ? colors.green : 
                type === 'warn' ? colors.yellow : colors.blue;
  console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${message}`);
}

// 使用 Service Role Key 执行 SQL
async function executeSQL(sql) {
  log(`执行 SQL: ${sql.substring(0, 50)}...`, 'info');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    log(`SQL 执行失败: ${error}`, 'error');
    return { success: false, error };
  }
  
  log('SQL 执行成功', 'success');
  return { success: true };
}

// 使用 PostgREST 通知刷新 schema
async function notifySchemaReload() {
  log('发送 NOTIFY pgrst, \'reload schema\' 命令...', 'info');
  
  // PostgREST 监听 pg_notify 通道
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      channel: 'pgrst',
      message: 'reload schema'
    })
  });
  
  // 注意：pg_notify 是一个 void 函数，可能返回空响应
  if (response.ok || response.status === 204 || response.status === 201) {
    log('NOTIFY 命令已发送', 'success');
    return { success: true };
  }
  
  const error = await response.text().catch(() => 'Unknown error');
  log(`NOTIFY 命令失败: ${error}`, 'warn');
  return { success: false, error };
}

// 直接使用 postgres 连接执行 SQL（通过 REST API）
async function directQuery(sql) {
  log(`执行查询: ${sql.substring(0, 60)}...`, 'info');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql })
  });
  
  const text = await response.text();
  
  if (response.ok) {
    log('查询成功', 'success');
    try {
      return { success: true, data: JSON.parse(text) };
    } catch {
      return { success: true, data: text };
    }
  }
  
  log(`查询失败: ${text}`, 'error');
  return { success: false, error: text };
}

// 检查表是否存在
async function checkTableExists() {
  log('检查 sms_verification_codes 表是否存在...', 'info');
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/sms_verification_codes?select=id&limit=1`,
    {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    }
  );
  
  const text = await response.text();
  
  if (response.ok) {
    log('表存在且可访问', 'success');
    try {
      const data = JSON.parse(text);
      log(`当前有 ${data.length} 条记录（或空数组）`, 'info');
    } catch {
      log('数据响应: ' + text.substring(0, 100), 'info');
    }
    return { exists: true };
  }
  
  if (text.includes('PGRST205') || text.includes('schema cache')) {
    log('PGRST205 错误: Schema Cache 问题', 'error');
    return { exists: false, error: 'PGRST205' };
  }
  
  if (text.includes('not found') || text.includes('does not exist')) {
    log('表不存在', 'error');
    return { exists: false, error: 'table_not_exists' };
  }
  
  log(`表检查失败: ${text}`, 'error');
  return { exists: false, error: text };
}

// 测试写入验证码
async function testInsert() {
  log('测试写入验证码...', 'info');
  
  const testData = {
    phone: '13800138000',
    code: '888888',
    type: 'diagnostic_test',
    expires_at: new Date(Date.now() + 60000).toISOString()
  };
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/sms_verification_codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(testData)
  });
  
  const text = await response.text();
  
  if (response.ok || response.status === 201) {
    log('写入成功', 'success');
    try {
      const data = JSON.parse(text);
      log(`测试记录 ID: ${data[0]?.id}`, 'info');
      
      // 清理测试数据
      if (data[0]?.id) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/sms_verification_codes?id=eq.${data[0].id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            }
          }
        );
        log('测试数据已清理', 'info');
      }
    } catch {
      log('响应: ' + text.substring(0, 100), 'info');
    }
    return { success: true };
  }
  
  log(`写入失败: ${text}`, 'error');
  return { success: false, error: text };
}

async function main() {
  console.log('\n🔧 Supabase Schema Cache 刷新工具\n');
  console.log('='.repeat(50));
  
  // 步骤 1: 检查表是否存在
  log('\n步骤 1: 检查 sms_verification_codes 表...', 'info');
  const tableCheck = await checkTableExists();
  
  if (tableCheck.error === 'PGRST205') {
    log('\n检测到 PGRST205 错误！正在尝试刷新 Schema Cache...', 'warn');
    
    // 尝试使用 RPC 调用 pg_notify
    log('\n步骤 2: 尝试刷新 Schema Cache...', 'info');
    
    // 方式 1: 通过 SQL 函数
    await directQuery("NOTIFY pgrst, 'reload schema'");
    
    // 方式 2: 通过 pg_notify
    await notifySchemaReload();
    
    log('\n等待 5 秒让 PostgREST 刷新...', 'info');
    await new Promise(r => setTimeout(r, 5000));
    
    // 再次检查
    log('\n步骤 3: 再次检查表...', 'info');
    const recheck = await checkTableExists();
    
    if (recheck.exists) {
      log('\n✅ Schema Cache 刷新成功！', 'success');
      log('问题已解决，请重新测试你的应用。', 'info');
    } else {
      log('\n❌ Schema Cache 刷新失败', 'error');
      log('请在 Supabase Dashboard -> SQL Editor 中手动执行:', 'warn');
      console.log('\n  NOTIFY pgrst, \'reload schema\';\n');
    }
  } else if (tableCheck.exists) {
    // 步骤 2: 测试写入
    log('\n步骤 2: 测试写入操作...', 'info');
    const writeResult = await testInsert();
    
    if (writeResult.success) {
      log('\n✅ 所有功能正常！', 'success');
      log('Supabase 配置正确，表可以正常访问。', 'info');
    } else {
      log('\n⚠️  表存在但写入失败', 'warn');
      log('可能是 RLS 策略问题，请检查。', 'warn');
    }
  } else {
    log('\n❌ 表不存在！', 'error');
    log('请先创建 sms_verification_codes 表。', 'error');
    console.log('\n在 Supabase SQL Editor 中执行以下 SQL:\n');
    console.log(`
CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'login',
    ip VARCHAR(50),
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_codes_type ON sms_verification_codes(type);
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_verification_codes(expires_at);

ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON sms_verification_codes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.sms_verification_codes TO postgres, anon, authenticated, service_role;
`);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

main().catch(console.error);
