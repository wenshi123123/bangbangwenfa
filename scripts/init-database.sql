-- ============================================
-- 帮帮问法 - 数据库初始化脚本
-- 用于创建短信验证码和相关表
-- ============================================

-- 创建短信验证码表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_codes_type ON sms_verification_codes(type);
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_verification_codes(expires_at);

-- ============================================
-- RLS 策略 (Row Level Security)
-- ============================================

-- 启用 RLS
ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;

-- 允许服务端操作（使用 service role key）
-- 注意：生产环境应该配置更严格的策略
CREATE POLICY "Allow service role full access" ON sms_verification_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 清理过期验证码的函数
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_sms_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sms_verification_codes
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 定期清理的 cron 作业（可选）
-- ============================================
-- 如果需要自动清理，可以取消下面的注释
-- 需要启用 pg_cron 扩展
-- SELECT cron.schedule('cleanup-sms-codes', '*/5 * * * *', 'SELECT cleanup_expired_sms_codes()');
