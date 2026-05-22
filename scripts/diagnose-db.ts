/**
 * 数据库诊断工具
 * 用于检测验证码功能所需表是否存在
 */

import { createClient } from '@supabase/supabase-js';

async function diagnoseDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ 环境变量未配置');
    console.error('请设置:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY 或 SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(url, key);

  console.log('🔍 正在检查数据库配置...\n');

  // 检查 sms_verification_codes 表
  try {
    const { error } = await supabase
      .from('sms_verification_codes')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ sms_verification_codes 表不存在或无法访问');
      console.error('错误详情:', error.message);
      console.log('\n📋 请在 Supabase SQL Editor 中执行以下 SQL 创建表:\n');
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
      `);
    } else {
      console.log('✅ sms_verification_codes 表存在且可访问');
    }
  } catch (err) {
    console.error('❌ 数据库连接失败');
    console.error(err);
  }

  // 检查 users 表
  try {
    const { error } = await supabase
      .from('users')
      .select('id, phone')
      .limit(1);

    if (error) {
      console.error('❌ users 表不存在或无法访问');
      console.error('错误详情:', error.message);
    } else {
      console.log('✅ users 表存在且可访问');
    }
  } catch (err) {
    console.error('❌ 数据库连接失败');
    console.error(err);
  }

  console.log('\n✨ 诊断完成');
}

diagnoseDatabase();
