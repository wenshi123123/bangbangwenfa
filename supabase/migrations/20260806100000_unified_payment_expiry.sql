-- 统一清理三类支付订单：未支付订单最多保留 15 分钟。
-- 只关闭 pending/paying/creating，不触碰已支付或历史业务记录。
CREATE OR REPLACE FUNCTION public.close_expired_payment_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.consult_orders
  SET payment_status = 'closed',
      closed_at = COALESCE(closed_at, NOW()),
      close_reason = COALESCE(close_reason, '支付超时'),
      updated_at = NOW()
  WHERE payment_status IN ('pending', 'paying')
    AND (
      payment_expires_at <= NOW()
      OR (payment_expires_at IS NULL AND created_at <= NOW() - INTERVAL '15 minutes')
    );

  UPDATE public.lawyer_renew_orders
  SET payment_status = 'closed',
      updated_at = NOW()
  WHERE payment_status IN ('pending', 'paying')
    AND (
      payment_expires_at <= NOW()
      OR (payment_expires_at IS NULL AND created_at <= NOW() - INTERVAL '15 minutes')
    );

  UPDATE public.lawyer_application_payment_orders
  SET status = 'expired',
      updated_at = NOW()
  WHERE status IN ('creating', 'pending', 'paying')
    AND (
      payment_expires_at <= NOW()
      OR (payment_expires_at IS NULL AND created_at <= NOW() - INTERVAL '15 minutes')
    );
END;
$$;

REVOKE ALL ON FUNCTION public.close_expired_payment_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_expired_payment_orders() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'close-expired-payment-orders'
  ) THEN
    PERFORM cron.schedule(
      'close-expired-payment-orders',
      '* * * * *',
      'SELECT public.close_expired_payment_orders()'
    );
  END IF;
END;
$$;
