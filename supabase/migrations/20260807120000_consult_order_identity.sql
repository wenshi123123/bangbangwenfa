-- Keep active consultation payment orders distinct by case type and plan.
-- Historical orders remain untouched; new orders carry plan_id.
ALTER TABLE public.consult_orders
  ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_url TEXT;

ALTER TABLE public.lawyer_renew_orders
  ADD COLUMN IF NOT EXISTS payment_url TEXT;

-- 历史订单可能没有支付截止时间；先按 15 分钟生命周期关闭，避免旧记录继续占用入口。
UPDATE public.consult_orders
SET payment_status = 'closed',
    closed_at = COALESCE(closed_at, NOW()),
    close_reason = COALESCE(close_reason, '支付超时'),
    updated_at = NOW()
WHERE payment_status IN ('pending', 'paying')
  AND payment_expires_at IS NULL
  AND created_at <= NOW() - INTERVAL '15 minutes';

DROP INDEX IF EXISTS public.idx_consult_orders_one_active_payment;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consult_orders_one_active_payment_v2
  ON public.consult_orders (user_id, category, case_type, plan_id)
  WHERE user_id IS NOT NULL
    AND plan_id IS NOT NULL
    AND payment_status IN ('pending', 'paying');

CREATE INDEX IF NOT EXISTS idx_consult_orders_plan_id
  ON public.consult_orders (plan_id);
