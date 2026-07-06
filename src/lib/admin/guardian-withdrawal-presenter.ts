export interface GuardianWithdrawalRecord {
  id: string | number;
  guardian_id: string | number;
  amount: number;
  status: string;
  bank_name: string | null;
  bank_account: string | null;
  bank_username: string | null;
  remark: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface GuardianWithdrawalAdminView {
  id: string | number;
  guardian_id: string | number;
  amount: number;
  status: string;
  bank_name: string | null;
  bank_account: string | null;
  bank_username: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

export function presentGuardianWithdrawal(
  withdrawal: GuardianWithdrawalRecord
): GuardianWithdrawalAdminView {
  return {
    id: withdrawal.id,
    guardian_id: withdrawal.guardian_id,
    amount: withdrawal.amount,
    status: withdrawal.status,
    bank_name: withdrawal.bank_name,
    bank_account: withdrawal.bank_account,
    bank_username: withdrawal.bank_username,
    admin_note: withdrawal.remark || null,
    created_at: withdrawal.created_at,
    processed_at: withdrawal.processed_at,
  };
}
