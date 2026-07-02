/**
 * Supabase 数据库迁移脚本
 * 尝试多种方式执行 SQL 迁移
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// 配置
// ============================================================
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || 'hznzreihgnosbmdfyeod';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY 或 COZE_SUPABASE_SERVICE_ROLE_KEY 环境变量');
}

const SQL_FILE = resolve(__dirname, 'add-wechat-qrcode-columns.sql');
const sql = readFileSync(SQL_FILE, 'utf8');

console.log('📄 SQL 文件已加载，共', sql.split('\n').length, '行');
console.log('');

// ============================================================
// 方案 1: Supabase Management API
// ============================================================
async function tryManagementAPI() {
  console.log('🔧 方案 1: 尝试 Supabase Management API...');
  
  // 尝试不同的认证方式
  const authMethods = [
    { name: 'service_role key', header: `Bearer ${SERVICE_ROLE_KEY}` },
  ];

  // 也尝试用 API key 的形式
  const extraHeaders = [
    {},
    { 'apikey': SERVICE_ROLE_KEY },
  ];

  for (const auth of authMethods) {
    for (const extra of extraHeaders) {
      try {
        const headers = {
          'Authorization': auth.header,
          'Content-Type': 'application/json',
          ...extra,
        };

        const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
        
        console.log(`   尝试: ${auth.name}${Object.keys(extra).length ? ' + apikey header' : ''}...`);
        
        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: 'SELECT 1 AS test' }),
        });

        const text = await resp.text();
        
        if (resp.ok) {
          console.log('   ✅ Management API 认证成功！');
          return { method: 'management_api', headers };
        } else {
          console.log(`   ❌ 失败 (${resp.status}): ${text.substring(0, 200)}`);
        }
      } catch (err) {
        console.log(`   ❌ 网络错误: ${err.message}`);
      }
    }
  }
  
  return null;
}

// ============================================================
// 方案 2: pg 直连 (需要 SUPABASE_DB_PASSWORD 环境变量)
// ============================================================
async function tryPgDirect() {
  console.log('\n🔧 方案 2: 尝试 pg 直连...');
  
  const password = process.env.SUPABASE_DB_PASSWORD;
  
  if (!password) {
    console.log('   ⚠️  未设置 SUPABASE_DB_PASSWORD 环境变量，跳过 pg 直连');
    return null;
  }

  try {
    const { default: pg } = await import('pg');
    const { Pool } = pg;

    // 尝试多个连接方式
    const configs = [
      {
        name: 'Session Pooler',
        config: {
          host: 'aws-0-us-west-1.pooler.supabase.com',
          port: 5432,
          database: 'postgres',
          user: `postgres.${PROJECT_REF}`,
          password,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        }
      },
      {
        name: 'Transaction Pooler',
        config: {
          host: 'aws-0-us-west-1.pooler.supabase.com',
          port: 6543,
          database: 'postgres',
          user: `postgres.${PROJECT_REF}`,
          password,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        }
      },
      {
        name: 'Direct Connection',
        config: {
          host: `db.${PROJECT_REF}.supabase.co`,
          port: 5432,
          database: 'postgres',
          user: 'postgres',
          password,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        }
      },
    ];

    for (const { name, config } of configs) {
      console.log(`   尝试: ${name}...`);
      try {
        const pool = new Pool(config);
        const client = await pool.connect();
        const result = await client.query('SELECT 1 AS test');
        client.release();
        await pool.end();
        
        if (result.rows[0]?.test === 1) {
          console.log(`   ✅ ${name} 连接成功！`);
          return { method: 'pg_direct', config };
        }
      } catch (err) {
        console.log(`   ❌ ${name}: ${err.message}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ pg 模块加载失败: ${err.message}`);
  }
  
  return null;
}

// ============================================================
// 执行迁移
// ============================================================
async function executeMigration(method, credentials) {
  console.log('\n🚀 执行迁移...');
  
  if (method === 'management_api') {
    // 通过 Management API 执行
    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
    
    // 分割 SQL 语句，逐条执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const stmt of statements) {
      console.log(`   执行: ${stmt.substring(0, 80)}...`);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: credentials.headers,
          body: JSON.stringify({ query: stmt + ';' }),
        });
        
        const text = await resp.text();
        if (resp.ok) {
          console.log(`   ✅ 成功`);
          if (text && text !== '[]' && text !== '{}') {
            try {
              const data = JSON.parse(text);
              if (Array.isArray(data) && data.length > 0) {
                console.table(data);
              }
            } catch {}
          }
        } else {
          console.log(`   ⚠️  状态 ${resp.status}: ${text.substring(0, 200)}`);
        }
      } catch (err) {
        console.log(`   ❌ 错误: ${err.message}`);
      }
    }
  } else if (method === 'pg_direct') {
    // 通过 pg 模块执行
    const { default: pg } = await import('pg');
    const { Pool } = pg;
    const pool = new Pool(credentials.config);
    
    try {
      const client = await pool.connect();
      const result = await client.query(sql);
      client.release();
      
      // 最后一个查询是验证查询
      const verificationIdx = sql.lastIndexOf('SELECT');
      if (verificationIdx > 0) {
        const verifySql = sql.substring(verificationIdx);
        const verifyResult = await pool.query(verifySql);
        if (verifyResult.rows.length > 0) {
          console.log('\n✅ 验证结果:');
          console.table(verifyResult.rows);
        }
      }
      
      console.log('\n✅ 迁移成功完成！');
    } catch (err) {
      console.log(`❌ 迁移失败: ${err.message}`);
    } finally {
      await pool.end();
    }
  }
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  console.log('='.repeat(60));
  console.log('  Supabase 数据库迁移工具');
  console.log('  项目: ' + PROJECT_REF);
  console.log('  SQL:  ' + SQL_FILE);
  console.log('='.repeat(60));
  console.log('');

  // 尝试方案 1: Management API
  let result = await tryManagementAPI();
  
  // 尝试方案 2: pg 直连
  if (!result) {
    result = await tryPgDirect();
  }
  
  if (!result) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ 所有连接方式均失败！');
    console.log('');
    console.log('请选择以下方式之一提供数据库访问凭证：');
    console.log('');
    console.log('方式 A - 设置数据库密码环境变量：');
    console.log('  $env:SUPABASE_DB_PASSWORD="your-db-password"');
    console.log('  (在 Supabase Dashboard → Settings → Database → Connection string 中查找)');
    console.log('');
    console.log('方式 B - 设置 Supabase Personal Access Token：');
    console.log('  1. 访问 https://supabase.com/dashboard/account/tokens');
    console.log('  2. 生成一个新 token');
    console.log('  3. $env:SUPABASE_ACCESS_TOKEN="your-token"');
    console.log('');
    console.log('方式 C - 手动在 Supabase SQL Editor 中执行：');
    console.log('  1. 打开 https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('  2. 粘贴 ' + SQL_FILE + ' 的内容');
    console.log('  3. 点击 Run');
    console.log('='.repeat(60));
    process.exit(1);
  }
  
  // 执行迁移
  await executeMigration(result.method, result);
  
  console.log('\n✅ 完成！');
}

main().catch(err => {
  console.error('❌ 未预期的错误:', err);
  process.exit(1);
});
