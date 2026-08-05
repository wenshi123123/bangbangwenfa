import { resetMockDatabase } from '@/storage/database/supabase-client';

export const LOCAL_PREVIEW_IDS = {
  user: 1001,
  guardian: 2001,
  lawyer: 'local-lawyer-3001',
  admin: 4001,
  application: 'local-application-5001',
  order: 'local-order-6001',
} as const;

export type LocalPreviewRole = 'user' | 'guardian' | 'lawyer' | 'admin';

const now = () => new Date().toISOString();

export function resetLocalPreviewFixtures() {
  const createdAt = now();
  resetMockDatabase({
    users: [{ id: LOCAL_PREVIEW_IDS.user, phone: '13900000001', username: 'local_user', nickname: '本地测试用户' }],
    guardian_users: [{ id: LOCAL_PREVIEW_IDS.guardian, user_id: LOCAL_PREVIEW_IDS.user, phone: '13900000001', nickname: '本地测试守护者', invite_code: 'LOCAL-CARE-2001', total_invites: 3, valid_invites: 2, total_commission: 30000, available_commission: 20000, withdrawn_commission: 10000, status: 'active', created_at: createdAt }],
    guardian_invitees: [{ id: 1, guardian_id: LOCAL_PREVIEW_IDS.guardian, invitee_nickname: '本地受邀用户', total_consumption: 10000, is_valid: true, created_at: createdAt }],
    guardian_commissions: [{ id: 1, guardian_id: LOCAL_PREVIEW_IDS.guardian, order_no: 'LOCAL-COMMISSION-1', order_amount: 10000, commission_amount: 3000, commission_rate: 0.3, status: 'settled', is_refunded: false, created_at: createdAt }],
    guardian_withdrawals: [],
    lawyers: [{ id: LOCAL_PREVIEW_IDS.lawyer, user_id: LOCAL_PREVIEW_IDS.user, phone: '13900000001', name: '本地测试律师', real_name: '本地测试律师', status: 'active', is_available: true, membership_status: 'normal', member_expires_at: '2030-01-01T00:00:00.000Z', login_count: 0 }],
    lawyer_applications: [{ id: LOCAL_PREVIEW_IDS.application, user_id: LOCAL_PREVIEW_IDS.user, phone: '13900000001', name: '本地待审律师', review_status: 'pending', payment_status: 'paid', package_type: 'civil_premium', selected_packages: ['civil_premium'], created_at: createdAt }],
    consult_orders: [{ id: LOCAL_PREVIEW_IDS.order, user_id: LOCAL_PREVIEW_IDS.user, order_no: 'LOCAL-ORDER-6001', assigned_lawyer_id: LOCAL_PREVIEW_IDS.lawyer, assignment_status: 'pending', payment_status: 'paid', case_type: 'civil', case_title: '本地测试咨询', created_at: createdAt }],
    admins: [{ id: LOCAL_PREVIEW_IDS.admin, username: 'local_admin', nickname: '本地测试管理员', permissions: ['all'], status: 'active' }],
    notifications: [], membership_records: [], lawyer_complimentary_orders: [],
  });
}

export function getLocalPreviewProfile(role: LocalPreviewRole) {
  const user = { id: LOCAL_PREVIEW_IDS.user, phone: '13900000001', username: 'local_user', nickname: '本地测试用户' };
  if (role === 'admin') return { admin: { id: LOCAL_PREVIEW_IDS.admin, username: 'local_admin', nickname: '本地测试管理员' }, targetPath: '/admin/dashboard' };
  if (role === 'guardian') return { user: { ...user, userType: 'guardian', isGuardian: true, guardianInfo: { id: LOCAL_PREVIEW_IDS.guardian, inviteCode: 'LOCAL-CARE-2001', totalInvites: 3, validInvites: 2, totalCommission: 30000, availableCommission: 20000 } }, targetPath: '/guardian/center', guardianId: LOCAL_PREVIEW_IDS.guardian };
  if (role === 'lawyer') return { user: { ...user, userType: 'lawyer', isLawyer: true, lawyerInfo: { id: LOCAL_PREVIEW_IDS.lawyer, name: '本地测试律师', status: 'active' } }, targetPath: '/lawyer', lawyerId: LOCAL_PREVIEW_IDS.lawyer };
  return { user: { ...user, userType: 'user', isGuardian: false, isLawyer: false }, targetPath: '/user' };
}
