#!/usr/bin/env node

/**
 * Supabase Schema Cache 诊断与修复工具 v3
 * 专门用于解决 PGRST205 错误
 * 
 * 错误说明: 
 * PGRST205 表示 PostgREST 无法在 schema cache 中找到指定的表
 * 原因通常是: 表被创建/修改后，PostgREST 的缓存没有刷新
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 颜色配置
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const color = type === 'error' ? RED : 
                type === 'success' ? GREEN : 
                type === 'warn' ? YELLOW : BLUE;
  console.log(`${color}[${type.toUpperCase()}]${RESET} ${message}`);
}

function section(title: string) {
  console.log(`\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${CYAN} ${title}${RESET}`);
  console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
}

async function checkSupabaseConnection(supabaseUrl: string, supabaseKey: string) {
  log('正在测试 Supabase 连接...', 'info');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 测试连接 - 查询 version
  let versionData = null;
  let versionError = null;
  try {
    const result = await supabase.rpc('version', {});
    versionData = result.data;
    versionError = result.error;
  } catch (e) {
    versionError = '无法连接到 Supabase';
  }
  
  if (versionError) {
    log(`连接失败: ${versionError}`, 'error');
    return false;
  }
  
  log('Supabase 连接成功', 'success');
  return true;
}

async function checkTableExists(supabaseUrl: string, supabaseKey: string) {
  log('检查 sms_verification_codes 表是否存在...', 'info');
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' }
  });
  
  try {
    // 方法 1: 直接查询表
    const { data, error } = await supabase
      .from('sms_verification_codes')
      .select('id')
      .limit(1);
    
    if (error) {
      log(`表不存在或无权限访问`, 'error');
      log(`错误信息: ${error.message}`, 'error');
      log(`错误代码: ${error.code || 'N/A'}`, 'warn');
      
      // 判断是否是 PGRST205 错误
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        log('\n🔍 检测到 PGRST205 错误！', 'warn');
        return { exists: false, error: 'PGRST205 - Schema Cache 问题' };
      }
      
      return { exists: false, error: error.message };
    }
    
    log('表存在且可访问', 'success');
    return { exists: true, error: null };
    
  } catch (err: any) {
    log(`查询异常: ${err.message}`, 'error');
    return { exists: false, error: err.message };
  }
}

async function testWriteOperation(supabaseUrl: string, supabaseKey: string) {
  log('测试写入验证码...', 'info');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const testData = {
    phone: '13800138000',
    code: '999999',
    type: 'diagnostic_test',
    expires_at: new Date(Date.now() + 60000).toISOString() // 1分钟后过期
  };
  
  const { data, error } = await supabase
    .from('sms_verification_codes')
    .insert(testData)
    .select()
    .single();
  
  if (error) {
    log(`写入失败: ${error.message}`, 'error');
    log(`错误代码: ${error.code || 'N/A'}`, 'warn');
    return { success: false, error: error.message, recordId: null };
  }
  
  log('写入成功', 'success');
  log(`测试记录 ID: ${data.id}`, 'info');
  
  // 清理测试数据
  await supabase
    .from('sms_verification_codes')
    .delete()
    .eq('id', data.id);
  
  log('测试数据已清理', 'info');
  return { success: true, error: null, recordId: data.id };
}

function printSolution(errorType: string) {
  section('🔧 解决方案');
  
  if (errorType === 'PGRST205' || errorType === 'table_not_found') {
    console.log(`
${YELLOW}您的错误是 PGRST205 - PostgREST Schema Cache 未刷新${RESET}

请按以下步骤操作：

${GREEN}方法 1: Supabase SQL Editor（推荐）${RESET}
  1. 登录 Supabase Dashboard: https://supabase.com/dashboard
  2. 选择您的项目
  3. 点击左侧菜单 "SQL Editor"
  4. 点击 "New Query"
  5. 粘贴并执行以下 SQL:

${CYAN}-- 刷新 PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

-- 或者使用这个（某些版本）
SELECT pg_notify('pgrst', 'reload schema');

-- 验证表是否存在
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'sms_verification_codes';${RESET}

  6. 等待 10-30 秒后重试您的应用

${GREEN}方法 2: 重启 Supabase 项目${RESET}
  1. 在 Supabase Dashboard 中进入 "Settings" -> "Hosting"
  2. 点击 "Manage Configuration"
  3. 点击 "Restart Project"
  4. 等待项目完全启动后（约 1-2 分钟）再试

${GREEN}方法 3: 如果表不存在${RESET}
  请先在 SQL Editor 中执行以下 SQL 创建表：

${CYAN}${require('fs').readFileSync(require('path').join(__dirname, '../scripts/init-database.sql'), 'utf8')}${RESET}
`);
  }
}

function printEnvironmentInfo() {
  section('环境变量检查');
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const optional = [
    'COZE_SUPABASE_URL',
    'COZE_SUPABASE_ANON_KEY',
    'COZE_SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  log('必需的环境变量:', 'info');
  required.forEach(key => {
    const value = process.env[key];
    if (value) {
      console.log(`  ${GREEN}✓${RESET} ${key}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`  ${RED}✗${RESET} ${key}: 未设置`);
    }
  });
  
  log('\n可选的环境变量 (扣子平台):', 'info');
  optional.forEach(key => {
    const value = process.env[key];
    if (value) {
      console.log(`  ${GREEN}✓${RESET} ${key}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`  ${YELLOW}○${RESET} ${key}: 未设置`);
    }
  });
}

async function main() {
  console.log('\n');
  console.log('███████╗██╗██╗  ██╗██╗███╗   ██╗ ██████╗ ███████╗██████╗ ');
  console.log('██╔════╝██║╚██╗██╔╝██║████╗  ██║██╔════╝ ██╔════╝██╔══██╗');
  console.log('███████╗██║ ╚███╔╝ ██║██╔██╗ ██║██║  ███╗█████╗  ██████╔╝');
  console.log('╚════██║██║ ██╔██╗ ██║██║╚██╗██║██║   ██║██╔══╝  ██╔══██╗');
  console.log('███████║██║██╔╝ ██╗██║██║ ╚████║╚██████╔╝███████╗██║  ██║');
  console.log('╚══════╝╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝');
  console.log('');
  console.log('   Supabase Schema Cache 诊断与修复工具 v3');
  console.log('   专门用于解决 PGRST205 错误\n');
  
  printEnvironmentInfo();
  
  // 获取 Supabase 配置
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.COZE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.COZE_SUPABASE_SERVICE_ROLE_KEY ||
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                      process.env.COZE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('\n❌ 缺少 Supabase 配置信息', 'error');
    console.log('\n请设置环境变量后重试。');
    console.log('如果你是本地开发，请创建 .env 文件：\n');
    console.log(`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`);
    console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n`);
    process.exit(1);
  }
  
  log(`\n正在连接: ${supabaseUrl}`, 'info');
  
  // 步骤 1: 测试连接
  section('步骤 1: 测试 Supabase 连接');
  const connected = await checkSupabaseConnection(supabaseUrl, supabaseKey);
  if (!connected) {
    log('连接失败，请检查 URL 和 API Key 是否正确', 'error');
    process.exit(1);
  }
  
  // 步骤 2: 检查表是否存在
  section('步骤 2: 检查 sms_verification_codes 表');
  const tableCheck = await checkTableExists(supabaseUrl, supabaseKey);
  
  // 步骤 3: 测试写入
  if (tableCheck.exists) {
    section('步骤 3: 测试写入操作');
    const writeTest = await testWriteOperation(supabaseUrl, supabaseKey);
    
    if (!writeTest.success) {
      log('写入测试失败，可能存在 RLS 策略问题', 'warn');
      printSolution('rls_issue');
    }
  } else {
    printSolution('table_not_found');
    process.exit(1);
  }
  
  // 最终结果
  section('诊断结果');
  
  if (tableCheck.exists && !tableCheck.error?.includes('PGRST205')) {
    log('✅ 所有检查通过！', 'success');
    log('您的 Supabase 配置正确，表可以正常访问。', 'info');
    log('\n如果仍然遇到 PGRST205 错误，请尝试：', 'info');
    console.log('1. 在 Supabase SQL Editor 中执行: NOTIFY pgrst, \'reload schema\';');
    console.log('2. 等待 30 秒后重试');
    console.log('3. 如果问题仍然存在，重启 Supabase 项目\n');
  } else {
    printSolution('PGRST205');
    process.exit(1);
  }
  
  console.log('='.repeat(55));
  console.log('\n诊断完成！\n');
}

main().catch(err => {
  console.error('程序执行出错:', err);
  process.exit(1);
});
