export type MembershipRecordPackageType = 'civil' | 'criminal';
export type LawyerPackageType = 'civil_premium' | 'criminal_premium';
export type MembershipDisplayPackageType = MembershipRecordPackageType;

export function normalizeMembershipRecordPackageType(
  packageType: string
): MembershipRecordPackageType {
  return packageType === 'criminal' || packageType === 'criminal_premium'
    ? 'criminal'
    : 'civil';
}

export function normalizeLawyerPackageType(
  packageType: string
): LawyerPackageType {
  return packageType === 'criminal' || packageType === 'criminal_premium'
    ? 'criminal_premium'
    : 'civil_premium';
}

export function normalizeMembershipDisplayPackageType(
  packageType: string | null | undefined
): MembershipDisplayPackageType {
  return packageType === 'criminal' || packageType === 'criminal_premium'
    ? 'criminal'
    : 'civil';
}

export function formatMembershipPackageLabel(
  packageType: string | null | undefined
): string {
  return normalizeMembershipDisplayPackageType(packageType) === 'criminal'
    ? '刑事臻选'
    : '民事臻选';
}
