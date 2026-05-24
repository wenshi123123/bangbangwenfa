-- ============================================================
-- 修复律师资料修改功能相关数据库迁移
-- 执行方式: 在 Supabase SQL Editor 中运行此脚本
-- 创建日期: 2026-05-24
-- ============================================================

-- 修复一：为 lawyer_profile_revisions 添加缺失列
ALTER TABLE lawyer_profile_revisions 
ADD COLUMN IF NOT EXISTS batch_id UUID;

ALTER TABLE lawyer_profile_revisions 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- 为 batch_id 添加索引加速查询
CREATE INDEX IF NOT EXISTS idx_revisions_batch_id 
ON lawyer_profile_revisions(batch_id);

-- 修复三（方案A）：为 lawyers 表添加四个缺失列
-- 这些字段在律师端资料编辑页可编辑，但之前数据库没有对应列
ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS law_firm VARCHAR(200);

ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS education VARCHAR(200);

ALTER TABLE lawyers 
ADD COLUMN IF NOT EXISTS graduated_school VARCHAR(200);

-- 验证：检查所有列是否正确添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lawyer_profile_revisions'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lawyers' 
  AND column_name IN ('gender', 'law_firm', 'education', 'graduated_school')
ORDER BY ordinal_position;
