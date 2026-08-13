ALTER TABLE public.consult_orders
  ADD COLUMN IF NOT EXISTS wecom_paid_notification_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS wecom_paid_notification_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wecom_paid_notification_last_error TEXT,
  ADD COLUMN IF NOT EXISTS wecom_paid_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_consult_orders_wecom_paid_notification
  ON public.consult_orders (wecom_paid_notification_status, payment_status);
