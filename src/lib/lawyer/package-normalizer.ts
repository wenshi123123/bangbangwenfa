import { LAWYER_ONBOARDING_PACKAGES } from '@/lib/lawyer/package-config';

export type CanonicalLawyerPackage = 'civil' | 'criminal';

const PACKAGE_ALIASES: Record<string, CanonicalLawyerPackage> = {
  civil: 'civil',
  civil_premium: 'civil',
  'civil-quarterly': 'civil',
  'civil-annual': 'civil',
  criminal: 'criminal',
  criminal_premium: 'criminal',
  'criminal-quarterly': 'criminal',
  'criminal-annual': 'criminal',
};

const DISPLAY_NAMES: Record<CanonicalLawyerPackage, string> = {
  civil: LAWYER_ONBOARDING_PACKAGES.find((item) => item.id === 'civil_premium')?.name || '民事律师（臻选）',
  criminal: LAWYER_ONBOARDING_PACKAGES.find((item) => item.id === 'criminal_premium')?.name || '刑事律师（臻选）',
};

export function normalizePackageIds(input: unknown): CanonicalLawyerPackage[] {
  const values = Array.isArray(input) ? input : [];
  const result: CanonicalLawyerPackage[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const canonical = PACKAGE_ALIASES[value];
    if (canonical && !result.includes(canonical)) result.push(canonical);
  }

  return result;
}

export function getPackageDisplayName(packageId: CanonicalLawyerPackage): string {
  return DISPLAY_NAMES[packageId];
}
