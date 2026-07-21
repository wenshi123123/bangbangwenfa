-- Formal migration: guardian-withdraw-atomic.sql + guardian-invite-stats-atomic.sql
-- This migration creates functions only; it does not alter existing rows.

CREATE OR REPLACE FUNCTION public.create_guardian_withdrawal(
  p_guardian_id integer,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal guardian_withdrawals%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> trunc(p_amount) THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF p_amount < 10000 THEN
    RAISE EXCEPTION 'AMOUNT_BELOW_MINIMUM';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_guardian_id::text, 0));

  IF EXISTS (
    SELECT 1 FROM guardian_withdrawals
    WHERE guardian_id = p_guardian_id AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'PENDING_EXISTS';
  END IF;

  UPDATE guardian_users
  SET available_commission = available_commission - p_amount,
      updated_at = NOW()
  WHERE id = p_guardian_id
    AND status <> 'banned'
    AND available_commission >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE_OR_GUARDIAN';
  END IF;

  INSERT INTO guardian_withdrawals (guardian_id, amount, status)
  VALUES (p_guardian_id, p_amount, 'pending')
  RETURNING * INTO v_withdrawal;

  RETURN jsonb_build_object(
    'withdrawalId', v_withdrawal.id,
    'amount', v_withdrawal.amount,
    'status', v_withdrawal.status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_guardian_withdrawal(integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guardian_withdrawal(integer, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_guardian_invite_stats(p_guardian_id integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE guardian_users
  SET total_invites = COALESCE(total_invites, 0) + 1,
      valid_invites = COALESCE(valid_invites, 0) + 1,
      updated_at = NOW()
  WHERE id = p_guardian_id;
$$;

REVOKE ALL ON FUNCTION public.increment_guardian_invite_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_guardian_invite_stats(integer) TO service_role;
