export const PAYMENT_TTL_MS = 15 * 60 * 1000;

export type UnpaidPaymentStatus = 'pending' | 'paying' | 'creating';

export function paymentExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + PAYMENT_TTL_MS);
}

export function isPaymentExpired(
  status: string,
  expiresAt: string | Date | null | undefined,
  now = new Date(),
): boolean {
  if (!['pending', 'paying', 'creating'].includes(status)) return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= now.getTime();
}
