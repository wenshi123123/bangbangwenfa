const PREFERRED_CANONICAL_HOST = 'bangbangwenfa.com';
const WWW_CANONICAL_HOST = `www.${PREFERRED_CANONICAL_HOST}`;

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
  if (!hostname) return false;
  return hostname.toLowerCase() === WWW_CANONICAL_HOST;
}
