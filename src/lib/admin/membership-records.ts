import { normalizeMembershipDisplayPackageType } from './membership-package';

export interface LawyerMembershipSnapshot {
  id: string;
  name?: string | null;
  package_type?: string | null;
  membership_status?: string | null;
  member_expires_at?: string | null;
  member_starting_at?: string | null;
}

export interface ExpiringMemberFallback {
  id: string;
  lawyer_id: string;
  name: string;
  package_type: 'civil' | 'criminal';
  expires_at: string;
  daysLeft: number;
  is_trial: boolean;
}

export function isMissingMembershipRecordsError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = error.message || '';
  return error.code === '42P01' || /membership_records|schema cache|does not exist/i.test(message);
}

export function buildExpiringMembersFallbackFromLawyers(
  lawyers: LawyerMembershipSnapshot[],
  days: number,
  referenceDate = new Date()
): ExpiringMemberFallback[] {
  const now = referenceDate.getTime();
  const deadline = now + days * 24 * 60 * 60 * 1000;

  return lawyers
    .filter((lawyer) => !!lawyer.member_expires_at)
    .map((lawyer) => {
      const expiresAt = new Date(lawyer.member_expires_at as string);
      const expiresAtTs = expiresAt.getTime();
      const daysLeft = Math.ceil((expiresAtTs - now) / (1000 * 60 * 60 * 24));

      return {
        id: `fallback-${lawyer.id}`,
        lawyer_id: lawyer.id,
        name: lawyer.name || '未知',
        package_type: normalizeMembershipDisplayPackageType(lawyer.package_type) as 'civil' | 'criminal',
        expires_at: lawyer.member_expires_at as string,
        daysLeft,
        is_trial: lawyer.membership_status === 'trial',
        expiresAtTs,
      };
    })
    .filter((item) => item.expiresAtTs > now && item.expiresAtTs <= deadline)
    .sort((a, b) => a.expiresAtTs - b.expiresAtTs)
    .map(({ expiresAtTs: _expiresAtTs, ...item }) => item);
}
