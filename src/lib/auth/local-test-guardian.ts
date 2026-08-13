import type { AuthResult } from './middleware';

/**
 * Deterministic guardian fixture used only by the local test account.
 * It is deliberately disabled for production-like environments.
 */
export const LOCAL_TEST_GUARDIAN_ID = 9201;

export function isLocalTestGuardian(auth: AuthResult): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEPLOY_ENV !== 'PROD' &&
    process.env.LOCAL_TEST_ACCOUNTS === 'true' &&
    auth.success &&
    auth.userType === 'guardian' &&
    auth.guardianId === LOCAL_TEST_GUARDIAN_ID
  );
}

export const LOCAL_TEST_GUARDIAN_PROFILE = {
  id: LOCAL_TEST_GUARDIAN_ID,
  nickname: '本地测试守护者',
  avatar_url: null,
  invite_code: 'GUD-LOCAL2026',
  total_invites: 12,
  valid_invites: 9,
  total_commission: 68000,
  available_commission: 32000,
  withdrawn_commission: 36000,
  wechat_account: 'local-test-wechat',
  wechat_qrcode: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
};

export const LOCAL_TEST_GUARDIAN_COMMISSIONS = [
  { id: 1, order_no: 'LOCAL-ORDER-001', order_amount: 50000, commission_amount: 5000, status: 'settled', is_refunded: false, refunded_amount: 0, created_at: '2026-08-01T10:00:00.000Z' },
  { id: 2, order_no: 'LOCAL-ORDER-002', order_amount: 80000, commission_amount: 8000, status: 'pending', is_refunded: false, refunded_amount: 0, created_at: '2026-08-05T10:00:00.000Z' },
];

export const LOCAL_TEST_GUARDIAN_INVITEES = [
  { id: 1, nickname: '本地测试亲友', total_consumption: 120000, is_valid: true, created_at: '2026-07-20T10:00:00.000Z' },
];

export const LOCAL_TEST_GUARDIAN_WITHDRAWALS = [
  { id: 1, amount: 20000, status: 'completed', created_at: '2026-07-25T10:00:00.000Z', processed_at: '2026-07-26T10:00:00.000Z' },
];
