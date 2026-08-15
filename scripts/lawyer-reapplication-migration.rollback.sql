-- 仅在确认回滚代码且确认没有新申请依赖这些字段后执行。
-- 不删除历史申请记录；只移除本次新增的关系、索引和字段。
DROP INDEX IF EXISTS lawyer_applications_one_pending_per_user_idx;
DROP INDEX IF EXISTS lawyer_applications_resubmitted_from_idx;
DROP INDEX IF EXISTS lawyer_applications_user_status_idx;
ALTER TABLE lawyer_applications DROP COLUMN IF EXISTS resubmitted_from_id;
ALTER TABLE lawyer_applications DROP COLUMN IF EXISTS revision_no;
