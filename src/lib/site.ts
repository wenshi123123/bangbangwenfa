const PREFERRED_CANONICAL_HOST = 'bangbangwenfa.com';
const WWW_CANONICAL_HOST = `www.${PREFERRED_CANONICAL_HOST}`;
const BUILD_CACHE_BUST_VALUE =
  process.env.BUILD_CACHE_BUST_VALUE ||
  process.env.NEXT_PUBLIC_BUILD_CACHE_BUST_VALUE ||
  'dev';

function normalizeHostnameValue(value: string | null | undefined): string | null {
  if (!value) return null;

  const firstValue = value.split(',')[0]?.trim().toLowerCase();
  if (!firstValue) return null;

  return firstValue.replace(/:\d+$/, '');
}

function normalizeUrl(input: string): URL | null {
  if (!input) return null;

  try {
    const candidate = input.includes('://') ? input : `https://${input}`;
    return new URL(candidate);
  } catch {
    return null;
  }
}

export function getCanonicalHostname(): string {
  return PREFERRED_CANONICAL_HOST;
}

export function getCanonicalSiteUrl(): string {
  return `https://${PREFERRED_CANONICAL_HOST}`;
}

export function getSiteUrl(): string {
  return (
    normalizeCanonicalUrl(process.env.NEXT_PUBLIC_SITE_URL || '')?.toString().replace(/\/$/, '') ||
    getCanonicalSiteUrl()
  );
}

export function normalizeCanonicalUrl(input: string | URL | null | undefined): URL | null {
  const normalized =
    typeof input === 'string'
      ? normalizeUrl(input)
      : input instanceof URL
        ? new URL(input.toString())
        : null;

  if (!normalized) {
    return null;
  }

  if (normalized.hostname.toLowerCase() === WWW_CANONICAL_HOST) {
    normalized.hostname = PREFERRED_CANONICAL_HOST;
  }

  normalized.protocol = 'https:';
  normalized.hash = '';
  normalized.username = '';
  normalized.password = '';

  return normalized;
}

export function isCanonicalHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;

  const normalized = hostname.toLowerCase();
  return (
    normalized === PREFERRED_CANONICAL_HOST ||
    normalized === 'localhost' ||
    normalized === '127.0.0.1'
  );
}

export function shouldRedirectToCanonicalHost(hostname: string | null | undefined): boolean {
  return normalizeHostnameValue(hostname) === WWW_CANONICAL_HOST;
}

export function getRequestHostname(headers: Headers, fallbackHostname?: string | null): string | null {
  return (
    normalizeHostnameValue(headers.get('x-forwarded-host')) ||
    normalizeHostnameValue(headers.get('host')) ||
    normalizeHostnameValue(fallbackHostname)
  );
}

export function getVersionedPath(pathname: string): string {
  if (!pathname.startsWith('/')) {
    return pathname;
  }

  if (BUILD_CACHE_BUST_VALUE === 'dev') {
    return pathname;
  }

  const url = new URL(`https://${PREFERRED_CANONICAL_HOST}${pathname}`);
  url.searchParams.set('__bbwv', BUILD_CACHE_BUST_VALUE);
  return `${url.pathname}${url.search}`;
}

export function getCivilUrl(): string {
  return getVersionedPath('/civil');
}

export function getAdminLoginUrl(): string {
  return getVersionedPath('/admin/login');
}

export function getHomeUrl(): string {
  return getVersionedPath('/');
}

export function getConsultUrl(): string {
  return getVersionedPath('/consult');
}

export function getAboutUrl(): string {
  return getVersionedPath('/about');
}

export function getGuardianUrl(): string {
  return getVersionedPath('/guardian');
}

export function getGuardianCenterUrl(): string {
  return getVersionedPath('/guardian/center');
}

export function getLawyerJoinUrl(): string {
  return getVersionedPath('/lawyer/join');
}

export function getLawyerJoinApplyUrl(): string {
  return getVersionedPath('/lawyer/join/apply');
}

export function getLawyerLoginUrl(): string {
  return getVersionedPath('/lawyer/login');
}

export function getLawyerUrl(): string {
  return getVersionedPath('/lawyer');
}

export function getLawyerDashboardUrl(): string {
  return getVersionedPath('/lawyer/dashboard');
}

export function getRegisterUrl(): string {
  return getVersionedPath('/register');
}

export function getUserAgreementUrl(): string {
  return getVersionedPath('/user-agreement');
}

export function getPrivacyPolicyUrl(): string {
  return getVersionedPath('/privacy-policy');
}

export function getLawyerCommitmentUrl(): string {
  return getVersionedPath('/lawyer-commitment');
}

export function getLawyerEntryAgreementUrl(): string {
  return getVersionedPath('/lawyer-entry-agreement');
}
