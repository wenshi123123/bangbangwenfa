const BARE_CANONICAL_HOST = 'bangbangwenfa.com';
const PREFERRED_CANONICAL_HOST = `www.${BARE_CANONICAL_HOST}`;
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

export function getCanonicalBrowserRedirectUrl(currentUrl: string): string | null {
  const current = normalizeUrl(currentUrl);
  if (!current) {
    return null;
  }

  if (current.hostname.toLowerCase() !== BARE_CANONICAL_HOST) {
    return null;
  }

  current.hostname = PREFERRED_CANONICAL_HOST;
  current.protocol = 'https:';
  return current.toString();
}

export function getSiteUrl(): string {
  return (
    normalizeCanonicalUrl(process.env.NEXT_PUBLIC_SITE_URL || '')?.toString().replace(/\/$/, '') ||
    getCanonicalSiteUrl()
  );
}

/**
 * 微信 H5 支付专用应用地址。
 * H5 支付域名当前审核使用 www 子域名，不能跟随站点裸域名规范化。
 */
export function getWechatH5SiteUrl(): string {
  const configured = process.env.WEIXIN_H5_SITE_URL || 'https://www.bangbangwenfa.com';
  const normalized = normalizeUrl(configured);
  if (!normalized) return 'https://www.bangbangwenfa.com';
  normalized.protocol = 'https:';
  normalized.pathname = '/';
  normalized.search = '';
  normalized.hash = '';
  return normalized.toString().replace(/\/$/, '');
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

  if (normalized.hostname.toLowerCase() === BARE_CANONICAL_HOST) {
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
  return normalizeHostnameValue(hostname) === BARE_CANONICAL_HOST;
}

export function getRequestHostname(headers: Headers, fallbackHostname?: string | null): string | null {
  return (
    normalizeHostnameValue(headers.get('x-forwarded-host')) ||
    normalizeHostnameValue(headers.get('host')) ||
    normalizeHostnameValue(fallbackHostname)
  );
}

export function getVersionedPath(pathname: string): string {
  return pathname;
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
