export interface LawyerApplicationState {
  review_status: string | null | undefined;
  payment_status: string | null | undefined;
}

/**
 * Whether an existing application should prevent creating another one.
 * Rejected applications are terminal history and must be eligible for resubmission.
 */
export function isBlockingApplication(application: LawyerApplicationState): boolean {
  if (application.review_status === 'rejected') return false;
  if (application.review_status === 'approved') return true;
  return application.review_status === 'pending' || application.payment_status === 'paid';
}
