-- Lawyer payment closure: additive migration for lifecycle, complimentary approval,
-- package-level entitlements, and consistent order projections.
-- Existing paid orders remain readable; no historical order or application is deleted.

ALTER TABLE public.consult_orders
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;

ALTER TABLE public.lawyer_renew_orders
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20),
  ADD COLUMN IF NOT EXISTS prepay_id VARCHAR(200),
  ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;

ALTER TABLE public.lawyer_application_payment_orders
  ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(20),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- The original table only allowed creating/pending/paid/failed/expired. Preserve
-- these legacy values while allowing the shared lifecycle used by new orders.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.lawyer_application_payment_orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.lawyer_application_payment_orders DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.lawyer_application_payment_orders
  ADD CONSTRAINT lawyer_application_payment_orders_status_lifecycle_check
  CHECK (status IN ('creating', 'pending', 'paying', 'paid', 'completed', 'cancelled', 'closed', 'failed', 'expired'));

DROP INDEX IF EXISTS public.idx_lawyer_application_payment_orders_one_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lawyer_application_payment_orders_one_active
  ON public.lawyer_application_payment_orders (application_id)
  WHERE status IN ('creating', 'pending', 'paying');

ALTER TABLE public.lawyer_applications
  ADD COLUMN IF NOT EXISTS approval_mode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS complimentary_reason TEXT,
  ADD COLUMN IF NOT EXISTS complimentary_code_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complimentary_expires_at TIMESTAMPTZ;

ALTER TABLE public.membership_records
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS source_order_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_complimentary BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS remark TEXT;

CREATE TABLE IF NOT EXISTS public.lawyer_complimentary_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id INTEGER NOT NULL REFERENCES public.lawyer_applications(id) ON DELETE RESTRICT,
  lawyer_id UUID NOT NULL REFERENCES public.lawyers(id) ON DELETE RESTRICT,
  user_id VARCHAR(50) NOT NULL,
  order_no VARCHAR(100) NOT NULL UNIQUE,
  amount INTEGER NOT NULL DEFAULT 0 CHECK (amount = 0),
  status VARCHAR(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'cancelled', 'closed')),
  reason TEXT NOT NULL,
  code_verified_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lawyer_renew_orders_payment_expiry
  ON public.lawyer_renew_orders (payment_status, payment_expires_at);
CREATE INDEX IF NOT EXISTS idx_consult_orders_payment_expiry
  ON public.consult_orders (payment_status, payment_expires_at);
CREATE INDEX IF NOT EXISTS idx_membership_records_package_expiry
  ON public.membership_records (lawyer_id, package_type, expires_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_records_source_order_no_unique
  ON public.membership_records (source_order_no)
  WHERE source_order_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lawyer_complimentary_orders_user_created
  ON public.lawyer_complimentary_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lawyer_complimentary_orders_application
  ON public.lawyer_complimentary_orders (application_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_complimentary_orders_lawyer
  ON public.lawyer_complimentary_orders (lawyer_id);

ALTER TABLE public.lawyer_complimentary_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lawyer_complimentary_orders FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lawyer_complimentary_orders TO service_role;

DROP POLICY IF EXISTS "Service role manages lawyer complimentary orders" ON public.lawyer_complimentary_orders;
CREATE POLICY "Service role manages lawyer complimentary orders"
  ON public.lawyer_complimentary_orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
