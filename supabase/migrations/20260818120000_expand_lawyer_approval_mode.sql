-- 修复特邀律师申请写入失败：
-- complimentary_requested 超过原 VARCHAR(20) 限制。

ALTER TABLE public.lawyer_applications
ALTER COLUMN approval_mode TYPE VARCHAR(40);
