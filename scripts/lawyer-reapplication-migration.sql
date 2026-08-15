-- 律师入驻驳回后重新申请：保留历史并建立修订关系
-- 仅新增字段和索引，不修改或删除现有申请、订单、审核结果。

ALTER TABLE lawyer_applications
  ADD COLUMN IF NOT EXISTS resubmitted_from_id INTEGER NULL
    REFERENCES lawyer_applications(id) ON DELETE RESTRICT;

ALTER TABLE lawyer_applications
  ADD COLUMN IF NOT EXISTS revision_no INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS lawyer_applications_user_status_idx
  ON lawyer_applications(user_id, review_status, created_at DESC);

CREATE INDEX IF NOT EXISTS lawyer_applications_resubmitted_from_idx
  ON lawyer_applications(resubmitted_from_id);

-- 同一账号同一时间只允许一条待处理申请，防止并发重复提交。
CREATE UNIQUE INDEX IF NOT EXISTS lawyer_applications_one_pending_per_user_idx
  ON lawyer_applications(user_id)
  WHERE user_id IS NOT NULL AND review_status = 'pending' AND payment_status = 'pending';

-- 历史数据默认是首次申请；不触碰其余字段。
UPDATE lawyer_applications
SET revision_no = 1
WHERE revision_no IS NULL;
