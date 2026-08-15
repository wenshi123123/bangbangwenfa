-- 免费体验开通必须按申请幂等：同一申请只能有一笔零元体验订单。
CREATE UNIQUE INDEX IF NOT EXISTS uq_lawyer_complimentary_orders_application
  ON public.lawyer_complimentary_orders (application_id);

-- 同一律师同一套餐的免费入驻资格只保留一份，避免审核重试重复发放。
CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_records_complimentary_onboarding
  ON public.membership_records (lawyer_id, package_type, source_type)
  WHERE source_type = 'complimentary_onboarding';
