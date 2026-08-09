-- 运行前先确认不存在同一 user_id/category 的多笔 pending/paying 订单。
-- 该索引只限制有效支付订单，不影响历史、已支付、已关闭和已退款订单。
CREATE UNIQUE INDEX IF NOT EXISTS idx_consult_orders_one_active_payment
  ON consult_orders (user_id, category)
  WHERE user_id IS NOT NULL
    AND payment_status IN ('pending', 'paying');
