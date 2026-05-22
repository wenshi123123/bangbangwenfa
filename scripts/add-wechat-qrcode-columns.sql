-- ============================================
-- 为 guardian_users 表添加微信收款码相关字段
-- ============================================

-- 1. 添加 wechat_qrcode 列（存储收款码 base64 或 URL）
ALTER TABLE guardian_users 
ADD COLUMN IF NOT EXISTS wechat_qrcode TEXT;

-- 2. 添加 wechat_qrcode_updated_at 列（记录上次更新收款码的时间，用于7天冷却）
ALTER TABLE guardian_users 
ADD COLUMN IF NOT EXISTS wechat_qrcode_updated_at TIMESTAMP WITH TIME ZONE;

-- 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guardian_users' 
AND column_name IN ('wechat_qrcode', 'wechat_qrcode_updated_at');
