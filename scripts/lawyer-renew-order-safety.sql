-- 运行前确认同一律师/套餐不存在多笔 pending 或 paying 订单。
CREATE UNIQUE INDEX IF NOT EXISTS idx_lawyer_renew_one_active_payment
  ON lawyer_renew_orders (lawyer_id, package_id)
  WHERE payment_status IN ('pending', 'paying');
